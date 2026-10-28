import { Socket } from 'socket.io-client';

export interface VoicePeer {
  socketId: string;
  playerName: string;
  pc: RTCPeerConnection;
  audioEl: HTMLAudioElement;
  stream?: MediaStream;
}

export type VoiceConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' }
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
      if (this.state !== 'connecting') return;
      this.setState('connected');

      for (const peerInfo of peers) {
        await this.createPeerConnection(peerInfo.socketId, peerInfo.playerName, true);
      }
      this.notifyPeers();
    });

    // 2. Another user joined voice chat
    this.socket.on('voice:user-joined', async ({ socketId, playerName }: { socketId: string; playerName: string }) => {
      if (this.state === 'disconnected') return;
      // The joining user will send us an offer, but we can prepare the peer connection
      this.createPeerConnection(socketId, playerName, false);
      this.notifyPeers();
    });

    // 3. WebRTC Signal (Offer / Answer / ICE Candidate) received
    this.socket.on('voice:signal', async ({ senderSocketId, signal }: { senderSocketId: string; signal: any }) => {
      let peer = this.peers.get(senderSocketId);
      if (!peer) {
        peer = this.createPeerConnection(senderSocketId, 'Pemain', false);
      }

      const pc = peer.pc;

      try {
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          this.socket?.emit('voice:signal', {
            targetSocketId: senderSocketId,
            signal: answer
          });
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
        } else if (signal.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (e) {
            console.warn('Gagal menambahkan ICE candidate:', e);
          }
        }
      } catch (err) {
        console.error('WebRTC signal handling error:', err);
      }
    });

    // 4. Remote peer speaking state changed
    this.socket.on('voice:speaking-state', ({ socketId, isSpeaking }: { socketId: string; isSpeaking: boolean }) => {
      if (isSpeaking) {
        this.speakingPeers.add(socketId);
      } else {
        this.speakingPeers.delete(socketId);
      }
      this.notifySpeaking();
    });

    // 5. User left voice chat
    this.socket.on('voice:user-left', ({ socketId }: { socketId: string }) => {
      this.removePeer(socketId);
      this.speakingPeers.delete(socketId);
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

  // Connect & turn on Microphone
  public async join(roomId: string, playerName: string): Promise<boolean> {
    if (!this.socket) {
      this.notifyError('Socket belum terhubung.');
      return false;
    }

    this.roomId = roomId.trim().toLowerCase();
    this.playerName = playerName;
    this.setState('connecting');

    try {
      // 1. Request microphone access with native echo cancellation
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

      // Apply initial mute state
      this.setMuted(this.isMuted);

      // 2. Setup Voice Activity Detection (VAD)
      this.setupVAD(this.localStream);

      // 3. Emit join event to server signaling
      this.socket.emit('voice:join', {
        roomId: this.roomId,
        playerName: this.playerName
      });

      return true;
    } catch (err: any) {
      console.error('Gagal mengakses mikrofon:', err);
      this.setState('error');
      let msg = 'Gagal mengakses mikrofon.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Izin mikrofon ditolak di browser. Silakan klik ikon gembok di bilah URL dan izinkan akses mikrofon.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'Tidak ada perangkat mikrofon yang terdeteksi di komputer Anda.';
      }
      this.notifyError(msg);
      return false;
    }
  }

  // Disconnect & turn off Microphone
  public leave(): void {
    if (this.socket && this.roomId) {
      this.socket.emit('voice:leave', { roomId: this.roomId });
    }

    // Stop and release local microphone
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close all peer connections
    for (const [socketId] of this.peers) {
      this.removePeer(socketId);
    }
    this.peers.clear();

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
    return this.setMuted(!this.isMuted);
  }

  public setMuted(muted: boolean): boolean {
    this.isMuted = muted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }

    // If muted, clear our speaking state
    if (muted && this.socket) {
      this.speakingPeers.delete('local');
      this.speakingPeers.delete(this.socket.id || '');
      this.notifySpeaking();
      this.socket.emit('voice:speaking', { roomId: this.roomId, isSpeaking: false });
    }

    return this.isMuted;
  }

  // Toggle Deafen (Mute incoming audio from all peers)
  public toggleDeafen(): boolean {
    this.isDeafened = !this.isDeafened;
    for (const peer of this.peers.values()) {
      peer.audioEl.muted = this.isDeafened;
    }
    return this.isDeafened;
  }

  // Adjust volume of incoming peers (0.0 to 1.0)
  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    for (const peer of this.peers.values()) {
      peer.audioEl.volume = this.volume;
    }
  }

  // Create WebRTC Peer Connection
  private createPeerConnection(targetSocketId: string, playerName: string, isInitiator: boolean): VoicePeer {
    let existing = this.peers.get(targetSocketId);
    if (existing) {
      return existing;
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Audio element for remote sound playback
    const audioEl = new Audio();
    audioEl.autoplay = true;
    audioEl.muted = this.isDeafened;
    audioEl.volume = this.volume;

    const peer: VoicePeer = {
      socketId: targetSocketId,
      playerName,
      pc,
      audioEl
    };

    // Add local tracks to send to remote peer
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
          signal: { candidate: event.candidate }
        });
      }
    };

    // Incoming remote audio track handler
    pc.ontrack = (event) => {
      peer.stream = event.streams[0];
      audioEl.srcObject = event.streams[0];
      audioEl.play().catch(() => {
        // Autoplay policy: will play on first click
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.removePeer(targetSocketId);
        this.notifyPeers();
      }
    };

    this.peers.set(targetSocketId, peer);

    // If initiator, create and send offer
    if (isInitiator) {
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
        });
    }

    return peer;
  }

  private removePeer(socketId: string): void {
    const peer = this.peers.get(socketId);
    if (peer) {
      peer.pc.close();
      peer.audioEl.srcObject = null;
      peer.audioEl.pause();
      this.peers.delete(socketId);
    }
  }

  // Voice Activity Detection (VAD) via AnalyserNode
  private setupVAD(stream: MediaStream): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.3;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let wasSpeaking = false;
      let silenceFrames = 0;

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
        const isCurrentlySpeaking = average > 14;

        if (isCurrentlySpeaking) {
          silenceFrames = 0;
          if (!wasSpeaking) {
            wasSpeaking = true;
            this.broadcastSpeaking(true);
          }
        } else {
          silenceFrames++;
          if (silenceFrames > 3 && wasSpeaking) {
            wasSpeaking = false;
            this.broadcastSpeaking(false);
          }
        }
      }, 100);
    } catch {
      // AudioContext may be blocked before gesture
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
      if (isSpeaking) {
        this.speakingPeers.add('local');
        this.speakingPeers.add(this.socket.id);
      } else {
        this.speakingPeers.delete('local');
        this.speakingPeers.delete(this.socket.id);
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
