export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  suit: Suit;
  rank: Rank; // 11: J, 12: Q, 13: K, 14: A
}

export type TableStage =
  | 'WAITING'   // Waiting for enough players
  | 'PREFLOP'   // Blinds posted, 2 cards dealt to players
  | 'FLOP'      // 3 community cards dealt
  | 'TURN'      // 4th community card dealt
  | 'RIVER'     // 5th community card dealt
  | 'SHOWDOWN'; // Revealing cards, pot distribution

export interface PlayerPublic {
  id: string;
  name: string;
  seatIndex: number;
  chips: number;
  currentBet: number;
  totalHandBet: number;
  folded: boolean;
  isAllIn: boolean;
  isSittingOut: boolean;
  isReady: boolean;
  isBot: boolean;
  lastAction?: string;
  cardCount: number;
  showdownCards?: Card[]; // Only revealed at showdown or fold show
  handDescription?: string;
  waitingNextHand?: boolean;
}

export interface PlayerPrivate extends PlayerPublic {
  cards: Card[]; // Private hole cards known only to this player
  walletId?: string;
}

export interface HandEvaluation {
  category: number; // 9: Royal Flush, 8: Straight Flush, ..., 0: High Card
  categoryName: string;
  tiebreakers: number[];
  bestCards: Card[];
  description: string;
}

export interface WinnerResult {
  seatIndex: number;
  playerId: string;
  playerName: string;
  amount: number;
  handName: string;
  winningCards: Card[];
}

export interface TableStatePublic {
  roomId: string;
  roomName: string;
  stage: TableStage;
  pot: number;
  currentHighestBet: number;
  minRaise: number;
  communityCards: Card[];
  dealerSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  activeSeat: number | null;
  turnTimeRemaining: number;
  turnDuration: number;
  smallBlind: number;
  bigBlind: number;
  startingChips: number;
  seats: (PlayerPublic | null)[];
  winners?: WinnerResult[];
  handNumber: number;
  waitingCountdown?: number;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  senderSeat?: number;
  message: string;
  timestamp: number;
  isSystem?: boolean;
}
