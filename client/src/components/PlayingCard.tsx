import React from 'react';
import { Card } from '../types.js';
import { isRedSuit, rankToString } from '../utils/formatters.js';

interface PlayingCardProps {
  card?: Card | null;
  faceDown?: boolean;
  isHighlighted?: boolean;
  isWinnerGold?: boolean;
  isDimmed?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  faceDown = false,
  isHighlighted = false,
  isWinnerGold = false,
  isDimmed = false,
  size = 'md',
  className = ''
}) => {
  const isHidden = faceDown || !card;
  const isRed = card ? isRedSuit(card.suit) : false;
  const rankStr = card ? rankToString(card.rank) : '';

  const sizeClass = size === 'sm' ? 'card-unit-sm' : size === 'lg' ? 'card-unit-lg' : 'card-unit-md';

  if (isHidden) {
    return (
      <div className={`card-unit ${sizeClass} card-face-down ${isDimmed ? 'card-dimmed' : ''} ${className}`}>
        <div className="card-back-pattern">
          <span>♠♦♥♣</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`card-unit ${sizeClass} card-face-up ${
        isWinnerGold ? 'card-winner-gold' : isHighlighted ? 'card-highlighted' : isDimmed ? 'card-dimmed' : ''
      } ${className}`}
    >
      {isWinnerGold && (
        <span className="winner-card-pill">👑 COMBO</span>
      )}

      {/* Top Left Corner */}
      <div className={`card-corner ${isRed ? 'suit-red' : 'suit-black'}`}>
        <span>{rankStr}</span>
        <span style={{ fontSize: '1.1em' }}>{card.suit}</span>
      </div>

      {/* Center Watermark */}
      <div className={`card-center-watermark ${isRed ? 'suit-red' : 'suit-black'}`}>
        {card.suit}
      </div>

      {/* Bottom Right Corner */}
      <div className={`card-corner bottom ${isRed ? 'suit-red' : 'suit-black'}`}>
        <span>{rankStr}</span>
        <span style={{ fontSize: '1.1em' }}>{card.suit}</span>
      </div>
    </div>
  );
};
