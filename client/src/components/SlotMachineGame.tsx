import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Volume2,
  VolumeX,
  ArrowLeft,
  Coins,
  Sparkles,
  Info,
  Flame,
  Award,
  Zap,
  Play,
  RotateCw,
  X
} from 'lucide-react';
import { soundEffects } from '../utils/soundEffects.js';
import { formatRupiah } from '../utils/formatters.js';

export interface SlotSymbol {
  id: string;
  char: string;
  name: string;
  color: string;
  weight: number; // probability weight
}

export const SLOT_SYMBOLS: SlotSymbol[] = [
  { id: 'seven', char: '7️⃣', name: 'Lucky Seven', color: '#ef4444', weight: 4 },
  { id: 'diamond', char: '💎', name: 'Diamond', color: '#38bdf8', weight: 7 },
  { id: 'crown', char: '👑', name: 'Royal Crown', color: '#fbbf24', weight: 10 },
  { id: 'bell', char: '🔔', name: 'Golden Bell', color: '#f59e0b', weight: 14 },
  { id: 'grape', char: '🍇', name: 'Sweet Grape', color: '#a855f7', weight: 18 },
  { id: 'lemon', char: '🍋', name: 'Lucky Lemon', color: '#facc15', weight: 22 },
  { id: 'cherry', char: '🍒', name: 'Red Cherry', color: '#dc2626', weight: 26 },
  { id: 'clover', char: '🍀', name: 'Four Clover', color: '#10b981', weight: 28 }
];

// Weighted random symbol picker
function getRandomSymbol(): SlotSymbol {
  const totalWeight = SLOT_SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const sym of SLOT_SYMBOLS) {
    if (rand < sym.weight) return sym;
    rand -= sym.weight;
  }
  return SLOT_SYMBOLS[SLOT_SYMBOLS.length - 1];
}

export interface SlotMachineGameProps {
  walletBalance: number;
  playerName: string;
  onUpdateBalance: (newBalance: number) => void;
  onClose: () => void;
  isBgmPlaying: boolean;
  onToggleBgm: () => void;
}

const BET_AMOUNTS = [1000, 5000, 10000, 25000, 50000, 100000];

export const SlotMachineGame: React.FC<SlotMachineGameProps> = ({
  walletBalance,
  playerName,
  onUpdateBalance,
  onClose,
  isBgmPlaying,
  onToggleBgm
}) => {
  const [betAmount, setBetAmount] = useState<number>(10000);
  const [reels, setReels] = useState<[SlotSymbol, SlotSymbol, SlotSymbol]>([
    SLOT_SYMBOLS[0], // 7
    SLOT_SYMBOLS[0], // 7
    SLOT_SYMBOLS[0]  // 7
  ]);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [spinningReels, setSpinningReels] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [leverPulled, setLeverPulled] = useState<boolean>(false);
  const [lastWin, setLastWin] = useState<{
    amount: number;
    multiplier: number;
    comboName: string;
    isJackpot: boolean;
  } | null>(null);
  const [autoSpinRemaining, setAutoSpinRemaining] = useState<number>(0);
  const [showPaytable, setShowPaytable] = useState<boolean>(false);
  const [totalWonSession, setTotalWonSession] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const autoSpinRef = useRef<number>(autoSpinRemaining);
  autoSpinRef.current = autoSpinRemaining;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Evaluate 3-reel outcome according to Vegas rules
  const evaluateWin = (
    r1: SlotSymbol,
    r2: SlotSymbol,
    r3: SlotSymbol,
    bet: number
  ): { amount: number; multiplier: number; comboName: string; isJackpot: boolean } => {
    // 1. Triple Lucky 7 - GRAND JACKPOT (250x)
    if (r1.id === 'seven' && r2.id === 'seven' && r3.id === 'seven') {
      return {
        multiplier: 250,
        amount: bet * 250,
        comboName: '👑 JACKPOT 777 MAHARANI (250x)',
        isJackpot: true
      };
    }

    // 2. Triple Diamonds (50x)
    if (r1.id === 'diamond' && r2.id === 'diamond' && r3.id === 'diamond') {
      return {
        multiplier: 50,
        amount: bet * 50,
        comboName: '💎 TRIPLE DIAMOND (50x)',
        isJackpot: true
      };
    }

    // 3. Triple Royal Crown (30x)
    if (r1.id === 'crown' && r2.id === 'crown' && r3.id === 'crown') {
      return {
        multiplier: 30,
        amount: bet * 30,
        comboName: '👑 TRIPLE ROYAL CROWN (30x)',
        isJackpot: false
      };
    }

    // 4. Triple Golden Bell (20x)
    if (r1.id === 'bell' && r2.id === 'bell' && r3.id === 'bell') {
      return {
        multiplier: 20,
        amount: bet * 20,
        comboName: '🔔 TRIPLE GOLDEN BELL (20x)',
        isJackpot: false
      };
    }

    // 5. Triple Sweet Grape (15x)
    if (r1.id === 'grape' && r2.id === 'grape' && r3.id === 'grape') {
      return {
        multiplier: 15,
        amount: bet * 15,
        comboName: '🍇 TRIPLE GRAPE (15x)',
        isJackpot: false
      };
    }

    // 6. Triple Lemon (10x)
    if (r1.id === 'lemon' && r2.id === 'lemon' && r3.id === 'lemon') {
      return {
        multiplier: 10,
        amount: bet * 10,
        comboName: '🍋 TRIPLE LEMON (10x)',
        isJackpot: false
      };
    }

    // 7. Triple Cherry (8x)
    if (r1.id === 'cherry' && r2.id === 'cherry' && r3.id === 'cherry') {
      return {
        multiplier: 8,
        amount: bet * 8,
        comboName: '🍒 TRIPLE CHERRY (8x)',
        isJackpot: false
      };
    }

    // 8. Triple Clover (5x)
    if (r1.id === 'clover' && r2.id === 'clover' && r3.id === 'clover') {
      return {
        multiplier: 5,
        amount: bet * 5,
        comboName: '🍀 TRIPLE LUCKY CLOVER (5x)',
        isJackpot: false
      };
    }

    // 9. Two Cherries (3x)
    const cherryCount = [r1, r2, r3].filter(s => s.id === 'cherry').length;
    if (cherryCount === 2) {
      return {
        multiplier: 3,
        amount: bet * 3,
        comboName: '🍒 DUA CHERRY (3x)',
        isJackpot: false
      };
    }

    // 10. Two Clovers (2x)
    const cloverCount = [r1, r2, r3].filter(s => s.id === 'clover').length;
    if (cloverCount === 2) {
      return {
        multiplier: 2,
        amount: bet * 2,
        comboName: '🍀 DUA CLOVER (2x)',
        isJackpot: false
      };
    }

    // 11. Mixed 3 Fruits (Grape, Lemon, Cherry) = 2x
    const fruitIds = new Set(['grape', 'lemon', 'cherry']);
    if (fruitIds.has(r1.id) && fruitIds.has(r2.id) && fruitIds.has(r3.id)) {
      return {
        multiplier: 2,
        amount: bet * 2,
        comboName: '🍹 MIXED FRUITS (2x)',
        isJackpot: false
      };
    }

    // 12. Single Cherry (1x - modal kembali)
    if (cherryCount === 1) {
      return {
        multiplier: 1,
        amount: bet,
        comboName: '🍒 SATU CHERRY (1x Modal Kembali)',
        isJackpot: false
      };
    }

    // No win
    return {
      multiplier: 0,
      amount: 0,
      comboName: '',
      isJackpot: false
    };
  };

  // Perform Spin Action
  const handleSpin = useCallback(() => {
    if (isSpinning) return;

    if (walletBalance < betAmount) {
      soundEffects.playFold();
      showToast('⚠️ Saldo dompet tidak mencukupi untuk melakukan spin ini.');
      setAutoSpinRemaining(0);
      return;
    }

    // Deduct bet from wallet
    const newBal = walletBalance - betAmount;
    onUpdateBalance(newBal);
    localStorage.setItem('poker_wallet_balance', String(newBal));

    setIsSpinning(true);
    setSpinningReels([true, true, true]);
    setLastWin(null);

    // Mechanical lever pull animation
    setLeverPulled(true);
    soundEffects.playSlotLever();
    setTimeout(() => setLeverPulled(false), 350);

    // Continuous reel whirring sound
    soundEffects.playSlotReelSpin();

    // Pick final outcome
    const targetR1 = getRandomSymbol();
    const targetR2 = getRandomSymbol();
    const targetR3 = getRandomSymbol();

    // Sequential Reel Stoppages
    // Reel 1 stops at 1000ms
    setTimeout(() => {
      soundEffects.playSlotReelStop();
      setSpinningReels([false, true, true]);
      setReels(prev => [targetR1, prev[1], prev[2]]);
    }, 1000);

    // Reel 2 stops at 1500ms
    setTimeout(() => {
      soundEffects.playSlotReelStop();
      setSpinningReels([false, false, true]);
      setReels(prev => [targetR1, targetR2, prev[2]]);
    }, 1500);

    // Reel 3 stops at 2000ms -> Finish spin!
    setTimeout(() => {
      soundEffects.playSlotReelStop();
      setSpinningReels([false, false, false]);
      setReels([targetR1, targetR2, targetR3]);
      setIsSpinning(false);

      // Evaluate win
      const result = evaluateWin(targetR1, targetR2, targetR3, betAmount);

      if (result.amount > 0) {
        if (result.isJackpot) {
          soundEffects.playSlotJackpot();
          soundEffects.playPotSplash();
          confetti({
            particleCount: 120,
            spread: 90,
            origin: { y: 0.55 },
            colors: ['#ef4444', '#fbbf24', '#fef08a', '#38bdf8', '#ffffff']
          });
        } else {
          soundEffects.playWinFanfare();
          soundEffects.playPotSplash();
          confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.6 }
          });
        }

        // Credit winnings to wallet
        const finalBal = newBal + result.amount;
        onUpdateBalance(finalBal);
        localStorage.setItem('poker_wallet_balance', String(finalBal));
        setTotalWonSession(prev => prev + result.amount);
        setLastWin(result);
      } else {
        soundEffects.playFold();
      }

      // Check auto spin countdown
      if (autoSpinRef.current > 1 && newBal >= betAmount) {
        setAutoSpinRemaining(prev => prev - 1);
        setTimeout(() => {
          handleSpin();
        }, 1200);
      } else if (autoSpinRef.current === 1) {
        setAutoSpinRemaining(0);
      }
    }, 2000);
  }, [isSpinning, walletBalance, betAmount, onUpdateBalance]);

  // Spacebar triggers spin, Escape closes
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpinning) {
        e.preventDefault();
        handleSpin();
      } else if (e.code === 'Escape' && !isSpinning) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isSpinning, handleSpin, onClose]);

  return (
    <div
      className="slot-machine-arena-root animate-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'radial-gradient(circle at center, #1e112a 0%, #0d0614 65%, #050208 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflow: 'hidden',
        color: '#f8fafc',
        userSelect: 'none'
      }}
    >
      {/* Top Header Bar */}
      <header
        style={{
          width: '100%',
          height: '56px',
          padding: '0 20px',
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(239, 68, 68, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={onClose}
            disabled={isSpinning}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '10px',
              padding: '7px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#cbd5e1',
              fontSize: '12px',
              fontWeight: 700,
              cursor: isSpinning ? 'not-allowed' : 'pointer'
            }}
            title="Kembali ke Ruangan Lounge 3D"
          >
            <ArrowLeft size={15} />
            <span>Lounge 3D</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🎰</span>
            <div>
              <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#f8fafc', letterSpacing: '0.02em' }}>
                LUCKY 777 VIP SLOT MACHINE
              </h1>
              <p style={{ margin: 0, fontSize: '10.5px', color: '#f87171', fontWeight: 600 }}>
                Grand Jackpot 250x Lipat • Mesin Kasino Klasik
              </p>
            </div>
          </div>
        </div>

        {/* Profile & Wallet */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setShowPaytable(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              borderRadius: '10px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#fbbf24',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            <Info size={15} />
            <span>Tabel Hadiah</span>
          </button>

          <div
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 78, 59, 0.3))',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '12px',
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Coins size={16} color="#34d399" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '9.5px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                Dompet {playerName}
              </span>
              <span style={{ fontSize: '13.5px', fontWeight: 900, color: '#34d399' }}>
                Rp {walletBalance.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <button
            onClick={onToggleBgm}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '10px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isBgmPlaying ? '#fbbf24' : '#94a3b8',
              cursor: 'pointer'
            }}
          >
            {isBgmPlaying ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </header>

      {/* Main Physical Slot Cabinet Stage */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          position: 'relative'
        }}
      >
        {/* Slot Cabinet Frame */}
        <div
          style={{
            position: 'relative',
            width: '540px',
            background: 'linear-gradient(180deg, #1e092b 0%, #11051b 50%, #0a0210 100%)',
            border: '4px solid #f59e0b',
            borderRadius: '28px',
            padding: '24px 28px',
            boxShadow:
              '0 30px 80px rgba(0, 0, 0, 0.9), inset 0 0 30px rgba(245, 158, 11, 0.2), 0 0 40px rgba(239, 68, 68, 0.25)'
          }}
        >
          {/* Running Neon Bulbs Top Arch */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              padding: '8px 18px',
              background: 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)',
              border: '2px solid #fbbf24',
              borderRadius: '16px',
              boxShadow: '0 4px 18px rgba(239, 68, 68, 0.5)'
            }}
          >
            <span style={{ fontSize: '20px', animation: isSpinning ? 'pulse 0.4s infinite' : 'none' }}>⭐</span>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '19px',
                  fontWeight: 900,
                  letterSpacing: '0.12em',
                  color: '#fef08a',
                  textShadow: '0 0 14px rgba(251, 191, 36, 0.8)'
                }}
              >
                777 GRAND ROYALE 777
              </div>
              <div style={{ fontSize: '10.5px', color: '#fed7aa', fontWeight: 700 }}>
                WIN UP TO 250X • MEGA CASH REELS
              </div>
            </div>
            <span style={{ fontSize: '20px', animation: isSpinning ? 'pulse 0.4s infinite' : 'none' }}>⭐</span>
          </div>

          {/* 3 Reel Windows Frame */}
          <div
            style={{
              position: 'relative',
              background: '#050208',
              border: '3px solid #d97706',
              borderRadius: '20px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px',
              boxShadow: 'inset 0 0 25px rgba(0, 0, 0, 0.95)'
            }}
          >
            {/* Center Red Winning Payline Indicator Bar */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '10px',
                right: '10px',
                height: '3px',
                background: lastWin && lastWin.amount > 0 ? '#fbbf24' : 'rgba(239, 68, 68, 0.4)',
                boxShadow:
                  lastWin && lastWin.amount > 0
                    ? '0 0 16px rgba(251, 191, 36, 1)'
                    : '0 0 6px rgba(239, 68, 68, 0.5)',
                pointerEvents: 'none',
                zIndex: 4
              }}
            />

            {/* Payline Triangles on left and right */}
            <div
              style={{
                position: 'absolute',
                left: '-12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: 0,
                height: 0,
                borderTop: '8px solid transparent',
                borderBottom: '8px solid transparent',
                borderLeft: '12px solid #ef4444',
                zIndex: 5
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: '-12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: 0,
                height: 0,
                borderTop: '8px solid transparent',
                borderBottom: '8px solid transparent',
                borderRight: '12px solid #ef4444',
                zIndex: 5
              }}
            />

            {/* 3 Individual Reels */}
            {[0, 1, 2].map(reelIdx => {
              const currentSymbol = reels[reelIdx];
              const isThisReelSpinning = spinningReels[reelIdx];

              return (
                <div
                  key={reelIdx}
                  style={{
                    flex: 1,
                    height: '140px',
                    background: 'linear-gradient(180deg, #18181b 0%, #27272a 50%, #18181b 100%)',
                    border: '2px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative',
                    boxShadow: 'inset 0 10px 20px rgba(0,0,0,0.8), inset 0 -10px 20px rgba(0,0,0,0.8)'
                  }}
                >
                  {isThisReelSpinning ? (
                    // Spinning Blur Animation
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px',
                        animation: 'reelBlurSpin 0.15s linear infinite',
                        filter: 'blur(2px)'
                      }}
                    >
                      <span style={{ fontSize: '48px' }}>7️⃣</span>
                      <span style={{ fontSize: '48px' }}>💎</span>
                      <span style={{ fontSize: '48px' }}>👑</span>
                    </div>
                  ) : (
                    // Stopped Symbol Display
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'bounceIn 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
                        zIndex: 2
                      }}
                    >
                      <span style={{ fontSize: '54px', lineHeight: 1 }}>{currentSymbol.char}</span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          color: currentSymbol.color,
                          marginTop: '6px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}
                      >
                        {currentSymbol.name}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Outcome / Winner Callout Display */}
          <div
            style={{
              marginTop: '16px',
              padding: '12px 18px',
              borderRadius: '16px',
              background:
                lastWin && lastWin.amount > 0
                  ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(220, 38, 38, 0.3))'
                  : 'rgba(0, 0, 0, 0.45)',
              border:
                lastWin && lastWin.amount > 0 ? '1.5px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '52px'
            }}
          >
            {isSpinning ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24' }}>
                <RotateCw size={16} className="animate-spin" />
                <span style={{ fontSize: '13px', fontWeight: 800 }}>Roda sedang berputar...</span>
              </div>
            ) : lastWin && lastWin.amount > 0 ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 900, color: '#fef08a', letterSpacing: '0.05em' }}>
                  {lastWin.comboName}
                </div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#34d399' }}>
                  MENANG +Rp {lastWin.amount.toLocaleString('id-ID')}
                </div>
              </div>
            ) : (
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                Tarik tuas atau tekan tombol SPIN [SPASI]
              </span>
            )}
          </div>

          {/* Bet Selector Bar */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
                Nominal Taruhan Per Spin
              </span>
              <span style={{ fontSize: '13px', fontWeight: 900, color: '#fbbf24' }}>
                Rp {betAmount.toLocaleString('id-ID')}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {BET_AMOUNTS.map(amt => (
                <button
                  key={amt}
                  onClick={() => {
                    soundEffects.playChipClick();
                    setBetAmount(amt);
                  }}
                  disabled={isSpinning}
                  style={{
                    flex: 1,
                    height: '36px',
                    borderRadius: '10px',
                    background: betAmount === amt ? '#d97706' : 'rgba(255, 255, 255, 0.08)',
                    border: betAmount === amt ? '2px solid #fef08a' : '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    fontSize: '11.5px',
                    fontWeight: 900,
                    cursor: isSpinning ? 'not-allowed' : 'pointer',
                    transition: 'all 0.12s ease',
                    boxShadow: betAmount === amt ? '0 0 10px rgba(245, 158, 11, 0.5)' : undefined
                  }}
                >
                  {amt >= 1000 ? `${amt / 1000}K` : amt}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Action Controls: Max Bet, Auto Spin, Big Spin */}
          <div
            style={{
              marginTop: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            {/* Max Bet */}
            <button
              onClick={() => {
                soundEffects.playChipClick();
                setBetAmount(100000);
              }}
              disabled={isSpinning}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '12px',
                padding: '12px 14px',
                color: '#f87171',
                fontSize: '12px',
                fontWeight: 900,
                cursor: isSpinning ? 'not-allowed' : 'pointer'
              }}
            >
              MAX BET
            </button>

            {/* Auto Spin Toggle */}
            <button
              onClick={() => {
                soundEffects.playChipClick();
                if (autoSpinRemaining > 0) {
                  setAutoSpinRemaining(0);
                } else {
                  setAutoSpinRemaining(10);
                  handleSpin();
                }
              }}
              style={{
                background: autoSpinRemaining > 0 ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                border:
                  autoSpinRemaining > 0 ? '1px solid #34d399' : '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                padding: '12px 16px',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              {autoSpinRemaining > 0 ? `AUTO (${autoSpinRemaining})` : 'AUTO (10x)'}
            </button>

            {/* Large Glowing Spin Button */}
            <button
              onClick={handleSpin}
              disabled={isSpinning}
              style={{
                flex: 1,
                height: '48px',
                background: isSpinning
                  ? 'rgba(100, 116, 139, 0.4)'
                  : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 50%, #7f1d1d 100%)',
                border: isSpinning ? 'none' : '2px solid #fca5a5',
                borderRadius: '14px',
                color: isSpinning ? '#64748b' : '#ffffff',
                fontSize: '15px',
                fontWeight: 900,
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: isSpinning ? 'none' : '0 8px 25px rgba(239, 68, 68, 0.5)',
                cursor: isSpinning ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Zap size={18} fill={isSpinning ? '#64748b' : '#ffffff'} />
              <span>{isSpinning ? 'SPINNING...' : 'SPIN [SPASI]'}</span>
            </button>
          </div>

          {/* Interactive Mechanical Lever on Right Side of Cabinet */}
          <div
            onClick={!isSpinning ? handleSpin : undefined}
            style={{
              position: 'absolute',
              right: '-46px',
              top: '40%',
              transform: 'translateY(-50%)',
              cursor: isSpinning ? 'not-allowed' : 'pointer',
              zIndex: 10
            }}
            title="Klik atau tekan Spasi untuk menarik tuas!"
          >
            {/* Lever Base bracket */}
            <div
              style={{
                width: '18px',
                height: '42px',
                background: 'linear-gradient(180deg, #475569, #1e293b)',
                border: '2px solid #94a3b8',
                borderRadius: '6px'
              }}
            />

            {/* Lever Shaft */}
            <div
              style={{
                position: 'absolute',
                left: '6px',
                bottom: '18px',
                width: '7px',
                height: '75px',
                background: 'linear-gradient(90deg, #cbd5e1, #94a3b8)',
                borderRadius: '4px',
                transformOrigin: 'bottom center',
                transform: leverPulled ? 'rotate(50deg) scaleY(0.7)' : 'rotate(0deg)',
                transition: 'transform 0.18s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
              }}
            >
              {/* Golden Handle Knob */}
              <div
                style={{
                  position: 'absolute',
                  top: '-18px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 35%, #fef08a 0%, #d97706 70%, #78350f 100%)',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.6), inset 0 2px 4px rgba(255,255,255,0.8)'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Paytable Modal Dialog */}
      {showPaytable && (
        <div
          className="modal-overlay"
          onClick={() => setShowPaytable(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 120
          }}
        >
          <div
            className="modal-card"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '460px',
              width: '92%',
              background: 'linear-gradient(180deg, #180d24 0%, #0c0512 100%)',
              border: '2px solid #f59e0b',
              borderRadius: '20px',
              padding: '20px 24px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '22px' }}>📜</span>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#fef08a' }}>
                  TABEL HADIAH & MULTIPLIER
                </h3>
              </div>
              <button
                onClick={() => setShowPaytable(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer'
                }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto' }}>
              {[
                { combo: '7️⃣ 7️⃣ 7️⃣', name: 'Grand Jackpot Lucky 7', mult: '250x Bet', gold: true },
                { combo: '💎 💎 💎', name: 'Triple Diamond', mult: '50x Bet', gold: true },
                { combo: '👑 👑 👑', name: 'Triple Royal Crown', mult: '30x Bet' },
                { combo: '🔔 🔔 🔔', name: 'Triple Golden Bell', mult: '20x Bet' },
                { combo: '🍇 🍇 🍇', name: 'Triple Sweet Grape', mult: '15x Bet' },
                { combo: '🍋 🍋 🍋', name: 'Triple Lucky Lemon', mult: '10x Bet' },
                { combo: '🍒 🍒 🍒', name: 'Triple Red Cherry', mult: '8x Bet' },
                { combo: '🍀 🍀 🍀', name: 'Triple Four Clover', mult: '5x Bet' },
                { combo: '🍒 🍒 + ❓', name: 'Dua Buah Cherry', mult: '3x Bet' },
                { combo: '🍀 🍀 + ❓', name: 'Dua Buah Clover', mult: '2x Bet' },
                { combo: '🍇 🍋 🍒', name: 'Mixed Fruits Campuran', mult: '2x Bet' },
                { combo: '🍒 + ❓ ❓', name: 'Satu Buah Cherry', mult: '1x (Modal Kembali)' }
              ].map((row, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: row.gold ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border: row.gold ? '1px solid rgba(251, 191, 36, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '17px' }}>{row.combo}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: row.gold ? '#fef08a' : '#cbd5e1' }}>
                      {row.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 900,
                      color: row.gold ? '#34d399' : '#fbbf24'
                    }}
                  >
                    {row.mult}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'absolute',
            top: '72px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '12px',
            padding: '10px 20px',
            color: '#fca5a5',
            fontSize: '13px',
            fontWeight: 700,
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
            zIndex: 150
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
};

