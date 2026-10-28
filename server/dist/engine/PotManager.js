export class PotManager {
    /**
     * Calculates main pot and any side pots based on each player's total contribution in the hand.
     */
    static calculatePots(contributions) {
        // Only consider players who contributed something > 0
        const activeContributors = contributions.filter(c => c.amount > 0);
        if (activeContributors.length === 0)
            return [];
        // Distinct non-zero contribution levels from all-in players + max contribution
        const allInLevels = Array.from(new Set(activeContributors.filter(c => c.isAllIn).map(c => c.amount))).sort((a, b) => a - b);
        const maxContrib = Math.max(...activeContributors.map(c => c.amount));
        if (!allInLevels.includes(maxContrib)) {
            allInLevels.push(maxContrib);
        }
        const pots = [];
        let previousLevel = 0;
        for (const level of allInLevels) {
            const potSizeContribution = level - previousLevel;
            if (potSizeContribution <= 0)
                continue;
            let potAmount = 0;
            const eligiblePlayers = [];
            for (const player of activeContributors) {
                if (player.amount > previousLevel) {
                    const contributedToThisPot = Math.min(player.amount, level) - previousLevel;
                    potAmount += contributedToThisPot;
                    // Eligible for winning this pot if not folded
                    if (!player.folded) {
                        eligiblePlayers.push(player.playerId);
                    }
                }
            }
            if (potAmount > 0 && eligiblePlayers.length > 0) {
                pots.push({
                    amount: potAmount,
                    eligiblePlayerIds: eligiblePlayers
                });
            }
            previousLevel = level;
        }
        // Merge adjacent pots with identical eligible players
        const mergedPots = [];
        for (const pot of pots) {
            const last = mergedPots[mergedPots.length - 1];
            if (last &&
                last.eligiblePlayerIds.length === pot.eligiblePlayerIds.length &&
                last.eligiblePlayerIds.every(id => pot.eligiblePlayerIds.includes(id))) {
                last.amount += pot.amount;
            }
            else {
                mergedPots.push({ ...pot });
            }
        }
        return mergedPots;
    }
}
