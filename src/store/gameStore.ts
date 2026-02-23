import { create } from 'zustand';
import type { Room, Player, Round } from '../types/game';

interface GameStore {
    // Current session context
    currentPlayerId: string | null;
    roomId: string | null;

    // Synced from Firebase
    room: Room | null;
    players: Player[];
    currentRound: Round | null;

    // Actions
    setCurrentPlayerId: (id: string) => void;
    setRoomId: (id: string) => void;
    setRoom: (room: Room | null) => void;
    setPlayers: (players: Player[]) => void;
    setCurrentRound: (round: Round | null) => void;

    // Computed helpers (optional but good for components)
    me: () => Player | null;
    isHost: () => boolean;
}

export const useGameStore = create<GameStore>((set, get) => ({
    currentPlayerId: null,
    roomId: null,
    room: null,
    players: [],
    currentRound: null,

    setCurrentPlayerId: (id) => set({ currentPlayerId: id }),
    setRoomId: (id) => set({ roomId: id }),
    setRoom: (room) => set({ room }),
    setPlayers: (players) => set({ players }),
    setCurrentRound: (round) => set({ currentRound: round }),

    me: () => get().players.find(p => p.id === get().currentPlayerId) || null,
    isHost: () => {
        const player = get().me();
        return player ? player.isHost : false;
    }
}));
