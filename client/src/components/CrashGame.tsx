import { useState, useEffect, useRef, useCallback } from 'react';
import { Rocket, ArrowLeft, Volume2, VolumeX, Sparkles, AlertCircle, History, TrendingUp, ShieldCheck } from 'lucide-react';
import { formatRupiah } from '../utils/formatters.js';
import { soundEffects } from '../utils/soundEffects.js';

interface CrashGameProps {
  walletBalance: number;
  onUpdateWallet: (newBalance: number) => void;
  onBackToLobby: () => void;
  playerName: string;
}

interface PastMultiplier {
  id: string;
  value: number;
}

interface SimulatedPlayer {
  name: string;
  bet: number;
  cashedOutAt: number | null;
  hasCrashed: boolean;
}

const BOT_NAMES = ['Budi VIP', 'Maya Sunset', 'Reza Trader', 'Doni Gambler', 'Sofia Glamour', 'Andi Tokyo', 'Rian HighRoller', 'Kenji Bartender'];

export const CrashGame: React.FC<CrashGameProps> = ({
  walletBalance,
  onUpdateWallet,
  onBackToLobby,
  playerName
}) => {
  // Game state: 'BETTING' (waiting 5s), 'FLYING' (rocket ascending), 'CRASHED' (explosion result)
  const [gameState, setGameState] = useState<'BETTING' | 'FLYING' | 'CRASHED'>('BETTING');
  const [multiplier, setMultiplier] = useState<number>(1.00);
  const [countdown, setCountdown] = useState<number>(5);
  const [crashPoint, setCrashPoint] = useState<number>(2.00);

  // Betting state
  const [betAmount, setBetAmount] = useState<number>(50000);
  const [hasBet, setHasBet] = useState<boolean>(false);
  const [hasCashedOut, setHasCashedOut] = useState<boolean>(false);
  const [cashedOutMultiplier, setCashedOutMultiplier] = useState<number>(0);
  const [winAmount, setWinAmount] = useState<number>(0);
  const [autoCashout, setAutoCashout] = useState<string>('2.00');
  const [isAutoCashoutEnabled, setIsAutoCashoutEnabled] = useState<boolean>(false);

  // History & Community
  const [history, setHistory] = useState<PastMultiplier[]>([
    { id: '1', value: 1.85 },
    { id: '2', value: 3.42 },
    { id: '3', value: 1.15 },
    { id: '4', value: 14.80 },
    { id: '5', value: 2.10 },
    { id: '6', value: 1.05 },
    { id: '7', value: 5.62 },
    { id: '8', value: 1.95 }
  ]);
  const [simulatedPlayers, setSimulatedPlayers] = useState<SimulatedPlayer[]>([]);

  // Sound & Visuals
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Generate fair Crash point with casino house edge (4% house edge)
  const generateCrashPoint = (): number => {
    const rand = Math.random();
    // 3% chance of instant bust at 1.00x
    if (rand < 0.03) return 1.00;
    // Standard crash multiplier formula: 0.96 / (1 - rand)
    const raw = 0.96 / (1 - rand);
    return Math.max(1.01, Math.min(250.0, Math.floor(raw * 100) / 100));
  };

  // Setup Simulated Players for new round
  const generateSimulatedPlayers = useCallback(() => {
    const numPlayers = Math.floor(3 + Math.random() * 4);
    const shuffled = [...BOT_NAMES].sort(() => 0.5 - Math.random());
    const players: SimulatedPlayer[] = [];
    for (let i = 0; i < numPlayers; i++) {
      players.push({
        name: shuffled[i],
        bet: [20000, 50000, 100000, 250000][Math.floor(Math.random() * 4)],
        cashedOutAt: null,
        hasCrashed: false
      });
    }
    setSimulatedPlayers(players);
  }, []);

  // Start Betting Countdown
  useEffect(() => {
    if (gameState !== 'BETTING') return;

    generateSimulatedPlayers();
    setMultiplier(1.00);
    setHasCashedOut(false);
    setCashedOutMultiplier(0);
    setWinAmount(0);

    let count = 5;
    setCountdown(count);

    const timer = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(timer);
        // Start Flying
        const targetCrash = generateCrashPoint();
        setCrashPoint(targetCrash);
        startTimeRef.current = performance.now();
        setGameState('FLYING');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, generateSimulatedPlayers]);

  // Flying Rocket Animation Loop
  useEffect(() => {
    if (gameState !== 'FLYING') return;

    let localHasCashedOut = hasCashedOut;
    const targetAutoCash = isAutoCashoutEnabled ? parseFloat(autoCashout) || 0 : 0;

    const loop = (timestamp: number) => {
      const elapsed = (timestamp - startTimeRef.current) / 1000;
      // Exponential growth curve: 1.00 + 0.06 * e^(0.75 * t)
      const currentMult = Math.floor((1.0 + Math.pow(elapsed * 0.9, 1.6)) * 100) / 100;

      if (!isMuted && Math.random() < 0.25) {
        soundEffects.playRocketAscend(Math.min(currentMult, 10));
      }

      // Check Auto Cashout
      if (hasBet && !localHasCashedOut && targetAutoCash >= 1.01 && currentMult >= targetAutoCash) {
        localHasCashedOut = true;
        handleCashOut(targetAutoCash);
      }

      // Update simulated bots cashout
      setSimulatedPlayers(prev =>
        prev.map(p => {
          if (!p.cashedOutAt && !p.hasCrashed) {
            // Target between 1.2x and 8x
            const botTarget = 1.2 + Math.random() * 4.5;
            if (currentMult >= botTarget && currentMult < crashPoint) {
              return { ...p, cashedOutAt: currentMult };
            }
          }
          return p;
        })
      );

      // Check if Crashed
      if (currentMult >= crashPoint) {
        setMultiplier(crashPoint);
        setGameState('CRASHED');
        if (!isMuted) soundEffects.playRocketCrash();

        // Add to history
        setHistory(prev => [{ id: Date.now().toString(), value: crashPoint }, ...prev.slice(0, 11)]);

        // Check if player didn't cash out in time
        if (hasBet && !localHasCashedOut) {
          // Bet is lost
          setHasBet(false);
        }

        // Set remaining bots as crashed
        setSimulatedPlayers(prev =>
          prev.map(p => (p.cashedOutAt ? p : { ...p, hasCrashed: true }))
        );

        // Schedule next round after 3.5s
        setTimeout(() => {
          setHasBet(false);
          setGameState('BETTING');
        }, 3500);

        return;
      }

      setMultiplier(currentMult);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, crashPoint, hasBet, hasCashedOut, isAutoCashoutEnabled, autoCashout, isMuted]);

  // Place Bet Handler
  const handlePlaceBet = () => {
    if (gameState !== 'BETTING' || hasBet) return;
    if (walletBalance < betAmount) {
      alert('Saldo dompet tidak mencukupi untuk memasang taruhan ini.');
      return;
    }
    onUpdateWallet(walletBalance - betAmount);
    setHasBet(true);
    soundEffects.playChipSound();
  };

  // Cancel Bet during countdown
  const handleCancelBet = () => {
    if (gameState !== 'BETTING' || !hasBet) return;
    onUpdateWallet(walletBalance + betAmount);
    setHasBet(false);
    soundEffects.playChipSound();
  };

  // Cash Out Handler
  const handleCashOut = (cashoutVal?: number) => {
    if (gameState !== 'FLYING' || !hasBet || hasCashedOut) return;
    const finalMult = cashoutVal || multiplier;
    const payout = Math.floor(betAmount * finalMult);

    setHasCashedOut(true);
    setCashedOutMultiplier(finalMult);
    setWinAmount(payout);
    onUpdateWallet(walletBalance + payout);

    if (!isMuted) soundEffects.playCashOut();
  };

  // Draw 2D Animated Rocket Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let particleOffset = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Draw Grid Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 60; x < w; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 50; y < h; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Origin point (Bottom Left)
      const startX = 50;
      const startY = h - 50;

      if (gameState === 'FLYING' || gameState === 'CRASHED') {
        // Curve trajectory progress from 0.0 to 1.0
        const progress = Math.min(1.0, (multiplier - 1.0) / Math.max(crashPoint, 1.5));
        const currentX = startX + progress * (w - 140);
        const currentY = startY - Math.pow(progress, 0.82) * (h - 130);

        // Gradient Trail under Rocket
        const trailGrad = ctx.createLinearGradient(startX, startY, currentX, currentY);
        trailGrad.addColorStop(0, 'rgba(239, 68, 68, 0.0)');
        trailGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.15)');
        trailGrad.addColorStop(1, gameState === 'CRASHED' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.45)');

        ctx.fillStyle = trailGrad;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(startX + (currentX - startX) * 0.5, startY, currentX, currentY);
        ctx.lineTo(currentX, startY);
        ctx.closePath();
        ctx.fill();

        // Main Trajectory Glow Line
        ctx.strokeStyle = gameState === 'CRASHED' ? '#ef4444' : '#f59e0b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(startX + (currentX - startX) * 0.5, startY, currentX, currentY);
        ctx.stroke();

        // Thruster Flames & Particles
        if (gameState === 'FLYING') {
          particleOffset += 0.2;
          for (let i = 0; i < 6; i++) {
            const pX = currentX - 12 - Math.random() * 22;
            const pY = currentY + 10 + Math.random() * 12;
            const pSize = 3 + Math.random() * 4;
            ctx.fillStyle = i % 2 === 0 ? '#ef4444' : '#fbbf24';
            ctx.beginPath();
            ctx.arc(pX, pY, pSize, 0, Math.PI * 2);
            ctx.fill();
          }

          // Draw Glowing 2D Rocket Icon
          ctx.save();
          ctx.translate(currentX, currentY);
          // Angle following tangent
          const angle = -0.55;
          ctx.rotate(angle);
          ctx.font = '32px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🚀', 0, 0);
          ctx.restore();
        } else if (gameState === 'CRASHED') {
          // Draw Explosion Boom
          ctx.font = '42px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('💥', currentX, currentY);
        }
      } else {
        // Idle on Launchpad
        ctx.font = '36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚀', startX + 20, startY - 15);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [gameState, multiplier, crashPoint]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 20%, #15102a 0%, #080612 100%)',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 90,
        fontFamily: "'Outfit', sans-serif",
        overflow: 'hidden'
      }}
    >
      {/* Top Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          background: 'rgba(15, 12, 32, 0.88)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(245, 158, 11, 0.25)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={onBackToLobby}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f8fafc',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={16} />
            <span>Ke Lounge 3D</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}
            >
              🚀
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, letterSpacing: '0.02em', color: '#fff' }}>
                CRASH AVIATOR 🚀
              </h2>
              <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 600 }}>
                Pengganda Chip Real-Time • Live Multiplayer
              </span>
            </div>
          </div>
        </div>

        {/* Right Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Mute Sound Button */}
          <button
            onClick={() => setIsMuted(prev => !prev)}
            style={{
              padding: '8px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#94a3b8',
              cursor: 'pointer'
            }}
            title={isMuted ? 'Nyalakan Efek Suara' : 'Bisukan Efek Suara'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          {/* Wallet Balance Capsule */}
          <div
            style={{
              padding: '6px 16px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 700 }}>Dompet:</span>
            <span style={{ fontSize: '15px', fontWeight: 900, color: '#fef08a', fontFamily: "'JetBrains Mono', monospace" }}>
              Rp {walletBalance.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </header>

      {/* History Ribbon of Past Multipliers */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 24px',
          background: 'rgba(9, 7, 20, 0.75)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          overflowX: 'auto'
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <History size={13} /> RIWAYAT:
        </span>
        {history.map(item => {
          const isHigh = item.value >= 10.0;
          const isMid = item.value >= 2.0;
          return (
            <span
              key={item.id}
              style={{
                padding: '3px 10px',
                borderRadius: '8px',
                fontSize: '11.5px',
                fontWeight: 900,
                fontFamily: "'JetBrains Mono', monospace",
                background: isHigh
                  ? 'rgba(245, 158, 11, 0.25)'
                  : isMid
                  ? 'rgba(16, 185, 129, 0.2)'
                  : 'rgba(239, 68, 68, 0.2)',
                color: isHigh ? '#fbbf24' : isMid ? '#34d399' : '#f87171',
                border: `1px solid ${isHigh ? 'rgba(245, 158, 11, 0.5)' : isMid ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.3)'}`
              }}
            >
              {item.value.toFixed(2)}x
            </span>
          );
        })}
      </div>

      {/* Main Game Arena */}
      <div style={{ flex: 1, display: 'flex', padding: '16px 24px', gap: '20px', minHeight: 0 }}>
        {/* Left Side: Real-time Rocket Launchpad Display */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            background: 'rgba(13, 10, 28, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 0 60px rgba(0,0,0,0.6)'
          }}
        >
          {/* 2D Canvas */}
          <canvas
            ref={canvasRef}
            width={800}
            height={460}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />

          {/* Center Multiplier Overlay */}
          <div
            style={{
              position: 'absolute',
              top: '42%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none'
            }}
          >
            {gameState === 'BETTING' && (
              <div>
                <div style={{ fontSize: '15px', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Peluncuran Berikutnya Dalam
                </div>
                <div style={{ fontSize: '64px', fontWeight: 900, color: '#fbbf24', textShadow: '0 0 30px rgba(245, 158, 11, 0.6)' }}>
                  {countdown}s
                </div>
                <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                  Pasang taruhan Anda di bawah sekarang!
                </div>
              </div>
            )}

            {gameState === 'FLYING' && (
              <div>
                <div
                  style={{
                    fontSize: 'clamp(54px, 8vw, 84px)',
                    fontWeight: 900,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: '#ffffff',
                    textShadow: '0 0 40px rgba(245, 158, 11, 0.75)'
                  }}
                >
                  {multiplier.toFixed(2)}x
                </div>
                <div style={{ fontSize: '14px', color: '#34d399', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Sedang Terbang Mengangkasa 🚀
                </div>
              </div>
            )}

            {gameState === 'CRASHED' && (
              <div>
                <div style={{ fontSize: '18px', color: '#f87171', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  FLEW AWAY / CRASHED
                </div>
                <div
                  style={{
                    fontSize: 'clamp(54px, 8vw, 84px)',
                    fontWeight: 900,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: '#ef4444',
                    textShadow: '0 0 40px rgba(239, 68, 68, 0.75)'
                  }}
                >
                  @{multiplier.toFixed(2)}x
                </div>
              </div>
            )}
          </div>

          {/* Personal Win Banner when cashed out */}
          {hasCashedOut && (
            <div
              style={{
                position: 'absolute',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95))',
                border: '1px solid #6ee7b7',
                padding: '10px 24px',
                borderRadius: '999px',
                boxShadow: '0 10px 30px rgba(16, 185, 129, 0.5)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '15px',
                fontWeight: 900,
                color: '#fff',
                animation: 'bounce 0.5s ease-out'
              }}
            >
              <Sparkles size={18} />
              <span>BERHASIL CASH OUT @ {cashedOutMultiplier.toFixed(2)}x! +{formatRupiah(winAmount)}</span>
            </div>
          )}
        </div>

        {/* Right Side: Betting Controls & Multi-Player Lounge Bets */}
        <div style={{ width: '360px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Main Action Betting Card */}
          <div
            style={{
              background: 'rgba(15, 12, 32, 0.88)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.5)'
            }}
          >
            {/* Amount input */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1', fontWeight: 600, marginBottom: '6px' }}>
                <span>Jumlah Taruhan:</span>
                <span style={{ color: '#fbbf24' }}>Min Rp 10.000</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  borderRadius: '12px',
                  padding: '8px 14px'
                }}
              >
                <span style={{ color: '#fbbf24', fontWeight: 800, marginRight: '6px' }}>Rp</span>
                <input
                  type="number"
                  disabled={hasBet}
                  value={betAmount}
                  onChange={e => setBetAmount(Math.max(1000, parseInt(e.target.value, 10) || 0))}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: 900,
                    outline: 'none',
                    fontFamily: "'JetBrains Mono', monospace"
                  }}
                />
              </div>

              {/* Quick Chip Presets */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                {[10000, 50000, 100000, 500000].map(val => (
                  <button
                    key={val}
                    disabled={hasBet}
                    onClick={() => setBetAmount(val)}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#cbd5e1',
                      fontSize: '11px',
                      fontWeight: 800,
                      cursor: hasBet ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {val >= 1000000 ? `${val / 1000000}jt` : `${val / 1000}k`}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Cashout Config */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '10px 12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0' }}>Auto Cashout:</span>
                <button
                  disabled={hasBet}
                  onClick={() => setIsAutoCashoutEnabled(prev => !prev)}
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: isAutoCashoutEnabled ? '#10b981' : 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    cursor: hasBet ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isAutoCashoutEnabled ? 'AKTIF' : 'NONAKTIF'}
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="text"
                  disabled={!isAutoCashoutEnabled || hasBet}
                  value={autoCashout}
                  onChange={e => setAutoCashout(e.target.value)}
                  style={{
                    width: '80px',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    color: '#fbbf24',
                    fontWeight: 900,
                    fontSize: '14px',
                    outline: 'none',
                    fontFamily: "'JetBrains Mono', monospace"
                  }}
                />
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#94a3b8' }}>x</span>
                <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px' }}>
                  Otomatis ambil untung saat roket menyentuh angka ini.
                </span>
              </div>
            </div>

            {/* Primary Action Button */}
            {gameState === 'BETTING' ? (
              !hasBet ? (
                <button
                  onClick={handlePlaceBet}
                  style={{
                    height: '56px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#0f172a',
                    border: 'none',
                    fontSize: '16px',
                    fontWeight: 900,
                    letterSpacing: '0.02em',
                    boxShadow: '0 8px 25px rgba(245, 158, 11, 0.45)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Rocket size={18} />
                  <span>PASANG TARUHAN (MULAI dlm {countdown}s)</span>
                </button>
              ) : (
                <button
                  onClick={handleCancelBet}
                  style={{
                    height: '56px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                    color: '#fff',
                    border: 'none',
                    fontSize: '15px',
                    fontWeight: 900,
                    cursor: 'pointer'
                  }}
                >
                  BATALKAN TARUHAN ({formatRupiah(betAmount)})
                </button>
              )
            ) : gameState === 'FLYING' ? (
              hasBet && !hasCashedOut ? (
                <button
                  onClick={() => handleCashOut()}
                  style={{
                    height: '56px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #10b981, #047857)',
                    color: '#fff',
                    border: '2px solid #a7f3d0',
                    fontSize: '18px',
                    fontWeight: 900,
                    letterSpacing: '0.02em',
                    boxShadow: '0 8px 30px rgba(16, 185, 129, 0.65)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'pulse 1.2s infinite'
                  }}
                >
                  <span>CASH OUT SEKARANG!</span>
                  <span style={{ fontSize: '13px', fontWeight: 800, opacity: 0.95 }}>
                    +{formatRupiah(Math.floor(betAmount * multiplier))} (@{multiplier.toFixed(2)}x)
                  </span>
                </button>
              ) : hasCashedOut ? (
                <div
                  style={{
                    height: '56px',
                    borderRadius: '14px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#34d399',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '15px'
                  }}
                >
                  ✓ Sudah Cash Out @ {cashedOutMultiplier.toFixed(2)}x
                </div>
              ) : (
                <div
                  style={{
                    height: '56px',
                    borderRadius: '14px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '13.5px'
                  }}
                >
                  Menonton Penerbangan...
                </div>
              )
            ) : (
              <div
                style={{
                  height: '56px',
                  borderRadius: '14px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#f87171',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '16px'
                }}
              >
                💥 CRASHED @ {multiplier.toFixed(2)}x
              </div>
            )}
          </div>

          {/* Simulated Multiplayer Live Feed in Room */}
          <div
            style={{
              flex: 1,
              background: 'rgba(15, 12, 32, 0.88)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={14} color="#fbbf24" />
                Pemain di Room ({simulatedPlayers.length + (hasBet ? 1 : 0)})
              </span>
              <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 700 }}>● Live</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* Local Player status if betting */}
              {hasBet && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    background: hasCashedOut ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    border: `1px solid ${hasCashedOut ? '#10b981' : '#f59e0b'}`
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#ffffff' }}>
                    {playerName} (Anda)
                  </span>
                  <span style={{ fontSize: '11.5px', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: hasCashedOut ? '#34d399' : '#fbbf24' }}>
                    {hasCashedOut ? `+${formatRupiah(winAmount)} (@${cashedOutMultiplier.toFixed(2)}x)` : formatRupiah(betAmount)}
                  </span>
                </div>
              )}

              {/* Bot Players */}
              {simulatedPlayers.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 10px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)'
                  }}
                >
                  <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>{p.name}</span>
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 800,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: p.cashedOutAt ? '#34d399' : p.hasCrashed ? '#f87171' : '#94a3b8'
                    }}
                  >
                    {p.cashedOutAt
                      ? `@${p.cashedOutAt.toFixed(2)}x (+${formatRupiah(Math.floor(p.bet * p.cashedOutAt))})`
                      : p.hasCrashed
                      ? 'Crashed'
                      : formatRupiah(p.bet)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

