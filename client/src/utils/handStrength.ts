import { Card, Rank } from '../types.js';

const RANK_NAMES: Record<Rank, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'Jack',
  12: 'Queen',
  13: 'King',
  14: 'As'
};

export type HandStrengthTier = 'monster' | 'strong' | 'medium' | 'pair' | 'high';

export interface LiveHandStrength {
  category: number;
  categoryName: string;
  label: string;
  tier: HandStrengthTier;
  bestCards: Card[];
  matchingCards: Card[];
}

interface InternalEval {
  category: number;
  categoryName: string;
  tiebreakers: number[];
  bestCards: Card[];
  matchingCards: Card[];
  label: string;
}

function getTier(category: number): HandStrengthTier {
  if (category >= 6) return 'monster'; // Full House, Four of a Kind, Straight Flush, Royal Flush
  if (category >= 4) return 'strong';  // Straight, Flush
  if (category >= 2) return 'medium';  // Two Pair, Three of a Kind
  if (category === 1) return 'pair';   // One Pair
  return 'high';                       // High Card
}

function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k === arr.length) return [arr];
  if (k === 1) return arr.map(e => [e]);
  if (k === 0 || k > arr.length) return [];

  const head = arr[0];
  const tail = arr.slice(1);

  const withHead = getCombinations(tail, k - 1).map(c => [head, ...c]);
  const withoutHead = getCombinations(tail, k);

  return [...withHead, ...withoutHead];
}

function compareEvals(a: InternalEval, b: InternalEval): number {
  if (a.category !== b.category) {
    return a.category - b.category;
  }
  for (let i = 0; i < Math.max(a.tiebreakers.length, b.tiebreakers.length); i++) {
    const tbA = a.tiebreakers[i] ?? 0;
    const tbB = b.tiebreakers[i] ?? 0;
    if (tbA !== tbB) {
      return tbA - tbB;
    }
  }
  return 0;
}

function evaluate5Cards(cards: Card[]): InternalEval {
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const ranks = sorted.map(c => c.rank);
  const suits = sorted.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);

  let isStraight = false;
  let straightHigh = 0;

  if (
    ranks[0] - ranks[1] === 1 &&
    ranks[1] - ranks[2] === 1 &&
    ranks[2] - ranks[3] === 1 &&
    ranks[3] - ranks[4] === 1
  ) {
    isStraight = true;
    straightHigh = ranks[0];
  } else if (
    ranks[0] === 14 &&
    ranks[1] === 5 &&
    ranks[2] === 4 &&
    ranks[3] === 3 &&
    ranks[4] === 2
  ) {
    isStraight = true;
    straightHigh = 5;
  }

  const counts: Record<number, number> = {};
  for (const r of ranks) {
    counts[r] = (counts[r] || 0) + 1;
  }

  const uniqueRanks = Object.keys(counts).map(Number);
  uniqueRanks.sort((a, b) => {
    const countDiff = counts[b] - counts[a];
    if (countDiff !== 0) return countDiff;
    return b - a;
  });

  const countsList = uniqueRanks.map(r => counts[r]);

  // 1. Royal Flush / Straight Flush
  if (isFlush && isStraight) {
    if (straightHigh === 14) {
      return {
        category: 9,
        categoryName: 'Royal Flush',
        tiebreakers: [14],
        bestCards: sorted,
        matchingCards: sorted,
        label: `Royal Flush (${sorted[0].suit})`
      };
    }
    return {
      category: 8,
      categoryName: 'Straight Flush',
      tiebreakers: [straightHigh],
      bestCards: sorted,
      matchingCards: sorted,
      label: `Straight Flush (${RANK_NAMES[straightHigh as Rank]})`
    };
  }

  // 2. Four of a Kind
  if (countsList[0] === 4) {
    const quadRank = uniqueRanks[0];
    const kicker = uniqueRanks[1];
    return {
      category: 7,
      categoryName: 'Four of a Kind',
      tiebreakers: [quadRank, kicker],
      bestCards: sorted,
      matchingCards: sorted.filter(c => c.rank === quadRank),
      label: `Four of a Kind (${RANK_NAMES[quadRank as Rank]})`
    };
  }

  // 3. Full House
  if (countsList[0] === 3 && countsList[1] === 2) {
    const tripsRank = uniqueRanks[0];
    const pairRank = uniqueRanks[1];
    return {
      category: 6,
      categoryName: 'Full House',
      tiebreakers: [tripsRank, pairRank],
      bestCards: sorted,
      matchingCards: sorted,
      label: `Full House (${RANK_NAMES[tripsRank as Rank]} & ${RANK_NAMES[pairRank as Rank]})`
    };
  }

  // 4. Flush
  if (isFlush) {
    return {
      category: 5,
      categoryName: 'Flush',
      tiebreakers: ranks,
      bestCards: sorted,
      matchingCards: sorted,
      label: `Flush (${sorted[0].suit} ${RANK_NAMES[ranks[0] as Rank]})`
    };
  }

  // 5. Straight
  if (isStraight) {
    return {
      category: 4,
      categoryName: 'Straight',
      tiebreakers: [straightHigh],
      bestCards: sorted,
      matchingCards: sorted,
      label: `Straight (${RANK_NAMES[straightHigh as Rank]} Tertinggi)`
    };
  }

  // 6. Three of a Kind
  if (countsList[0] === 3) {
    const tripsRank = uniqueRanks[0];
    const kickers = [uniqueRanks[1], uniqueRanks[2]];
    return {
      category: 3,
      categoryName: 'Three of a Kind',
      tiebreakers: [tripsRank, ...kickers],
      bestCards: sorted,
      matchingCards: sorted.filter(c => c.rank === tripsRank),
      label: `Three of a Kind (${RANK_NAMES[tripsRank as Rank]})`
    };
  }

  // 7. Two Pair
  if (countsList[0] === 2 && countsList[1] === 2) {
    const highPair = Math.max(uniqueRanks[0], uniqueRanks[1]);
    const lowPair = Math.min(uniqueRanks[0], uniqueRanks[1]);
    const kicker = uniqueRanks[2];
    return {
      category: 2,
      categoryName: 'Two Pair',
      tiebreakers: [highPair, lowPair, kicker],
      bestCards: sorted,
      matchingCards: sorted.filter(c => c.rank === highPair || c.rank === lowPair),
      label: `Two Pair (${RANK_NAMES[highPair as Rank]} & ${RANK_NAMES[lowPair as Rank]})`
    };
  }

  // 8. One Pair
  if (countsList[0] === 2) {
    const pairRank = uniqueRanks[0];
    const kickers = [uniqueRanks[1], uniqueRanks[2], uniqueRanks[3]];
    return {
      category: 1,
      categoryName: 'One Pair',
      tiebreakers: [pairRank, ...kickers],
      bestCards: sorted,
      matchingCards: sorted.filter(c => c.rank === pairRank),
      label: `One Pair (${RANK_NAMES[pairRank as Rank]})`
    };
  }

  // 9. High Card
  return {
    category: 0,
    categoryName: 'High Card',
    tiebreakers: ranks,
    bestCards: sorted,
    matchingCards: [sorted[0]],
    label: `High Card (${RANK_NAMES[ranks[0] as Rank]})`
  };
}

/**
 * Evaluates a player's live hand strength from their hole cards + current community cards.
 */
export function evaluateLiveHandStrength(
  holeCards: Card[],
  communityCards: Card[]
): LiveHandStrength | null {
  if (!holeCards || holeCards.length < 2) {
    return null;
  }

  const allCards = [...holeCards, ...communityCards];

  // Pre-Flop (only 2 hole cards)
  if (allCards.length < 5) {
    const sorted = [...holeCards].sort((a, b) => b.rank - a.rank);
    const [c1, c2] = sorted;

    if (c1.rank === c2.rank) {
      return {
        category: 1,
        categoryName: 'One Pair',
        label: `Pocket Pair (${RANK_NAMES[c1.rank]})`,
        tier: 'pair',
        bestCards: sorted,
        matchingCards: sorted
      };
    }

    const isSuited = c1.suit === c2.suit;
    return {
      category: 0,
      categoryName: 'High Card',
      label: `High Card (${RANK_NAMES[c1.rank]}${isSuited ? ` • ${c1.suit} Suited` : ''})`,
      tier: 'high',
      bestCards: sorted,
      matchingCards: [c1]
    };
  }

  // Flop, Turn, River (5, 6, or 7 cards)
  const combos = getCombinations(allCards, 5);
  let bestEval: InternalEval | null = null;

  for (const combo of combos) {
    const current = evaluate5Cards(combo);
    if (!bestEval || compareEvals(current, bestEval) > 0) {
      bestEval = current;
    }
  }

  if (!bestEval) return null;

  return {
    category: bestEval.category,
    categoryName: bestEval.categoryName,
    label: bestEval.label,
    tier: getTier(bestEval.category),
    bestCards: bestEval.bestCards,
    matchingCards: bestEval.matchingCards
  };
}

export function isCardInList(card: Card | null, list: Card[] | undefined): boolean {
  if (!card || !list || list.length === 0) return false;
  return list.some(c => c.rank === card.rank && c.suit === card.suit);
}

