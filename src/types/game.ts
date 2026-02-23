// Firestore Data Models

export type GameMode = 'CLASSIC' | 'CUSTOM' | 'PLAYER_SELECTED' | 'SINGLE' | 'FULL_RANDOM';
export type ScoringVariant = 'STANDARD' | 'HARDCORE' | 'EASY';
export type GameState = 'LOBBY' | 'PLAYING' | 'VOTING' | 'SUMMARY' | 'FINISHED';

export interface RoomSettings {
    roundsTotal: number;
    timePerRound: number; // in seconds
    maxPlayers: number;
    gameMode: GameMode;
    scoringVariant: ScoringVariant;
    customCategories: string[]; // Used if CUSTOM mode
}

export interface Room {
    id: string; // Document ID (e.g. 6-char room code)
    hostId: string;
    state: GameState;
    settings: RoomSettings;
    currentRoundIndex: number; // 0-based
    createdAt: number; // timestamp
}

export interface Player {
    id: string; // Document ID
    name: string;
    isHost: boolean;
    isReady: boolean;
    isActive: boolean; // Anti-cheat app state
    score: number;
    joinedAt: number; // timestamp
}

export interface PlayerAnswers {
    [category: string]: string;
}

export interface Vote {
    [category: string]: {
        [word: string]: {
            accept: string[]; // array of player ids who voted accept
            reject: string[]; // array of player ids who voted reject
        }
    }
}

export interface Round {
    id: string; // typically "round_1", etc.
    roundNumber: number;
    letter: string;
    categories: string[];
    startTime: number | null; // Set when timer starts
    endTime: number | null; // Calculated based on timePerRound
    answers: { [playerId: string]: PlayerAnswers };
    votes: Vote;
    scores: { [playerId: string]: number }; // Points earned this round
}
