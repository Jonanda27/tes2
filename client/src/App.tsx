import React, { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import confetti from 'canvas-confetti';
import { Card, ChatMessage, TableStatePublic, WalletRecord } from './types.js';
import { PlayerSeat } from './components/PlayerSeat.js';
import { CommunityBoard } from './components/CommunityBoard.js';
import { ActionControls } from './components/ActionControls.js';
import { ChatPanel } from './components/ChatPanel.js';
import { FloatingChatFeed, FloatingChatItem } from './components/FloatingChatFeed.js';
import { FlyingChipLayer, FlyingChipEvent } from './components/FlyingChipLayer.js';
import { LobbyModal } from './components/LobbyModal.js';
import { BuyInModal } from './components/BuyInModal.js';
import { Lobby3D } from './components/Lobby3D.js';
import { RouletteGame } from './components/RouletteGame.js';
import { SlotMachineGame } from './components/SlotMachineGame.js';
import { CrashGame } from './components/CrashGame.js';
import { BlackjackGame } from './components/BlackjackGame.js';
import { soundEffects } from './utils/soundEffects.js';
import { evaluateLiveHandStrength } from './utils/handStrength.js';
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
  MicOff,
  LogOut
} from 'lucide-react';

const SEAT_COORDINATES = [
  { top: '10%', left: '50%' },  // 0: Top Center (#1)
  { top: '18%', left: '80%' },  // 1: Top Right (#2)
  { top: '52%', left: '92%' },  // 2: Far Right (#3)
  { top: '85%', left: '80%' },  // 3: Bottom Right (#4)
  { top: '92%', left: '50%' },  // 4: Bottom Center (#5)
  { top: '85%', left: '20%' },  // 5: Bottom Left (#6)
  { top: '52%', left: '8%' },   // 6: Far Left (#7)
  { top: '18%', left: '20%' },  // 7: Top Left (#8)
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
    const saved = localStorage.getItem('poker_player_name');
    if (saved) return saved;
    const generated = `Pemain #${Math.floor(100 + Math.random() * 900)}`;
    localStorage.setItem('poker_player_name', generated);
    return generated;
  });

  // Persistent Wallet ID & Balance (Starts with Rp 1.000.000)
  const [walletId] = useState<string>(() => {
    const saved = localStorage.getItem('poker_wallet_id');
    if (saved) return saved;
    const generated = `w_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem('poker_wallet_id', generated);
    return generated;
  });

  const [walletBalance, setWalletBalance] = useState<number>(() => {
    const saved = localStorage.getItem('poker_wallet_balance');
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        // Upgrade legacy 100.000 initial default to Rp 1.000.000
        if (parsed === 100000) {
          localStorage.setItem('poker_wallet_balance', '1000000');
          return 1000000;
        }
        return parsed;
      }
    }
    localStorage.setItem('poker_wallet_balance', '1000000');
    return 1000000;
  });

  const [walletWins, setWalletWins] = useState<number>(() => {
    const saved = localStorage.getItem('poker_wallet_wins');
    return saved !== null ? parseInt(saved, 10) || 0 : 0;
  });

  const [leaderboard, setLeaderboard] = useState<WalletRecord[]>([]);

  // View mode: 'lobby' (3D room with character), 'table' (poker game table), 'roulette' (European Roulette), 'slot' (777 Slot Machine), 'crash' (Aviator Rocket), or 'blackjack' (21 vs Dealer)
  const [viewMode, setViewMode] = useState<'lobby' | 'table' | 'roulette' | 'slot' | 'crash' | 'blackjack'>(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('view');
    return v === 'table' ? 'table' : v === 'roulette' ? 'roulette' : v === 'slot' ? 'slot' : v === 'crash' ? 'crash' : v === 'blackjack' ? 'blackjack' : 'lobby';
  });

  // Voice Chat (On-Mic WebRTC) State
  const [voiceState, setVoiceState] = useState<VoiceConnectionState>('disconnected');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [speakingPeers, setSpeakingPeers] = useState<Set<string>>(new Set());
  const [voicePeers, setVoicePeers] = useState<VoicePeer[]>([]);

  // UI state
  const [isLobbyOpen, setIsLobbyOpen] = useState(false);
  const [buyInModal, setBuyInModal] = useState<{
    isOpen: boolean;
    mode: 'sit' | 'topup';
    seatIndex: number;
  }>({ isOpen: false, mode: 'sit', seatIndex: 0 });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatFocusTrigger, setChatFocusTrigger] = useState(0);
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

  // Flying chips animation particles
  const [flyingChips, setFlyingChips] = useState<FlyingChipEvent[]>([]);
  const handleFinishFlyingChip = useCallback((id: string) => {
    setFlyingChips(prev => prev.filter(c => c.id !== id));
  }, []);

  const prevActiveSeatRef = useRef<number | null>(null);
  const prevStageRef = useRef<string | null>(null);
  const prevBetsRef = useRef<(number | null)[]>([]);
  const viewModeRef = useRef(viewMode);
  const roomIdRef = useRef(roomId);
  const playerNameRef = useRef(playerName);
  const walletIdRef = useRef(walletId);
  const walletBalanceRef = useRef(walletBalance);
  const tableStateRef = useRef<TableStatePublic | null>(tableState);

  viewModeRef.current = viewMode;
  roomIdRef.current = roomId;
  playerNameRef.current = playerName;
  walletIdRef.current = walletId;
  walletBalanceRef.current = walletBalance;
  tableStateRef.current = tableState;

  // Show toast notification
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleDismissFloatingChat = useCallback((id: string) => {
    setFloatingChats(prev => prev.filter(c => c.id !== id));
  }, []);

  // Keyboard shortcut: Press Enter while in poker table to immediately open & focus chat
  useEffect(() => {
    if (viewMode !== 'table' || isLobbyOpen) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;

      const activeEl = document.activeElement as HTMLElement | null;
      const isTypingInField =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.isContentEditable);

      if (e.key === 'Enter' && !isTypingInField) {
        e.preventDefault();
        e.stopPropagation();
        setIsChatOpen(true);
        setChatFocusTrigger(prev => prev + 1);
      } else if (e.key === 'Escape' && isChatOpen) {
        e.preventDefault();
        setIsChatOpen(false);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
    };
  }, [viewMode, isLobbyOpen, isChatOpen]);

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
      showToast('Menghubungkan ke audio meja...');
      const success = await voiceChat.join(roomId, playerName);
      if (success) {
        setIsMicMuted(false);
        showToast('🎙️ Mikrofon aktif! Anda sekarang on-mic.');
      }
    } else if (!voiceChat.hasMic()) {
      showToast('Mengaktifkan mikrofon...');
      const success = await voiceChat.enableMic();
      if (success) {
        setIsMicMuted(false);
        showToast('🎙️ Mikrofon aktif! Semua pemain di meja sekarang bisa mendengar Anda.');
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

  // 1. Socket initialization (persistent single socket connection)
  useEffect(() => {
    const serverUrl = import.meta.env.VITE_SERVER_URL || '';
    const s = io(serverUrl || undefined, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 500
    });

    s.on('connect', () => {
      voiceChat.init(s);
      s.emit('wallet:sync', {
        walletId: walletIdRef.current,
        name: playerNameRef.current,
        clientCachedBalance: walletBalanceRef.current
      });
      if (viewModeRef.current === 'table') {
        s.emit('joinRoom', {
          roomId: roomIdRef.current,
          playerName: playerNameRef.current,
          walletId: walletIdRef.current,
          clientCachedBalance: walletBalanceRef.current
        });
      }
    });

    s.on('wallet:updated', (record: WalletRecord) => {
      if (record && typeof record.balance === 'number') {
        setWalletBalance(record.balance);
        localStorage.setItem('poker_wallet_balance', String(record.balance));
      }
      if (record && typeof record.wins === 'number') {
        setWalletWins(record.wins);
        localStorage.setItem('poker_wallet_wins', String(record.wins));
      }
    });

    s.on(
      'wallet:cashed-out',
      ({ cashedOutChips, newWalletBalance }: { cashedOutChips: number; newWalletBalance: number }) => {
        if (typeof newWalletBalance === 'number') {
          setWalletBalance(newWalletBalance);
          localStorage.setItem('poker_wallet_balance', String(newWalletBalance));
        }
        if (cashedOutChips > 0) {
          showToast(
            `💰 Cash-Out: Rp ${cashedOutChips.toLocaleString('id-ID')} masuk ke Dompet (Total: Rp ${newWalletBalance.toLocaleString('id-ID')})`
          );
        }
      }
    );

    s.on('leaderboard:updated', (list: WalletRecord[]) => {
      if (Array.isArray(list)) {
        setLeaderboard(list);
      }
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
  }, []);

  // 1b. Immediately join/sync table whenever entering 'table' view or changing roomId
  useEffect(() => {
    if (!socket || viewMode !== 'table') return;

    const joinCurrentTable = () => {
      if (socket.connected) {
        socket.emit('joinRoom', {
          roomId,
          playerName: playerNameRef.current,
          walletId: walletIdRef.current,
          clientCachedBalance: walletBalanceRef.current
        });
      }
    };

    // Emit immediately when entering table or switching room
    joinCurrentTable();

    // Automatically connect to room voice channel so user can hear everyone at the table immediately
    voiceChat.connect(roomId, playerNameRef.current);

    // Fast fallback retry if tableState hasn't loaded or doesn't match target roomId yet
    const retryInterval = setInterval(() => {
      const currentTable = tableStateRef.current;
      if (!currentTable || currentTable.roomId?.toLowerCase() !== roomId.toLowerCase()) {
        joinCurrentTable();
      }
    }, 600);

    return () => clearInterval(retryInterval);
  }, [socket, viewMode, roomId]);

  // 2. Audio, Flying Chips, & Confetti reactive effects
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

    // Bet flying chip animations from player seats towards center pot
    if (tableState.stage !== 'WAITING' && tableState.stage !== 'SHOWDOWN') {
      tableState.seats.forEach((seat, idx) => {
        const curBet = seat?.currentBet || 0;
        const prevBet = prevBetsRef.current[idx] || 0;
        if (curBet > prevBet) {
          const diff = curBet - prevBet;
          const chipCount = Math.min(5, Math.max(1, Math.ceil(diff / 5000)));
          setFlyingChips(prev => [
            ...prev,
            {
              id: `bet-${idx}-${Date.now()}-${Math.random()}`,
              type: 'bet',
              from: SEAT_COORDINATES[idx],
              to: { top: '44%', left: '50%' },
              count: chipCount,
              color: diff >= 50000 ? 'gold' : 'green'
            }
          ]);
        }
        prevBetsRef.current[idx] = curBet;
      });
    } else {
      prevBetsRef.current = tableState.seats.map(s => s?.currentBet || 0);
    }

    // Showdown fanfare, pot splash audio, multi-burst confetti, & pot-to-winner chip cascade
    if (tableState.stage === 'SHOWDOWN' && prevStageRef.current !== 'SHOWDOWN') {
      soundEffects.playWinFanfare();
      soundEffects.playPotSplash();

      // Multi-stage celebratory confetti
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#f59e0b', '#fbbf24', '#fef08a', '#10b981', '#3b82f6', '#ffffff']
      });

      setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 110,
          origin: { y: 0.45 },
          colors: ['#ffd700', '#f59e0b', '#ffffff']
        });
      }, 240);

      // Cascading chips flying from center pot to winner seat(s)
      if (tableState.winners && tableState.winners.length > 0) {
        tableState.winners.forEach((winner, wIdx) => {
          if (winner.seatIndex >= 0 && winner.seatIndex < SEAT_COORDINATES.length) {
            setTimeout(() => {
              const chipCount = Math.min(10, Math.max(5, Math.ceil(winner.amount / 15000)));
              setFlyingChips(prev => [
                ...prev,
                {
                  id: `win-${winner.seatIndex}-${Date.now()}-${Math.random()}`,
                  type: 'pot-splash',
                  from: { top: '44%', left: '50%' },
                  to: SEAT_COORDINATES[winner.seatIndex],
                  count: chipCount,
                  color: 'gold'
                }
              ]);
            }, wIdx * 150);
          }
        });
      }
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
  const myLiveHandStrength =
    isSeated && myCards.length >= 2 && tableState && tableState.stage !== 'WAITING'
      ? evaluateLiveHandStrength(myCards, tableState.communityCards)
      : null;

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
    if (isSeated) {
      showToast('Anda sudah duduk di kursi.');
      return;
    }
    setBuyInModal({ isOpen: true, mode: 'sit', seatIndex });
  };

  const handleConfirmBuyIn = (buyInAmount: number) => {
    if (!socket) return;
    const cleanAmount = Math.max(1000, Math.floor(buyInAmount));

    if (buyInModal.mode === 'sit') {
      const nextWallet = Math.max(0, walletBalance - cleanAmount);
      setWalletBalance(nextWallet);
      localStorage.setItem('poker_wallet_balance', String(nextWallet));

      socket.emit('sit', {
        seatIndex: buyInModal.seatIndex,
        playerName,
        walletId,
        clientCachedBalance: walletBalance,
        buyInAmount: cleanAmount
      });
      setBuyInModal(prev => ({ ...prev, isOpen: false }));
      showToast(
        `🎯 Duduk di Kursi #${buyInModal.seatIndex + 1} membawa modal Rp ${cleanAmount.toLocaleString('id-ID')}`
      );
    } else {
      const nextWallet = Math.max(0, walletBalance - cleanAmount);
      setWalletBalance(nextWallet);
      localStorage.setItem('poker_wallet_balance', String(nextWallet));

      socket.emit('rebuy', { buyInAmount: cleanAmount });
      setBuyInModal(prev => ({ ...prev, isOpen: false }));
      showToast(`💰 Menambah modal +Rp ${cleanAmount.toLocaleString('id-ID')} ke kursi`);
    }
  };

  const handleLeaveSeat = () => {
    if (!socket) return;
    if (!isSeated) {
      showToast('Anda belum duduk di kursi manapun.');
      return;
    }
    const currentTableChips = myPlayer?.chips || 0;
    if (currentTableChips > 0) {
      const nextWallet = walletBalance + currentTableChips;
      setWalletBalance(nextWallet);
      localStorage.setItem('poker_wallet_balance', String(nextWallet));
    }
    socket.emit('leaveSeat');
    showToast(
      currentTableChips > 0
        ? `💰 Berdiri dari kursi. Rp ${currentTableChips.toLocaleString('id-ID')} dikembalikan ke Dompet!`
        : 'Anda berdiri dari kursi dan menjadi penonton.'
    );
  };

  const handlePlayerAction = (action: 'FOLD' | 'CHECK' | 'CALL' | 'RAISE', amount?: number) => {
    if (!socket) return;
    socket.emit('playerAction', { action, amount });
  };

  const handleRebuy = () => {
    if (!socket) return;
    setBuyInModal({
      isOpen: true,
      mode: 'topup',
      seatIndex: mySeatIndex !== -1 ? mySeatIndex : 0
    });
  };

  const handleClaimRelief = () => {
    const newBal = 1000000;
    setWalletBalance(newBal);
    localStorage.setItem('poker_wallet_balance', String(newBal));
    if (socket) {
      socket.emit('wallet:claim-relief', { walletId, name: playerName });
    }
    showToast('🎁 Bantuan modal Rp 1.000.000 berhasil diklaim ke Dompet!');
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
    if (socket) {
      socket.emit('wallet:sync', {
        walletId,
        name: newName,
        clientCachedBalance: walletBalance
      });
    }
    showToast(`Nama disimpan: ${newName}`);
  };

  const handleChangeRoom = (newRoom: string) => {
    const clean = newRoom.trim().toLowerCase();
    if (isSeated && clean !== roomId) {
      handleLeaveSeat();
    }
    if (voiceState === 'connected' || voiceState === 'connecting') {
      voiceChat.leave();
      voiceChat.join(clean, playerName);
    }
    if (clean !== roomId) {
      setTableState(prev => (prev?.roomId?.toLowerCase() === clean ? prev : null));
      setMyCards([]);
      setMessages([]);
      setFloatingChats([]);
    }
    setRoomId(clean);
    if (socket) {
      socket.emit('joinRoom', {
        roomId: clean,
        playerName,
        walletId,
        clientCachedBalance: walletBalance
      });
    }
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
          walletId={walletId}
          walletBalance={walletBalance}
          walletWins={walletWins}
          leaderboard={leaderboard}
          onClaimRelief={handleClaimRelief}
          onUpdatePlayerName={handleUpdatePlayerName}
          onSelectTable={(selectedRoomId) => {
            handleChangeRoom(selectedRoomId);
            setViewMode('table');
          }}
          onSelectRoulette={() => {
            setViewMode('roulette');
            window.history.pushState({}, '', '?view=roulette');
          }}
          onSelectSlots={() => {
            setViewMode('slot');
            window.history.pushState({}, '', '?view=slot');
          }}
          onSelectCrash={() => {
            setViewMode('crash');
            window.history.pushState({}, '', '?view=crash');
          }}
          onSelectBlackjack={() => {
            setViewMode('blackjack');
            window.history.pushState({}, '', '?view=blackjack');
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

  if (viewMode === 'roulette') {
    return (
      <div className="flex flex-col min-h-screen relative overflow-hidden">
        <RouletteGame
          walletBalance={walletBalance}
          playerName={playerName}
          onUpdateBalance={(newBal) => {
            setWalletBalance(newBal);
            localStorage.setItem('poker_wallet_balance', String(newBal));
          }}
          onClose={() => {
            setViewMode('lobby');
            window.history.pushState({}, '', `?view=lobby&room=${roomId}`);
            showToast('Kembali ke Ruangan Lounge 3D');
          }}
          isBgmPlaying={isBgmPlaying}
          onToggleBgm={handleToggleBgm}
        />
        {toast && (
          <div className="toast-popup">
            {toast}
          </div>
        )}
      </div>
    );
  }

  if (viewMode === 'slot') {
    return (
      <div className="flex flex-col min-h-screen relative overflow-hidden">
        <SlotMachineGame
          walletBalance={walletBalance}
          playerName={playerName}
          onUpdateBalance={(newBal) => {
            setWalletBalance(newBal);
            localStorage.setItem('poker_wallet_balance', String(newBal));
          }}
          onClose={() => {
            setViewMode('lobby');
            window.history.pushState({}, '', `?view=lobby&room=${roomId}`);
            showToast('Kembali ke Ruangan Lounge 3D');
          }}
          isBgmPlaying={isBgmPlaying}
          onToggleBgm={handleToggleBgm}
        />
        {toast && (
          <div className="toast-popup">
            {toast}
          </div>
        )}
      </div>
    );
  }

  if (viewMode === 'crash') {
    return (
      <div className="flex flex-col min-h-screen relative overflow-hidden">
        <CrashGame
          walletBalance={walletBalance}
          playerName={playerName}
          onUpdateWallet={(newBal) => {
            setWalletBalance(newBal);
            localStorage.setItem('poker_wallet_balance', String(newBal));
          }}
          onBackToLobby={() => {
            setViewMode('lobby');
            window.history.pushState({}, '', `?view=lobby&room=${roomId}`);
            showToast('Kembali ke Ruangan Lounge 3D');
          }}
        />
        {toast && (
          <div className="toast-popup">
            {toast}
          </div>
        )}
      </div>
    );
  }

  if (viewMode === 'blackjack') {
    return (
      <div className="flex flex-col min-h-screen relative overflow-hidden">
        <BlackjackGame
          walletBalance={walletBalance}
          playerName={playerName}
          onUpdateWallet={(newBal) => {
            setWalletBalance(newBal);
            localStorage.setItem('poker_wallet_balance', String(newBal));
          }}
          onBackToLobby={() => {
            setViewMode('lobby');
            window.history.pushState({}, '', `?view=lobby&room=${roomId}`);
            showToast('Kembali ke Ruangan Lounge 3D');
          }}
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
    <div className="poker-screen-root">
      {/* Top Header Bar */}
      <header className="top-bar">
        <div className="brand-badge">
          <span className="brand-logo">♠</span>
          <div>
            <h1 className="brand-title">Texas Hold'em</h1>
            <div className="brand-sub">
              {playerName} • 🏦 Dompet: Rp {walletBalance.toLocaleString('id-ID')}
              {isSeated && myPlayer ? ` • 🎯 Di Meja: Rp ${myPlayer.chips.toLocaleString('id-ID')}` : ''}
            </div>
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
                  ? voiceChat.hasMic() && !isMicMuted
                    ? 'btn-pill-emerald'
                    : isMicMuted
                    ? 'btn-pill-rose'
                    : 'btn-pill-dark'
                  : voiceState === 'connecting'
                  ? 'btn-pill-gold'
                  : 'btn-pill-dark'
              }`}
              style={
                voiceState === 'connected' && voiceChat.hasMic() && !isMicMuted && speakingPeers.has('local')
                  ? { boxShadow: '0 0 16px rgba(16, 185, 129, 0.8)', borderColor: '#34d399' }
                  : undefined
              }
              title={
                voiceState === 'disconnected'
                  ? 'Nyalakan Mikrofon (On-Mic bersama teman di meja ini)'
                  : !voiceChat.hasMic()
                  ? 'Klik untuk mengaktifkan mikrofon Anda (On-Mic)'
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
                !voiceChat.hasMic() ? (
                  <>
                    <Mic size={14} className="text-amber-400" />
                    <span className="hidden sm:inline">Aktifkan Mic</span>
                  </>
                ) : isMicMuted ? (
                  <>
                    <MicOff size={14} color="#fca5a5" />
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

          {/* Quick Top-Up / Rebuy Button from Wallet when seated and not in active hand */}
          {isSeated && !isActivelyPlaying && (canRebuy || walletBalance >= 20000) && (
            <button
              onClick={handleRebuy}
              className={`btn-pill btn-pill-gold ${canRebuy ? 'animate-bounce' : ''}`}
              title="Ambil modal tambahan dari Saldo Dompet ke kursi Anda"
            >
              <RefreshCw size={14} />
              <span className="hidden sm:inline">{canRebuy ? 'Isi Modal Kursi' : '+ Modal Kursi'}</span>
            </button>
          )}

          {/* Stand Up from Seat Button directly on Poker Page */}
          <button
            onClick={handleLeaveSeat}
            className={`btn-pill ${isSeated ? 'btn-pill-rose' : 'btn-pill-dark'}`}
            style={!isSeated ? { opacity: 0.65 } : undefined}
            title={
              isSeated
                ? 'Berdiri dari Kursi (Menjadi Penonton)'
                : 'Anda belum duduk di kursi (Klik + Duduk pada kursi meja)'
            }
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Berdiri dari Kursi</span>
          </button>

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

                {/* Flying Chip Animation Layer */}
                <FlyingChipLayer
                  events={flyingChips}
                  onFinishEvent={handleFinishFlyingChip}
                />

                {/* Community Board in the center */}
                <CommunityBoard
                  communityCards={tableState.communityCards}
                  pot={tableState.pot}
                  stage={tableState.stage}
                  winners={tableState.winners}
                  seats={tableState.seats}
                  waitingCountdown={tableState.waitingCountdown}
                  highlightedCards={
                    tableState.stage !== 'SHOWDOWN' &&
                    !myPlayer?.folded &&
                    myLiveHandStrength &&
                    myLiveHandStrength.category >= 1
                      ? myLiveHandStrength.matchingCards
                      : undefined
                  }
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
                  const seatWinningCards = winInfo?.winningCards || (tableState.winners ? tableState.winners.flatMap(w => w.winningCards || []) : undefined);

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
                      ? speakingPeers.has('local') ||
                        (socket?.id ? speakingPeers.has(socket.id) : false) ||
                        speakingPeers.has(player.id) ||
                        speakingPeers.has(playerName.trim().toLowerCase())
                      : speakingPeers.has(player.id) ||
                        speakingPeers.has(player.name.trim().toLowerCase())
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
                      winningCards={seatWinningCards}
                      liveHandStrength={isMe ? myLiveHandStrength : null}
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
        <div style={{ position: 'fixed', bottom: '24px', left: '22px', width: '236px', zIndex: 35 }}>
          <button
            onClick={handleToggleReady}
            style={{
              width: '100%',
              padding: '16px 16px',
              borderRadius: '18px',
              fontSize: '14px',
              fontWeight: 900,
              letterSpacing: '0.03em',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: '6px',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {myPlayer.isReady ? <CheckCircle2 size={20} /> : <Play size={20} />}
              <span>{myPlayer.isReady ? 'SUDAH READY' : 'SIAP BERMAIN'}</span>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, opacity: 0.92 }}>
              {myPlayer.isReady
                ? tableState.waitingCountdown
                  ? `Mulai dlm ${tableState.waitingCountdown}s`
                  : 'Klik untuk Batal'
                : tableState.waitingCountdown
                ? `Mulai dlm ${tableState.waitingCountdown}s`
                : 'KLIK READY'}
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
          liveHandStrength={myLiveHandStrength}
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
        onOpenChat={() => {
          setIsChatOpen(true);
          setChatFocusTrigger(prev => prev + 1);
        }}
      />

      {/* Floating Chat & Dealer Log Drawer */}
      <ChatPanel
        messages={messages}
        onSendMessage={handleSendMessage}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(prev => !prev)}
        focusTrigger={chatFocusTrigger}
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

      {/* Buy-In / Top-Up Modal (Opsi 1: Pilih Modal Bawa ke Meja) */}
      <BuyInModal
        isOpen={buyInModal.isOpen}
        mode={buyInModal.mode}
        seatIndex={buyInModal.seatIndex}
        walletBalance={walletBalance}
        bigBlind={tableState?.bigBlind || 2000}
        onClose={() => setBuyInModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmBuyIn}
        onGoToLobbyCashier={handleReturnToLounge}
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
