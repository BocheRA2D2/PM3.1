import { useGameStore } from '../store/gameStore';
import { FirebaseService } from '../services/FirebaseService';

export default function Summary() {
    const { room, currentRound, players, isHost } = useGameStore();

    const handleNextRound = async () => {
        if (room && isHost()) {
            if (room.currentRoundIndex >= room.settings.roundsTotal) {
                // Zakończ grę definitywnie
                await FirebaseService.updateRoomState(room.id, 'FINISHED');
            } else {
                await FirebaseService.startRound(room.id, room.settings, room.currentRoundIndex);
            }
        }
    };

    const handleEndGame = async () => {
        if (room && isHost()) {
            await FirebaseService.updateRoomState(room.id, 'LOBBY');
        }
    };

    if (!room || !currentRound) return null;

    // Sorting players by current total score descending
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const isGameOver = room.currentRoundIndex >= room.settings.roundsTotal;

    return (
        <div className="glass-panel flex-col gap-4" style={{ padding: '1rem', width: '100%', maxWidth: '800px' }}>
            <h2 style={{ textAlign: 'center' }}>
                {isGameOver ? 'Koniec Gry!' : `Podsumowanie Rundy ${currentRound.roundNumber}/${room.settings.roundsTotal}`}
            </h2>

            <div className="flex-col gap-2 mt-4 glass-panel" style={{ background: 'rgba(0,0,0,0.2)' }}>
                <h3 style={{ margin: 0 }}>Ranking Graczy</h3>

                {sortedPlayers.map((p, index) => {
                    const roundPoints = currentRound.scores?.[p.id] || 0;
                    return (
                        <div key={p.id} className="flex-between mt-2" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                            <span>{index + 1}. {p.name} {p.isHost ? '(Host)' : ''}</span>
                            <div className="flex-col" style={{ alignItems: 'flex-end' }}>
                                <span style={{ fontWeight: 'bold', color: 'var(--success-color)' }}>
                                    {p.score} pkt {roundPoints > 0 && <span style={{ fontSize: '0.8em', color: 'var(--text-secondary)' }}>(+{roundPoints})</span>}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex-col gap-2 mt-4">
                {isHost() ? (
                    <>
                        <button className="btn" onClick={handleNextRound}>
                            {isGameOver ? 'Zakończ Grę (Podgląd)' : 'Następna Runda'}
                        </button>
                        <button className="btn btn-secondary" onClick={handleEndGame}>
                            Wróć do Poczekalni
                        </button>
                    </>
                ) : (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Oczekiwanie na hosta...</p>
                )}
            </div>
        </div>
    );
}
