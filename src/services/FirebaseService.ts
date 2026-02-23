import { collection, doc, setDoc, updateDoc, onSnapshot, arrayRemove, arrayUnion, increment } from 'firebase/firestore';
import { db } from '../firebase';
import type { Room, RoomSettings, Player, Round } from '../types/game';

export class FirebaseService {
    // Rooms Collection
    static async createRoom(hostId: string, hostName: string, settings: RoomSettings): Promise<string> {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

        // 1. Create room document
        const roomRef = doc(db, 'rooms', roomId);
        const newRoom: Room = {
            id: roomId,
            hostId,
            state: 'LOBBY',
            settings,
            currentRoundIndex: 0,
            createdAt: Date.now()
        };
        await setDoc(roomRef, newRoom);

        // 2. Add host as first player
        await this.joinRoom(roomId, hostId, hostName, true);

        return roomId;
    }

    static async joinRoom(roomId: string, playerId: string, playerName: string, isHost: boolean = false): Promise<void> {
        const playerRef = doc(db, 'rooms', roomId, 'players', playerId);
        const player: Player = {
            id: playerId,
            name: playerName,
            isHost,
            isReady: false,
            isActive: true,
            score: 0,
            joinedAt: Date.now()
        };
        await setDoc(playerRef, player);
    }

    static async setPlayerReady(roomId: string, playerId: string, isReady: boolean): Promise<void> {
        const playerRef = doc(db, 'rooms', roomId, 'players', playerId);
        await updateDoc(playerRef, { isReady });
    }

    static async setPlayerActive(roomId: string, playerId: string, isActive: boolean): Promise<void> {
        const playerRef = doc(db, 'rooms', roomId, 'players', playerId);
        await updateDoc(playerRef, { isActive });
    }

    static async updateRoomState(roomId: string, state: Room['state']): Promise<void> {
        const roomRef = doc(db, 'rooms', roomId);
        await updateDoc(roomRef, { state });
    }

    static async startRound(roomId: string, roomSettings: RoomSettings, currentRoundIndex: number): Promise<void> {
        const nextRoundIndex = currentRoundIndex + 1;

        // Generate random letter (A-Z except Q, V, X, Y)
        const alphabet = "ABCDEFGHIJKLMNOPRSTUWZ";
        const letter = alphabet[Math.floor(Math.random() * alphabet.length)];

        let categories = ['Państwo', 'Miasto', 'Imię', 'Zwierzę', 'Roślina', 'Rzecz', 'Zawód']; // Classic default

        const allPossible = [
            'Państwo', 'Miasto', 'Imię', 'Zwierzę', 'Roślina', 'Rzecz', 'Zawód',
            'Kolor', 'Marka Samochodu', 'Pierwiastek', 'Tytuł Filmu', 'Danie',
            'Część Ciała', 'Stolica', 'Zawód', 'Instrument Muzyczny', 'Sport',
            'Rzeka', 'Aktor', 'Piosenkarz'
        ];

        switch (roomSettings.gameMode) {
            case 'CLASSIC':
                break; // already set
            case 'CUSTOM':
                if (roomSettings.customCategories && roomSettings.customCategories.length > 0) {
                    categories = roomSettings.customCategories;
                }
                break;
            case 'SINGLE':
                categories = [allPossible[Math.floor(Math.random() * allPossible.length)]];
                break;
            case 'FULL_RANDOM':
                // Pick 5 to 8 random categories
                const count = Math.floor(Math.random() * 4) + 5;
                const shuffled = [...allPossible].sort(() => 0.5 - Math.random());
                categories = shuffled.slice(0, count);
                break;
            case 'PLAYER_SELECTED':
                // For MVP, we will just simulate this by pulling random ones, 
                // a true implementation requires Lobby submissions.
                const pCount = Math.floor(Math.random() * 3) + 4;
                const pShuffled = [...allPossible].sort(() => 0.5 - Math.random());
                categories = pShuffled.slice(0, pCount);
                break;
        }

        const roundRef = doc(db, 'rooms', roomId, 'rounds', `round_${nextRoundIndex}`);
        const newRound: Round = {
            id: `round_${nextRoundIndex}`,
            roundNumber: nextRoundIndex,
            letter,
            categories,
            startTime: Date.now() + 2000, // Starts in 2 seconds
            endTime: Date.now() + 2000 + (roomSettings.timePerRound * 1000),
            answers: {},
            votes: {},
            scores: {}
        };

        await setDoc(roundRef, newRound);

        const roomRef = doc(db, 'rooms', roomId);
        await updateDoc(roomRef, {
            currentRoundIndex: nextRoundIndex,
            state: 'PLAYING'
        });
    }

    static async submitAnswers(roomId: string, roundIndex: number, playerId: string, answers: Record<string, string>): Promise<void> {
        const roundRef = doc(db, 'rooms', roomId, 'rounds', `round_${roundIndex}`);
        await updateDoc(roundRef, {
            [`answers.${playerId}`]: answers
        });
    }

    static async evaluateRoundAndStartVoting(roomId: string, currentRound: Round): Promise<void> {
        // Collect all answers
        const allAnswers = currentRound.answers;
        const votesNeeded: Round['votes'] = {};

        // In a real app we'd import DictionaryManager here and check.
        // For now, let's mock validation: if word length > 2 it "needs voting" just to test the UI,
        // or we just put everything to voting for testing.

        // Actually, let's construct a votes object.
        const categories = currentRound.categories;

        categories.forEach(cat => {
            votesNeeded[cat] = {};
            Object.values(allAnswers).forEach(playerAns => {
                const word = playerAns[cat];
                if (word && word.trim().length > 0) {
                    const normalized = word.trim().toLowerCase();
                    // Mock: assuming no dictionary, everything goes to vote!
                    if (!votesNeeded[cat][normalized]) {
                        votesNeeded[cat][normalized] = { accept: [], reject: [] };
                    }
                }
            });
        });

        // Save votes needed
        const roundRef = doc(db, 'rooms', roomId, 'rounds', `round_${currentRound.roundNumber}`);
        await updateDoc(roundRef, { votes: votesNeeded });

        // Update room state
        const roomRef = doc(db, 'rooms', roomId);
        await updateDoc(roomRef, { state: 'VOTING' });
    }

    static async submitVote(roomId: string, roundIndex: number, category: string, word: string, voterId: string, isAccept: boolean): Promise<void> {
        const roundRef = doc(db, 'rooms', roomId, 'rounds', `round_${roundIndex}`);

        // Remove from both lists first to allow changing vote
        await updateDoc(roundRef, {
            [`votes.${category}.${word}.accept`]: arrayRemove(voterId),
            [`votes.${category}.${word}.reject`]: arrayRemove(voterId)
        });

        // Add to the correct list
        const fieldPath = `votes.${category}.${word}.${isAccept ? 'accept' : 'reject'}`;
        await updateDoc(roundRef, {
            [fieldPath]: arrayUnion(voterId)
        });
    }

    static async finishVotingAndScore(roomId: string, currentRound: Round, players: Player[], settings: RoomSettings): Promise<void> {
        // Evaluate scores based on accepted words and Dictionary
        const finalScores: Record<string, number> = {};
        players.forEach(p => finalScores[p.id] = 0);

        const acceptedWordsCache: Record<string, Record<string, boolean>> = {};

        // Calculate if words are accepted
        Object.keys(currentRound.votes).forEach(cat => {
            acceptedWordsCache[cat] = {};
            Object.keys(currentRound.votes[cat]).forEach(word => {
                const voteData = currentRound.votes[cat][word];
                // Simple majority wins. Ties = false.
                acceptedWordsCache[cat][word] = voteData.accept.length > voteData.reject.length;
            });
        });

        // Determine uniqueness and points
        currentRound.categories.forEach(cat => {
            const wordFrequency: Record<string, number> = {};

            // Count frequencies
            players.forEach(p => {
                const word = currentRound.answers[p.id]?.[cat]?.trim().toLowerCase();
                if (word) {
                    // Check if it's accepted
                    let isCorrect = acceptedWordsCache[cat]?.[word];
                    if (isCorrect === undefined) {
                        // Mock local dictionary fallback - say it's true if no voting was required
                        isCorrect = true;
                    }
                    if (isCorrect) {
                        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
                    }
                }
            });

            const totalCorrectInCat = Object.values(wordFrequency).reduce((a, b) => a + b, 0);

            // Assign points
            players.forEach(p => {
                const word = currentRound.answers[p.id]?.[cat]?.trim().toLowerCase();
                if (word && wordFrequency[word]) {
                    const freq = wordFrequency[word];
                    let points = 0;

                    if (settings.scoringVariant === 'HARDCORE') {
                        if (totalCorrectInCat === 1) points = 25;
                        else if (freq === 1) points = 20;
                        else points = 0; // 0 for repeats in hardcore!
                    } else if (settings.scoringVariant === 'EASY') {
                        points = freq === 1 ? 6 : 1;
                    } else {
                        // Standard: 15 for only answer, 10 for unique, 5 for repeat
                        if (totalCorrectInCat === 1) points = 15;
                        else if (freq === 1) points = 10;
                        else points = 5;
                    }

                    finalScores[p.id] += points;
                }
            });
        });

        const roundRef = doc(db, 'rooms', roomId, 'rounds', `round_${currentRound.roundNumber}`);
        await updateDoc(roundRef, { scores: finalScores });

        // Update total scores logically via transaction or batched updates
        // For simplicity, we can do independent updateDoc calls since this acts as the "Server"
        for (const p of players) {
            const pointsEarned = finalScores[p.id] || 0;
            if (pointsEarned > 0) {
                const pRef = doc(db, 'rooms', roomId, 'players', p.id);
                await updateDoc(pRef, { score: increment(pointsEarned) });
            }
        }

        // Update room state to SUMMARY
        const roomRef = doc(db, 'rooms', roomId);
        await updateDoc(roomRef, { state: 'SUMMARY' });
    }

    static listenToRoom(roomId: string, callback: (room: Room | null) => void) {
        const roomRef = doc(db, 'rooms', roomId);
        return onSnapshot(roomRef, (snapshot) => {
            if (snapshot.exists()) {
                callback(snapshot.data() as Room);
            } else {
                callback(null);
            }
        });
    }

    static listenToPlayers(roomId: string, callback: (players: Player[]) => void) {
        const playersRef = collection(db, 'rooms', roomId, 'players');
        return onSnapshot(playersRef, (snapshot) => {
            const players = snapshot.docs.map(doc => doc.data() as Player);
            callback(players);
        });
    }

    static listenToRound(roomId: string, roundIndex: number, callback: (round: Round | null) => void) {
        const roundRef = doc(db, 'rooms', roomId, 'rounds', `round_${roundIndex}`);
        return onSnapshot(roundRef, (snapshot) => {
            if (snapshot.exists()) {
                callback(snapshot.data() as Round);
            } else {
                callback(null);
            }
        });
    }
}
