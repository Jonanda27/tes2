import { Deck } from './Deck.js';
import { HandEvaluator } from './HandEvaluator.js';
import { PotManager } from './PotManager.js';
import { BotAI } from './BotAI.js';
export class PokerTable {
    roomId;
    roomName;
    maxSeats;
    smallBlind;
    bigBlind;
    startingChips;
    turnDuration;
    seats;
    deck;
    stage = 'WAITING';
    pot = 0;
    currentHighestBet = 0;
    minRaise = 0;
    communityCards = [];
    dealerSeat = -1;
    smallBlindSeat = -1;
    bigBlindSeat = -1;
    activeSeat = null;
    lastRaiserSeat = null;
    playersActedInRound = new Set();
    turnTimer = null;
    turnTimeRemaining = 0;
    turnInterval = null;
    showdownTimeout = null;
    botActionTimeout = null;
    waitingCountdownTimer = null;
    waitingCountdown = null;
    winners = [];
    handNumber = 0;
    onStateChange;
    onChatMessage;
    constructor(options) {
        this.roomId = options.roomId;
        this.roomName = options.roomName;
        this.maxSeats = options.maxSeats ?? 8;
        this.smallBlind = options.smallBlind ?? 1000;
        this.bigBlind = options.bigBlind ?? 2000;
        this.startingChips = options.startingChips ?? 100000;
        this.turnDuration = options.turnDuration ?? 25;
        this.onStateChange = options.onStateChange;
        this.onChatMessage = options.onChatMessage;
        this.seats = Array(this.maxSeats).fill(null);
        this.deck = new Deck();
    }
    sit(playerId, name, seatIndex, isBot = false) {
        if (seatIndex < 0 || seatIndex >= this.maxSeats) {
            return { success: false, error: 'Kursi tidak valid' };
        }
        if (this.seats[seatIndex] !== null) {
            return { success: false, error: 'Kursi sudah ditempati' };
        }
        // Check if player already seated elsewhere
        const existing = this.seats.findIndex(p => p?.id === playerId);
        if (existing !== -1) {
            return { success: false, error: 'Anda sudah duduk di kursi lain' };
        }
        const isMidGame = this.stage !== 'WAITING';
        this.seats[seatIndex] = {
            id: playerId,
            name,
            seatIndex,
            chips: this.startingChips,
            currentBet: 0,
            totalHandBet: 0,
            folded: isMidGame,
            waitingNextHand: isMidGame,
            isAllIn: false,
            isSittingOut: false,
            isReady: isBot ? true : false,
            isBot,
            lastAction: isMidGame ? 'Menunggu Ronde Baru' : undefined,
            cardCount: 0,
            cards: []
        };
        if (isMidGame) {
            this.broadcastSystemMessage(`${name} duduk di Kursi #${seatIndex + 1} (Menunggu ronde saat ini selesai untuk ikut bermain)`);
        }
        else {
            this.broadcastSystemMessage(`${name} duduk di Kursi #${seatIndex + 1} (${isBot ? 'Siap' : 'Klik READY untuk mulai'})`);
            this.checkReadyAndStart();
        }
        this.onStateChange();
        return { success: true };
    }
    toggleReady(playerId) {
        const player = this.seats.find(p => p?.id === playerId);
        if (!player)
            return { success: false, error: 'Pemain tidak ditemukan' };
        // If player clicked READY during SHOWDOWN, queue the ready state
        if (this.stage === 'SHOWDOWN') {
            player.isReady = true;
            this.broadcastSystemMessage(`✅ ${player.name} SIAP (READY)!`);
            this.onStateChange();
            return { success: true };
        }
        if (this.stage !== 'WAITING') {
            return { success: false, error: 'Game sedang berlangsung' };
        }
        player.isReady = !player.isReady;
        this.broadcastSystemMessage(player.isReady
            ? `✅ ${player.name} SIAP (READY)!`
            : `⏳ ${player.name} membatalkan READY.`);
        this.checkReadyAndStart();
        this.onStateChange();
        return { success: true };
    }
    checkReadyAndStart() {
        if (this.stage !== 'WAITING')
            return false;
        const eligible = this.seats.filter((p) => p !== null && !p.isSittingOut && p.chips > 0);
        if (eligible.length < 2) {
            this.clearWaitingTimer();
            return false;
        }
        const allReady = eligible.every(p => p.isReady);
        if (allReady) {
            this.clearWaitingTimer();
            this.startHand();
            return true;
        }
        else {
            // Auto countdown so game starts even if a player is AFK or delayed
            if (!this.waitingCountdownTimer) {
                this.startWaitingAutoStartCountdown();
            }
        }
        return false;
    }
    startWaitingAutoStartCountdown() {
        if (this.stage !== 'WAITING')
            return;
        if (this.waitingCountdownTimer)
            return;
        const eligible = this.seats.filter((p) => p !== null && !p.isSittingOut && p.chips > 0);
        if (eligible.length < 2) {
            this.waitingCountdown = null;
            return;
        }
        this.waitingCountdown = 5;
        this.waitingCountdownTimer = setInterval(() => {
            if (this.stage !== 'WAITING') {
                this.clearWaitingTimer();
                return;
            }
            const curEligible = this.seats.filter((p) => p !== null && !p.isSittingOut && p.chips > 0);
            if (curEligible.length < 2) {
                this.clearWaitingTimer();
                this.onStateChange();
                return;
            }
            if (this.waitingCountdown !== null && this.waitingCountdown > 1) {
                this.waitingCountdown--;
                this.onStateChange();
            }
            else {
                this.clearWaitingTimer();
                for (const p of curEligible) {
                    p.isReady = true;
                }
                this.startHand();
            }
        }, 1000);
        this.onStateChange();
    }
    clearWaitingTimer() {
        if (this.waitingCountdownTimer) {
            clearInterval(this.waitingCountdownTimer);
            this.waitingCountdownTimer = null;
        }
        this.waitingCountdown = null;
    }
    rebindPlayerSocket(playerName, newSocketId) {
        const cleanName = playerName.trim().toLowerCase();
        const player = this.seats.find(p => p !== null && !p.isBot && p.name.trim().toLowerCase() === cleanName);
        if (player) {
            player.id = newSocketId;
            return true;
        }
        return false;
    }
    leave(playerId) {
        const seatIndex = this.seats.findIndex(p => p?.id === playerId);
        if (seatIndex === -1)
            return;
        const player = this.seats[seatIndex];
        this.broadcastSystemMessage(`${player.name} meninggalkan meja`);
        // If active during a hand, fold them first
        if (this.stage !== 'WAITING' && this.stage !== 'SHOWDOWN' && !player.folded) {
            player.folded = true;
            if (this.activeSeat === seatIndex) {
                this.nextTurn();
            }
        }
        this.seats[seatIndex] = null;
        if (this.getEligiblePlayerCount() < 2 && this.stage !== 'WAITING') {
            this.resetToWaiting('Pemain tersisa kurang dari 2, menunggu pemain lain...');
        }
        else {
            if (this.stage === 'WAITING') {
                this.checkReadyAndStart();
            }
            this.onStateChange();
        }
    }
    rebuy(playerId) {
        const player = this.seats.find(p => p?.id === playerId);
        if (!player)
            return { success: false, error: 'Pemain tidak ditemukan' };
        // 1. Chip must be completely 0
        if (player.chips > 0) {
            return { success: false, error: 'Chip Anda belum habis. Isi ulang hanya bisa saat chip benar-benar 0!' };
        }
        // 2. Cannot rebuy while actively participating in an ongoing hand
        if (this.stage !== 'WAITING') {
            const isCurrentlyInHand = (player.cards && player.cards.length > 0) ||
                player.isAllIn ||
                player.totalHandBet > 0 ||
                !player.folded;
            if (isCurrentlyInHand) {
                return {
                    success: false,
                    error: 'Tidak bisa isi ulang saat sedang bermain! Tunggu hingga ronde ini selesai.'
                };
            }
        }
        player.chips = this.startingChips;
        player.isAllIn = false;
        player.isSittingOut = false;
        this.broadcastSystemMessage(`${player.name} mengisi ulang chip (Rp ${this.startingChips.toLocaleString('id-ID')})`);
        if (this.stage === 'WAITING') {
            this.checkReadyAndStart();
        }
        this.onStateChange();
        return { success: true };
    }
    tipPlayer(senderId, targetSeatIndex, amount) {
        const validAmounts = [500, 1000, 2000];
        if (!validAmounts.includes(amount)) {
            return { success: false, error: 'Nominal tip receh hanya boleh Rp 500, Rp 1.000, atau Rp 2.000' };
        }
        const sender = this.seats.find(p => p?.id === senderId);
        if (!sender) {
            return { success: false, error: 'Anda harus duduk di meja untuk melempar tip receh' };
        }
        if (targetSeatIndex < 0 || targetSeatIndex >= this.maxSeats) {
            return { success: false, error: 'Kursi tujuan tidak valid' };
        }
        const target = this.seats[targetSeatIndex];
        if (!target) {
            return { success: false, error: 'Kursi tujuan kosong' };
        }
        if (target.id === sender.id) {
            return { success: false, error: 'Tidak bisa memberi tip ke diri sendiri' };
        }
        if (sender.chips < amount) {
            return { success: false, error: 'Chip Anda tidak cukup untuk memberi tip receh ini' };
        }
        sender.chips -= amount;
        target.chips += amount;
        if (target.isSittingOut && target.chips > 0) {
            target.isSittingOut = false;
            if (this.stage === 'WAITING') {
                this.checkReadyAndStart();
            }
        }
        const phrases = [
            'Nih buat beli gorengan! 🪙',
            'Sedekah receh buat lu bro! 🪙',
            'Nih uang jajan permen! 🍬',
            'Lumayan kan nambah receh? 😆',
            'Semangat bro, nih buat modal kopi! ☕',
            'Nih receh receh berkah! 🪙'
        ];
        const phrase = phrases[Math.floor(Math.random() * phrases.length)];
        this.broadcastSystemMessage(`🪙 ${sender.name} melempar receh Rp ${amount.toLocaleString('id-ID')} ke ${target.name}: "${phrase}"`);
        this.onStateChange();
        return {
            success: true,
            tipData: {
                fromSeat: sender.seatIndex,
                toSeat: target.seatIndex,
                amount,
                fromName: sender.name,
                toName: target.name,
                phrase
            }
        };
    }
    addBot() {
        const emptySeat = this.seats.findIndex(p => p === null);
        if (emptySeat === -1) {
            return { success: false, error: 'Meja sudah penuh' };
        }
        const botNames = ['Budi Pro', 'Siti Joker', 'Reza Aces', 'Dewi Bluff', 'Andi Shark', 'Mega Poker'];
        const usedNames = new Set(this.seats.filter(Boolean).map(p => p.name));
        const availableNames = botNames.filter(n => !usedNames.has(n));
        const chosenName = availableNames[0] ?? `Bot #${Math.floor(Math.random() * 1000)}`;
        const botId = `bot_${Date.now()}_${emptySeat}`;
        return this.sit(botId, chosenName, emptySeat, true);
    }
    kickBot(seatIndex) {
        const p = this.seats[seatIndex];
        if (p && p.isBot) {
            this.leave(p.id);
        }
    }
    // =================== GAME ENGINE LIFECYCLE ===================
    startHand() {
        this.clearTimers();
        // 1. Reset and synchronize seated players with chips FIRST
        for (const seat of this.seats) {
            if (seat) {
                seat.cards = [];
                seat.cardCount = 0;
                seat.currentBet = 0;
                seat.totalHandBet = 0;
                if (seat.chips > 0) {
                    seat.isSittingOut = false;
                    seat.folded = false;
                }
                else {
                    seat.isSittingOut = true;
                    seat.folded = true;
                }
                seat.waitingNextHand = false;
                seat.isAllIn = false;
                seat.lastAction = undefined;
                seat.showdownCards = undefined;
                seat.handDescription = undefined;
            }
        }
        // 2. Compute eligible seats strictly AFTER player synchronization
        const eligibleSeats = this.getEligibleSeats();
        if (eligibleSeats.length < 2) {
            this.resetToWaiting('Menunggu pemain lain (minimal 2 pemain bertaruh)...');
            return;
        }
        try {
            this.handNumber++;
            this.winners = [];
            this.communityCards = [];
            this.pot = 0;
            this.deck.reset();
            this.deck.shuffle();
            // 3. Advance dealer seat strictly within eligibleSeats
            const prevDealerIdx = eligibleSeats.indexOf(this.dealerSeat);
            if (prevDealerIdx === -1) {
                this.dealerSeat = eligibleSeats[0];
            }
            else {
                this.dealerSeat = eligibleSeats[(prevDealerIdx + 1) % eligibleSeats.length];
            }
            // 4. Determine Blinds strictly within eligibleSeats
            const dIdx = eligibleSeats.indexOf(this.dealerSeat);
            if (eligibleSeats.length === 2) {
                // Heads-up: Dealer is Small Blind!
                this.smallBlindSeat = this.dealerSeat;
                this.bigBlindSeat = eligibleSeats.find(s => s !== this.dealerSeat);
            }
            else {
                // 3+ players: SB is seat after Dealer, BB is seat after SB
                this.smallBlindSeat = eligibleSeats[(dIdx + 1) % eligibleSeats.length];
                this.bigBlindSeat = eligibleSeats[(dIdx + 2) % eligibleSeats.length];
            }
            // 5. Deduct Blinds safely
            const sbPlayer = this.seats[this.smallBlindSeat];
            const bbPlayer = this.seats[this.bigBlindSeat];
            if (!sbPlayer || !bbPlayer) {
                console.error('Critical blind assignment error: seats not found', this.smallBlindSeat, this.bigBlindSeat);
                this.resetToWaiting('Terjadi kesalahan saat membagikan blind, mengulang ronde...');
                return;
            }
            const sbAmount = Math.min(sbPlayer.chips, this.smallBlind);
            sbPlayer.chips -= sbAmount;
            sbPlayer.currentBet = sbAmount;
            sbPlayer.totalHandBet = sbAmount;
            if (sbPlayer.chips === 0)
                sbPlayer.isAllIn = true;
            sbPlayer.lastAction = `SB Rp ${sbAmount.toLocaleString('id-ID')}`;
            const bbAmount = Math.min(bbPlayer.chips, this.bigBlind);
            bbPlayer.chips -= bbAmount;
            bbPlayer.currentBet = bbAmount;
            bbPlayer.totalHandBet = bbAmount;
            if (bbPlayer.chips === 0)
                bbPlayer.isAllIn = true;
            bbPlayer.lastAction = `BB Rp ${bbAmount.toLocaleString('id-ID')}`;
            this.pot = sbAmount + bbAmount;
            this.currentHighestBet = this.bigBlind;
            this.minRaise = this.bigBlind;
            // 6. Deal 2 hole cards to EVERY eligible player
            for (let round = 0; round < 2; round++) {
                for (const seatIdx of eligibleSeats) {
                    const card = this.deck.draw();
                    if (card && this.seats[seatIdx]) {
                        this.seats[seatIdx].cards.push(card);
                        this.seats[seatIdx].cardCount = this.seats[seatIdx].cards.length;
                    }
                }
            }
            this.stage = 'PREFLOP';
            this.playersActedInRound.clear();
            // 7. First action preflop:
            // Heads-up: Small Blind (Dealer) acts first preflop!
            // 3+ players: Seat after Big Blind (UTG) acts first preflop!
            if (eligibleSeats.length === 2) {
                this.activeSeat = this.smallBlindSeat;
            }
            else {
                const utgSeat = eligibleSeats[(dIdx + 3) % eligibleSeats.length];
                this.activeSeat = utgSeat;
            }
            // Validate initial active player
            const initialActive = this.activeSeat !== null ? this.seats[this.activeSeat] : null;
            if (!initialActive || initialActive.folded || initialActive.isAllIn || initialActive.cards.length === 0) {
                this.activeSeat = this.getNextActiveSeat(this.activeSeat ?? this.bigBlindSeat);
            }
            this.lastRaiserSeat = this.bigBlindSeat;
            this.broadcastSystemMessage(`=== Ronde Baru #${this.handNumber} Dimulai ===`);
            this.startTurnTimer();
            this.onStateChange();
        }
        catch (err) {
            console.error('Error starting hand:', err);
            this.resetToWaiting('Terjadi kesalahan saat memulai ronde, silakan klik READY kembali.');
        }
    }
    handleAction(playerId, action, raiseAmount) {
        if (this.stage === 'WAITING' || this.stage === 'SHOWDOWN') {
            return { success: false, error: 'Game sedang tidak dalam ronde taruhan' };
        }
        if (this.activeSeat === null || this.seats[this.activeSeat]?.id !== playerId) {
            return { success: false, error: 'Bukan giliran Anda' };
        }
        const player = this.seats[this.activeSeat];
        const callCost = this.currentHighestBet - player.currentBet;
        switch (action) {
            case 'FOLD': {
                player.folded = true;
                player.lastAction = 'FOLD';
                player.showdownCards = [...player.cards];
                const allCards = [...player.cards, ...this.communityCards];
                if (allCards.length >= 5) {
                    try {
                        const evalHand = HandEvaluator.evaluate(allCards);
                        player.handDescription = evalHand.description;
                    }
                    catch {
                        // ignore
                    }
                }
                this.broadcastSystemMessage(`${player.name} melakukan FOLD`);
                break;
            }
            case 'CHECK': {
                if (callCost > 0) {
                    return { success: false, error: 'Tidak bisa CHECK, ada taruhan yang harus di-CALL' };
                }
                player.lastAction = 'CHECK';
                this.broadcastSystemMessage(`${player.name} melakukan CHECK`);
                break;
            }
            case 'CALL': {
                if (callCost <= 0) {
                    // Equivalent to check
                    player.lastAction = 'CHECK';
                    this.broadcastSystemMessage(`${player.name} melakukan CHECK`);
                }
                else {
                    const actualCall = Math.min(player.chips, callCost);
                    player.chips -= actualCall;
                    player.currentBet += actualCall;
                    player.totalHandBet += actualCall;
                    this.pot += actualCall;
                    if (player.chips === 0) {
                        player.isAllIn = true;
                        player.lastAction = 'ALL-IN';
                        this.broadcastSystemMessage(`${player.name} ALL-IN (Rp ${actualCall.toLocaleString('id-ID')})`);
                    }
                    else {
                        player.lastAction = `CALL Rp ${actualCall.toLocaleString('id-ID')}`;
                        this.broadcastSystemMessage(`${player.name} CALL Rp ${actualCall.toLocaleString('id-ID')}`);
                    }
                }
                break;
            }
            case 'RAISE': {
                if (!raiseAmount || isNaN(raiseAmount)) {
                    return { success: false, error: 'Nominal raise tidak valid' };
                }
                // raiseAmount is total bet target in current round
                const minTarget = this.currentHighestBet + this.minRaise;
                const totalNeeded = raiseAmount - player.currentBet;
                if (totalNeeded > player.chips) {
                    // If player doesn't have enough for full raise, they can only All-In
                    if (raiseAmount > player.currentBet + player.chips) {
                        raiseAmount = player.currentBet + player.chips;
                    }
                }
                if (raiseAmount < minTarget && raiseAmount < player.currentBet + player.chips) {
                    return {
                        success: false,
                        error: `Minimal raise adalah Rp ${minTarget.toLocaleString('id-ID')}`
                    };
                }
                const addedChips = raiseAmount - player.currentBet;
                player.chips -= addedChips;
                player.currentBet = raiseAmount;
                player.totalHandBet += addedChips;
                this.pot += addedChips;
                const raiseDifference = raiseAmount - this.currentHighestBet;
                if (raiseDifference > this.minRaise) {
                    this.minRaise = raiseDifference;
                }
                this.currentHighestBet = raiseAmount;
                this.lastRaiserSeat = this.activeSeat;
                this.playersActedInRound.clear(); // Everyone must act again
                if (player.chips === 0) {
                    player.isAllIn = true;
                    player.lastAction = 'ALL-IN RAISE';
                    this.broadcastSystemMessage(`${player.name} ALL-IN RAISE ke Rp ${raiseAmount.toLocaleString('id-ID')}`);
                }
                else {
                    player.lastAction = `RAISE ke Rp ${raiseAmount.toLocaleString('id-ID')}`;
                    this.broadcastSystemMessage(`${player.name} RAISE ke Rp ${raiseAmount.toLocaleString('id-ID')}`);
                }
                break;
            }
        }
        this.playersActedInRound.add(this.activeSeat);
        this.nextTurn();
        return { success: true };
    }
    nextTurn() {
        this.clearTimers();
        // 1. Check if only 1 player remaining (all others folded)
        const activeUnfolded = this.seats.filter((p) => p !== null && !p.folded);
        if (activeUnfolded.length === 1) {
            this.resolveSingleWinner(activeUnfolded[0]);
            return;
        }
        // 2. Check if betting round complete
        if (this.isBettingRoundComplete()) {
            this.advanceStreet();
            return;
        }
        // 3. Move to next active player
        const nextSeat = this.getNextActiveSeat(this.activeSeat);
        if (nextSeat === null) {
            // All remaining players are all-in or folded
            this.advanceStreet();
            return;
        }
        this.activeSeat = nextSeat;
        this.startTurnTimer();
        this.onStateChange();
    }
    isBettingRoundComplete() {
        const playersInHand = this.seats.filter((p) => p !== null && !p.folded);
        // Players who are not all-in and can still act
        const canActPlayers = playersInHand.filter((p) => !p.isAllIn);
        if (canActPlayers.length <= 1) {
            // If at most 1 player can act, check if they matched highest bet
            const uncalledBets = canActPlayers.some(p => p.currentBet < this.currentHighestBet);
            if (!uncalledBets)
                return true;
        }
        // Everyone who can act has acted, and their bets match currentHighestBet
        for (const p of canActPlayers) {
            if (!this.playersActedInRound.has(p.seatIndex))
                return false;
            if (p.currentBet !== this.currentHighestBet)
                return false;
        }
        return true;
    }
    advanceStreet() {
        // Reset round bets
        for (const p of this.seats) {
            if (p)
                p.currentBet = 0;
        }
        this.currentHighestBet = 0;
        this.minRaise = this.bigBlind;
        this.playersActedInRound.clear();
        // If remaining active players can no longer bet (e.g. all-in), reveal cards to end
        const playersWhoCanBet = this.seats.filter((p) => p !== null && !p.folded && !p.isAllIn);
        switch (this.stage) {
            case 'PREFLOP': {
                this.stage = 'FLOP';
                this.deck.draw(); // Burn card
                this.communityCards.push(this.deck.draw(), this.deck.draw(), this.deck.draw());
                this.broadcastSystemMessage(`=== FLOP DIBUKA: [${this.communityCards.map(c => c.rank + c.suit).join(' ')}] ===`);
                break;
            }
            case 'FLOP': {
                this.stage = 'TURN';
                this.deck.draw(); // Burn card
                this.communityCards.push(this.deck.draw());
                this.broadcastSystemMessage(`=== TURN DIBUKA: [${this.communityCards[3].rank + this.communityCards[3].suit}] ===`);
                break;
            }
            case 'TURN': {
                this.stage = 'RIVER';
                this.deck.draw(); // Burn card
                this.communityCards.push(this.deck.draw());
                this.broadcastSystemMessage(`=== RIVER DIBUKA: [${this.communityCards[4].rank + this.communityCards[4].suit}] ===`);
                break;
            }
            case 'RIVER': {
                this.showdown();
                return;
            }
        }
        if (playersWhoCanBet.length <= 1) {
            // If remaining active players are all-in, reveal their cards during the runout
            const activePlayers = this.seats.filter((p) => p !== null && !p.folded);
            if (activePlayers.length > 1) {
                for (const p of activePlayers) {
                    p.showdownCards = [...p.cards];
                }
            }
            // Fast forward with suspense delay to showdown
            this.onStateChange();
            this.showdownTimeout = setTimeout(() => {
                this.advanceStreet();
            }, 1500);
            return;
        }
        // Action starts after dealer button post-flop
        this.activeSeat = this.getNextActiveSeat(this.dealerSeat);
        this.lastRaiserSeat = null;
        this.startTurnTimer();
        this.onStateChange();
    }
    showdown() {
        this.stage = 'SHOWDOWN';
        this.activeSeat = null;
        this.clearTimers();
        // Reveal cards for ALL seated players who had cards in this hand (active & folded)
        for (const p of this.seats) {
            if (p && p.cards && p.cards.length > 0) {
                p.showdownCards = [...p.cards];
                const allCards = [...p.cards, ...this.communityCards];
                if (allCards.length >= 5) {
                    try {
                        const evalHand = HandEvaluator.evaluate(allCards);
                        p.handDescription = evalHand.description;
                    }
                    catch {
                        // ignore
                    }
                }
            }
        }
        const contenders = this.seats.filter((p) => p !== null && !p.folded);
        // Evaluate hand for every contender
        const handScores = contenders.map(player => {
            const allCards = [...player.cards, ...this.communityCards];
            const evaluation = HandEvaluator.evaluate(allCards);
            player.showdownCards = [...player.cards];
            player.handDescription = evaluation.description;
            return { player, evaluation };
        });
        // Prepare pot contributions for side-pot calculations
        const contributions = this.seats
            .filter((p) => p !== null)
            .map(p => ({
            playerId: p.id,
            seatIndex: p.seatIndex,
            amount: p.totalHandBet,
            isAllIn: p.isAllIn,
            folded: p.folded
        }));
        const calculatedPots = PotManager.calculatePots(contributions);
        const winResults = [];
        for (const pot of calculatedPots) {
            const eligibleContenders = handScores.filter(h => pot.eligiblePlayerIds.includes(h.player.id));
            if (eligibleContenders.length === 0)
                continue;
            // Find the best hand among eligible contenders
            eligibleContenders.sort((a, b) => HandEvaluator.compareHands(b.evaluation, a.evaluation));
            const bestScore = eligibleContenders[0].evaluation;
            // Filter all who tie with bestScore
            const winnersForPot = eligibleContenders.filter(c => HandEvaluator.compareHands(c.evaluation, bestScore) === 0);
            const splitAmount = Math.floor(pot.amount / winnersForPot.length);
            for (const w of winnersForPot) {
                w.player.chips += splitAmount;
                winResults.push({
                    seatIndex: w.player.seatIndex,
                    playerId: w.player.id,
                    playerName: w.player.name,
                    amount: splitAmount,
                    handName: w.evaluation.description,
                    winningCards: w.evaluation.bestCards
                });
                this.broadcastSystemMessage(`🏆 ${w.player.name} memenangkan Rp ${splitAmount.toLocaleString('id-ID')} dengan ${w.evaluation.description}!`);
            }
        }
        this.winners = winResults;
        this.onStateChange();
        // Auto start next hand after 7 seconds
        this.showdownTimeout = setTimeout(() => {
            // Check rebuy or sitting out
            for (const p of this.seats) {
                if (p && p.chips <= 0) {
                    if (p.isBot) {
                        p.chips = this.startingChips; // Bots auto-reload
                    }
                    else {
                        p.isSittingOut = true;
                        this.broadcastSystemMessage(`${p.name} kehabisan chip. Silakan klik Rebuy Rp 100.000.`);
                    }
                }
            }
            // Reset flags for next hand
            for (const p of this.seats) {
                if (p) {
                    p.waitingNextHand = false;
                    if (p.chips > 0) {
                        p.isSittingOut = false;
                    }
                }
            }
            this.stage = 'WAITING';
            this.broadcastSystemMessage('Ronde selesai. Silakan klik READY untuk memulai ronde berikutnya.');
            this.checkReadyAndStart();
            this.onStateChange();
        }, 5000);
    }
    resolveSingleWinner(winner) {
        this.stage = 'SHOWDOWN';
        this.activeSeat = null;
        this.clearTimers();
        // Reveal cards for ALL seated players when the game finishes
        for (const p of this.seats) {
            if (p && p.cards && p.cards.length > 0) {
                p.showdownCards = [...p.cards];
                const allCards = [...p.cards, ...this.communityCards];
                if (allCards.length >= 5) {
                    try {
                        const evalHand = HandEvaluator.evaluate(allCards);
                        p.handDescription = evalHand.description;
                    }
                    catch {
                        // ignore
                    }
                }
            }
        }
        winner.chips += this.pot;
        this.winners = [
            {
                seatIndex: winner.seatIndex,
                playerId: winner.id,
                playerName: winner.name,
                amount: this.pot,
                handName: 'Semua lawan Fold',
                winningCards: [...winner.cards]
            }
        ];
        this.broadcastSystemMessage(`🏆 ${winner.name} memenangkan Rp ${this.pot.toLocaleString('id-ID')} (Semua pemain lain Fold)!`);
        this.onStateChange();
        this.showdownTimeout = setTimeout(() => {
            // Check rebuy or sitting out for players who ran out of chips
            for (const p of this.seats) {
                if (p && p.chips <= 0) {
                    if (p.isBot) {
                        p.chips = this.startingChips;
                    }
                    else {
                        p.isSittingOut = true;
                        this.broadcastSystemMessage(`${p.name} kehabisan chip. Silakan klik Rebuy Rp 100.000.`);
                    }
                }
            }
            for (const p of this.seats) {
                if (p) {
                    p.waitingNextHand = false;
                    if (p.chips > 0) {
                        p.isSittingOut = false;
                    }
                }
            }
            this.stage = 'WAITING';
            this.broadcastSystemMessage('Ronde selesai. Silakan klik READY untuk memulai ronde berikutnya.');
            this.checkReadyAndStart();
            this.onStateChange();
        }, 4500);
    }
    // =================== TIMERS & BOTS ===================
    startTurnTimer() {
        this.clearTimers();
        const activePlayer = this.activeSeat !== null ? this.seats[this.activeSeat] : null;
        if (!activePlayer)
            return;
        this.turnTimeRemaining = this.turnDuration;
        if (activePlayer.isBot) {
            // Bot takes action after 1.2 - 2.5 seconds for natural pacing
            const botDelay = 1200 + Math.random() * 1200;
            this.botActionTimeout = setTimeout(() => {
                if (this.activeSeat === activePlayer.seatIndex) {
                    try {
                        const decision = BotAI.decide(activePlayer.cards, this.communityCards, this.stage, this.currentHighestBet, activePlayer.currentBet, activePlayer.chips, this.minRaise, this.pot);
                        this.handleAction(activePlayer.id, decision.action, decision.amount);
                    }
                    catch (err) {
                        console.error('Error in bot decision, falling back to safe action:', err);
                        const callCost = this.currentHighestBet - activePlayer.currentBet;
                        if (callCost <= 0) {
                            this.handleAction(activePlayer.id, 'CHECK');
                        }
                        else {
                            this.handleAction(activePlayer.id, 'CALL');
                        }
                    }
                }
            }, botDelay);
            return;
        }
        // Player countdown
        this.turnInterval = setInterval(() => {
            this.turnTimeRemaining--;
            if (this.turnTimeRemaining <= 0) {
                this.clearTimers();
                // Auto action: Check if possible, else Fold
                const callCost = this.currentHighestBet - activePlayer.currentBet;
                if (callCost <= 0) {
                    this.handleAction(activePlayer.id, 'CHECK');
                }
                else {
                    this.handleAction(activePlayer.id, 'FOLD');
                }
            }
            else {
                this.onStateChange();
            }
        }, 1000);
    }
    clearTimers() {
        if (this.turnTimer)
            clearTimeout(this.turnTimer);
        if (this.turnInterval)
            clearInterval(this.turnInterval);
        if (this.showdownTimeout)
            clearTimeout(this.showdownTimeout);
        if (this.botActionTimeout)
            clearTimeout(this.botActionTimeout);
        this.clearWaitingTimer();
        this.turnTimer = null;
        this.turnInterval = null;
        this.showdownTimeout = null;
        this.botActionTimeout = null;
    }
    resetToWaiting(msg) {
        this.clearTimers();
        this.stage = 'WAITING';
        this.activeSeat = null;
        this.pot = 0;
        this.communityCards = [];
        this.broadcastSystemMessage(msg);
        this.checkReadyAndStart();
        this.onStateChange();
    }
    // =================== UTILITIES ===================
    getNextOccupiedSeat(fromSeat) {
        for (let i = 1; i <= this.maxSeats; i++) {
            const idx = (fromSeat + i) % this.maxSeats;
            const p = this.seats[idx];
            if (p !== null && !p.isSittingOut && p.chips > 0) {
                return idx;
            }
        }
        return -1;
    }
    getNextActiveSeat(fromSeat) {
        for (let i = 1; i <= this.maxSeats; i++) {
            const idx = (fromSeat + i) % this.maxSeats;
            const p = this.seats[idx];
            if (p !== null &&
                !p.folded &&
                !p.isAllIn &&
                !p.isSittingOut &&
                !p.waitingNextHand &&
                p.cards &&
                p.cards.length > 0 &&
                p.chips > 0) {
                return idx;
            }
        }
        return null;
    }
    getEligibleSeats() {
        const list = [];
        for (let i = 0; i < this.maxSeats; i++) {
            const p = this.seats[i];
            if (p !== null && !p.isSittingOut && p.chips > 0) {
                list.push(i);
            }
        }
        return list;
    }
    getEligiblePlayerCount() {
        return this.getEligibleSeats().length;
    }
    getPlayerCards(playerId) {
        const p = this.seats.find(s => s?.id === playerId);
        return p ? p.cards : [];
    }
    getPublicState() {
        const publicSeats = this.seats.map(p => {
            if (!p)
                return null;
            return {
                id: p.id,
                name: p.name,
                seatIndex: p.seatIndex,
                chips: p.chips,
                currentBet: p.currentBet,
                totalHandBet: p.totalHandBet,
                folded: p.folded,
                isAllIn: p.isAllIn,
                isSittingOut: p.isSittingOut,
                isReady: p.isReady,
                isBot: p.isBot,
                lastAction: p.lastAction,
                cardCount: p.cards.length,
                showdownCards: p.showdownCards,
                handDescription: p.handDescription,
                waitingNextHand: p.waitingNextHand
            };
        });
        return {
            roomId: this.roomId,
            roomName: this.roomName,
            stage: this.stage,
            pot: this.pot,
            currentHighestBet: this.currentHighestBet,
            minRaise: this.minRaise,
            communityCards: this.communityCards,
            dealerSeat: this.dealerSeat,
            smallBlindSeat: this.smallBlindSeat,
            bigBlindSeat: this.bigBlindSeat,
            activeSeat: this.activeSeat,
            turnTimeRemaining: this.turnTimeRemaining,
            turnDuration: this.turnDuration,
            smallBlind: this.smallBlind,
            bigBlind: this.bigBlind,
            startingChips: this.startingChips,
            seats: publicSeats,
            winners: this.winners,
            handNumber: this.handNumber,
            waitingCountdown: this.waitingCountdown ?? undefined
        };
    }
    broadcastSystemMessage(text) {
        this.onChatMessage({
            id: `sys_${Date.now()}_${Math.random()}`,
            senderName: 'Dealer',
            message: text,
            timestamp: Date.now(),
            isSystem: true
        });
    }
}
