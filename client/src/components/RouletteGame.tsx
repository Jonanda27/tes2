import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Trash2,
  Sparkles,
  ArrowLeft,
  Coins,
  History,
  TrendingUp,
  Award,
  Flame,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { soundEffects } from '../utils/soundEffects.js';
import { formatRupiah } from '../utils/formatters.js';

// European Roulette Wheel standard sequence (Clockwise)
export const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
]);

export const BLACK_NUMBERS = new Set([
  2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35
]);

export function getNumberColor(num: number): 'green' | 'red' | 'black' {
  if (num === 0) return 'green';
  return RED_NUMBERS.has(num) ? 'red' : 'black';
}

export type BetType =
  | 'straight'
  | 'red'
  | 'black'
  | 'even'
  | 'odd'
  | 'low'
  | 'high'
  | 'dozen1'
  | 'dozen2'
  | 'dozen3'
  | 'col1'
  | 'col2'
  | 'col3';

export interface BetItem {
  id: string;
  type: BetType;
  label: string;
  amount: number;
  value?: number; // for straight numbers (0 - 36)
  payoutMultiplier: number; // e.g. 35 for straight (returns 36x), 1 for even money, 2 for dozen
}

export interface RouletteGameProps {
  walletBalance: number;
  playerName: string;
  onUpdateBalance: (newBalance: number) => void;
  onClose: () => void;
  isBgmPlaying: boolean;
  onToggleBgm: () => void;
}

const CHIP_DENOMINATIONS = [
  { value: 1000, label: '1K', color: '#64748b', border: '#94a3b8' },
  { value: 5000, label: '5K', color: '#dc2626', border: '#f87171' },
  { value: 10000, label: '10K', color: '#2563eb', border: '#60a5fa' },
  { value: 50000, label: '50K', color: '#059669', border: '#34d399' },
  { value: 100000, label: '100K', color: '#d97706', border: '#fbbf24' }
];

export const RouletteGame: React.FC<RouletteGameProps> = ({
  walletBalance,
  playerName,
  onUpdateBalance,
  onClose,
  isBgmPlaying,
  onToggleBgm
}) => {
  const [selectedChip, setSelectedChip] = useState<number>(10000);
  const [bets, setBets] = useState<Record<string, BetItem>>({});
  const [lastBets, setLastBets] = useState<Record<string, BetItem>>({});
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const [ballRotation, setBallRotation] = useState<number>(0);
  const [history, setHistory] = useState<number[]>([17, 32, 0, 7, 29, 14, 2]);
  const [spinResult, setSpinResult] = useState<{
    number: number;
    totalWon: number;
    netGain: number;
    winningBetsCount: number;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const totalBetAmount = Object.values(bets).reduce((sum, b) => sum + b.amount, 0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Place a bet on a key
  const handlePlaceBet = (
    key: string,
    type: BetType,
    label: string,
    payoutMultiplier: number,
    value?: number
  ) => {
    if (isSpinning) return;

    if (walletBalance < totalBetAmount + selectedChip) {
      soundEffects.playFold();
      showToast('⚠️ Saldo dompet tidak mencukupi untuk menambah taruhan ini.');
      return;
    }

    soundEffects.playChipClick();
    setBets(prev => {
      const existing = prev[key];
      const newAmount = (existing ? existing.amount : 0) + selectedChip;
      return {
        ...prev,
        [key]: {
          id: key,
          type,
          label,
          amount: newAmount,
          value,
          payoutMultiplier
        }
      };
    });
  };

  // Clear all current bets
  const handleClearBets = () => {
    if (isSpinning || totalBetAmount === 0) return;
    soundEffects.playChipClick();
    setBets({});
  };

  // Double current bets
  const handleDoubleBets = () => {
    if (isSpinning || totalBetAmount === 0) return;
    if (walletBalance < totalBetAmount * 2) {
      showToast('⚠️ Saldo dompet tidak mencukupi untuk menggandakan semua taruhan.');
      return;
    }
    soundEffects.playChipClick();
    setBets(prev => {
      const updated: Record<string, BetItem> = {};
      Object.entries(prev).forEach(([k, item]) => {
        updated[k] = { ...item, amount: item.amount * 2 };
      });
      return updated;
    });
  };

  // Rebet last round's bets
  const handleRebet = () => {
    if (isSpinning || Object.keys(lastBets).length === 0) return;
    const lastTotal = Object.values(lastBets).reduce((s, b) => s + b.amount, 0);
    if (walletBalance < lastTotal) {
      showToast('⚠️ Saldo dompet tidak mencukupi untuk mengulangi taruhan sebelumnya.');
      return;
    }
    soundEffects.playChipClick();
    setBets(lastBets);
  };

  // Check if a bet won for a given outcome number
  const checkBetWon = (bet: BetItem, outcome: number): boolean => {
    switch (bet.type) {
      case 'straight':
        return bet.value === outcome;
      case 'red':
        return outcome !== 0 && RED_NUMBERS.has(outcome);
      case 'black':
        return outcome !== 0 && BLACK_NUMBERS.has(outcome);
      case 'even':
        return outcome !== 0 && outcome % 2 === 0;
      case 'odd':
        return outcome !== 0 && outcome % 2 === 1;
      case 'low':
        return outcome >= 1 && outcome <= 18;
      case 'high':
        return outcome >= 19 && outcome <= 36;
      case 'dozen1':
        return outcome >= 1 && outcome <= 12;
      case 'dozen2':
        return outcome >= 13 && outcome <= 24;
      case 'dozen3':
        return outcome >= 25 && outcome <= 36;
      case 'col1':
        return outcome !== 0 && outcome % 3 === 1;
      case 'col2':
        return outcome !== 0 && outcome % 3 === 2;
      case 'col3':
        return outcome !== 0 && outcome % 3 === 0;
      default:
        return false;
    }
  };

  // Trigger the wheel spin!
  const handleSpin = () => {
    if (isSpinning) return;
    if (totalBetAmount === 0) {
      soundEffects.playFold();
      showToast('Silakan pasang taruhan terlebih dahulu pada karpet angka.');
      return;
    }
    if (walletBalance < totalBetAmount) {
      soundEffects.playFold();
      showToast('Saldo dompet tidak mencukupi.');
      return;
    }

    // Deduct total bet from wallet upfront
    const newWallet = walletBalance - totalBetAmount;
    onUpdateBalance(newWallet);
    localStorage.setItem('poker_wallet_balance', String(newWallet));

    setLastBets({ ...bets });
    setIsSpinning(true);
    setSpinResult(null);
    setWinningNumber(null);

    // Pick random winning number (0 - 36)
    const outcomeIndex = Math.floor(Math.random() * ROULETTE_NUMBERS.length);
    const outcomeNumber = ROULETTE_NUMBERS[outcomeIndex];

    // Sound effect: ball rolling and whirring around roulette rim
    soundEffects.playRouletteSpin();

    // Calculate rotation math: 37 pockets = 360 / 37 ≈ 9.7297° each
    const wedgeAngle = 360 / ROULETTE_NUMBERS.length;
    const targetWedgeAngle = outcomeIndex * wedgeAngle;

    // Wheel spins clockwise 5 full rotations + target angle
    const extraWheelSpins = 5 * 360;
    const targetWheel = wheelRotation + extraWheelSpins + (360 - targetWedgeAngle);

    // Ball spins counter-clockwise 8 full rotations
    const extraBallSpins = -8 * 360;
    const targetBall = ballRotation + extraBallSpins;

    setWheelRotation(targetWheel);
    setBallRotation(targetBall);

    // After 4.2 seconds, ball lands in the target pocket!
    setTimeout(() => {
      soundEffects.playRouletteBallDrop();
      setWinningNumber(outcomeNumber);
      setHistory(prev => [outcomeNumber, ...prev.slice(0, 11)]);

      // Calculate payouts
      let totalWon = 0;
      let winningBetsCount = 0;

      Object.values(bets).forEach(bet => {
        if (checkBetWon(bet, outcomeNumber)) {
          winningBetsCount++;
          // Payout = bet returned + (multiplier * bet)
          const payout = bet.amount * (bet.payoutMultiplier + 1);
          totalWon += payout;
        }
      });

      const netGain = totalWon - totalBetAmount;

      if (totalWon > 0) {
        // Player won!
        soundEffects.playWinFanfare();
        soundEffects.playPotSplash();

        // Celebration confetti
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#fbbf24', '#10b981', '#38bdf8', '#ffffff']
        });

        // Credit winnings to wallet
        const finalBalance = newWallet + totalWon;
        onUpdateBalance(finalBalance);
        localStorage.setItem('poker_wallet_balance', String(finalBalance));
      } else {
        soundEffects.playFold();
      }

      setSpinResult({
        number: outcomeNumber,
        totalWon,
        netGain,
        winningBetsCount
      });

      setIsSpinning(false);
    }, 4200);
  };

  // Keyboard shortcut: Space to spin, Escape to close
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
  }, [isSpinning, totalBetAmount, walletBalance, bets]);

  return (
    <div
      className="roulette-arena-root animate-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'radial-gradient(circle at center, #0f172a 0%, #080d1a 60%, #03060d 100%)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#f8fafc',
        userSelect: 'none'
      }}
    >
      {/* Top Header Bar */}
      <header
        style={{
          height: '56px',
          padding: '0 20px',
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
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
              cursor: isSpinning ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s ease'
            }}
            title="Kembali ke Ruangan Lounge 3D"
          >
            <ArrowLeft size={15} />
            <span>Lounge 3D</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🎡</span>
            <div>
              <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#f8fafc', letterSpacing: '0.02em' }}>
                GRAND EUROPEAN ROULETTE
              </h1>
              <p style={{ margin: 0, fontSize: '10.5px', color: '#fbbf24', fontWeight: 600 }}>
                Peluang Menang s/d 35x Lipat • Single Zero (0)
              </p>
            </div>
          </div>
        </div>

        {/* Player Profile & Wallet Balance */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            title={isBgmPlaying ? 'Matikan Musik' : 'Nyalakan Musik'}
          >
            {isBgmPlaying ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </header>

      {/* Main Game Stage */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          justifyContent: 'center',
          gap: '24px',
          padding: '16px 24px',
          overflowY: 'auto'
        }}
      >
        {/* Left Side: Animated European Roulette Wheel & History */}
        <div
          style={{
            width: '380px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '24px',
            padding: '20px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
          }}
        >
          {/* History Ribbon */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              padding: '6px 12px',
              background: 'rgba(0, 0, 0, 0.35)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>
              <History size={13} color="#f59e0b" />
              <span>RIWAYAT:</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
              {history.map((num, idx) => {
                const col = getNumberColor(num);
                const bg = col === 'green' ? '#059669' : col === 'red' ? '#dc2626' : '#1e293b';
                return (
                  <span
                    key={idx}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: bg,
                      border: idx === 0 ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 900,
                      color: '#ffffff',
                      boxShadow: idx === 0 ? '0 0 10px rgba(251, 191, 36, 0.6)' : undefined
                    }}
                  >
                    {num}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Interactive Spinning Wheel */}
          <div
            style={{
              position: 'relative',
              width: '280px',
              height: '280px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Outer Wooden Rim */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'radial-gradient(circle, #3d1b0a 60%, #1a0a03 95%)',
                border: '6px solid #d97706',
                boxShadow: '0 0 30px rgba(245, 158, 11, 0.35), inset 0 0 20px rgba(0, 0, 0, 0.8)'
              }}
            />

            {/* Rotating Pockets Wheel SVG */}
            <div
              style={{
                position: 'absolute',
                inset: '16px',
                borderRadius: '50%',
                transform: `rotate(${wheelRotation}deg)`,
                transition: isSpinning ? 'transform 4.2s cubic-bezier(0.15, 0.85, 0.35, 1)' : 'none'
              }}
            >
              <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%' }}>
                {ROULETTE_NUMBERS.map((num, i) => {
                  const angle = (360 / ROULETTE_NUMBERS.length) * i;
                  const rad = (angle * Math.PI) / 180;
                  const nextRad = (((angle + 360 / ROULETTE_NUMBERS.length) * Math.PI) / 180);
                  const color = getNumberColor(num);
                  const fillColor = color === 'green' ? '#047857' : color === 'red' ? '#b91c1c' : '#0f172a';

                  // Wedge path
                  const x1 = 100 + 90 * Math.sin(rad);
                  const y1 = 100 - 90 * Math.cos(rad);
                  const x2 = 100 + 90 * Math.sin(nextRad);
                  const y2 = 100 - 90 * Math.cos(nextRad);

                  const pathData = `M 100 100 L ${x1} ${y1} A 90 90 0 0 1 ${x2} ${y2} Z`;

                  // Number text position
                  const textAngle = angle + (360 / ROULETTE_NUMBERS.length) / 2;
                  const textRad = (textAngle * Math.PI) / 180;
                  const textX = 100 + 72 * Math.sin(textRad);
                  const textY = 100 - 72 * Math.cos(textRad);

                  return (
                    <g key={num}>
                      <path d={pathData} fill={fillColor} stroke="#d97706" strokeWidth="0.5" />
                      <text
                        x={textX}
                        y={textY}
                        fill="#ffffff"
                        fontSize="6.5"
                        fontWeight="900"
                        textAnchor="middle"
                        dominantBaseline="central"
                        transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                      >
                        {num}
                      </text>
                    </g>
                  );
                })}
                {/* Center Brass Turret Hub */}
                <circle cx="100" cy="100" r="42" fill="url(#brassGradient)" stroke="#fbbf24" strokeWidth="2" />
                <circle cx="100" cy="100" r="18" fill="#1e1b18" stroke="#f59e0b" strokeWidth="1.5" />
                <defs>
                  <radialGradient id="brassGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="60%" stopColor="#d97706" />
                    <stop offset="100%" stopColor="#78350f" />
                  </radialGradient>
                </defs>
              </svg>
            </div>

            {/* Ball Track & Spinning Ivory Ball */}
            <div
              style={{
                position: 'absolute',
                inset: '24px',
                borderRadius: '50%',
                pointerEvents: 'none',
                transform: `rotate(${ballRotation}deg)`,
                transition: isSpinning ? 'transform 4.2s cubic-bezier(0.12, 0.8, 0.32, 1)' : 'none'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '6px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #e2e8f0 60%, #94a3b8 100%)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.8), 0 0 6px rgba(255, 255, 255, 0.8)'
                }}
              />
            </div>

            {/* Top Indicator Arrow pointing down to the winning pocket */}
            <div
              style={{
                position: 'absolute',
                top: '-4px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '10px solid transparent',
                borderRight: '10px solid transparent',
                borderTop: '16px solid #fbbf24',
                filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.8))',
                zIndex: 5
              }}
            />
          </div>

          {/* Winning Outcome Display Card */}
          <div
            style={{
              marginTop: '18px',
              width: '100%',
              padding: '12px',
              borderRadius: '16px',
              background: 'rgba(0, 0, 0, 0.45)',
              border: winningNumber !== null ? '1px solid rgba(251, 191, 36, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              minHeight: '62px'
            }}
          >
            {isSpinning ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fbbf24' }}>
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: '3px solid #fbbf24',
                    borderTopColor: 'transparent',
                    animation: 'spin 0.8s linear infinite'
                  }}
                />
                <span style={{ fontSize: '13px', fontWeight: 800 }}>Bola sedang berputar...</span>
              </div>
            ) : winningNumber !== null ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background:
                      getNumberColor(winningNumber) === 'green'
                        ? '#059669'
                        : getNumberColor(winningNumber) === 'red'
                        ? '#dc2626'
                        : '#0f172a',
                    border: '2px solid #fbbf24',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: 900,
                    color: '#ffffff',
                    boxShadow: '0 0 16px rgba(251, 191, 36, 0.6)'
                  }}
                >
                  {winningNumber}
                </span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 900, color: '#f8fafc' }}>
                    ANGKA KELUAR: <strong style={{ color: '#fbbf24' }}>{winningNumber}</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 600 }}>
                    {winningNumber === 0
                      ? 'NOL HIJAU (HOUSE ZERO)'
                      : `${getNumberColor(winningNumber) === 'red' ? 'MERAH' : 'HITAM'} • ${
                          winningNumber % 2 === 0 ? 'GENAP' : 'GANJIL'
                        } • ${winningNumber <= 18 ? 'KECIL (1-18)' : 'BESAR (19-36)'}`}
                  </div>
                </div>
              </div>
            ) : (
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                Pasang chip pada karpet lalu tekan PUTAR
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Interactive Casino Felt Betting Grid */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, #064e3b 0%, #022c22 100%)',
            border: '3px solid #d97706',
            borderRadius: '24px',
            padding: '20px',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7), inset 0 0 35px rgba(0, 0, 0, 0.6)',
            position: 'relative'
          }}
        >
          {/* Watermark */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '48px',
              fontWeight: 900,
              letterSpacing: '0.25em',
              color: 'rgba(255, 255, 255, 0.04)',
              pointerEvents: 'none'
            }}
          >
            ROULETTE INDONESIA
          </div>

          {/* Number Grid Layout */}
          <div style={{ display: 'flex', gap: '8px', zIndex: 1 }}>
            {/* Zero (0) Column */}
            <button
              onClick={() => handlePlaceBet('num_0', 'straight', '0 (Nol)', 35, 0)}
              style={{
                width: '64px',
                background: bets['num_0'] ? '#047857' : 'rgba(4, 120, 87, 0.65)',
                border: bets['num_0'] ? '2px solid #fbbf24' : '1.5px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '14px',
                color: '#ffffff',
                fontSize: '24px',
                fontWeight: 900,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: bets['num_0'] ? '0 0 14px rgba(251, 191, 36, 0.5)' : undefined
              }}
              title="0 (Nol) - Bayaran 35:1"
            >
              <span>0</span>
              {bets['num_0'] && (
                <span
                  style={{
                    fontSize: '9.5px',
                    fontWeight: 900,
                    background: '#fbbf24',
                    color: '#0f172a',
                    padding: '2px 5px',
                    borderRadius: '8px',
                    marginTop: '4px'
                  }}
                >
                  {formatRupiah(bets['num_0'].amount)}
                </span>
              )}
            </button>

            {/* 36 Numbers arranged in 3 Rows and 12 Columns */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                // Row 3: 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36
                [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
                // Row 2: 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35
                [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
                // Row 1: 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34
                [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
              ].map((row, rIdx) => (
                <div key={rIdx} style={{ display: 'flex', gap: '6px' }}>
                  {row.map(num => {
                    const isRed = RED_NUMBERS.has(num);
                    const betKey = `num_${num}`;
                    const hasBet = Boolean(bets[betKey]);

                    return (
                      <button
                        key={num}
                        onClick={() => handlePlaceBet(betKey, 'straight', `Angka ${num}`, 35, num)}
                        style={{
                          flex: 1,
                          height: '52px',
                          background: isRed
                            ? hasBet
                              ? '#b91c1c'
                              : 'linear-gradient(135deg, #dc2626, #991b1b)'
                            : hasBet
                            ? '#0f172a'
                            : 'linear-gradient(135deg, #1e293b, #0f172a)',
                          border: hasBet ? '2px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '10px',
                          color: '#ffffff',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'transform 0.12s ease',
                          boxShadow: hasBet ? '0 0 12px rgba(251, 191, 36, 0.6)' : undefined
                        }}
                      >
                        <span style={{ fontSize: '15px', fontWeight: 900 }}>{num}</span>
                        {hasBet && (
                          <span
                            style={{
                              fontSize: '8.5px',
                              fontWeight: 900,
                              background: '#fbbf24',
                              color: '#0f172a',
                              padding: '1px 4px',
                              borderRadius: '6px'
                            }}
                          >
                            {formatRupiah(bets[betKey].amount)}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Column Bet (2:1) at the end of each row */}
                  {(() => {
                    const colIdx = 3 - rIdx; // 3, 2, 1
                    const colKey = `col_${colIdx}` as BetType;
                    const hasColBet = Boolean(bets[colKey]);

                    return (
                      <button
                        onClick={() =>
                          handlePlaceBet(colKey, colKey, `Kolom ${colIdx}`, 2)
                        }
                        style={{
                          width: '54px',
                          background: hasColBet ? '#047857' : 'rgba(255, 255, 255, 0.08)',
                          border: hasColBet ? '2px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '10px',
                          color: '#f8fafc',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title={`Kolom ${colIdx} - Bayaran 2:1`}
                      >
                        <span>2 to 1</span>
                        {hasColBet && (
                          <span
                            style={{
                              fontSize: '8px',
                              background: '#fbbf24',
                              color: '#0f172a',
                              padding: '1px 3px',
                              borderRadius: '4px'
                            }}
                          >
                            {formatRupiah(bets[colKey].amount)}
                          </span>
                        )}
                      </button>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>

          {/* Dozens Bets (1st 12, 2nd 12, 3rd 12) */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', paddingLeft: '72px', zIndex: 1 }}>
            {[
              { key: 'dozen1', label: '1st 12 (1 - 12)', type: 'dozen1' as BetType },
              { key: 'dozen2', label: '2nd 12 (13 - 24)', type: 'dozen2' as BetType },
              { key: 'dozen3', label: '3rd 12 (25 - 36)', type: 'dozen3' as BetType }
            ].map(d => {
              const hasBet = Boolean(bets[d.key]);
              return (
                <button
                  key={d.key}
                  onClick={() => handlePlaceBet(d.key, d.type, d.label, 2)}
                  style={{
                    flex: 1,
                    height: '38px',
                    background: hasBet ? '#047857' : 'rgba(255, 255, 255, 0.07)',
                    border: hasBet ? '2px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{d.label}</span>
                  {hasBet && (
                    <span
                      style={{
                        fontSize: '9px',
                        background: '#fbbf24',
                        color: '#0f172a',
                        padding: '1px 5px',
                        borderRadius: '6px'
                      }}
                    >
                      {formatRupiah(bets[d.key].amount)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Even Money Bets (1-18, EVEN, RED, BLACK, ODD, 19-36) */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', paddingLeft: '72px', zIndex: 1 }}>
            {[
              { key: 'low', label: '1 to 18 (Kecil)', type: 'low' as BetType, bg: 'rgba(255,255,255,0.08)' },
              { key: 'even', label: 'GENAP', type: 'even' as BetType, bg: 'rgba(255,255,255,0.08)' },
              { key: 'red', label: 'MERAH', type: 'red' as BetType, bg: '#dc2626' },
              { key: 'black', label: 'HITAM', type: 'black' as BetType, bg: '#0f172a' },
              { key: 'odd', label: 'GANJIL', type: 'odd' as BetType, bg: 'rgba(255,255,255,0.08)' },
              { key: 'high', label: '19 to 36 (Besar)', type: 'high' as BetType, bg: 'rgba(255,255,255,0.08)' }
            ].map(em => {
              const hasBet = Boolean(bets[em.key]);
              return (
                <button
                  key={em.key}
                  onClick={() => handlePlaceBet(em.key, em.type, em.label, 1)}
                  style={{
                    flex: 1,
                    height: '42px',
                    background: hasBet ? '#047857' : em.bg,
                    border: hasBet ? '2px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: '10px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <span>{em.label}</span>
                  {hasBet && (
                    <span
                      style={{
                        fontSize: '9px',
                        background: '#fbbf24',
                        color: '#0f172a',
                        padding: '1px 5px',
                        borderRadius: '6px'
                      }}
                    >
                      {formatRupiah(bets[em.key].amount)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Controls Bar: Chip Selector & Spin Action */}
          <div
            style={{
              marginTop: '16px',
              paddingTop: '14px',
              borderTop: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              zIndex: 1
            }}
          >
            {/* Quick Utility Tools: Clear, Double, Rebet */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleClearBets}
                disabled={isSpinning || totalBetAmount === 0}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  color: '#fca5a5',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: isSpinning || totalBetAmount === 0 ? 'not-allowed' : 'pointer'
                }}
                title="Hapus semua taruhan di meja"
              >
                <Trash2 size={14} />
                <span>Hapus</span>
              </button>

              <button
                onClick={handleDoubleBets}
                disabled={isSpinning || totalBetAmount === 0}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: isSpinning || totalBetAmount === 0 ? 'not-allowed' : 'pointer'
                }}
                title="Gandakan semua taruhan (2x)"
              >
                2x Double
              </button>

              {Object.keys(lastBets).length > 0 && totalBetAmount === 0 && (
                <button
                  onClick={handleRebet}
                  disabled={isSpinning}
                  style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    color: '#fbbf24',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: isSpinning ? 'not-allowed' : 'pointer'
                  }}
                  title="Pasang kembali taruhan putaran sebelumnya"
                >
                  <RotateCcw size={14} />
                  <span>Ulangi Bet</span>
                </button>
              )}
            </div>

            {/* Chip Denominations Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>PILIH CHIP:</span>
              {CHIP_DENOMINATIONS.map(c => {
                const isSelected = selectedChip === c.value;
                return (
                  <button
                    key={c.value}
                    onClick={() => {
                      soundEffects.playChipClick();
                      setSelectedChip(c.value);
                    }}
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: `radial-gradient(circle, ${c.color} 50%, #0f172a 100%)`,
                      border: isSelected ? '3px solid #fbbf24' : `2px dashed ${c.border}`,
                      boxShadow: isSelected ? '0 0 14px rgba(251, 191, 36, 0.7)' : '0 4px 10px rgba(0,0,0,0.4)',
                      transform: isSelected ? 'translateY(-4px) scale(1.08)' : 'scale(1)',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 900,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            {/* Total Bet & Big Spin Action Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>TOTAL TARUHAN</div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: totalBetAmount > 0 ? '#fbbf24' : '#64748b' }}>
                  Rp {totalBetAmount.toLocaleString('id-ID')}
                </div>
              </div>

              <button
                onClick={handleSpin}
                disabled={isSpinning || totalBetAmount === 0}
                style={{
                  background:
                    isSpinning || totalBetAmount === 0
                      ? 'rgba(100, 116, 139, 0.4)'
                      : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: isSpinning || totalBetAmount === 0 ? '#64748b' : '#0f172a',
                  border: isSpinning || totalBetAmount === 0 ? 'none' : '1px solid #fef08a',
                  borderRadius: '14px',
                  padding: '12px 28px',
                  fontSize: '15px',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: isSpinning || totalBetAmount === 0 ? 'not-allowed' : 'pointer',
                  boxShadow:
                    isSpinning || totalBetAmount === 0 ? 'none' : '0 8px 25px rgba(245, 158, 11, 0.45)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Sparkles size={18} />
                <span>{isSpinning ? 'MEMUTAR...' : 'PUTAR ROULETTE [SPASI]'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Result Announcement Popup Banner */}
      {spinResult && (
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background:
              spinResult.totalWon > 0
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(6, 78, 59, 0.98))'
                : 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))',
            backdropFilter: 'blur(16px)',
            border: spinResult.totalWon > 0 ? '2px solid #34d399' : '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8)',
            borderRadius: '18px',
            padding: '16px 26px',
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
            zIndex: 120,
            animation: 'slideUp 0.25s ease-out'
          }}
        >
          <span style={{ fontSize: '32px' }}>{spinResult.totalWon > 0 ? '🎉' : '💔'}</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>
              {spinResult.totalWon > 0 ? (
                <>
                  SELAMAT! ANDA MENANG <strong style={{ color: '#fef08a' }}>{spinResult.winningBetsCount} TARUHAN</strong>
                </>
              ) : (
                'Belum beruntung pada putaran ini'
              )}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: spinResult.totalWon > 0 ? '#fef08a' : '#cbd5e1' }}>
              {spinResult.totalWon > 0
                ? `+Rp ${spinResult.totalWon.toLocaleString('id-ID')} (Untung Bersih +Rp ${spinResult.netGain.toLocaleString('id-ID')})`
                : `Kehilangan modal Rp ${totalBetAmount.toLocaleString('id-ID')}`}
            </div>
          </div>

          <button
            onClick={() => setSpinResult(null)}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Tutup
          </button>
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
            border: '1px solid rgba(245, 158, 11, 0.5)',
            borderRadius: '12px',
            padding: '10px 20px',
            color: '#fbbf24',
            fontSize: '13px',
            fontWeight: 700,
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
            zIndex: 150,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
};

