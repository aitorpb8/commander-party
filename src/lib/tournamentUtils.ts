export interface TournamentProfile {
    id: string;
    username: string;
    avatar_url: string;
}

export interface TournamentPlayer {
    id: string; // tournament_participant id
    player_id: string; // profile id
    points: number;
    wins: number;
    draws: number;
    losses: number;
    matches_played: number;
    is_dropped?: boolean;
    profiles: TournamentProfile;
    // Computed
    omw?: number; 
}

export interface MatchInfo {
    id: string;
    players: string[]; // array of player_ids
    winner_id: string | null;
}

export interface TournamentMatchInfo {
    id: string; // db id
    match_id: string;
    round_number: number;
    table_number: number;
    matches: MatchInfo;
}

/**
 * Calculates standings with OMW% (Opponent Match Win Percentage)
 */
export function calculateStandings(
    participants: TournamentPlayer[],
    matches: TournamentMatchInfo[]
): TournamentPlayer[] {
    // 1. Map player_id to participant for easy lookup
    const playerMap = new Map<string, TournamentPlayer>();
    participants.forEach(p => playerMap.set(p.player_id, p));

    // 2. Build Opponent Graph
    const opponents: Record<string, Set<string>> = {};
    participants.forEach(p => opponents[p.player_id] = new Set());

    matches.forEach(tm => {
        const pIds = tm.matches.players;
        // In a multiplayer pod, everyone is an opponent of everyone else
        for (let i = 0; i < pIds.length; i++) {
            for (let j = 0; j < pIds.length; j++) {
                if (i !== j) {
                    opponents[pIds[i]]?.add(pIds[j]);
                }
            }
        }
    });

    // 3. Calculate OMW%
    const participantsWithStats = participants.map(p => {
        const myOpponents = Array.from(opponents[p.player_id] || []);
        
        let sumOpponentMWP = 0;
        let count = 0;

        myOpponents.forEach(oppId => {
            const opp = playerMap.get(oppId);
            if (opp) {
                // Magic Rule: Minimum 33% (0.33)
                const played = opp.matches_played || 0;
                const actualMWP = played > 0 ? opp.points / (played * 3) : 0;
                sumOpponentMWP += Math.max(actualMWP, 0.33);
                count++;
            }
        });

        const omw = count > 0 ? sumOpponentMWP / count : 0.33; // Default 0.33 if no games
        return { ...p, omw };
    });

    // 4. Sort
    // Priority: Points > Wins > OMW% > Random/Alphabetical
    return participantsWithStats.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        // Handle undefined omw just in case
        const omwA = a.omw || 0;
        const omwB = b.omw || 0;
        if (Math.abs(omwB - omwA) > 0.0001) return omwB - omwA; 
        
        return a.profiles.username.localeCompare(b.profiles.username);
    });
}

/**
 * Generates Pairings avoiding rematches if possible
 */
export function generatePairings(
    participants: TournamentPlayer[],
    pastMatches: TournamentMatchInfo[],
    currentRound: number
): string[][] {
    // 1. Get available active players
    const activePlayers = participants.filter(p => !p.is_dropped);
    
    // 2. Build Collision Map (Who has played whom)
    const history: Record<string, Set<string>> = {};
    activePlayers.forEach(p => history[p.player_id] = new Set());

    pastMatches.forEach(tm => {
        const pIds = tm.matches.players;
        for (let i = 0; i < pIds.length; i++) {
            for (let j = 0; j < pIds.length; j++) {
                if (i !== j) {
                    history[pIds[i]]?.add(pIds[j]);
                }
            }
        }
    });

    // 3. Sort players by points to ensure strong players play strong players (Swiss)
    // Add a small random factor to shuffle within same point brackets
    const sortedPlayers = [...activePlayers].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return Math.random() - 0.5;
    });

    const N = sortedPlayers.length;
    const pods: string[][] = [];

    // 4. Determine Pod Structure (Avoid 5s, prefer 3s)
    let num5s = 0, num4s = 0, num3s = 0;
    
    if (N < 4) {
        // Special case for tiny tourneys
        num3s = (N === 3) ? 1 : 0;
        // If N=2/1, logic below usually fails or we just do 1v1? 
        // Current logic assumes multiplayer > 2 usually.
    } else if (N === 5) {
        // Unavoidable 5
        num5s = 1;
    } else {
        // Strategy: Maximize 4s, Fill rest with 3s. No 5s.
        // Formula: num3s = (4 - (remainder mod 4)) mod 4
        const rem = N % 4;
        num3s = (4 - rem) % 4;
        num4s = (N - 3 * num3s) / 4;
    }

    // 5. Fill Pods
    // A simple greedy approach:
    // Take the highest pointed player, then try to find 3 others closest in points
    // who have NOT played this player.
    
    const availableSet = new Set(sortedPlayers.map(p => p.player_id));
    const finalPods: string[][] = [];

    const createPod = (size: number) => {
         // Pick highest seed available
         const seedId = getHighestSeed(sortedPlayers, availableSet);
         if (!seedId) return; // Should not happen if logic is correct

         const currentPod = [seedId];
         availableSet.delete(seedId);

         // Find (size - 1) best mates
         while (currentPod.length < size) {
             const candidate = findBestCandidate(currentPod, sortedPlayers, availableSet, history);
             if (candidate) {
                 currentPod.push(candidate);
                 availableSet.delete(candidate);
             } else {
                 // Fallback: Just take next available high seed
                 const fallback = getHighestSeed(sortedPlayers, availableSet);
                 if (fallback) {
                    currentPod.push(fallback);
                    availableSet.delete(fallback);
                 } else {
                     break; // Should not happen
                 }
             }
         }
         finalPods.push(currentPod);
    };

    // It's usually better to make largest pods first or last? 
    // In Swiss, usually top tables are strictly paired.
    // Let's execute the calculated number of pods.
    
    // Note: The order of 5s, 4s, 3s matters for who gets the "weird" table.
    // Usually we want top tables to be standard 4. 
    // Let's put 3s/5s at the bottom (lower points).
    
    // Strategy: Fill X pods of 4. Then fill the rest. 
    // Actually, logic above defined exact counts.
    // Let's map out the sizes array, e.g. [4, 4, 4, ... 3]
    // And standard sort implies top players first.
    
    const podSizes: number[] = [];
    for(let i=0; i<num4s; i++) podSizes.push(4);
    for(let i=0; i<num5s; i++) podSizes.push(5); // 5s are often considered "bad" or "good" depending.
    for(let i=0; i<num3s; i++) podSizes.push(3);
    
    // Sort podSizes? If we want top table to be 4, put 4 first.
    // If we have 5s, usually 5 is better than 3.
    // This simple logic just appends.
    
    podSizes.forEach(size => createPod(size));
    
    return finalPods;
}

// Helpers

function getHighestSeed(allSorted: TournamentPlayer[], available: Set<string>): string | null {
    for (const p of allSorted) {
        if (available.has(p.player_id)) return p.player_id;
    }
    return null;
}

function findBestCandidate(
    currentPod: string[], 
    allSorted: TournamentPlayer[], 
    available: Set<string>, 
    history: Record<string, Set<string>>
): string | null {
    // We want a player who is available
    // AND has minimal Conflicts with currentPod members
    // AND has closest points (already sorted, so first valid candidate is best in points)
    
    let bestCandidate: string | null = null;
    let minConflicts = 999;

    // Iterate through available players (ordered by points)
    for (const p of allSorted) {
        if (!available.has(p.player_id)) continue;

        // Calculate conflicts
        let conflicts = 0;
        for (const member of currentPod) {
            if (history[member]?.has(p.player_id)) {
                conflicts++;
            }
        }

        if (conflicts === 0) {
            // Perfect match found (highest points, 0 conflicts)
            return p.player_id;
        }

        // Keep track of "least bad" option if we can't find 0 conflicts
        if (conflicts < minConflicts) {
            minConflicts = conflicts;
            bestCandidate = p.player_id;
        }
    }

    return bestCandidate;
}
