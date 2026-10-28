import React, { useState } from 'react';
import { Card, PlayerPublic, TableStage } from '../types.js';
import { PlayingCard } from './PlayingCard.js';
import { ChipStack } from './ChipStack.js';
import { formatRupiah } from '../utils/formatters.js';
import { Bot, User, X, Mic } from 'lucide-react';

interface PlayerSeatProps {
  seatIndex: number;
  player: PlayerPublic | null;
  isMe: boolean;
  isMeSeated: boolean;
  myCards: Card[];
  stage: TableStage;
  isActiveTurn: boolean;
  turnTimeRemaining: number;
  turnDuration: number;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  isWinner: boolean;
  winningHandName?: string;
  tipEffect?: { type: 'sent' | 'received'; amount: number; phrase?: string } | null;
  isSpeaking?: boolean;
  onSit: (seatIndex: number) => void;
  onKickBot?: (seatIndex: number) => void;
  onTip?: (seatIndex: number, amount: number) => void;
  stylePosition: { top: string; left: string };
}

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  seatIndex,
  player,
  isMe,
  isMeSeated,
  myCards,
  stage,
  isActiveTurn,
  turnTimeRemaining,
  turnDuration,
  isDealer,
  isSmallBlind,
  isBigBlind,
  isWinner,
  winningHandName,
  tipEffect,
  isSpeaking,
  onSit,
  onKickBot,
  onTip,
  stylePosition
}) => {
  const [showTipMenu, setShowTipMenu] = useState(false);
  // Empty Seat
  if (!player) {
    return (
      <div
        className="seat-anchor"
        style={{ top: stylePosition.top, left: stylePosition.left }}
      >
        <button
          onClick={() => onSit(seatIndex)}
          className="seat-empty-btn"
          title={`Duduk di Kursi #${seatIndex + 1}`}
        >
          <span style={{ fontSize: '20px', lineHeight: 1 }}>+</span>
          <span style={{ fontSize: '11px', fontWeight: 800, marginTop: '2px' }}>Duduk</span>
          <span style={{ fontSize: '9px', opacity: 0.7 }}>#{seatIndex + 1}</span>
        </button>
      </div>
    );
  }

  // Cards to display
  let displayCards: (Card | null)[] = [];
  if (player.showdownCards && player.showdownCards.length > 0) {
    displayCards = player.showdownCards;
  } else if (isMe && myCards.length > 0) {
    displayCards = myCards;
  } else if (player.cardCount > 0 && !player.folded) {
    displayCards = [null, null]; // 2 face down cards fallback
  }

  const timerPercent = turnDuration > 0 ? (turnTimeRemaining / turnDuration) * 100 : 0;

  return (
    <div
      className="seat-anchor"
      style={{ top: stylePosition.top, left: stylePosition.left }}
    >
      {/* Cards container with dealing animations */}
      {displayCards.length > 0 && (
        <div className={`seat-cards-row ${player.folded ? 'folded-cards' : ''}`}>
          {displayCards.map((c, i) => (
            <div
              key={i}
              className={i === 0 ? 'animate-hole-left' : 'animate-hole-right'}
              style={{
                animationDelay: `${i * 120}ms`
              }}
            >
              <PlayingCard
                card={c}
                faceDown={c === null}
                size={isMe ? 'md' : 'sm'}
                isHighlighted={isWinner}
              />
            </div>
          ))}
        </div>
      )}

      {/* Floating Tip Bubble on Seat */}
      {tipEffect && (
        <div className={`seat-tip-floating ${tipEffect.type}`}>
          <span className="tip-amount">
            {tipEffect.type === 'received'
              ? `+Rp ${tipEffect.amount.toLocaleString('id-ID')}`
              : `-Rp ${tipEffect.amount.toLocaleString('id-ID')}`}
          </span>
          <span className="tip-icon">🪙</span>
          {tipEffect.phrase && tipEffect.type === 'received' && (
            <div className="tip-phrase">{tipEffect.phrase}</div>
          )}
        </div>
      )}

      {/* Player Capsule */}
      <div
        className={`player-capsule ${isMe ? 'is-me' : ''} ${isActiveTurn ? 'active-turn' : ''} ${
          isWinner ? 'is-winner' : ''
        } ${player.folded && !player.waitingNextHand ? 'folded' : ''} ${player.waitingNextHand ? 'waiting-next' : ''}`}
      >
        {/* Turn Progress Bar */}
        {isActiveTurn && (
          <div className="turn-bar">
            <div
              className={`turn-progress ${turnTimeRemaining <= 5 ? 'urgent' : ''}`}
              style={{ width: `${timerPercent}%` }}
            />
          </div>
        )}

        {/* Dealer / Blind Badges */}
        <div className="puck-container">
          {isDealer && <span className="puck-badge puck-dealer">D</span>}
          {isSmallBlind && <span className="puck-badge puck-sb">SB</span>}
          {isBigBlind && <span className="puck-badge puck-bb">BB</span>}
        </div>

        {/* Kick Bot Button */}
        {player.isBot && onKickBot && (
          <button
            onClick={() => onKickBot(seatIndex)}
            className="btn-kick-bot"
            title="Keluarkan Bot"
          >
            <X size={11} />
          </button>
        )}

        {/* Tip Opponent Button (Lempar Receh) */}
        {!isMe && isMeSeated && (
          <div className="tip-trigger-wrapper">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowTipMenu(!showTipMenu);
              }}
              className="btn-tip-opponent"
              title={`Lempar receh ke ${player.name}`}
            >
              🪙
            </button>

            {showTipMenu && (
              <div className="tip-popover" onClick={(e) => e.stopPropagation()}>
                <div className="tip-popover-title">Lempar Receh 🪙</div>
                <div className="tip-popover-buttons">
                  <button
                    onClick={() => {
                      onTip?.(seatIndex, 500);
                      setShowTipMenu(false);
                    }}
                    className="btn-tip-chip chip-500"
                    title="Beri Rp 500"
                  >
                    500
                  </button>
                  <button
                    onClick={() => {
                      onTip?.(seatIndex, 1000);
                      setShowTipMenu(false);
                    }}
                    className="btn-tip-chip chip-1k"
                    title="Beri Rp 1.000"
                  >
                    1k
                  </button>
                  <button
                    onClick={() => {
                      onTip?.(seatIndex, 2000);
                      setShowTipMenu(false);
                    }}
                    className="btn-tip-chip chip-2k"
                    title="Beri Rp 2.000"
                  >
                    2k
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Avatar & Player Name */}
        <div className="player-name-row">
          <div
            className={`player-avatar ${isSpeaking ? 'speaking-active' : ''}`}
            style={{
              backgroundColor: player.isBot
                ? '#9333ea'
                : isMe
                ? '#10b981'
                : '#334155',
              color: '#fff',
              position: 'relative'
            }}
          >
            {player.isBot ? <Bot size={11} /> : <User size={11} />}
            {isSpeaking && (
              <span
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-3px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#10b981',
                  border: '1.5px solid #0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '7px'
                }}
                title="Sedang Berbicara"
              >
                🎙️
              </span>
            )}
          </div>
          <span className="player-name" style={{ color: isSpeaking ? '#34d399' : undefined }}>
            {player.name} {isMe && '(Anda)'}
          </span>
        </div>

        {/* Chip Balance */}
        <div className="player-chips">{formatRupiah(player.chips)}</div>

        {/* Ready Badge in WAITING stage or In-game Actions */}
        {stage === 'WAITING' ? (
          <span
            className="action-badge"
            style={{
              backgroundColor: player.isReady ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.2)',
              color: player.isReady ? '#34d399' : '#fbbf24',
              border: `1px solid ${player.isReady ? 'rgba(16, 185, 129, 0.5)' : 'rgba(245, 158, 11, 0.4)'}`
            }}
          >
            {player.isReady ? '✅ READY' : '⏳ BELUM READY'}
          </span>
        ) : player.waitingNextHand ? (
          <span
            className="action-badge"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.2)',
              color: '#fbbf24',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              fontSize: '8.5px',
              padding: '2px 6px'
            }}
          >
            ⏳ MENUNGGU
          </span>
        ) : player.folded ? (
          <span className="action-badge fold">FOLDED</span>
        ) : player.isAllIn ? (
          <span className="action-badge allin">ALL-IN</span>
        ) : player.lastAction ? (
          <span className="action-badge">{player.lastAction}</span>
        ) : null}

        {/* Hand description (combination) display at Showdown or Folded */}
        {player.handDescription && (stage === 'SHOWDOWN' || (player.folded && !player.waitingNextHand)) && !isWinner && (
          <div
            style={{
              fontSize: '9px',
              fontWeight: 700,
              color: player.folded ? '#94a3b8' : '#cbd5e1',
              marginTop: '3px',
              textAlign: 'center',
              lineHeight: 1.2
            }}
          >
            {player.handDescription}
          </div>
        )}

        {/* Winning Hand Display */}
        {isWinner && winningHandName && (
          <div
            style={{
              fontSize: '9px',
              fontWeight: 900,
              color: '#fef08a',
              marginTop: '2px',
              textAlign: 'center'
            }}
          >
            🏆 {winningHandName}
          </div>
        )}
      </div>

      {/* Floating Bet Stack */}
      {player.currentBet > 0 && (
        <div className="seat-bet-row">
          <ChipStack amount={player.currentBet} size="sm" />
        </div>
      )}
    </div>
  );
};
