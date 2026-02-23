import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { FirebaseService } from '../services/FirebaseService';
import type { RoomSettings } from '../types/game';

export default function Lobby() {
    const navigate = useNavigate();
    const { setRoomId, setCurrentPlayerId } = useGameStore();

    const [playerName, setPlayerName] = useState('');
    const [roomIdInput, setRoomIdInput] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const [gameMode, setGameMode] = useState<RoomSettings['gameMode']>('CLASSIC');
    const [scoringVariant, setScoringVariant] = useState<RoomSettings['scoringVariant']>('STANDARD');
    const [roundsTotal, setRoundsTotal] = useState(10);
    const [timePerRound, setTimePerRound] = useState(30);

    const handleCreateRoom = async () => {
        if (!playerName) return alert('Wpisz swoje imię!');
        setIsCreating(true);
        try {
            const playerId = Math.random().toString(36).substring(2, 10);
            setCurrentPlayerId(playerId);

            const defaultSettings: RoomSettings = {
                roundsTotal,
                timePerRound,
                maxPlayers: 8,
                gameMode,
                scoringVariant,
                customCategories: []
            };

            const newRoomId = await FirebaseService.createRoom(playerId, playerName, defaultSettings);
            setRoomId(newRoomId);
            navigate(`/room/${newRoomId}`);
        } catch (e) {
            console.error(e);
            alert('Błąd podczas tworzenia pokoju.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoinRoom = async () => {
        if (!playerName) return alert('Wpisz swoje imię!');
        if (!roomIdInput) return alert('Wpisz kod pokoju!');

        try {
            const playerId = Math.random().toString(36).substring(2, 10);
            setCurrentPlayerId(playerId);

            const upperRoomId = roomIdInput.toUpperCase();
            await FirebaseService.joinRoom(upperRoomId, playerId, playerName, false);

            setRoomId(upperRoomId);
            navigate(`/room/${upperRoomId}`);
        } catch (e) {
            console.error(e);
            alert('Nie udało się dołączyć do pokoju.');
        }
    };

    return (
        <div className="glass-panel flex-col gap-4">
            <h1 style={{ textAlign: 'center' }}>Państwa-Miasta</h1>
            <p style={{ textAlign: 'center' }}>Dołącz do gry lub utwórz nowy pokój</p>

            <div className="flex-col gap-2 mt-4">
                <label>Twoje imię / Nick:</label>
                <input
                    type="text"
                    className="input-field"
                    placeholder="Wpisz nick..."
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                />
            </div>

            <div className="flex-col gap-2 mt-4 glass-panel" style={{ background: 'rgba(0,0,0,0.2)' }}>
                <h3>Ustawienia Gry (Tylko Host)</h3>

                <label>Tryb Gry:</label>
                <select className="input-field" value={gameMode} onChange={e => setGameMode(e.target.value as any)}>
                    <option value="CLASSIC">Klasyczny (7 stałych)</option>
                    <option value="CUSTOM">Własny Zestaw</option>
                    <option value="PLAYER_SELECTED">Gracze wybierają (po 2)</option>
                    <option value="SINGLE">Pojedyncza Kategoria</option>
                    <option value="FULL_RANDOM">Pełny Los (Zmienne co runda)</option>
                </select>

                <label>Punktacja:</label>
                <select className="input-field" value={scoringVariant} onChange={e => setScoringVariant(e.target.value as any)}>
                    <option value="STANDARD">Standardowa</option>
                    <option value="HARDCORE">Hardcore (0 za powtórki)</option>
                    <option value="EASY">Łatwa</option>
                </select>

                <div className="flex-between gap-4">
                    <div className="flex-col w-full">
                        <label>Rundy:</label>
                        <input type="number" className="input-field" value={roundsTotal} onChange={e => setRoundsTotal(Number(e.target.value))} />
                    </div>
                    <div className="flex-col w-full">
                        <label>Czas (s):</label>
                        <input type="number" className="input-field" value={timePerRound} onChange={e => setTimePerRound(Number(e.target.value))} />
                    </div>
                </div>

                <button className="btn mt-4" onClick={handleCreateRoom} disabled={isCreating}>
                    {isCreating ? 'Tworzenie...' : 'Utwórz nowy pokój'}
                </button>
            </div>

            <div className="flex-center mt-2 mb-2">
                <span style={{ color: 'var(--text-secondary)' }}>LUB</span>
            </div>

            <div className="flex-col gap-2">
                <input
                    type="text"
                    className="input-field"
                    placeholder="Kod pokoju (np. XYZ123)"
                    value={roomIdInput}
                    onChange={(e) => setRoomIdInput(e.target.value)}
                    style={{ textTransform: 'uppercase' }}
                />
                <button className="btn btn-secondary" onClick={handleJoinRoom}>
                    Dołącz do pokoju
                </button>
            </div>
        </div>
    );
}
