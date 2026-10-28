import crypto from 'crypto';
export class Deck {
    cards = [];
    constructor() {
        this.reset();
    }
    reset() {
        const suits = ['♠', '♥', '♦', '♣'];
        const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
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
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = crypto.randomInt(0, i + 1);
            const temp = this.cards[i];
            this.cards[i] = this.cards[j];
            this.cards[j] = temp;
        }
    }
    draw() {
        return this.cards.pop() ?? null;
    }
    remaining() {
        return this.cards.length;
    }
}
