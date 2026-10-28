import { Card, HandEvaluation, Rank } from './types.js';

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

export class HandEvaluator {
  /**
   * Evaluates the best 5-card poker hand from 5, 6, or 7 cards.
   */
  public static evaluate(cards: Card[]): HandEvaluation {
    if (cards.length < 5) {
      throw new Error(`Minimal butuh 5 kartu untuk evaluasi, diterima: ${cards.length}`);
    }

    const fiveCardCombos = this.getCombinations(cards, 5);
    let bestHand: HandEvaluation | null = null;

    for (const combo of fiveCardCombos) {
      const evaluation = this.evaluate5Cards(combo);
      if (!bestHand || this.compareHands(evaluation, bestHand) > 0) {
        bestHand = evaluation;
      }
    }

    return bestHand!;
  }

  /**
   * Compares hand A vs hand B.
   * Returns > 0 if A wins, < 0 if B wins, 0 if tie.
   */
  public static compareHands(a: HandEvaluation, b: HandEvaluation): number {
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

  /**
   * Evaluates exactly 5 cards.
   */
  private static evaluate5Cards(cards: Card[]): HandEvaluation {
    const sorted = [...cards].sort((a, b) => b.rank - a.rank);
    const ranks = sorted.map(c => c.rank);
    const suits = sorted.map(c => c.suit);

    const isFlush = suits.every(s => s === suits[0]);

    // Check straight
    let isStraight = false;
    let straightHigh = 0;

    // Normal straight (ranks differ by 1)
    if (
      ranks[0] - ranks[1] === 1 &&
      ranks[1] - ranks[2] === 1 &&
      ranks[2] - ranks[3] === 1 &&
      ranks[3] - ranks[4] === 1
    ) {
      isStraight = true;
      straightHigh = ranks[0];
    } else if (
      // A-2-3-4-5 straight (Wheel straight, Ace counts as 1)
      ranks[0] === 14 &&
      ranks[1] === 5 &&
      ranks[2] === 4 &&
      ranks[3] === 3 &&
      ranks[4] === 2
    ) {
      isStraight = true;
      straightHigh = 5; // In A-2-3-4-5, 5 is the high card
    }

    // Rank counts
    const counts: Record<number, number> = {};
    for (const r of ranks) {
      counts[r] = (counts[r] || 0) + 1;
    }

    const uniqueRanks = Object.keys(counts).map(Number);
    // Sort unique ranks by count descending, then rank descending
    uniqueRanks.sort((a, b) => {
      const countDiff = counts[b] - counts[a];
      if (countDiff !== 0) return countDiff;
      return b - a;
    });

    const countsList = uniqueRanks.map(r => counts[r]);

    // 1. Straight Flush / Royal Flush
    if (isFlush && isStraight) {
      if (straightHigh === 14) {
        return {
          category: 9,
          categoryName: 'Royal Flush',
          tiebreakers: [14],
          bestCards: sorted,
          description: `Royal Flush (${sorted[0].suit})`
        };
      }
      return {
        category: 8,
        categoryName: 'Straight Flush',
        tiebreakers: [straightHigh],
        bestCards: sorted,
        description: `Straight Flush (${RANK_NAMES[straightHigh as Rank]} Tertinggi)`
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
        description: `Four of a Kind (${RANK_NAMES[quadRank as Rank]})`
      };
    }

    // 3. Full House (3 + 2)
    if (countsList[0] === 3 && countsList[1] === 2) {
      const tripsRank = uniqueRanks[0];
      const pairRank = uniqueRanks[1];
      return {
        category: 6,
        categoryName: 'Full House',
        tiebreakers: [tripsRank, pairRank],
        bestCards: sorted,
        description: `Full House (${RANK_NAMES[tripsRank as Rank]} penuh ${RANK_NAMES[pairRank as Rank]})`
      };
    }

    // 4. Flush
    if (isFlush) {
      return {
        category: 5,
        categoryName: 'Flush',
        tiebreakers: ranks,
        bestCards: sorted,
        description: `Flush (${RANK_NAMES[ranks[0] as Rank]} Tertinggi, ${sorted[0].suit})`
      };
    }

    // 5. Straight
    if (isStraight) {
      return {
        category: 4,
        categoryName: 'Straight',
        tiebreakers: [straightHigh],
        bestCards: sorted,
        description: `Straight (${RANK_NAMES[straightHigh as Rank]} Tertinggi)`
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
        description: `Three of a Kind (${RANK_NAMES[tripsRank as Rank]})`
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
        description: `Two Pair (${RANK_NAMES[highPair as Rank]} dan ${RANK_NAMES[lowPair as Rank]})`
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
        description: `One Pair (${RANK_NAMES[pairRank as Rank]})`
      };
    }

    // 9. High Card
    return {
      category: 0,
      categoryName: 'High Card',
      tiebreakers: ranks,
      bestCards: sorted,
      description: `High Card (${RANK_NAMES[ranks[0] as Rank]})`
    };
  }

  /**
   * Helper to generate combinations of k items from array
   */
  private static getCombinations<T>(arr: T[], k: number): T[][] {
    if (k === arr.length) return [arr];
    if (k === 1) return arr.map(e => [e]);
    if (k === 0 || k > arr.length) return [];

    const head = arr[0];
    const tail = arr.slice(1);

    const withHead = this.getCombinations(tail, k - 1).map(c => [head, ...c]);
    const withoutHead = this.getCombinations(tail, k);

    return [...withHead, ...withoutHead];
  }
}
