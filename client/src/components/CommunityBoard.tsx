import React from 'react';
import { Card, PlayerPublic, TableStage, WinnerResult } from '../types.js';
import { PlayingCard } from './PlayingCard.js';
import { ChipStack } from './ChipStack.js';
import { isCardInList } from '../utils/handStrength.js';
import { Trophy, Clock } from 'lucide-react';

interface CommunityBoardProps {
  communityCards: Card[];
  pot: number;
  stage: TableStage;
  winners?: WinnerResult[];
  seats?: (PlayerPublic | null)[];
  waitingCountdown?: number;
  highlightedCards?: Card[];
}

export const CommunityBoard: React.FC<CommunityBoardProps> = ({
  communityCards,
  pot,
  stage,
  winners,
  seats = [],
  waitingCountdown,
  highlightedCards
}) => {
  const slots: (Card | null)[] = [
    communityCards[0] ?? null,
    communityCards[1] ?? null,
    communityCards[2] ?? null,
    communityCards[3] ?? null,
    communityCards[4] ?? null
  ];

  const seatedPlayers = seats.filter((p): p is PlayerPublic => p !== null && !p.isSittingOut && p.chips > 0);
  const readyPlayers = seatedPlayers.filter(p => p.isReady);

  const getStageLabel = () => {
    if (stage === 'WAITING') {
      if (seatedPlayers.length < 2) {
        return 'Menunggu Pemain Lain (Minimal 2 Kursi)';
      }
      if (waitingCountdown) {
        return `Ronde Baru Dimulai dalam ${waitingCountdown}s (${readyPlayers.length}/${seatedPlayers.length} Siap)`;
      }
      return `Menunggu Semua Pemain Ready (${readyPlayers.length}/${seatedPlayers.length} Siap)`;
    }

    const stageLabels: Record<TableStage, string> = {
      WAITING: 'Menunggu Pemain',
      PREFLOP: 'Pre-Flop (Taruhan Awal)',
      FLOP: 'Flop (3 Kartu Meja)',
      TURN: 'Turn (Kartu ke-4)',
      RIVER: 'River (Kartu Terakhir)',
      SHOWDOWN: 'Showdown & Pemenang'
    };
    return stageLabels[stage];
  };

  return (
    <div className="community-board">
      {/* Game Stage Badge */}
      <div
        className="stage-badge"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          borderColor: stage === 'WAITING' && seatedPlayers.length >= 2 && readyPlayers.length < seatedPlayers.length ? 'rgba(245, 158, 11, 0.4)' : undefined,
          color: stage === 'WAITING' && seatedPlayers.length >= 2 && readyPlayers.length < seatedPlayers.length ? '#fcd34d' : undefined
        }}
      >
        {stage === 'WAITING' && seatedPlayers.length >= 2 && readyPlayers.length < seatedPlayers.length && (
          <Clock size={13} className="animate-spin-slow" />
        )}
        <span>{getStageLabel()}</span>
      </div>

      {/* Main Pot Display */}
      {pot > 0 && (
        <div className="pot-row">
          <ChipStack amount={pot} label="TOTAL POT" size="lg" />
        </div>
      )}

      {/* 5 Community Cards Grid */}
      <div className="cards-container">
        {slots.map((card, idx) => (
          <div key={`${idx}-${card ? `${card.suit}-${card.rank}` : 'empty'}`} style={{ position: 'relative' }}>
            {card ? (
              <div
                className="community-card-wrapper"
                style={{
                  animationDelay: `${idx < 3 ? idx * 140 : 0}ms`
                }}
              >
                <PlayingCard
                  card={card}
                  size="md"
                  isHighlighted={isCardInList(card, highlightedCards)}
                />
              </div>
            ) : (
              <div className="card-slot-placeholder">
                {idx < 3 ? 'FLOP' : idx === 3 ? 'TURN' : 'RIVER'}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Winner announcement overlay */}
      {stage === 'SHOWDOWN' && winners && winners.length > 0 && (
        <div className="winner-banner">
          <Trophy size={18} />
          <span>
            {winners.map(w => `${w.playerName} Menang (${w.handName})`).join(' & ')}
          </span>
        </div>
      )}
    </div>
  );
};
