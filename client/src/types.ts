export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type TableStage =
  | 'WAITING'
  | 'PREFLOP'
  | 'FLOP'
  | 'TURN'
  | 'RIVER'
  | 'SHOWDOWN';

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
  showdownCards?: Card[];
  handDescription?: string;
  waitingNextHand?: boolean;
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

export interface RoomInfo {
  roomId: string;
  name: string;
  playerCount: number;
  maxSeats: number;
  stage: string;
  smallBlind?: number;
  bigBlind?: number;
  startingChips?: number;
}

