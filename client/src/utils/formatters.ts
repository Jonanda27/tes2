import { Rank, Suit } from '../types.js';

export function formatRupiah(amount: number): string {
  if (isNaN(amount)) return 'Rp 0';
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

export function rankToString(rank: Rank): string {
  switch (rank) {
    case 14:
      return 'A';
    case 13:
      return 'K';
    case 12:
      return 'Q';
    case 11:
      return 'J';
    default:
      return rank.toString();
  }
}

export function isRedSuit(suit: Suit): boolean {
  return suit === '♥' || suit === '♦';
}

export function suitNameId(suit: Suit): string {
  switch (suit) {
    case '♠':
      return 'Sekop';
    case '♥':
      return 'Hati';
    case '♦':
      return 'Wajik';
    case '♣':
      return 'Keriting';
  }
}
