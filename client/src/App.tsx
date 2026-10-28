import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import confetti from 'canvas-confetti';
import { Card, ChatMessage, TableStatePublic } from './types.js';
import { PlayerSeat } from './components/PlayerSeat.js';
import { CommunityBoard } from './components/CommunityBoard.js';
import { ActionControls } from './components/ActionControls.js';
import { ChatPanel } from './components/ChatPanel.js';
import { FloatingChatFeed, FloatingChatItem } from './components/FloatingChatFeed.js';
import { LobbyModal } from './components/LobbyModal.js';
import { Lobby3D } from './components/Lobby3D.js';
import { soundEffects } from './utils/soundEffects.js';
import { voiceChat, VoiceConnectionState, VoicePeer } from './utils/voiceChat.js';
import {
  Share2,
  Settings,
  Bot,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Play,
  Music,
  Volume2,
  VolumeX,
  Compass,
  ArrowLeft,
  Mic,
  MicOff
} from 'lucide-react';

const SEAT_COORDINATES = [
  { top: '9%', left: '50%' },   // 0: Top Center
  { top: '17%', left: '77%' },  // 1: Top Right
  { top: '50%', left: '92%' },  // 2: Far Right
  { top: '82%', left: '77%' },  // 3: Bottom Right
  { top: '91%', left: '50%' },  // 4: Bottom Center
  { top: '82%', left: '23%' },  // 5: Bottom Left
  { top: '50%', left: '8%' },   // 6: Far Left
  { top: '17%', left: '23%' },  // 7: Top Left
];

export const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [tableState, setTableState] = useState<TableStatePublic | null>(null);
  const [myCards, setMyCards] = useState<Card[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Room & Identity
  const [roomId, setRoomId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('room') || 'meja-1').toLowerCase();
  });

  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('poker_player_name') || `Pemain #${Math.floor(100 + Math.random() * 900)}`;
  });

  // View mode: 'lobby' (3D room with character) or 'table' (poker game table)
  const [viewMode, setViewMode] = useState<'lobby' | 'table'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === 'table' ? 'table' : 'lobby';
  });

  // Voice Chat (On-Mic WebRTC) State
  const [voiceState, setVoiceState] = useState<VoiceConnectionState>('disconnected');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [speakingPeers, setSpeakingPeers] = useState<Set<string>>(new Set());
  const [voicePeers, setVoicePeers] = useState<VoicePeer[]>([]);

  // UI state
  const [isLobbyOpen, setIsLobbyOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [floatingChats, setFloatingChats] = useState<FloatingChatItem[]>([]);
  const [recentTip, setRecentTip] = useState<{
    fromSeat: number;
    toSeat: number;
    amount: number;
    fromName: string;
    toName: string;
    phrase?: string;
    id: number;
  } | null>(null);
  const [isBgmPlaying, setIsBgmPlaying] = useState(soundEffects.isBgmPlaying);
  const [toast, setToast] = useState<string | null>(null);

  const prevActiveSeatRef = useRef<number | null>(null);
  const prevStageRef = useRef<string | null>(null);

  // Show toast notification
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleDismissFloatingChat = (id: string) => {
    setFloatingChats(prev => prev.filter(c => c.id !== id));
  };

  // Background Music (Tokyo Drift - Teriyaki Boyz) Initialization & Autoplay on first click
  useEffect(() => {
    soundEffects.initBgm('/bgm.mp3');

    const handleFirstUserInteraction = () => {
      soundEffects.playBgm();
      window.removeEventListener('pointerdown', handleFirstUserInteraction);
      window.removeEventListener('keydown', handleFirstUserInteraction);
    };

    window.addEventListener('pointerdown', handleFirstUserInteraction);
    window.addEventListener('keydown', handleFirstUserInteraction);

    const unsub = soundEffects.onBgmChange((playing) => {
      setIsBgmPlaying(playing);
    });

    // Voice Chat State & Speaking Subscriptions
    const unsubVoiceState = voiceChat.onStateChange((st) => setVoiceState(st));
    const unsubVoiceSpeaking = voiceChat.onSpeakingChange((peers) => setSpeakingPeers(peers));
    const unsubVoicePeers = voiceChat.onPeersChange((peers) => setVoicePeers(peers));
    const unsubVoiceErr = voiceChat.onError((err) => showToast(`⚠️ ${err}`));

    return () => {
      window.removeEventListener('pointerdown', handleFirstUserInteraction);
      window.removeEventListener('keydown', handleFirstUserInteraction);
      unsub();
      unsubVoiceState();
      unsubVoiceSpeaking();
      unsubVoicePeers();
      unsubVoiceErr();
      voiceChat.leave();
    };
  }, []);

  const handleToggleBgm = () => {
    const playing = soundEffects.toggleBgm();
    setIsBgmPlaying(playing);
    showToast(playing ? '🎵 Memutar Tokyo Drift - Teriyaki Boyz' : '🔇 Musik dijeda');
  };

  // Voice Chat Handlers
  const handleToggleMic = async () => {
    if (voiceState === 'disconnected') {
      showToast('Menghubungkan mikrofon...');
      const success = await voiceChat.join(roomId, playerName);
      if (success) {
        setIsMicMuted(false);
        showToast('🎙️ Mikrofon aktif! Anda sekarang on-mic.');
      }
    } else {
      const muted = voiceChat.toggleMute();
      setIsMicMuted(muted);
      showToast(muted ? '🔇 Mikrofon di-mute' : '🎙️ Mikrofon aktif');
    }
  };

  const handleToggleDeafen = () => {
    const deaf = voiceChat.toggleDeafen();
    setIsDeafened(deaf);
    showToast(deaf ? '🔇 Suara teman dibisukan' : '🔊 Suara teman aktif');
  };

  const handleDisconnectVoice = () => {
    voiceChat.leave();
    showToast('Mikrofon dimatikan.');
  };

  // 1. Socket initialization
  useEffect(() => {
    const serverUrl = import.meta.env.VITE_SERVER_URL || '';
    const s = io(serverUrl || undefined, {
      transports: ['websocket', 'polling']
    });

    s.on('connect', () => {
      s.emit('joinRoom', { roomId, playerName });
      voiceChat.init(s);
    });

    s.on('tableState', (state: TableStatePublic) => {
      setTableState(state);
    });

    s.on('myCards', (cards: Card[]) => {
      setMyCards(cards);
      if (cards.length > 0) {
        soundEffects.playCardDeal();
      }
    });

    s.on('chatMessage', (msg: ChatMessage) => {
      setMessages(prev => [...prev.slice(-49), msg]);

      // Add to floating chat notifications ONLY if it's a message from a user (not dealer/system log)
      if (!msg.isSystem) {
        setFloatingChats(prev => [
          ...prev.slice(-3),
          { id: `${msg.id}_${Date.now()}_${Math.random()}`, msg }
        ]);
        soundEffects.playChatPop();
      }
    });

    s.on('playerTipped', (data: { fromSeat: number; toSeat: number; amount: number; fromName: string; toName: string; phrase?: string }) => {
      soundEffects.playChipSound();
      const tipId = Date.now();
      setRecentTip({ ...data, id: tipId });
      setTimeout(() => {
        setRecentTip(curr => (curr?.id === tipId ? null : curr));
      }, 2800);
    });

    s.on('errorAlert', (err: string) => {
      showToast(err);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [roomId]);

  // 2. Audio & Confetti reactive effects
  useEffect(() => {
    if (!tableState || !socket) return;

    const mySeat = tableState.seats.findIndex(p => p?.id === socket.id);

    // Turn chime alert
    if (
      mySeat !== -1 &&
      tableState.activeSeat === mySeat &&
      prevActiveSeatRef.current !== mySeat
    ) {
      soundEffects.playTurnChime();
    }
    prevActiveSeatRef.current = tableState.activeSeat;

    // Showdown fanfare & confetti
    if (tableState.stage === 'SHOWDOWN' && prevStageRef.current !== 'SHOWDOWN') {
      soundEffects.playWinFanfare();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
    prevStageRef.current = tableState.stage;
  }, [tableState, socket]);

  // 3. Audio effect when Community Cards (Flop, Turn, River) are dealt
  const prevCommunityCountRef = useRef<number>(0);
  useEffect(() => {
    if (!tableState) return;
    const count = tableState.communityCards.length;
    if (count > prevCommunityCountRef.current) {
      const added = count - prevCommunityCountRef.current;
      for (let i = 0; i < added; i++) {
        setTimeout(() => {
          soundEffects.playCardDeal();
        }, i * 140);
      }
    }
    prevCommunityCountRef.current = count;
  }, [tableState?.communityCards]);

  // Player Seating checks
  const mySeatIndex = tableState && socket
    ? tableState.seats.findIndex(p => p?.id === socket.id)
    : -1;
  const isSeated = mySeatIndex !== -1;
  const myPlayer = isSeated && tableState ? tableState.seats[mySeatIndex] : null;
  const isMyTurn = isSeated && tableState?.activeSeat === mySeatIndex && !myPlayer?.folded && !myPlayer?.isAllIn;

  // Auto-request hole cards if seated with cardCount > 0 but myCards is unexpectedly empty
  useEffect(() => {
    if (isSeated && myPlayer && myPlayer.cardCount > 0 && !myPlayer.folded && myCards.length === 0) {
      socket?.emit('requestMyCards');
    }
  }, [tableState, isSeated, myPlayer?.cardCount, myCards.length, socket]);

  // Player cannot rebuy while an active hand is in progress and they are participating
  const isActivelyPlaying = tableState
    ? tableState.stage !== 'WAITING' &&
      ((myPlayer && !myPlayer.folded) || (myPlayer && myPlayer.isAllIn) || myCards.length > 0)
    : false;

  const canRebuy = isSeated && myPlayer
    ? myPlayer.chips <= 0 && !isActivelyPlaying
    : false;

  // Actions
  const handleSit = (seatIndex: number) => {
    if (!socket) return;
    socket.emit('sit', { seatIndex, playerName });
  };

  const handleLeaveSeat = () => {
    if (!socket) return;
    socket.emit('leaveSeat');
  };

  const handlePlayerAction = (action: 'FOLD' | 'CHECK' | 'CALL' | 'RAISE', amount?: number) => {
    if (!socket) return;
    socket.emit('playerAction', { action, amount });
  };

  const handleRebuy = () => {
    if (!socket) return;
    socket.emit('rebuy');
  };

  const handleAddBot = () => {
    if (!socket) return;
    socket.emit('addBot');
  };

  const handleKickBot = (seatIndex: number) => {
    if (!socket) return;
    socket.emit('kickBot', { seatIndex });
  };

  const handleTipPlayer = (targetSeatIndex: number, amount: number) => {
    if (!socket) return;
    socket.emit('tipPlayer', { targetSeatIndex, amount });
  };

  const handleToggleReady = () => {
    if (!socket) return;
    soundEffects.playCheckSound();
    socket.emit('toggleReady');
  };

  const handleSendMessage = (message: string) => {
    if (!socket) return;
    socket.emit('sendChat', { message, senderName: playerName });
  };

  const handleUpdatePlayerName = (newName: string) => {
    setPlayerName(newName);
    localStorage.setItem('poker_player_name', newName);
    showToast(`Nama disimpan: ${newName}`);
  };

  const handleChangeRoom = (newRoom: string) => {
    const clean = newRoom.trim().toLowerCase();
    if (voiceState === 'connected' || voiceState === 'connecting') {
      voiceChat.leave();
      voiceChat.join(clean, playerName);
    }
    setRoomId(clean);
    window.history.pushState({}, '', `?view=table&room=${clean}`);
    showToast(`Berpindah ke meja: ${clean.toUpperCase()}`);
  };

  const handleReturnToLounge = () => {
    if (isSeated) {
      handleLeaveSeat();
    }
    voiceChat.leave();
    setViewMode('lobby');
    window.history.pushState({}, '', `?view=lobby&room=${roomId}`);
    showToast('Kembali ke Ruangan Lounge 3D');
  };

  if (viewMode === 'lobby') {
    return (
      <div className="flex flex-col min-h-screen relative overflow-hidden">
        <Lobby3D
          socket={socket}
          playerName={playerName}
          onUpdatePlayerName={handleUpdatePlayerName}
          onSelectTable={(selectedRoomId) => {
            handleChangeRoom(selectedRoomId);
            setViewMode('table');
          }}
          isBgmPlaying={isBgmPlaying}
          onToggleBgm={handleToggleBgm}
          initialTableId={roomId}
        />
        {toast && (
          <div className="toast-popup">
            {toast}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden">
      {/* Top Header Bar */}
      <header className="top-bar">
        <div className="brand-badge">
          <span className="brand-logo">♠</span>
          <div>
            <h1 className="brand-title">Texas Hold'em</h1>
            <div className="brand-sub">VIP Online Lounge • Modal Rp 100.000</div>
          </div>
        </div>

        <div className="top-actions">
          {/* Tokyo Drift BGM Controller */}
          <button
            onClick={handleToggleBgm}
            className={`btn-pill ${isBgmPlaying ? 'btn-pill-gold' : 'btn-pill-dark'}`}
            title={isBgmPlaying ? 'Jeda Musik (Tokyo Drift - Teriyaki Boyz)' : 'Putar Musik (Tokyo Drift - Teriyaki Boyz)'}
          >
            {isBgmPlaying ? (
              <>
                <Music size={14} className="text-amber-300 animate-pulse" />
                <span className="hidden sm:inline">Tokyo Drift 🎵</span>
                <span className="music-bars">
                  <span className="bar bar-1"></span>
                  <span className="bar bar-2"></span>
                  <span className="bar bar-3"></span>
                </span>
              </>
            ) : (
              <>
                <VolumeX size={14} className="text-slate-400" />
                <span className="hidden sm:inline">Musik: OFF</span>
              </>
            )}
          </button>

          {/* Voice Chat On-Mic Button */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={handleToggleMic}
              className={`btn-pill ${
                voiceState === 'connected'
                  ? isMicMuted
                    ? 'btn-pill-dark'
                    : 'btn-pill-emerald'
                  : voiceState === 'connecting'
                  ? 'btn-pill-gold'
                  : 'btn-pill-dark'
              }`}
              style={
                voiceState === 'connected' && !isMicMuted && speakingPeers.has('local')
                  ? { boxShadow: '0 0 16px rgba(16, 185, 129, 0.8)', borderColor: '#34d399' }
                  : undefined
              }
              title={
                voiceState === 'disconnected'
                  ? 'Nyalakan Mikrofon (On-Mic bersama teman di meja ini)'
                  : isMicMuted
                  ? 'Buka Mute Mikrofon'
                  : 'Mute Mikrofon'
              }
            >
              {voiceState === 'connecting' ? (
                <>
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid #f59e0b',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }}
                  />
                  <span className="hidden sm:inline">Menghubungkan...</span>
                </>
              ) : voiceState === 'connected' ? (
                isMicMuted ? (
                  <>
                    <MicOff size={14} color="#f87171" />
                    <span className="hidden sm:inline" style={{ color: '#fca5a5' }}>Mic: Muted</span>
                  </>
                ) : (
                  <>
                    <Mic size={14} color="#a7f3d0" className="animate-pulse" />
                    <span className="hidden sm:inline">On-Mic ({voicePeers.length + 1})</span>
                    <span className="music-bars">
                      <span className="bar bar-1" style={{ background: '#a7f3d0' }}></span>
                      <span className="bar bar-2" style={{ background: '#a7f3d0' }}></span>
                      <span className="bar bar-3" style={{ background: '#a7f3d0' }}></span>
                    </span>
                  </>
                )
              ) : (
                <>
                  <Mic size={14} className="text-slate-400" />
                  <span className="hidden sm:inline">On-Mic</span>
                </>
              )}
            </button>

            {/* Deafen (Mute Peers) Button */}
            {voiceState === 'connected' && (
              <button
                onClick={handleToggleDeafen}
                className={`btn-pill ${isDeafened ? 'btn-pill-rose' : 'btn-pill-dark'}`}
                title={isDeafened ? 'Buka Suara Teman' : 'Bisukan Suara Teman'}
                style={{ padding: '8px 10px' }}
              >
                {isDeafened ? <VolumeX size={14} color="#fca5a5" /> : <Volume2 size={14} color="#94a3b8" />}
              </button>
            )}

            {/* Disconnect Voice Button */}
            {voiceState === 'connected' && (
              <button
                onClick={handleDisconnectVoice}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#94a3b8',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
                title="Matikan Voice Chat"
              >
                ✕
              </button>
            )}
          </div>

          {/* Add Bot Button */}
          <button
            onClick={handleAddBot}
            className="btn-pill btn-pill-dark"
            title="Tambah Bot AI untuk bermain sekarang"
          >
            <Bot size={15} className="text-purple-400" />
            <span className="hidden sm:inline">+ Bot AI</span>
          </button>

          {/* Quick Rebuy Button if chips empty */}
          {canRebuy && (
            <button
              onClick={handleRebuy}
              className="btn-pill btn-pill-gold animate-bounce"
            >
              <RefreshCw size={14} />
              <span>Isi Ulang Rp 100.000</span>
            </button>
          )}

          {/* Return to 3D Lounge Button */}
          <button
            onClick={handleReturnToLounge}
            className="btn-pill btn-pill-gold"
            title="Keluar ke Ruangan Lounge 3D"
          >
            <Compass size={15} />
            <span className="hidden sm:inline">Keluar Room</span>
          </button>

          {/* Table Settings / Invite Modal Toggle */}
          <button
            onClick={() => setIsLobbyOpen(true)}
            className="btn-pill btn-pill-gold"
          >
            <Share2 size={15} />
            <span className="hidden sm:inline">Meja: {roomId.toUpperCase()}</span>
            <Settings size={14} className="sm:hidden" />
          </button>
        </div>
      </header>

      {/* Main Poker Arena */}
      <main className="poker-arena">
        {tableState ? (
          <div className="table-outer-container">
            {/* Outer Wood / Leather Border */}
            <div className="table-wood-rim">
              {/* Inner Green Felt */}
              <div className="table-felt">
                <div className="table-watermark">POKER INDONESIA</div>

                {/* Community Board in the center */}
                <CommunityBoard
                  communityCards={tableState.communityCards}
                  pot={tableState.pot}
                  stage={tableState.stage}
                  winners={tableState.winners}
                  seats={tableState.seats}
                  waitingCountdown={tableState.waitingCountdown}
                />

                {/* 8 Elliptical Seats */}
                {SEAT_COORDINATES.map((coords, seatIdx) => {
                  const player = tableState.seats[seatIdx] ?? null;
                  const isMe = socket ? player?.id === socket.id : false;
                  const isActiveTurn = tableState.activeSeat === seatIdx;
                  const isDealer = tableState.dealerSeat === seatIdx;
                  const isSmallBlind = tableState.smallBlindSeat === seatIdx;
                  const isBigBlind = tableState.bigBlindSeat === seatIdx;

                  // Check if this seat won
                  const winInfo = tableState.winners?.find(w => w.seatIndex === seatIdx);

                  // Tip effect for this seat
                  let tipEffect: { type: 'sent' | 'received'; amount: number; phrase?: string } | null = null;
                  if (recentTip) {
                    if (recentTip.toSeat === seatIdx) {
                      tipEffect = { type: 'received', amount: recentTip.amount, phrase: recentTip.phrase };
                    } else if (recentTip.fromSeat === seatIdx) {
                      tipEffect = { type: 'sent', amount: recentTip.amount };
                    }
                  }

                  // Voice speaking state check for this player
                  const isSeatSpeaking = player
                    ? isMe
                      ? speakingPeers.has('local') || (socket?.id ? speakingPeers.has(socket.id) : false) || speakingPeers.has(player.id)
                      : speakingPeers.has(player.id)
                    : false;

                  return (
                    <PlayerSeat
                      key={seatIdx}
                      seatIndex={seatIdx}
                      player={player}
                      isMe={isMe}
                      isMeSeated={isSeated}
                      myCards={isMe ? myCards : []}
                      stage={tableState.stage}
                      isActiveTurn={isActiveTurn}
                      turnTimeRemaining={tableState.turnTimeRemaining}
                      turnDuration={tableState.turnDuration}
                      isDealer={isDealer}
                      isSmallBlind={isSmallBlind}
                      isBigBlind={isBigBlind}
                      isWinner={Boolean(winInfo)}
                      winningHandName={winInfo?.handName}
                      tipEffect={tipEffect}
                      isSpeaking={isSeatSpeaking}
                      onSit={handleSit}
                      onKickBot={handleKickBot}
                      onTip={handleTipPlayer}
                      stylePosition={coords}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
            <p className="text-sm font-semibold">Menghubungkan ke server meja poker...</p>
          </div>
        )}
      </main>

      {/* Prominent READY Button for Seated Player in WAITING or SHOWDOWN stage */}
      {tableState && isSeated && (tableState.stage === 'WAITING' || tableState.stage === 'SHOWDOWN') && myPlayer && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 35 }}>
          <button
            onClick={handleToggleReady}
            style={{
              padding: '14px 34px',
              borderRadius: '999px',
              fontSize: '15px',
              fontWeight: 900,
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: myPlayer.isReady
                ? '0 10px 30px rgba(245, 158, 11, 0.5)'
                : '0 10px 35px rgba(16, 185, 129, 0.6)',
              background: myPlayer.isReady
                ? 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)'
                : 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
              color: myPlayer.isReady ? '#0f172a' : '#ffffff',
              border: `2px solid ${myPlayer.isReady ? '#fef08a' : '#a7f3d0'}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {myPlayer.isReady ? <CheckCircle2 size={20} /> : <Play size={20} />}
            <span>
              {myPlayer.isReady
                ? tableState.waitingCountdown
                  ? `SUDAH READY (Mulai dlm ${tableState.waitingCountdown}s)`
                  : 'SUDAH READY (Klik untuk Batal)'
                : tableState.waitingCountdown
                ? `SIAP BERMAIN (Mulai dlm ${tableState.waitingCountdown}s)`
                : 'SIAP BERMAIN (KLIK READY)'}
            </span>
          </button>
        </div>
      )}

      {/* Floating Action Console for Active Player during hand */}
      {tableState && isSeated && isMyTurn && myPlayer && tableState.stage !== 'WAITING' && (
        <ActionControls
          myPlayer={myPlayer}
          currentHighestBet={tableState.currentHighestBet}
          minRaise={tableState.minRaise}
          pot={tableState.pot}
          bigBlind={tableState.bigBlind}
          onAction={handlePlayerAction}
        />
      )}

      {/* Status Bar for Spectator or Seated Player Waiting Turn during hand */}
      {tableState && tableState.stage !== 'WAITING' && (!isSeated || !isMyTurn) && (
        <div className="status-capsule">
          {!isSeated ? (
            <>
              <Sparkles size={16} color="#f59e0b" />
              <span>
                Anda adalah <strong style={{ color: '#fff' }}>Penonton</strong>. Klik salah satu kursi kosong bertanda <strong style={{ color: '#34d399' }}>+ Duduk</strong> untuk mulai bermain!
              </span>
            </>
          ) : myPlayer?.waitingNextHand ? (
            <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>
              ⏳ Anda sudah duduk di meja! Mohon menunggu ronde saat ini selesai untuk ikut bermain di ronde berikutnya.
            </span>
          ) : myPlayer?.folded ? (
            <span style={{ color: '#f87171', fontWeight: 'bold' }}>
              Anda telah FOLD pada ronde ini. Menunggu ronde berikutnya...
            </span>
          ) : myPlayer?.isAllIn ? (
            <span style={{ color: '#fcd34d', fontWeight: 'bold' }}>
              Anda sedang ALL-IN! Kartu akan dibuka saat Showdown.
            </span>
          ) : (
            <span>
              Menunggu giliran:{' '}
              <strong style={{ color: '#fcd34d' }}>
                {tableState.activeSeat !== null && tableState.seats[tableState.activeSeat]
                  ? tableState.seats[tableState.activeSeat]?.name
                  : 'Dealer'}
              </strong>
            </span>
          )}
        </div>
      )}

      {/* Status Bar for Spectator when table is WAITING */}
      {tableState && tableState.stage === 'WAITING' && !isSeated && (
        <div className="status-capsule">
          <Sparkles size={16} color="#f59e0b" />
          <span>
            Anda adalah <strong style={{ color: '#fff' }}>Penonton</strong>. Klik salah satu kursi kosong bertanda <strong style={{ color: '#34d399' }}>+ Duduk</strong> untuk mulai bermain!
          </span>
        </div>
      )}

      {/* Floating Chat Notifications on the right side */}
      <FloatingChatFeed
        items={floatingChats}
        onDismiss={handleDismissFloatingChat}
        onOpenChat={() => setIsChatOpen(true)}
      />

      {/* Floating Chat & Dealer Log Drawer */}
      <ChatPanel
        messages={messages}
        onSendMessage={handleSendMessage}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
      />

      {/* Lobby & Settings Modal */}
      <LobbyModal
        isOpen={isLobbyOpen}
        onClose={() => setIsLobbyOpen(false)}
        roomId={roomId}
        playerName={playerName}
        onUpdatePlayerName={handleUpdatePlayerName}
        onChangeRoom={handleChangeRoom}
        onAddBot={handleAddBot}
        onRebuy={handleRebuy}
        onLeaveSeat={handleLeaveSeat}
        onReturnToLounge={handleReturnToLounge}
        isSeated={isSeated}
        canRebuy={canRebuy}
      />

      {/* Toast Popup Notification */}
      {toast && (
        <div className="toast-popup">
          {toast}
        </div>
      )}
    </div>
  );
};

export default App;
