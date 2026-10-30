import { useState, useEffect } from 'react';
import { ArrowLeft, Volume2, VolumeX, RefreshCw, Trophy, AlertTriangle, Sparkles, User, Bot } from 'lucide-react';
import { formatRupiah } from '../utils/formatters.js';
import { soundEffects } from '../utils/soundEffects.js';

interface BlackjackGameProps {
  walletBalance: number;
  onUpdateWallet: (newBalance: number) => void;
  onBackToLobby: () => void;
  playerName: string;
}

interface Card {
  suit: '♠' | '♥' | '♦' | '♣';
  rank: string;
  value: number;
}

type RoundStatus = 'BETTING' | 'PLAYER_TURN' | 'DEALER_TURN' | 'ROUND_OVER';

const SUITS: ('♠' | '♥' | '♦' | '♣')[] = ['♠', '♥', '♦', '♣'];
const RANKS = [
  { rank: 'A', value: 11 },
  { rank: '2', value: 2 },
  { rank: '3', value: 3 },
  { rank: '4', value: 4 },
  { rank: '5', value: 5 },
  { rank: '6', value: 6 },
  { rank: '7', value: 7 },
  { rank: '8', value: 8 },
  { rank: '9', value: 9 },
  { rank: '10', value: 10 },
  { rank: 'J', value: 10 },
  { rank: 'Q', value: 10 },
  { rank: 'K', value: 10 }
];

export const BlackjackGame: React.FC<BlackjackGameProps> = ({
  walletBalance,
  onUpdateWallet,
  onBackToLobby,
  playerName
}) => {
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [botHand, setBotHand] = useState<Card[]>([]);

  const [betAmount, setBetAmount] = useState<number>(50000);
  const [currentBet, setCurrentBet] = useState<number>(0);
  const [roundStatus, setRoundStatus] = useState<RoundStatus>('BETTING');
  const [resultMessage, setResultMessage] = useState<string>('');
  const [payoutAmount, setPayoutAmount] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Stats
  const [streak, setStreak] = useState<number>(0);
  const [handsWon, setHandsWon] = useState<number>(0);

  // Initialize a fresh 4-deck shoe shuffled
  const createShuffledDeck = (): Card[] => {
    const newDeck: Card[] = [];
    for (let d = 0; d < 4; d++) {
      for (const suit of SUITS) {
        for (const r of RANKS) {
          newDeck.push({ suit, rank: r.rank, value: r.value });
        }
      }
    }
    // Fisher-Yates shuffle
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
  };

  useEffect(() => {
    setDeck(createShuffledDeck());
  }, []);

  // Calculate hand score with flexible Ace (11 or 1)
  const calculateScore = (hand: Card[]): { score: number; isSoft: boolean; isBlackjack: boolean } => {
    let total = 0;
    let aces = 0;

    for (const card of hand) {
      total += card.value;
      if (card.rank === 'A') aces += 1;
    }

    while (total > 21 && aces > 0) {
      total -= 10;
      aces -= 1;
    }

    const isBlackjack = hand.length === 2 && total === 21;
    return { score: total, isSoft: aces > 0, isBlackjack };
  };

  const drawCard = (currentDeck: Card[]): { card: Card; remainingDeck: Card[] } => {
    let d = currentDeck;
    if (d.length < 15) {
      d = createShuffledDeck();
    }
    const card = d[0];
    const remainingDeck = d.slice(1);
    return { card, remainingDeck };
  };

  // Deal initial cards
  const handleDeal = () => {
    if (betAmount > walletBalance) {
      alert('Saldo dompet tidak mencukupi untuk memasang taruhan ini.');
      return;
    }
    if (betAmount <= 0) return;

    onUpdateWallet(walletBalance - betAmount);
    setCurrentBet(betAmount);

    let activeDeck = deck;
    const pCards: Card[] = [];
    const dCards: Card[] = [];
    const bCards: Card[] = [];

    // Deal Player Card 1
    let draw = drawCard(activeDeck);
    pCards.push(draw.card);
    activeDeck = draw.remainingDeck;

    // Deal Bot Card 1
    draw = drawCard(activeDeck);
    bCards.push(draw.card);
    activeDeck = draw.remainingDeck;

    // Deal Dealer Card 1 (Face Up)
    draw = drawCard(activeDeck);
    dCards.push(draw.card);
    activeDeck = draw.remainingDeck;

    // Deal Player Card 2
    draw = drawCard(activeDeck);
    pCards.push(draw.card);
    activeDeck = draw.remainingDeck;

    // Deal Bot Card 2
    draw = drawCard(activeDeck);
    bCards.push(draw.card);
    activeDeck = draw.remainingDeck;

    // Deal Dealer Card 2 (Hole Card - Hidden)
    draw = drawCard(activeDeck);
    dCards.push(draw.card);
    activeDeck = draw.remainingDeck;

    setDeck(activeDeck);
    setPlayerHand(pCards);
    setDealerHand(dCards);
    setBotHand(bCards);
    setResultMessage('');
    setPayoutAmount(0);

    if (!isMuted) soundEffects.playCardDeal();

    // Check for Instant Natural Blackjack
    const playerCheck = calculateScore(pCards);
    const dealerCheck = calculateScore(dCards);

    if (playerCheck.isBlackjack) {
      setRoundStatus('ROUND_OVER');
      if (dealerCheck.isBlackjack) {
        // Push
        setResultMessage('PUSH (Keduanya Blackjack!)');
        setPayoutAmount(betAmount);
        onUpdateWallet(walletBalance);
      } else {
        // Player Natural 3:2 payout
        const win = Math.floor(betAmount * 2.5);
        setResultMessage('BLACKJACK ALAMI! Bayaran 3:2 👑');
        setPayoutAmount(win);
        setStreak(prev => prev + 1);
        setHandsWon(prev => prev + 1);
        onUpdateWallet(walletBalance - betAmount + win);
        if (!isMuted) soundEffects.playBlackjackWin();
      }
    } else {
      setRoundStatus('PLAYER_TURN');
    }
  };

  // Player Hits (Take another card)
  const handleHit = () => {
    if (roundStatus !== 'PLAYER_TURN') return;

    const { card, remainingDeck } = drawCard(deck);
    const newHand = [...playerHand, card];
    setDeck(remainingDeck);
    setPlayerHand(newHand);

    if (!isMuted) soundEffects.playCardDeal();

    const { score } = calculateScore(newHand);
    if (score > 21) {
      // BUST
      setRoundStatus('ROUND_OVER');
      setResultMessage('BUST! Nilai kartu melebihi 21.');
      setPayoutAmount(0);
      setStreak(0);
      if (!isMuted) soundEffects.playBust();
    } else if (score === 21) {
      // Auto Stand on 21
      handleStand(newHand, remainingDeck);
    }
  };

  // Player Double Down (Double bet, take exactly 1 card, then stand)
  const handleDoubleDown = () => {
    if (roundStatus !== 'PLAYER_TURN' || playerHand.length !== 2) return;
    if (walletBalance < currentBet) {
      alert('Saldo dompet tidak mencukupi untuk Double Down.');
      return;
    }

    onUpdateWallet(walletBalance - currentBet);
    const newTotalBet = currentBet * 2;
    setCurrentBet(newTotalBet);

    const { card, remainingDeck } = drawCard(deck);
    const newHand = [...playerHand, card];
    setDeck(remainingDeck);
    setPlayerHand(newHand);

    if (!isMuted) soundEffects.playCardDeal();

    const { score } = calculateScore(newHand);
    if (score > 21) {
      setRoundStatus('ROUND_OVER');
      setResultMessage('BUST saat Double Down! Nilai kartu melebihi 21.');
      setPayoutAmount(0);
      setStreak(0);
      if (!isMuted) soundEffects.playBust();
    } else {
      handleStand(newHand, remainingDeck, newTotalBet);
    }
  };

  // Player Stands (Dealer's turn)
  const handleStand = (
    currentPHand: Card[] = playerHand,
    currentDeck: Card[] = deck,
    activeBet: number = currentBet
  ) => {
    setRoundStatus('DEALER_TURN');

    let dCards = [...dealerHand];
    let dDeck = currentDeck;

    // Dealer draws until hard 17 or higher
    let dScore = calculateScore(dCards).score;

    while (dScore < 17) {
      const { card, remainingDeck } = drawCard(dDeck);
      dCards.push(card);
      dDeck = remainingDeck;
      dScore = calculateScore(dCards).score;
    }

    setDeck(dDeck);
    setDealerHand(dCards);

    const pScore = calculateScore(currentPHand).score;
    const finalDealerScore = calculateScore(dCards).score;

    setRoundStatus('ROUND_OVER');

    // Evaluate Outcome
    if (finalDealerScore > 21) {
      // Dealer Busts -> Player Wins!
      const win = activeBet * 2;
      setResultMessage('DEALER BUST! Anda Menang 🎉');
      setPayoutAmount(win);
      setStreak(prev => prev + 1);
      setHandsWon(prev => prev + 1);
      onUpdateWallet(walletBalance - currentBet + win);
      if (!isMuted) soundEffects.playBlackjackWin();
    } else if (pScore > finalDealerScore) {
      // Player Higher
      const win = activeBet * 2;
      setResultMessage(`MENANG! (${pScore} vs Dealer ${finalDealerScore}) 🎉`);
      setPayoutAmount(win);
      setStreak(prev => prev + 1);
      setHandsWon(prev => prev + 1);
      onUpdateWallet(walletBalance - currentBet + win);
      if (!isMuted) soundEffects.playBlackjackWin();
    } else if (pScore < finalDealerScore) {
      // Dealer Higher
      setResultMessage(`KALAH! Dealer menang (${finalDealerScore} vs ${pScore})`);
      setPayoutAmount(0);
      setStreak(0);
      if (!isMuted) soundEffects.playBust();
    } else {
      // Push (Tie)
      setResultMessage(`PUSH! Seri pada ${pScore}. Modal dikembalikan.`);
      setPayoutAmount(activeBet);
      onUpdateWallet(walletBalance - currentBet + activeBet);
    }
  };

  // Card Rendering Helper
  const renderCard = (card: Card, isHoleCard: boolean = false) => {
    if (isHoleCard && (roundStatus === 'PLAYER_TURN' || roundStatus === 'BETTING')) {
      return (
        <div
          style={{
            width: '64px',
            height: '92px',
            borderRadius: '10px',
            background: 'repeating-linear-gradient(45deg, #1e1b4b, #1e1b4b 10px, #312e81 10px, #312e81 20px)',
            border: '2px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 8px 18px rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fbbf24',
            fontSize: '22px'
          }}
        >
          ♠
        </div>
      );
    }

    const isRed = card.suit === '♥' || card.suit === '♦';

    return (
      <div
        style={{
          width: '64px',
          height: '92px',
          borderRadius: '10px',
          background: '#ffffff',
          color: isRed ? '#dc2626' : '#0f172a',
          padding: '6px 8px',
          boxShadow: '0 8px 18px rgba(0,0,0,0.6)',
          border: '1.5px solid #cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '15px', fontWeight: 900, lineHeight: 1 }}>{card.rank}</span>
          <span style={{ fontSize: '13px', lineHeight: 1 }}>{card.suit}</span>
        </div>
        <div style={{ textAlign: 'center', fontSize: '26px', lineHeight: 1 }}>
          {card.suit}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', transform: 'rotate(180deg)' }}>
          <span style={{ fontSize: '15px', fontWeight: 900, lineHeight: 1 }}>{card.rank}</span>
          <span style={{ fontSize: '13px', lineHeight: 1 }}>{card.suit}</span>
        </div>
      </div>
    );
  };

  const playerScoreInfo = calculateScore(playerHand);
  const dealerScoreInfo = calculateScore(dealerHand);
  const visibleDealerScore =
    roundStatus === 'PLAYER_TURN' && dealerHand.length >= 1
      ? dealerHand[0].value
      : dealerScoreInfo.score;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 30%, #063826 0%, #021a11 65%, #010d08 100%)',
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
          background: 'rgba(2, 26, 17, 0.88)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(16, 185, 129, 0.3)'
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
                background: 'linear-gradient(135deg, #10b981, #047857)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}
            >
              🃏
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#fff' }}>
                BLACKJACK 21 VIP
              </h2>
              <span style={{ fontSize: '11px', color: '#6ee7b7', fontWeight: 600 }}>
                Meja Kasino Melawan Dealer • Bayaran Blackjack 3:2
              </span>
            </div>
          </div>
        </div>

        {/* Right Stats & Wallet */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            title={isMuted ? 'Nyalakan Suara' : 'Bisukan Suara'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          {streak > 0 && (
            <div
              style={{
                padding: '6px 14px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                fontSize: '12px',
                fontWeight: 800,
                color: '#fbbf24'
              }}
            >
              🔥 Win Streak: {streak}x
            </div>
          )}

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

      {/* Main Blackjack Table Arena */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          position: 'relative'
        }}
      >
        {/* Table Felt Oval Border */}
        <div
          style={{
            position: 'absolute',
            inset: '16px 32px',
            borderRadius: '260px 260px 120px 120px',
            border: '20px solid #1f140e',
            boxShadow: '0 30px 80px rgba(0,0,0,0.9), inset 0 0 100px rgba(0,0,0,0.8)',
            pointerEvents: 'none'
          }}
        />

        {/* Dealer Zone (Top Center) */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '5px 16px',
              borderRadius: '999px',
              background: 'rgba(0, 0, 0, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              marginBottom: '10px'
            }}
          >
            <Bot size={15} color="#fbbf24" />
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>DEALER ROY</span>
            {dealerHand.length > 0 && (
              <span style={{ fontSize: '12px', fontWeight: 900, color: '#34d399', marginLeft: '4px' }}>
                ({visibleDealerScore})
              </span>
            )}
          </div>

          {/* Dealer Cards */}
          <div style={{ display: 'flex', gap: '10px', minHeight: '92px' }}>
            {dealerHand.map((card, idx) => (
              <div key={idx}>{renderCard(card, idx === 1)}</div>
            ))}
          </div>
        </div>

        {/* Table Center Watermark & Rules */}
        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', userSelect: 'none' }}>
          <div style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '0.12em', color: 'rgba(255, 255, 255, 0.15)' }}>
            BLACKJACK PAYS 3 TO 2
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(251, 191, 36, 0.4)', marginTop: '4px' }}>
            Dealer must stand on 17 and must draw to 16
          </div>

          {/* Round Result Announcement Banner */}
          {resultMessage && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px 28px',
                borderRadius: '16px',
                background: payoutAmount > 0
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(4, 120, 87, 0.95))'
                  : 'linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(185, 28, 28, 0.95))',
                border: `1.5px solid ${payoutAmount > 0 ? '#6ee7b7' : '#fca5a5'}`,
                boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                fontSize: '16px',
                fontWeight: 900,
                color: '#fff',
                animation: 'slideUp 0.25s ease-out'
              }}
            >
              {resultMessage}
              {payoutAmount > 0 && ` (+${formatRupiah(payoutAmount)})`}
            </div>
          )}
        </div>

        {/* Player Zone (Bottom Center) */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Player Cards */}
          <div style={{ display: 'flex', gap: '10px', minHeight: '92px', marginBottom: '10px' }}>
            {playerHand.map((card, idx) => (
              <div key={idx}>{renderCard(card, false)}</div>
            ))}
          </div>

          {/* Player Score & Identity */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 20px',
              borderRadius: '999px',
              background: 'rgba(0, 0, 0, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.16)'
            }}
          >
            <User size={15} color="#34d399" />
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>{playerName} (Anda)</span>
            {playerHand.length > 0 && (
              <span style={{ fontSize: '14px', fontWeight: 900, color: '#fbbf24', marginLeft: '4px' }}>
                Score: {playerScoreInfo.score} {playerScoreInfo.isBlackjack ? '👑 (BJ)' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <footer
        style={{
          padding: '14px 24px',
          background: 'rgba(2, 26, 17, 0.92)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 20
        }}
      >
        {/* Chips Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 700, marginRight: '4px' }}>Pasang Taruhan:</span>
          {[10000, 50000, 100000, 250000, 500000].map(val => (
            <button
              key={val}
              disabled={roundStatus === 'PLAYER_TURN' || roundStatus === 'DEALER_TURN'}
              onClick={() => setBetAmount(val)}
              style={{
                padding: '6px 14px',
                borderRadius: '10px',
                background: betAmount === val ? 'linear-gradient(135deg, #fbbf24, #d97706)' : 'rgba(255, 255, 255, 0.08)',
                color: betAmount === val ? '#0f172a' : '#f8fafc',
                border: betAmount === val ? '1px solid #fef08a' : '1px solid rgba(255, 255, 255, 0.14)',
                fontSize: '12px',
                fontWeight: 900,
                cursor: roundStatus === 'PLAYER_TURN' ? 'not-allowed' : 'pointer'
              }}
            >
              {formatRupiah(val)}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {roundStatus === 'BETTING' || roundStatus === 'ROUND_OVER' ? (
            <button
              onClick={handleDeal}
              style={{
                height: '46px',
                padding: '0 28px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                border: 'none',
                fontSize: '15px',
                fontWeight: 900,
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
                cursor: 'pointer'
              }}
            >
              BAGIKAN KARTU ({formatRupiah(betAmount)})
            </button>
          ) : roundStatus === 'PLAYER_TURN' ? (
            <>
              {/* HIT */}
              <button
                onClick={handleHit}
                style={{
                  height: '46px',
                  padding: '0 24px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10b981, #047857)',
                  color: '#fff',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)'
                }}
              >
                HIT (+1 KARTU)
              </button>

              {/* STAND */}
              <button
                onClick={() => handleStand()}
                style={{
                  height: '46px',
                  padding: '0 24px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                  color: '#fff',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(239, 68, 68, 0.35)'
                }}
              >
                STAND (CUKUP)
              </button>

              {/* DOUBLE DOWN (Only available on first 2 cards) */}
              {playerHand.length === 2 && walletBalance >= currentBet && (
                <button
                  onClick={handleDoubleDown}
                  style={{
                    height: '46px',
                    padding: '0 22px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#0f172a',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(245, 158, 11, 0.4)'
                  }}
                >
                  DOUBLE DOWN 2X
                </button>
              )}
            </>
          ) : (
            <div style={{ color: '#fbbf24', fontWeight: 800, fontSize: '14px' }}>
              Dealer sedang membuka kartu...
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};

