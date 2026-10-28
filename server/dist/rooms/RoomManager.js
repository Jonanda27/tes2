import { PokerTable } from '../engine/PokerTable.js';
export class RoomManager {
    io;
    tables = new Map();
    socketToRoom = new Map();
    voiceUsersInRoom = new Map();
    lobbyPlayers = new Map();
    constructor(io) {
        this.io = io;
        // Create default tables for 3D Casino Lounge
        this.getOrCreateTable('meja-1', 'Meja Santai #1', { smallBlind: 1000, bigBlind: 2000, startingChips: 100000 });
        this.getOrCreateTable('meja-2', 'Meja Reguler #2', { smallBlind: 2500, bigBlind: 5000, startingChips: 250000 });
        this.getOrCreateTable('meja-vip', 'Meja VIP High Roller', { smallBlind: 10000, bigBlind: 20000, startingChips: 1000000 });
        this.getOrCreateTable('meja-turnamen', 'Meja Turnamen Royale', { smallBlind: 25000, bigBlind: 50000, startingChips: 2500000 });
    }
    getOrCreateTable(roomId, roomName, options) {
        const cleanId = roomId.trim().toLowerCase();
        let table = this.tables.get(cleanId);
        if (!table) {
            table = new PokerTable({
                roomId: cleanId,
                roomName: roomName || `Meja ${cleanId.toUpperCase()}`,
                startingChips: options?.startingChips || 100000,
                smallBlind: options?.smallBlind || 1000,
                bigBlind: options?.bigBlind || 2000,
                onStateChange: () => this.broadcastTableState(cleanId),
                onChatMessage: (msg) => this.broadcastChatMessage(cleanId, msg)
            });
            this.tables.set(cleanId, table);
        }
        return table;
    }
    listRooms() {
        const list = [];
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
    getLobbyPlayers() {
        return Array.from(this.lobbyPlayers.values());
    }
    handleSocketConnection(socket) {
        // === 0. 3D Casino Lounge Presence & Movement ===
        socket.on('lobby:join', ({ name, suitColorIdx, position }) => {
            socket.join('casino-lobby');
            const player = {
                id: socket.id,
                name: (name || 'Pemain').trim(),
                suitColorIdx: typeof suitColorIdx === 'number' ? suitColorIdx : 0,
                position: position || [0, 0, 1],
                rotationY: 0,
                isMoving: false
            };
            this.lobbyPlayers.set(socket.id, player);
            console.log(`[LOBBY 3D] "${player.name}" (${socket.id}) entered Lounge. Total online in Lounge: ${this.lobbyPlayers.size}`);
            // Send all existing lobby players to this client
            const otherPlayers = Array.from(this.lobbyPlayers.values()).filter(p => p.id !== socket.id);
            socket.emit('lobby:all-players', otherPlayers);
            // Broadcast to everyone else in the lounge
            socket.to('casino-lobby').emit('lobby:player-joined', player);
        });
        socket.on('lobby:request-sync', () => {
            const otherPlayers = Array.from(this.lobbyPlayers.values()).filter(p => p.id !== socket.id);
            socket.emit('lobby:all-players', otherPlayers);
        });
        socket.on('lobby:move', ({ position, rotationY, isMoving }) => {
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
        socket.on('lobby:update-outfit', ({ suitColorIdx, name }) => {
            const player = this.lobbyPlayers.get(socket.id);
            if (player) {
                if (typeof suitColorIdx === 'number')
                    player.suitColorIdx = suitColorIdx;
                if (name)
                    player.name = name.trim();
                socket.to('casino-lobby').emit('lobby:player-updated', {
                    id: socket.id,
                    suitColorIdx: player.suitColorIdx,
                    name: player.name
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
        socket.on('joinRoom', ({ roomId, playerName }) => {
            const cleanId = (roomId || 'meja-1').trim().toLowerCase();
            const currentRoom = this.socketToRoom.get(socket.id);
            if (currentRoom && currentRoom !== cleanId) {
                socket.leave(currentRoom);
                const oldTable = this.tables.get(currentRoom);
                oldTable?.leave(socket.id);
            }
            const table = this.getOrCreateTable(cleanId);
            socket.join(cleanId);
            this.socketToRoom.set(socket.id, cleanId);
            // Rebind socket to seat if player is reconnecting or refreshed page
            if (playerName) {
                const reconnected = table.rebindPlayerSocket(playerName, socket.id);
                if (reconnected) {
                    this.broadcastTableState(cleanId);
                }
            }
            // Send initial public table state
            socket.emit('tableState', table.getPublicState());
            socket.emit('myCards', table.getPlayerCards(socket.id));
        });
        // 1b. Request private cards explicitly
        socket.on('requestMyCards', () => {
            const roomId = this.socketToRoom.get(socket.id);
            if (!roomId)
                return;
            const table = this.tables.get(roomId);
            if (!table)
                return;
            socket.emit('myCards', table.getPlayerCards(socket.id));
        });
        // 2. Sit at table
        socket.on('sit', ({ seatIndex, playerName }) => {
            const roomId = this.socketToRoom.get(socket.id);
            if (!roomId)
                return;
            const table = this.tables.get(roomId);
            if (!table)
                return;
            const result = table.sit(socket.id, playerName || 'Pemain', seatIndex);
            if (!result.success) {
                socket.emit('errorAlert', result.error);
            }
            else {
                this.broadcastTableState(roomId);
            }
        });
        // 3. Leave seat
        socket.on('leaveSeat', () => {
            const roomId = this.socketToRoom.get(socket.id);
            if (!roomId)
                return;
            const table = this.tables.get(roomId);
            table?.leave(socket.id);
            this.broadcastTableState(roomId);
        });
        // 3b. Toggle Ready
        socket.on('toggleReady', () => {
            const roomId = this.socketToRoom.get(socket.id);
            if (!roomId)
                return;
            const table = this.tables.get(roomId);
            if (!table)
                return;
            const result = table.toggleReady(socket.id);
            if (!result.success) {
                socket.emit('errorAlert', result.error);
            }
            else {
                this.broadcastTableState(roomId);
            }
        });
        // 4. Player Action (FOLD, CHECK, CALL, RAISE)
        socket.on('playerAction', ({ action, amount }) => {
            const roomId = this.socketToRoom.get(socket.id);
            if (!roomId)
                return;
            const table = this.tables.get(roomId);
            if (!table)
                return;
            const result = table.handleAction(socket.id, action, amount);
            if (!result.success) {
                socket.emit('errorAlert', result.error);
            }
            else {
                this.broadcastTableState(roomId);
            }
        });
        // 5. Rebuy chips
        socket.on('rebuy', () => {
            const roomId = this.socketToRoom.get(socket.id);
            if (!roomId)
                return;
            const table = this.tables.get(roomId);
            if (!table)
                return;
            const result = table.rebuy(socket.id);
            if (!result.success) {
                socket.emit('errorAlert', result.error);
            }
            else {
                this.broadcastTableState(roomId);
            }
        });
        // 5b. Tip opponent
        socket.on('tipPlayer', ({ targetSeatIndex, amount }) => {
            const roomId = this.socketToRoom.get(socket.id);
            if (!roomId)
                return;
            const table = this.tables.get(roomId);
            if (!table)
                return;
            const result = table.tipPlayer(socket.id, targetSeatIndex, amount);
            if (!result.success) {
                socket.emit('errorAlert', result.error);
            }
            else {
                this.broadcastTableState(roomId);
                if (result.tipData) {
                    this.io.to(roomId).emit('playerTipped', result.tipData);
                }
            }
        });
        // 6. Bot controls
        socket.on('addBot', () => {
            const roomId = this.socketToRoom.get(socket.id);
            if (!roomId)
                return;
            const table = this.tables.get(roomId);
            const res = table?.addBot();
            if (res && !res.success) {
                socket.emit('errorAlert', res.error);
            }
        });
        socket.on('kickBot', ({ seatIndex }) => {
            const roomId = this.socketToRoom.get(socket.id);
            if (!roomId)
                return;
            const table = this.tables.get(roomId);
            table?.kickBot(seatIndex);
        });
        // 7. Send chat / emote
        socket.on('sendChat', ({ message, senderName }) => {
            const roomId = this.socketToRoom.get(socket.id);
            if (!roomId || !message.trim())
                return;
            this.broadcastChatMessage(roomId, {
                id: `chat_${Date.now()}_${Math.random()}`,
                senderName: senderName || 'Pemain',
                message: message.trim(),
                timestamp: Date.now(),
                isSystem: false
            });
        });
        // 7b. WebRTC Voice Chat Signaling
        socket.on('voice:join', ({ roomId, playerName }) => {
            const cleanId = (roomId || 'meja-1').trim().toLowerCase();
            let roomVoice = this.voiceUsersInRoom.get(cleanId);
            if (!roomVoice) {
                roomVoice = new Map();
                this.voiceUsersInRoom.set(cleanId, roomVoice);
            }
            // Collect existing peers in this voice room
            const existingPeers = Array.from(roomVoice.values()).filter(p => p.socketId !== socket.id);
            roomVoice.set(socket.id, { socketId: socket.id, playerName: playerName || 'Pemain' });
            // Send existing peers to the new participant
            socket.emit('voice:all-users', { peers: existingPeers });
            // Notify other peers in this room that a new user joined voice
            socket.to(cleanId).emit('voice:user-joined', { socketId: socket.id, playerName: playerName || 'Pemain' });
        });
        socket.on('voice:signal', ({ targetSocketId, signal }) => {
            this.io.to(targetSocketId).emit('voice:signal', {
                senderSocketId: socket.id,
                signal
            });
        });
        socket.on('voice:speaking', ({ roomId, isSpeaking }) => {
            const cleanId = (roomId || 'meja-1').trim().toLowerCase();
            socket.to(cleanId).emit('voice:speaking-state', {
                socketId: socket.id,
                isSpeaking
            });
        });
        socket.on('voice:leave', ({ roomId }) => {
            const targetRoom = (roomId || this.socketToRoom.get(socket.id) || '').trim().toLowerCase();
            if (targetRoom) {
                const roomVoice = this.voiceUsersInRoom.get(targetRoom);
                if (roomVoice && roomVoice.has(socket.id)) {
                    roomVoice.delete(socket.id);
                    socket.to(targetRoom).emit('voice:user-left', { socketId: socket.id });
                }
            }
        });
        // 8. Disconnect with grace period so brief network drops or page reloads don't ruin game
        socket.on('disconnect', () => {
            // Clean up voice chat
            for (const [rId, roomVoice] of this.voiceUsersInRoom.entries()) {
                if (roomVoice.has(socket.id)) {
                    roomVoice.delete(socket.id);
                    socket.to(rId).emit('voice:user-left', { socketId: socket.id });
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
    broadcastTableState(roomId) {
        const table = this.tables.get(roomId);
        if (!table)
            return;
        const publicState = table.getPublicState();
        this.io.to(roomId).emit('tableState', publicState);
        // Send private cards individually to seated players
        const clients = this.io.sockets.adapter.rooms.get(roomId);
        if (clients) {
            for (const clientId of clients) {
                const privateCards = table.getPlayerCards(clientId);
                this.io.to(clientId).emit('myCards', privateCards);
            }
        }
    }
    broadcastChatMessage(roomId, msg) {
        this.io.to(roomId).emit('chatMessage', msg);
    }
}
