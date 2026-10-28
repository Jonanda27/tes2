import { Card, TableStage } from './types.js';
import { HandEvaluator } from './HandEvaluator.js';

export interface BotDecision {
  action: 'FOLD' | 'CHECK' | 'CALL' | 'RAISE';
  amount?: number;
}

export class BotAI {
  /**
   * Decides action for a bot player given table state
   */
  public static decide(
    holeCards: Card[],
    communityCards: Card[],
    stage: TableStage,
    currentHighestBet: number,
    botCurrentBet: number,
    botChips: number,
    minRaise: number,
    pot: number
  ): BotDecision {
    const callCost = currentHighestBet - botCurrentBet;
    const canCheck = callCost <= 0;

    // Fallback if cards not yet dealt
    if (!holeCards || holeCards.length < 2) {
      return canCheck ? { action: 'CHECK' } : { action: 'CALL' };
    }

    // Calculate rough strength
    if (stage === 'PREFLOP') {
      const [c1, c2] = holeCards;
      if (!c1 || !c2) {
        return canCheck ? { action: 'CHECK' } : { action: 'CALL' };
      }
      const isPair = c1.rank === c2.rank;
      const highRank = Math.max(c1.rank, c2.rank);
      const lowRank = Math.min(c1.rank, c2.rank);
      const isSuited = c1.suit === c2.suit;

      // Premium hands: AA, KK, QQ, JJ, AK
      if ((isPair && highRank >= 11) || (highRank === 14 && lowRank >= 13)) {
        if (botChips > minRaise && Math.random() < 0.7) {
          const raiseAmount = Math.min(botChips, currentHighestBet + minRaise * 2);
          return { action: 'RAISE', amount: raiseAmount };
        }
        return canCheck ? { action: 'CHECK' } : { action: 'CALL' };
      }

      // Medium hands: TT-77, AQ, AJ, KQ, suited connectors
      if ((isPair && highRank >= 7) || (highRank >= 12 && lowRank >= 10) || (isSuited && highRank >= 10)) {
        if (callCost <= botChips * 0.15) {
          return canCheck ? { action: 'CHECK' } : { action: 'CALL' };
        }
        return canCheck ? { action: 'CHECK' } : { action: 'FOLD' };
      }

      // Weak hands: Fold if cost is significant, otherwise check/limp
      if (canCheck) return { action: 'CHECK' };
      if (callCost <= botChips * 0.05 && Math.random() < 0.4) {
        return { action: 'CALL' };
      }
      return { action: 'FOLD' };
    }

    // Post-flop (FLOP, TURN, RIVER)
    const allCards = [...holeCards, ...communityCards];
    if (allCards.length < 5) {
      return canCheck ? { action: 'CHECK' } : { action: 'CALL' };
    }
    const evalResult = HandEvaluator.evaluate(allCards);

    // Strong made hands (Two pair, Trips, Straight, Flush, Full house, etc)
    if (evalResult.category >= 2) {
      if (evalResult.category >= 4 || (evalResult.category >= 2 && Math.random() < 0.5)) {
        if (botChips > currentHighestBet + minRaise && Math.random() < 0.6) {
          const betSize = Math.max(minRaise, Math.floor(pot * 0.5));
          const raiseTarget = Math.min(botChips, currentHighestBet + betSize);
          return { action: 'RAISE', amount: raiseTarget };
        }
      }
      return canCheck ? { action: 'CHECK' } : { action: 'CALL' };
    }

    // One pair
    if (evalResult.category === 1) {
      if (canCheck) return { action: 'CHECK' };
      if (callCost <= botChips * 0.1 || callCost <= pot * 0.3) {
        return { action: 'CALL' };
      }
      return Math.random() < 0.3 ? { action: 'CALL' } : { action: 'FOLD' };
    }

    // High card / Nothing
    if (canCheck) return { action: 'CHECK' };
    return { action: 'FOLD' };
  }
}
