import { Server, Socket } from 'socket.io';
import { PokerTable } from '../engine/PokerTable.js';
import { ChatMessage, PlayerPrivate } from '../engine/types.js';
import { WalletManager, DEFAULT_INITIAL_BALANCE, WalletRecord } from '../wallet/WalletManager.js';

export interface RoomInfo {
  roomId: string;
  name: string;
  playerCount: number;
  maxSeats: number;
  stage: string;
  smallBlind: number;
  bigBlind: number;
  startingChips: number;
}

export interface LobbyPlayer {
  id: string;
  name: string;
  suitColorIdx: number;
  position: [number, number, number];
  rotationY: number;
  isMoving: boolean;
  balance?: number;
  wins?: number;
}

export class RoomManager {
  private io: Server;
  private tables: Map<string, PokerTable> = new Map();
  private socketToRoom: Map<string, string> = new Map();
  private socketToWalletId: Map<string, string> = new Map();
  private voiceUsersInRoom: Map<string, Map<string, { socketId: string; playerName: string }>> = new Map();
  private lobbyPlayers: Map<string, LobbyPlayer> = new Map();
  public walletManager: WalletManager;

  constructor(io: Server) {
    this.io = io;
    this.walletManager = new WalletManager();
    // Create default tables for 3D Casino Lounge (Every new user starts with Rp 1.000.000)
    this.getOrCreateTable('meja-1', 'Meja Santai #1', { smallBlind: 1000, bigBlind: 2000, startingChips: 1000000 });
    this.getOrCreateTable('meja-2', 'Meja Reguler #2', { smallBlind: 2500, bigBlind: 5000, startingChips: 1000000 });
    this.getOrCreateTable('meja-vip', 'Meja VIP High Roller', { smallBlind: 10000, bigBlind: 20000, startingChips: 1000000 });
    this.getOrCreateTable('meja-turnamen', 'Meja Turnamen Royale', { smallBlind: 25000, bigBlind: 50000, startingChips: 1000000 });
  }

  public getOrCreateTable(
    roomId: string,
    roomName?: string,
    options?: { smallBlind?: number; bigBlind?: number; startingChips?: number }
  ): PokerTable {
    const cleanId = roomId.trim().toLowerCase();
    let table = this.tables.get(cleanId);
    if (!table) {
      table = new PokerTable({
        roomId: cleanId,
        roomName: roomName || `Meja ${cleanId.toUpperCase()}`,
        startingChips: options?.startingChips || DEFAULT_INITIAL_BALANCE,
        smallBlind: options?.smallBlind || 1000,
        bigBlind: options?.bigBlind || 2000,
        onStateChange: () => this.broadcastTableState(cleanId),
        onChatMessage: (msg: ChatMessage) => this.broadcastChatMessage(cleanId, msg),
        onWalletSync: (player: PlayerPrivate, didWin?: boolean) => this.handlePlayerWalletSync(player, didWin),
        onPlayerLeaveSeat: (player: PlayerPrivate) => this.handlePlayerLeaveSeat(player)
      });
      this.tables.set(cleanId, table);
    }
    return table;
  }

  private handlePlayerWalletSync(player: PlayerPrivate, didWin?: boolean): void {
    const record = this.walletManager.syncTableChips(
      player.walletId,
      player.name,
      player.chips,
      player.isBot
    );
    if (didWin) {
      this.walletManager.recordWin(player.walletId, player.name, player.isBot);
    }
    if (!player.isBot) {
      this.io.to(player.id).emit('wallet:updated', record);
      const lobbyP = this.lobbyPlayers.get(player.id);
      if (lobbyP) {
        lobbyP.balance = record.balance + (record.tableChips || 0);
        lobbyP.wins = record.wins;
      }
    }
  }

  private handlePlayerLeaveSeat(player: PlayerPrivate): void {
    const record = this.walletManager.cashOutFromTable(
      player.walletId,
      player.name,
      player.chips,
      player.isBot
    );
    if (!player.isBot) {
      this.io.to(player.id).emit('wallet:updated', record);
      this.io.to(player.id).emit('wallet:cashed-out', {
        cashedOutChips: player.chips,
        newWalletBalance: record.balance
      });
      const lobbyP = this.lobbyPlayers.get(player.id);
      if (lobbyP) {
        lobbyP.balance = record.balance;
        lobbyP.wins = record.wins;
      }
    }
    this.io.emit('leaderboard:updated', this.getLeaderboard(15));
  }

  public getLeaderboard(limit: number = 15): WalletRecord[] {
    return this.walletManager.getLeaderboard(limit);
  }

  public listRooms(): RoomInfo[] {
    const list: RoomInfo[] = [];
    for (const [id, table] of this.tables.entries()) {
      const state = table.getPublicState();
      list.push({
        roomId: id,
        name: state.roomName,
        playerCount: state.seats.filter(Boolean).length,
        maxSeats: 8,
        stage: state.stage,
        smallBlind: state.smallBlind,
        bigBlind: state.bigBlind,
        startingChips: state.startingChips
      });
    }
    return list;
  }

  public getLobbyPlayers(): LobbyPlayer[] {
    return Array.from(this.lobbyPlayers.values());
  }

  public handleSocketConnection(socket: Socket): void {
    // === 0a. Persistent Wallet & Leaderboard Sync ===
    socket.on(
      'wallet:sync',
      ({
        walletId,
        name,
        clientCachedBalance
      }: {
        walletId?: string;
        name?: string;
        clientCachedBalance?: number;
      }) => {
        const record = this.walletManager.getOrCreateWallet(
          walletId,
          name || 'Pemain',
          clientCachedBalance,
          false
        );
        this.socketToWalletId.set(socket.id, record.walletId);

        const lobbyP = this.lobbyPlayers.get(socket.id);
        if (lobbyP) {
          lobbyP.name = record.name;
          lobbyP.balance = record.balance;
          lobbyP.wins = record.wins;
        }

        socket.emit('wallet:updated', record);
        this.io.emit('leaderboard:updated', this.getLeaderboard(15));
      }
    );

    socket.on(
      'wallet:claim-relief',
      ({ walletId, name }: { walletId?: string; name?: string }) => {
        const wId = walletId || this.socketToWalletId.get(socket.id);
        const record = this.walletManager.getOrCreateWallet(wId, name || 'Pemain');
        const totalWealth = record.balance + (record.tableChips || 0);
        if (totalWealth > 0) {
          socket.emit('errorAlert', 'Isi ulang di Loket Kasir NPC hanya bisa dilakukan saat chip Anda benar-benar Rp 0!');
          return;
        }
        const updated = this.walletManager.updateBalance(record.walletId, record.name, DEFAULT_INITIAL_BALANCE, false);
        socket.emit('wallet:updated', updated);
        this.io.emit('leaderboard:updated', this.getLeaderboard(15));
      }
    );

    // === 0. 3D Casino Lounge Presence & Movement ===
    socket.on(
      'lobby:join',
      ({
        name,
        suitColorIdx,
        position,
        walletId,
        clientCachedBalance
      }: {
        name: string;
        suitColorIdx: number;
        position?: [number, number, number];
        walletId?: string;
        clientCachedBalance?: number;
      }) => {
        socket.join('casino-lobby');
        const cleanName = (name || 'Pemain').trim();
        const wId = walletId || this.socketToWalletId.get(socket.id);
        const walletRecord = this.walletManager.getOrCreateWallet(wId, cleanName, clientCachedBalance, false);
        this.socketToWalletId.set(socket.id, walletRecord.walletId);

        const player: LobbyPlayer = {
          id: socket.id,
          name: cleanName,
          suitColorIdx: typeof suitColorIdx === 'number' ? suitColorIdx : 0,
          position: position || [0, 0, 1],
          rotationY: 0,
          isMoving: false,
          balance: walletRecord.balance,
          wins: walletRecord.wins
        };
        this.lobbyPlayers.set(socket.id, player);

        console.log(`[LOBBY 3D] "${player.name}" (${socket.id}) entered Lounge. Saldo: Rp ${walletRecord.balance.toLocaleString('id-ID')}`);

        socket.emit('wallet:updated', walletRecord);
        socket.emit('leaderboard:updated', this.getLeaderboard(15));

        // Send all existing lobby players to this client
        const otherPlayers = Array.from(this.lobbyPlayers.values()).filter(p => p.id !== socket.id);
        socket.emit('lobby:all-players', otherPlayers);

        // Broadcast to everyone else in the lounge
        socket.to('casino-lobby').emit('lobby:player-joined', player);
        this.io.emit('leaderboard:updated', this.getLeaderboard(15));
      }
    );

    socket.on('lobby:request-sync', () => {
      const otherPlayers = Array.from(this.lobbyPlayers.values()).filter(p => p.id !== socket.id);
      socket.emit('lobby:all-players', otherPlayers);
      socket.emit('leaderboard:updated', this.getLeaderboard(15));
    });

    socket.on('lobby:move', ({ position, rotationY, isMoving }: { position: [number, number, number]; rotationY: number; isMoving: boolean }) => {
      const player = this.lobbyPlayers.get(socket.id);
      if (player) {
        player.position = position;
        player.rotationY = rotationY;
        player.isMoving = isMoving;
        socket.to('casino-lobby').emit('lobby:player-moved', {
          id: socket.id,
          position,
          rotationY,
          isMoving
        });
      }
    });

    socket.on('lobby:update-outfit', ({ suitColorIdx, name, walletId }: { suitColorIdx: number; name?: string; walletId?: string }) => {
      const player = this.lobbyPlayers.get(socket.id);
      const wId = walletId || this.socketToWalletId.get(socket.id);
      if (name && name.trim()) {
        const updatedWallet = this.walletManager.updatePlayerName(wId, player?.name || name, name.trim());
        socket.emit('wallet:updated', updatedWallet);
        this.io.emit('leaderboard:updated', this.getLeaderboard(15));
      }
      if (player) {
        if (typeof suitColorIdx === 'number') player.suitColorIdx = suitColorIdx;
        if (name) player.name = name.trim();
        socket.to('casino-lobby').emit('lobby:player-updated', {
          id: socket.id,
          suitColorIdx: player.suitColorIdx,
          name: player.name,
          balance: player.balance,
          wins: player.wins
        });
      }
    });

    socket.on('lobby:leave', () => {
      if (this.lobbyPlayers.has(socket.id)) {
        const player = this.lobbyPlayers.get(socket.id);
        this.lobbyPlayers.delete(socket.id);
        socket.leave('casino-lobby');
        socket.to('casino-lobby').emit('lobby:player-left', { id: socket.id, name: player?.name });
      }
    });

    // 1. Join poker room
    socket.on(
      'joinRoom',
      ({
        roomId,
        playerName,
        walletId,
        clientCachedBalance
      }: {
        roomId: string;
        playerName: string;
        walletId?: string;
        clientCachedBalance?: number;
      }) => {
        const cleanId = (roomId || 'meja-1').trim().toLowerCase();
        const currentRoom = this.socketToRoom.get(socket.id);
        if (currentRoom && currentRoom !== cleanId) {
          socket.leave(currentRoom);
          const oldTable = this.tables.get(currentRoom);
          oldTable?.leave(socket.id);
        }

        const wId = walletId || this.socketToWalletId.get(socket.id);
        const walletRecord = this.walletManager.getOrCreateWallet(
          wId,
          playerName || 'Pemain',
          clientCachedBalance,
          false
        );
        this.socketToWalletId.set(socket.id, walletRecord.walletId);

        const table = this.getOrCreateTable(cleanId);
        socket.join(cleanId);
        this.socketToRoom.set(socket.id, cleanId);

        // Rebind socket to seat if player is reconnecting or refreshed page
        if (playerName) {
          const reconnected = table.rebindPlayerSocket(playerName, socket.id, walletRecord.walletId);
          if (reconnected) {
            this.broadcastTableState(cleanId);
          }
        }

        // Send initial public table state & wallet state
        socket.emit('tableState', table.getPublicState());
        socket.emit('myCards', table.getPlayerCards(socket.id));
        socket.emit('wallet:updated', walletRecord);
        socket.emit('leaderboard:updated', this.getLeaderboard(15));
      }
    );

    // 1b. Request private cards explicitly
    socket.on('requestMyCards', () => {
      const roomId = this.socketToRoom.get(socket.id);
      if (!roomId) return;
      const table = this.tables.get(roomId);
      if (!table) return;
      socket.emit('myCards', table.getPlayerCards(socket.id));
    });

    // 2. Sit at table with chosen Buy-In amount (Opsi 1: Buy-In from Wallet)
    socket.on(
      'sit',
      ({
        seatIndex,
        playerName,
        walletId,
        clientCachedBalance,
        buyInAmount
      }: {
        seatIndex: number;
        playerName: string;
        walletId?: string;
        clientCachedBalance?: number;
        buyInAmount?: number;
      }) => {
        const roomId = this.socketToRoom.get(socket.id);
        if (!roomId) return;
        const table = this.tables.get(roomId);
        if (!table) return;

        const wId = walletId || this.socketToWalletId.get(socket.id);
        let walletRecord = this.walletManager.getOrCreateWallet(
          wId,
          playerName || 'Pemain',
          clientCachedBalance,
          false
        );
        this.socketToWalletId.set(socket.id, walletRecord.walletId);

        if (walletRecord.balance <= 0) {
          socket.emit(
            'errorAlert',
            'Saldo Dompet Anda Rp 0! Silakan keluar ke Lounge 3D dan isi ulang di Loket Kasir NPC dengan menjawab soal Python.'
          );
          return;
        }

        const defaultBuyIn = Math.min(walletRecord.balance, Math.max(20000, table.bigBlind * 100));
        const requestedBuyIn =
          typeof buyInAmount === 'number' && !Number.isNaN(buyInAmount) && buyInAmount > 0
            ? buyInAmount
            : defaultBuyIn;

        const { record: updatedWallet, actualBuyIn } = this.walletManager.buyInToTable(
          walletRecord.walletId,
          playerName || walletRecord.name || 'Pemain',
          requestedBuyIn,
          false
        );

        const result = table.sit(
          socket.id,
          playerName || updatedWallet.name || 'Pemain',
          seatIndex,
          false,
          actualBuyIn,
          updatedWallet.walletId
        );
        if (!result.success) {
          // Refund buy-in back to wallet since sitting failed
          const refunded = this.walletManager.cashOutFromTable(
            updatedWallet.walletId,
            updatedWallet.name,
            actualBuyIn,
            false
          );
          socket.emit('wallet:updated', refunded);
          socket.emit('errorAlert', result.error);
        } else {
          socket.emit('wallet:updated', updatedWallet);
          this.broadcastTableState(roomId);
        }
      }
    );

    // 3. Leave seat (automatically cashes out remaining seat chips back to wallet)
    socket.on('leaveSeat', () => {
      const roomId = this.socketToRoom.get(socket.id);
      if (!roomId) return;
      const table = this.tables.get(roomId);
      table?.leave(socket.id);
      this.broadcastTableState(roomId);
    });

    // 3b. Toggle Ready
    socket.on('toggleReady', () => {
      const roomId = this.socketToRoom.get(socket.id);
      if (!roomId) return;
      const table = this.tables.get(roomId);
      if (!table) return;

      const result = table.toggleReady(socket.id);
      if (!result.success) {
        socket.emit('errorAlert', result.error);
      } else {
        this.broadcastTableState(roomId);
      }
    });

    // 4. Player Action (FOLD, CHECK, CALL, RAISE)
    socket.on(
      'playerAction',
      ({ action, amount }: { action: 'FOLD' | 'CHECK' | 'CALL' | 'RAISE'; amount?: number }) => {
        const roomId = this.socketToRoom.get(socket.id);
        if (!roomId) return;
        const table = this.tables.get(roomId);
        if (!table) return;

        const result = table.handleAction(socket.id, action, amount);
        if (!result.success) {
          socket.emit('errorAlert', result.error);
        } else {
          this.broadcastTableState(roomId);
        }
      }
    );

    // 5. Rebuy / Top-Up chips from Wallet onto Seat
    socket.on('rebuy', (payload?: { buyInAmount?: number }) => {
      const roomId = this.socketToRoom.get(socket.id);
      if (!roomId) return;
      const table = this.tables.get(roomId);
      if (!table) return;

      const seatedPlayer = table.getSeatedPlayer(socket.id);
      if (!seatedPlayer) {
        socket.emit('errorAlert', 'Anda harus duduk di kursi terlebih dahulu.');
        return;
      }

      const wId = seatedPlayer.walletId || this.socketToWalletId.get(socket.id);
      const walletRecord = this.walletManager.getOrCreateWallet(wId, seatedPlayer.name);

      if (walletRecord.balance <= 0) {
        socket.emit(
          'errorAlert',
          'Saldo Dompet Anda Rp 0! Silakan keluar ke Lounge 3D dan isi ulang di Loket Kasir NPC dengan menjawab soal Python.'
        );
        return;
      }

      const requestedAmount =
        payload && typeof payload.buyInAmount === 'number' && payload.buyInAmount > 0
          ? payload.buyInAmount
          : Math.min(walletRecord.balance, 200000);

      const { record: updatedWallet, addedChips } = this.walletManager.topUpTableChips(
        walletRecord.walletId,
        seatedPlayer.name,
        requestedAmount,
        seatedPlayer.chips,
        false
      );

      const result = table.rebuy(socket.id, addedChips);
      if (!result.success) {
        // Refund back to wallet balance
        const refunded = this.walletManager.updateBalance(
          updatedWallet.walletId,
          seatedPlayer.name,
          updatedWallet.balance + addedChips,
          false
        );
        this.walletManager.syncTableChips(updatedWallet.walletId, seatedPlayer.name, seatedPlayer.chips, false);
        socket.emit('wallet:updated', refunded);
        socket.emit('errorAlert', result.error);
      } else {
        socket.emit('wallet:updated', updatedWallet);
        this.broadcastTableState(roomId);
      }
    });

    // 5b. Tip opponent
    socket.on(
      'tipPlayer',
      ({ targetSeatIndex, amount }: { targetSeatIndex: number; amount: number }) => {
        const roomId = this.socketToRoom.get(socket.id);
        if (!roomId) return;
        const table = this.tables.get(roomId);
        if (!table) return;

        const result = table.tipPlayer(socket.id, targetSeatIndex, amount);
        if (!result.success) {
          socket.emit('errorAlert', result.error);
        } else {
          this.broadcastTableState(roomId);
          if (result.tipData) {
            this.io.to(roomId).emit('playerTipped', result.tipData);
          }
        }
      }
    );

    // 6. Bot controls
    socket.on('addBot', () => {
      const roomId = this.socketToRoom.get(socket.id);
      if (!roomId) return;
      const table = this.tables.get(roomId);
      const res = table?.addBot();
      if (res && !res.success) {
        socket.emit('errorAlert', res.error);
      } else if (res && res.success && res.botWalletId && res.botName && res.botChips) {
        this.walletManager.buyInToTable(res.botWalletId, res.botName, res.botChips, true);
        this.io.emit('leaderboard:updated', this.getLeaderboard(15));
      }
    });

    socket.on('kickBot', ({ seatIndex }: { seatIndex: number }) => {
      const roomId = this.socketToRoom.get(socket.id);
      if (!roomId) return;
      const table = this.tables.get(roomId);
      table?.kickBot(seatIndex);
    });

    // 7. Send chat / emote
    socket.on('sendChat', ({ message, senderName }: { message: string; senderName: string }) => {
      const roomId = this.socketToRoom.get(socket.id);
      if (!roomId || !message.trim()) return;

      this.broadcastChatMessage(roomId, {
        id: `chat_${Date.now()}_${Math.random()}`,
        senderName: senderName || 'Pemain',
        message: message.trim(),
        timestamp: Date.now(),
        isSystem: false
      });
    });

    // 7b. WebRTC Voice Chat Signaling
    socket.on('voice:join', ({ roomId, playerName }: { roomId: string; playerName: string }) => {
      const cleanId = (roomId || 'meja-1').trim().toLowerCase();
      socket.join(`voice:${cleanId}`);

      let roomVoice = this.voiceUsersInRoom.get(cleanId);
      if (!roomVoice) {
        roomVoice = new Map();
        this.voiceUsersInRoom.set(cleanId, roomVoice);
      }

      // Collect existing peers in this voice room
      const existingPeers = Array.from(roomVoice.values()).filter(p => p.socketId !== socket.id);
      roomVoice.set(socket.id, { socketId: socket.id, playerName: playerName || 'Pemain' });

      // Send existing peers list to the new participant
      socket.emit('voice:all-users', { peers: existingPeers });

      // Notify other peers in this room directly that a new user joined voice
      for (const peer of existingPeers) {
        this.io.to(peer.socketId).emit('voice:user-joined', {
          socketId: socket.id,
          playerName: playerName || 'Pemain'
        });
      }
      socket.to(`voice:${cleanId}`).emit('voice:user-joined', {
        socketId: socket.id,
        playerName: playerName || 'Pemain'
      });
    });

    socket.on('voice:signal', ({ targetSocketId, signal }: { targetSocketId: string; signal: any }) => {
      if (!targetSocketId || !signal) return;
      this.io.to(targetSocketId).emit('voice:signal', {
        senderSocketId: socket.id,
        signal
      });
    });

    socket.on('voice:speaking', ({ roomId, isSpeaking }: { roomId: string; isSpeaking: boolean }) => {
      const cleanId = (roomId || 'meja-1').trim().toLowerCase();
      const roomVoice = this.voiceUsersInRoom.get(cleanId);
      const senderName = roomVoice?.get(socket.id)?.playerName || 'Pemain';

      if (roomVoice) {
        for (const peer of roomVoice.values()) {
          if (peer.socketId !== socket.id) {
            this.io.to(peer.socketId).emit('voice:speaking-state', {
              socketId: socket.id,
              playerName: senderName,
              isSpeaking
            });
          }
        }
      }
      socket.to(`voice:${cleanId}`).emit('voice:speaking-state', {
        socketId: socket.id,
        playerName: senderName,
        isSpeaking
      });
    });

    socket.on('voice:leave', ({ roomId }: { roomId?: string }) => {
      const targetRoom = (roomId || this.socketToRoom.get(socket.id) || '').trim().toLowerCase();
      if (targetRoom) {
        socket.leave(`voice:${targetRoom}`);
        const roomVoice = this.voiceUsersInRoom.get(targetRoom);
        if (roomVoice && roomVoice.has(socket.id)) {
          roomVoice.delete(socket.id);
          for (const peer of roomVoice.values()) {
            this.io.to(peer.socketId).emit('voice:user-left', { socketId: socket.id });
          }
          socket.to(`voice:${targetRoom}`).emit('voice:user-left', { socketId: socket.id });
        }
      }
    });

    // 8. Disconnect with grace period so brief network drops or page reloads don't ruin game
    socket.on('disconnect', () => {
      // Clean up voice chat
      for (const [rId, roomVoice] of this.voiceUsersInRoom.entries()) {
        if (roomVoice.has(socket.id)) {
          roomVoice.delete(socket.id);
          for (const peer of roomVoice.values()) {
            this.io.to(peer.socketId).emit('voice:user-left', { socketId: socket.id });
          }
          socket.to(`voice:${rId}`).emit('voice:user-left', { socketId: socket.id });
        }
      }

      // Clean up 3D Lounge presence
      if (this.lobbyPlayers.has(socket.id)) {
        this.lobbyPlayers.delete(socket.id);
        socket.to('casino-lobby').emit('lobby:player-left', { id: socket.id });
      }

      const roomId = this.socketToRoom.get(socket.id);
      if (roomId) {
        const table = this.tables.get(roomId);
        if (table) {
          const graceMs = table.getPublicState().stage === 'WAITING' ? 3000 : 15000;
          setTimeout(() => {
            if (!this.io.sockets.sockets.has(socket.id)) {
              table.leave(socket.id);
              this.socketToRoom.delete(socket.id);
              this.broadcastTableState(roomId);
            }
          }, graceMs);
        }
      }
    });
  }

  public broadcastTableState(roomId: string): void {
    const table = this.tables.get(roomId);
    if (!table) return;

    const publicState = table.getPublicState();
    this.io.to(roomId).emit('tableState', publicState);
    this.io.emit('leaderboard:updated', this.getLeaderboard(15));

    // Send private cards individually to seated players
    const clients = this.io.sockets.adapter.rooms.get(roomId);
    if (clients) {
      for (const clientId of clients) {
        const privateCards = table.getPlayerCards(clientId);
        this.io.to(clientId).emit('myCards', privateCards);
      }
    }
  }

  public broadcastChatMessage(roomId: string, msg: ChatMessage): void {
    this.io.to(roomId).emit('chatMessage', msg);
  }
}
