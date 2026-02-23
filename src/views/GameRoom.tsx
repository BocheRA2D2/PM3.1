import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { FirebaseService } from '../services/FirebaseService';
import Voting from './Voting';
import Summary from './Summary';

// TBD: Extract to separate views later
function LobbyState() {
    const { id } = useParams();
    const { room, players, me, isHost } = useGameStore();

    const handleToggleReady = async () => {
        const player = me();
        if (player && id) {
            await FirebaseService.setPlayerReady(id, player.id, !player.isReady);
        }
    };

    const startGame = async () => {
        if (id && room) {
            await FirebaseService.startRound(id, room.settings, room.currentRoundIndex);
        }
    };

    const allReady = players.length > 0 && players.every(p => p.isReady);

    return (
        <div className="glass-panel flex-col gap-4">
            <h2>Poczekalnia: <span style={{ color: 'var(--accent-color)' }}>{id}</span></h2>
            <p>Oczekujemy na graczy ({players.length}/{room?.settings.maxPlayers})</p>

            <div className="flex-col gap-2 mt-4">
                {players.map(p => (
                    <div key={p.id} className="flex-between" style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)' }}>
                        <span>{p.name} {p.isHost ? '(Host)' : ''}</span>
                        <span style={{ color: p.isReady ? 'var(--success-color)' : 'var(--text-secondary)' }}>
                            {p.isReady ? 'Gotowy' : 'Czeka'}
                        </span>
                    </div>
                ))}
            </div>

            <div className="flex-col gap-2 mt-4">
                <button className="btn btn-secondary" onClick={handleToggleReady}>
                    {me()?.isReady ? 'Anuluj Gotowość' : 'Jestem Gotowy'}
                </button>

                {isHost() && (
                    <button className="btn" onClick={startGame} disabled={!allReady}>
                        Rozpocznij Grę
                    </button>
                )}
            </div>
        </div>
    );
}

function PlayingState() {
    const { id } = useParams();
    const { room, currentRound, setCurrentRound, me, isHost, players } = useGameStore();
    const [timeLeft, setTimeLeft] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [hasSubmitted, setHasSubmitted] = useState(false);

    // Subscribe to current round
    useEffect(() => {
        if (!id || !room) return;
        const unsub = FirebaseService.listenToRound(id, room.currentRoundIndex, setCurrentRound);
        return () => unsub();
    }, [id, room?.currentRoundIndex, setCurrentRound]);

    // Timer logic
    useEffect(() => {
        if (!currentRound || !currentRound.endTime) return;

        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.floor((currentRound.endTime! - Date.now()) / 1000));
            setTimeLeft(remaining);

            if (remaining === 0 && !hasSubmitted) {
                handleSubmit();
            }
        }, 500);

        return () => clearInterval(interval);
    }, [currentRound?.endTime, hasSubmitted]);

    // Host state advancement logic
    useEffect(() => {
        if (!currentRound || !room || !isHost()) return;

        // Check if we are already transitioning out of PLAYING to prevent double evaluation
        if (room.state !== 'PLAYING') return;

        const allSubmitted = players.length > 0 && Object.keys(currentRound.answers).length >= players.length;
        const timeUp = currentRound.endTime && Date.now() >= currentRound.endTime;

        if (allSubmitted || timeUp) {
            // Only evaluate once
            FirebaseService.evaluateRoundAndStartVoting(room.id, currentRound);
        }
    }, [currentRound?.answers, players.length, isHost, room?.id, currentRound?.endTime, room?.state]);


    const handleInputChange = (category: string, value: string) => {
        setAnswers((prev: Record<string, string>) => ({ ...prev, [category]: value }));
    };

    const handleSubmit = async () => {
        if (!id || !room || hasSubmitted) return;
        setHasSubmitted(true);
        const player = me();
        if (player) {
            await FirebaseService.submitAnswers(id, room.currentRoundIndex, player.id, answers);
        }
    };

    if (!currentRound) return <div className="glass-panel">Ładowanie rundy...</div>;

    return (
        <div className="glass-panel flex-col gap-4" style={{ padding: '1rem', width: '100%', maxWidth: '800px' }}>
            <div className="flex-between">
                <h2>Litera: <span style={{ fontSize: '2rem', color: 'var(--success-color)' }}>{currentRound.letter}</span></h2>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: timeLeft <= 5 ? 'var(--error-color)' : 'white' }}>
                    00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                </div>
            </div>

            <div className="flex-col gap-4 mt-4 overflow-y-auto" style={{ maxHeight: '60vh' }}>
                {currentRound.categories.map((cat) => (
                    <div key={cat} className="flex-col gap-2">
                        <label style={{ fontWeight: '600' }}>{cat}</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder={`Wpisz na literę ${currentRound.letter}...`}
                            value={answers[cat] || ''}
                            onChange={(e) => handleInputChange(cat, e.target.value)}
                            disabled={hasSubmitted}
                        />
                    </div>
                ))}
            </div>

            <button className="btn mt-4" onClick={handleSubmit} disabled={hasSubmitted}>
                {hasSubmitted ? 'Oczekiwanie na resztę graczy...' : 'Skończyłem!'}
            </button>
        </div>
    );
}


export default function GameRoom() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { room, setRoom, setPlayers } = useGameStore();

    useEffect(() => {
        if (!id) return;

        const unsubRoom = FirebaseService.listenToRoom(id, (r) => {
            if (!r) {
                alert('Pokój przestał istnieć!');
                navigate('/lobby');
                return;
            }
            setRoom(r);
        });

        const unsubPlayers = FirebaseService.listenToPlayers(id, setPlayers);

        return () => {
            unsubRoom();
            unsubPlayers();
        };
    }, [id, navigate, setRoom, setPlayers]);

    if (!room) {
        return (
            <div className="glass-panel flex-center" style={{ height: '300px' }}>
                <p>Ładowanie pokoju...</p>
            </div>
        );
    }

    switch (room.state) {
        case 'LOBBY':
            return <LobbyState />;
        case 'PLAYING':
            return <PlayingState />;
        case 'VOTING':
            return <Voting />;
        case 'SUMMARY':
            return <Summary />;
        default:
            return <p>Nieznany stan pokoju.</p>;
    }
}
