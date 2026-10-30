import { Socket } from 'socket.io-client';

export interface VoicePeer {
  socketId: string;
  playerName: string;
  pc: RTCPeerConnection;
  audioEl: HTMLAudioElement;
  stream?: MediaStream;
  pendingCandidates: RTCIceCandidateInit[];
  hasRemoteDescription: boolean;
  isMakingOffer: boolean;
}

export type VoiceConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:global.stun.twilio.com:3478' }
];

export class VoiceChatManager {
  private socket: Socket | null = null;
  private roomId: string = '';
  private playerName: string = '';

  private localStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private vadInterval: number | null = null;

  private peers: Map<string, VoicePeer> = new Map();
  private speakingPeers: Set<string> = new Set();
  private peerNamesBySocketId: Map<string, string> = new Map();

  public state: VoiceConnectionState = 'disconnected';
  public isMuted: boolean = false;
  public isDeafened: boolean = false;
  public volume: number = 1.0;

  private onStateChangeListeners: Set<(state: VoiceConnectionState) => void> = new Set();
  private onSpeakingChangeListeners: Set<(speakingPeers: Set<string>) => void> = new Set();
  private onPeersChangeListeners: Set<(peers: VoicePeer[]) => void> = new Set();
  private onErrorListeners: Set<(errorMessage: string) => void> = new Set();

  constructor() {}

  public init(socket: Socket): void {
    if (this.socket) {
      this.cleanupSocketListeners();
    }
    this.socket = socket;
    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    // 1. Existing peers list received after voice:join
    this.socket.on('voice:all-users', async ({ peers }: { peers: { socketId: string; playerName: string }[] }) => {
      this.setState('connected');

      for (const peerInfo of peers) {
        this.peerNamesBySocketId.set(peerInfo.socketId, peerInfo.playerName);
        await this.createPeerConnection(peerInfo.socketId, peerInfo.playerName, true);
      }
      this.notifyPeers();
    });

    // 2. Another user joined voice chat in our room
    this.socket.on('voice:user-joined', async ({ socketId, playerName }: { socketId: string; playerName: string }) => {
      if (this.state === 'disconnected') return;
      this.peerNamesBySocketId.set(socketId, playerName);
      // Ensure peer connection exists (the other side will initiate offer, or we handle it gracefully)
      this.createPeerConnection(socketId, playerName, false);
      this.notifyPeers();
    });

    // 3. WebRTC Signal (Offer / Answer / ICE Candidate) received
    this.socket.on('voice:signal', async ({ senderSocketId, signal }: { senderSocketId: string; signal: any }) => {
      if (!signal || !senderSocketId) return;

      const knownName = this.peerNamesBySocketId.get(senderSocketId) || 'Pemain';
      let peer = this.peers.get(senderSocketId);
      if (!peer) {
        peer = this.createPeerConnection(senderSocketId, knownName, false);
      }

      const pc = peer.pc;

      try {
        if (signal.type === 'offer') {
          // Glare / collision handling (Perfect Negotiation)
          const myId = this.socket?.id || '';
          const isPolite = myId < senderSocketId;
          const offerCollision = peer.isMakingOffer || pc.signalingState !== 'stable';

          if (offerCollision) {
            if (!isPolite) {
              return;
            }
            // Polite peer rolls back local offer to accept remote offer
            try {
              await pc.setLocalDescription({ type: 'rollback' } as any);
            } catch {
              // Rollback may not be supported on all browsers, continue
            }
          }

          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          peer.hasRemoteDescription = true;
          await this.flushPendingCandidates(peer);

          const answer = await pc.createAnswer({ offerToReceiveAudio: true });
          await pc.setLocalDescription(answer);

          this.socket?.emit('voice:signal', {
            targetSocketId: senderSocketId,
            signal: pc.localDescription
          });
        } else if (signal.type === 'answer') {
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
            peer.hasRemoteDescription = true;
            await this.flushPendingCandidates(peer);
          }
        } else if (signal.candidate) {
          if (peer.hasRemoteDescription && pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } catch (e) {
              console.warn('Gagal menambahkan direct ICE candidate:', e);
            }
          } else {
            peer.pendingCandidates.push(signal.candidate);
          }
        }
      } catch (err) {
        console.error(`WebRTC signal error for ${senderSocketId}:`, err);
      }
    });

    // 4. Remote peer speaking state changed
    this.socket.on('voice:speaking-state', ({ socketId, playerName, isSpeaking }: { socketId: string; playerName?: string; isSpeaking: boolean }) => {
      const cleanName = playerName ? playerName.trim().toLowerCase() : '';
      if (isSpeaking) {
        this.speakingPeers.add(socketId);
        if (cleanName) this.speakingPeers.add(cleanName);
      } else {
        this.speakingPeers.delete(socketId);
        if (cleanName) this.speakingPeers.delete(cleanName);
      }
      this.notifySpeaking();
    });

    // 5. User left voice chat
    this.socket.on('voice:user-left', ({ socketId }: { socketId: string }) => {
      const pName = this.peerNamesBySocketId.get(socketId)?.trim().toLowerCase();
      this.removePeer(socketId);
      this.speakingPeers.delete(socketId);
      if (pName) this.speakingPeers.delete(pName);
      this.peerNamesBySocketId.delete(socketId);
      this.notifySpeaking();
      this.notifyPeers();
    });
  }

  private cleanupSocketListeners(): void {
    if (!this.socket) return;
    this.socket.off('voice:all-users');
    this.socket.off('voice:user-joined');
    this.socket.off('voice:signal');
    this.socket.off('voice:speaking-state');
    this.socket.off('voice:user-left');
  }

  private getOrCreateAudioContainer(): HTMLElement {
    let container = document.getElementById('poker-voice-audio-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'poker-voice-audio-container';
      container.style.display = 'none';
      container.style.position = 'fixed';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.width = '1px';
      container.style.height = '1px';
      container.style.overflow = 'hidden';
      document.body.appendChild(container);
    }
    return container;
  }

  // Connect to room voice channel (receives audio from all speakers immediately)
  public connect(roomId: string, playerName: string): void {
    if (!this.socket) {
      this.notifyError('Socket belum terhubung.');
      return;
    }

    const cleanId = roomId.trim().toLowerCase();
    if (this.state === 'connected' && this.roomId === cleanId) {
      return;
    }

    if (this.roomId && this.roomId !== cleanId) {
      this.leave();
    }

    this.roomId = cleanId;
    this.playerName = playerName;
    this.setState('connecting');

    // Ensure audio DOM container is initialized
    this.getOrCreateAudioContainer();

    // Signal room join
    this.socket.emit('voice:join', {
      roomId: this.roomId,
      playerName: this.playerName
    });
  }

  // Acquire microphone with high-fidelity speech processing
  public async enableMic(): Promise<boolean> {
    if (!this.socket || !this.roomId) {
      this.notifyError('Harap bergabung ke meja terlebih dahulu.');
      return false;
    }

    try {
      if (!this.localStream) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
            sampleRate: 48000
          },
          video: false
        });
      }

      this.isMuted = false;
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });

      this.setupVAD(this.localStream);

      // Add local audio track to all existing peer connections
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        for (const peer of this.peers.values()) {
          const pc = peer.pc;
          const senders = pc.getSenders();
          const audioSender = senders.find(s => s.track?.kind === 'audio');
          if (audioSender) {
            audioSender.replaceTrack(audioTrack).catch(err => {
              console.warn('replaceTrack error:', err);
            });
          } else {
            pc.addTrack(audioTrack, this.localStream);
            if (pc.connectionState === 'connected' || pc.signalingState === 'stable') {
              this.renegotiatePeer(peer);
            }
          }
        }
      }

      this.setState('connected');
      return true;
    } catch (err: any) {
      console.error('Gagal mengakses mikrofon:', err);
      let msg = 'Gagal mengakses mikrofon.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Izin mikrofon ditolak di browser. Silakan klik ikon gembok pada URL dan izinkan mikrofon.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'Tidak ada mikrofon yang terdeteksi di perangkat Anda.';
      }
      this.notifyError(msg);
      return false;
    }
  }

  // Connect to room & turn on Microphone in one call
  public async join(roomId: string, playerName: string): Promise<boolean> {
    this.connect(roomId, playerName);
    return await this.enableMic();
  }

  // Leave room voice channel & stop local microphone
  public leave(): void {
    if (this.socket && this.roomId) {
      this.socket.emit('voice:leave', { roomId: this.roomId });
    }

    // Stop and release local microphone
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close all peer connections & remove audio elements
    for (const [socketId] of this.peers) {
      this.removePeer(socketId);
    }
    this.peers.clear();
    this.peerNamesBySocketId.clear();

    // Stop VAD
    this.stopVAD();

    // Reset speaking
    this.speakingPeers.clear();
    this.notifySpeaking();
    this.notifyPeers();

    this.setState('disconnected');
  }

  // Toggle Mute / Unmute
  public toggleMute(): boolean {
    if (!this.localStream) {
      this.enableMic();
      return false;
    }
    return this.setMuted(!this.isMuted);
  }

  public setMuted(muted: boolean): boolean {
    this.isMuted = muted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }

    if (muted && this.socket) {
      this.speakingPeers.delete('local');
      if (this.socket.id) {
        this.speakingPeers.delete(this.socket.id);
      }
      this.notifySpeaking();
      this.socket.emit('voice:speaking', { roomId: this.roomId, isSpeaking: false });
    }

    return this.isMuted;
  }

  // Toggle Deafen (Mute incoming voices)
  public toggleDeafen(): boolean {
    this.isDeafened = !this.isDeafened;
    for (const peer of this.peers.values()) {
      peer.audioEl.muted = this.isDeafened;
    }
    return this.isDeafened;
  }

  // Set incoming volume (0.0 to 1.5)
  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(2.0, vol));
    for (const peer of this.peers.values()) {
      peer.audioEl.volume = Math.min(1.0, this.volume);
    }
  }

  public hasMic(): boolean {
    return Boolean(this.localStream && this.localStream.getAudioTracks().length > 0);
  }

  private createPeerConnection(targetSocketId: string, playerName: string, isInitiator: boolean): VoicePeer {
    let existing = this.peers.get(targetSocketId);
    if (existing) {
      return existing;
    }

    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 2
    });

    const container = this.getOrCreateAudioContainer();
    const audioEl = document.createElement('audio');
    audioEl.id = `voice-peer-${targetSocketId}`;
    audioEl.autoplay = true;
    audioEl.muted = this.isDeafened;
    audioEl.volume = Math.min(1.0, this.volume);
    audioEl.setAttribute('playsinline', 'true');
    container.appendChild(audioEl);

    const peer: VoicePeer = {
      socketId: targetSocketId,
      playerName,
      pc,
      audioEl,
      pendingCandidates: [],
      hasRemoteDescription: false,
      isMakingOffer: false
    };

    // Add local audio tracks if microphone is active
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit('voice:signal', {
          targetSocketId,
          signal: { candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate }
        });
      }
    };

    // Incoming remote audio track handler
    pc.ontrack = (event) => {
      peer.stream = event.streams[0];
      audioEl.srcObject = event.streams[0];
      audioEl.play().catch(() => {
        // Browser Autoplay policy unlock on first user gesture
        this.registerAutoplayUnlock(audioEl);
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.removePeer(targetSocketId);
        this.notifyPeers();
      }
    };

    this.peers.set(targetSocketId, peer);

    // If initiator, create and send initial offer
    if (isInitiator) {
      peer.isMakingOffer = true;
      pc.createOffer({ offerToReceiveAudio: true })
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          this.socket?.emit('voice:signal', {
            targetSocketId,
            signal: pc.localDescription
          });
        })
        .catch(err => {
          console.error(`Gagal membuat WebRTC offer ke ${targetSocketId}:`, err);
        })
        .finally(() => {
          peer.isMakingOffer = false;
        });
    }

    return peer;
  }

  private async flushPendingCandidates(peer: VoicePeer): Promise<void> {
    if (!peer.hasRemoteDescription || !peer.pc.remoteDescription) return;
    while (peer.pendingCandidates.length > 0) {
      const candidate = peer.pendingCandidates.shift();
      if (candidate) {
        try {
          await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('Gagal menambahkan buffered ICE candidate:', e);
        }
      }
    }
  }

  private renegotiatePeer(peer: VoicePeer): void {
    if (!this.socket) return;
    peer.isMakingOffer = true;
    peer.pc.createOffer({ offerToReceiveAudio: true })
      .then(offer => peer.pc.setLocalDescription(offer))
      .then(() => {
        this.socket?.emit('voice:signal', {
          targetSocketId: peer.socketId,
          signal: peer.pc.localDescription
        });
      })
      .catch(err => {
        console.warn('Renegotiation offer error:', err);
      })
      .finally(() => {
        peer.isMakingOffer = false;
      });
  }

  private removePeer(socketId: string): void {
    const peer = this.peers.get(socketId);
    if (peer) {
      try {
        peer.pc.close();
      } catch {}
      peer.audioEl.srcObject = null;
      peer.audioEl.pause();
      if (peer.audioEl.parentNode) {
        peer.audioEl.parentNode.removeChild(peer.audioEl);
      }
      this.peers.delete(socketId);
    }
  }

  private registerAutoplayUnlock(audioEl: HTMLAudioElement): void {
    const unlock = () => {
      audioEl.play().catch(() => {});
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  // Voice Activity Detection (VAD) via WebAudio AnalyserNode
  private setupVAD(stream: MediaStream): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.35;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let wasSpeaking = false;
      let silenceFrames = 0;

      if (this.vadInterval !== null) {
        clearInterval(this.vadInterval);
      }

      this.vadInterval = window.setInterval(() => {
        if (!this.analyser || this.isMuted) {
          if (wasSpeaking) {
            wasSpeaking = false;
            this.broadcastSpeaking(false);
          }
          return;
        }

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Threshold for speaking
        const isCurrentlySpeaking = average > 12;

        if (isCurrentlySpeaking) {
          silenceFrames = 0;
          if (!wasSpeaking) {
            wasSpeaking = true;
            this.broadcastSpeaking(true);
          }
        } else {
          silenceFrames++;
          if (silenceFrames > 4 && wasSpeaking) {
            wasSpeaking = false;
            this.broadcastSpeaking(false);
          }
        }
      }, 90);
    } catch {
      // AudioContext may be suspended before user interaction
    }
  }

  private stopVAD(): void {
    if (this.vadInterval !== null) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
  }

  private broadcastSpeaking(isSpeaking: boolean): void {
    if (this.socket && this.socket.id) {
      const myName = (this.playerName || '').trim().toLowerCase();
      if (isSpeaking) {
        this.speakingPeers.add('local');
        this.speakingPeers.add(this.socket.id);
        if (myName) this.speakingPeers.add(myName);
      } else {
        this.speakingPeers.delete('local');
        this.speakingPeers.delete(this.socket.id);
        if (myName) this.speakingPeers.delete(myName);
      }
      this.notifySpeaking();

      this.socket.emit('voice:speaking', {
        roomId: this.roomId,
        isSpeaking
      });
    }
  }

  // Listener helpers
  private setState(newState: VoiceConnectionState): void {
    this.state = newState;
    this.onStateChangeListeners.forEach(cb => cb(this.state));
  }

  private notifySpeaking(): void {
    const copy = new Set(this.speakingPeers);
    this.onSpeakingChangeListeners.forEach(cb => cb(copy));
  }

  private notifyPeers(): void {
    const list = Array.from(this.peers.values());
    this.onPeersChangeListeners.forEach(cb => cb(list));
  }

  private notifyError(msg: string): void {
    this.onErrorListeners.forEach(cb => cb(msg));
  }

  public onStateChange(cb: (state: VoiceConnectionState) => void): () => void {
    this.onStateChangeListeners.add(cb);
    cb(this.state);
    return () => this.onStateChangeListeners.delete(cb);
  }

  public onSpeakingChange(cb: (speakingPeers: Set<string>) => void): () => void {
    this.onSpeakingChangeListeners.add(cb);
    cb(new Set(this.speakingPeers));
    return () => this.onSpeakingChangeListeners.delete(cb);
  }

  public onPeersChange(cb: (peers: VoicePeer[]) => void): () => void {
    this.onPeersChangeListeners.add(cb);
    cb(Array.from(this.peers.values()));
    return () => this.onPeersChangeListeners.delete(cb);
  }

  public onError(cb: (msg: string) => void): () => void {
    this.onErrorListeners.add(cb);
    return () => this.onErrorListeners.delete(cb);
  }
}

export const voiceChat = new VoiceChatManager();
