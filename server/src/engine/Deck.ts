import crypto from 'crypto';
import { Card, Rank, Suit } from './types.js';

export class Deck {
  private cards: Card[] = [];

  constructor() {
    this.reset();
  }

  public reset(): void {
    const suits: Suit[] = ['♠', '♥', '♦', '♣'];
    const ranks: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

    this.cards = [];
    for (const suit of suits) {
      for (const rank of ranks) {
        this.cards.push({ suit, rank });
      }
    }
  }

  /**
   * Fisher-Yates shuffle using cryptographically secure random integers
   */
  public shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      const temp = this.cards[i];
      this.cards[i] = this.cards[j];
      this.cards[j] = temp;
    }
  }

  public draw(): Card | null {
    return this.cards.pop() ?? null;
  }

  public remaining(): number {
    return this.cards.length;
  }
}
