import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_INITIAL_BALANCE = 1_000_000; // Rp 1.000.000

export interface WalletRecord {
  walletId: string;
  name: string;
  balance: number; // Saldo aman di dompet (di luar meja)
  tableChips?: number; // Chip yang sedang dibawa duduk di kursi meja
  wins: number;
  handsPlayed: number;
  isBot?: boolean;
  updatedAt: number;
}

export class WalletManager {
  private wallets: Map<string, WalletRecord> = new Map();
  private dataFilePath: string;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    const dataDir = path.resolve(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {
        // ignore
      }
    }
    this.dataFilePath = path.join(dataDir, 'wallets.json');
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const raw = fs.readFileSync(this.dataFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && typeof item.walletId === 'string') {
              const savedBalance =
                typeof item.balance === 'number' && !Number.isNaN(item.balance)
                  ? item.balance
                  : DEFAULT_INITIAL_BALANCE;
              const savedTableChips =
                typeof item.tableChips === 'number' && !Number.isNaN(item.tableChips) && item.tableChips > 0
                  ? item.tableChips
                  : 0;

              // On server boot, all seats are empty so refund any tableChips back into wallet balance
              let totalRestored = savedBalance + savedTableChips;
              // Upgrade legacy 100.000 default balances with 0 wins to the new Rp 1.000.000 starting balance
              if (totalRestored === 100_000 && (!item.wins || item.wins === 0)) {
                totalRestored = DEFAULT_INITIAL_BALANCE;
              }

              this.wallets.set(item.walletId, {
                walletId: item.walletId,
                name: item.name || 'Pemain',
                balance: totalRestored,
                tableChips: 0,
                wins: typeof item.wins === 'number' ? item.wins : 0,
                handsPlayed: typeof item.handsPlayed === 'number' ? item.handsPlayed : 0,
                isBot: Boolean(item.isBot),
                updatedAt: item.updatedAt || Date.now()
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('Gagal membaca data wallet:', err);
    }
  }

  private scheduleSaveToDisk(): void {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      this.saveToDiskNow();
    }, 250);
  }

  public saveToDiskNow(): void {
    try {
      const list = Array.from(this.wallets.values());
      fs.writeFileSync(this.dataFilePath, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('Gagal menyimpan data wallet:', err);
    }
  }

  public normalizeKey(walletId?: string, name?: string): string {
    if (walletId && walletId.trim().length > 0) {
      return walletId.trim();
    }
    const cleanName = (name || 'Pemain').trim().toLowerCase();
    return `name_${cleanName}`;
  }

  public getOrCreateWallet(
    walletId?: string,
    name?: string,
    clientCachedBalance?: number,
    isBot: boolean = false
  ): WalletRecord {
    const cleanName = (name || 'Pemain').trim();
    const key = this.normalizeKey(walletId, cleanName);

    let record = this.wallets.get(key);

    // If not found by walletId, also check if there's an existing record with the exact same non-bot player name
    if (!record && !isBot && cleanName) {
      for (const existing of this.wallets.values()) {
        if (!existing.isBot && existing.name.trim().toLowerCase() === cleanName.toLowerCase()) {
          record = existing;
          break;
        }
      }
    }

    if (!record) {
      let initialBalance =
        typeof clientCachedBalance === 'number' &&
        !Number.isNaN(clientCachedBalance) &&
        clientCachedBalance > 0
          ? clientCachedBalance
          : DEFAULT_INITIAL_BALANCE;

      // Upgrade legacy 100.000 cached balance to 1.000.000
      if (initialBalance === 100_000) {
        initialBalance = DEFAULT_INITIAL_BALANCE;
      }

      record = {
        walletId: key,
        name: cleanName,
        balance: initialBalance,
        tableChips: 0,
        wins: 0,
        handsPlayed: 0,
        isBot,
        updatedAt: Date.now()
      };
      this.wallets.set(key, record);
      this.scheduleSaveToDisk();
    } else {
      if (cleanName && record.name !== cleanName) {
        record.name = cleanName;
        record.updatedAt = Date.now();
        this.scheduleSaveToDisk();
      }
    }

    return record;
  }

  /**
   * Deducts buyInAmount from wallet.balance and places it into record.tableChips when sitting down.
   */
  public buyInToTable(
    walletId: string | undefined,
    name: string,
    requestedBuyIn: number,
    isBot: boolean = false
  ): { record: WalletRecord; actualBuyIn: number } {
    const record = this.getOrCreateWallet(walletId, name, undefined, isBot);

    // If there were any leftover tableChips from an unclosed seat, return them to balance first
    if (record.tableChips && record.tableChips > 0) {
      record.balance += record.tableChips;
      record.tableChips = 0;
    }

    // If broke, grant initial balance for bots or allow minimum
    if (record.balance <= 0 && isBot) {
      record.balance = DEFAULT_INITIAL_BALANCE;
    }

    const cleanRequest = Math.max(1000, Math.floor(requestedBuyIn));
    const actualBuyIn = Math.min(record.balance, cleanRequest);

    record.balance = Math.max(0, record.balance - actualBuyIn);
    record.tableChips = actualBuyIn;
    record.updatedAt = Date.now();
    this.scheduleSaveToDisk();

    return { record, actualBuyIn };
  }

  /**
   * Top-up additional chips from wallet.balance onto an already seated player's stack.
   */
  public topUpTableChips(
    walletId: string | undefined,
    name: string,
    requestedAmount: number,
    currentSeatChips: number,
    isBot: boolean = false
  ): { record: WalletRecord; addedChips: number } {
    const record = this.getOrCreateWallet(walletId, name, undefined, isBot);
    if (record.balance <= 0 && isBot) {
      record.balance = DEFAULT_INITIAL_BALANCE;
    }
    const cleanRequest = Math.max(0, Math.floor(requestedAmount));
    const addedChips = Math.min(record.balance, cleanRequest);

    record.balance = Math.max(0, record.balance - addedChips);
    record.tableChips = Math.max(0, Math.floor(currentSeatChips)) + addedChips;
    record.updatedAt = Date.now();
    this.scheduleSaveToDisk();

    return { record, addedChips };
  }

  /**
   * Updates only the live tableChips while the player is seated at a table (wallet.balance stays safe).
   */
  public syncTableChips(
    walletId: string | undefined,
    name: string,
    currentSeatChips: number,
    isBot: boolean = false
  ): WalletRecord {
    const record = this.getOrCreateWallet(walletId, name, undefined, isBot);
    const safeTableChips = Math.max(0, Math.floor(currentSeatChips));
    if (record.tableChips !== safeTableChips || (name && record.name !== name.trim())) {
      record.tableChips = safeTableChips;
      if (name && name.trim()) {
        record.name = name.trim();
      }
      record.updatedAt = Date.now();
      this.scheduleSaveToDisk();
    }
    return record;
  }

  /**
   * Cashes out finalSeatChips back into wallet.balance when the player stands up or leaves the table.
   */
  public cashOutFromTable(
    walletId: string | undefined,
    name: string,
    finalSeatChips: number,
    isBot: boolean = false
  ): WalletRecord {
    const record = this.getOrCreateWallet(walletId, name, undefined, isBot);
    const safeSeatChips = Math.max(0, Math.floor(finalSeatChips));
    record.balance = Math.max(0, record.balance + safeSeatChips);
    record.tableChips = 0;
    if (name && name.trim()) {
      record.name = name.trim();
    }
    record.updatedAt = Date.now();
    this.scheduleSaveToDisk();
    return record;
  }

  public updateBalance(
    walletId: string | undefined,
    name: string,
    newBalance: number,
    isBot: boolean = false
  ): WalletRecord {
    const record = this.getOrCreateWallet(walletId, name, undefined, isBot);
    const safeBalance = Math.max(0, Math.floor(newBalance));
    if (record.balance !== safeBalance || (name && record.name !== name.trim())) {
      record.balance = safeBalance;
      if (name && name.trim()) {
        record.name = name.trim();
      }
      record.updatedAt = Date.now();
      this.scheduleSaveToDisk();
    }
    return record;
  }

  public recordWin(walletId: string | undefined, name: string, isBot: boolean = false): WalletRecord {
    const record = this.getOrCreateWallet(walletId, name, undefined, isBot);
    record.wins += 1;
    record.updatedAt = Date.now();
    this.scheduleSaveToDisk();
    return record;
  }

  public updatePlayerName(walletId: string | undefined, oldName: string, newName: string): WalletRecord {
    const record = this.getOrCreateWallet(walletId, oldName);
    if (newName && newName.trim()) {
      record.name = newName.trim();
      record.updatedAt = Date.now();
      this.scheduleSaveToDisk();
    }
    return record;
  }

  public getLeaderboard(limit: number = 15): WalletRecord[] {
    const all = Array.from(this.wallets.values()).map(r => ({
      ...r,
      // Total wealth = safe wallet balance + active chips on table
      balance: r.balance + (r.tableChips || 0)
    }));
    all.sort((a, b) => {
      if (b.balance !== a.balance) return b.balance - a.balance;
      return b.wins - a.wins;
    });
    return all.slice(0, limit);
  }
}
