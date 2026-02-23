import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { FirebaseService } from '../services/FirebaseService';

export default function Voting() {
    const { room, currentRound, players, me, isHost } = useGameStore();

    useEffect(() => {
        if (!room || !currentRound || !isHost()) return;

        // Host checks if all votes are cast
        const checkVotingComplete = () => {
            let isComplete = true;

            for (const cat of Object.keys(currentRound.votes)) {
                for (const word of Object.keys(currentRound.votes[cat])) {
                    const voteData = currentRound.votes[cat][word];

                    // Calculate eligible voters
                    const eligibleVoters = players.filter(p => {
                        const playerWord = currentRound.answers[p.id]?.[cat];
                        return !playerWord || playerWord.trim().toLowerCase() !== word;
                    });

                    const totalVotes = voteData.accept.length + voteData.reject.length;
                    if (totalVotes < eligibleVoters.length) {
                        isComplete = false;
                        break;
                    }
                }
            }

            if (isComplete && room.state === 'VOTING') {
                FirebaseService.finishVotingAndScore(room.id, currentRound, players, room.settings);
            }
        };

        checkVotingComplete();

    }, [currentRound?.votes, players, isHost, room?.id, room?.state, currentRound, room?.settings]);

    if (!room || !currentRound) return null;

    const player = me();
    if (!player) return null;

    // Flatten votes to a list for rendering
    const voteItems: { cat: string, word: string, data: any }[] = [];

    Object.keys(currentRound.votes).forEach(cat => {
        Object.keys(currentRound.votes[cat]).forEach(word => {
            const myAnswer = currentRound.answers[player.id]?.[cat]?.trim().toLowerCase();
            // Only show to vote if we didn't submit it
            if (myAnswer !== word) {
                voteItems.push({
                    cat,
                    word,
                    data: currentRound.votes[cat][word]
                });
            }
        });
    });

    const handleVote = (cat: string, word: string, isAccept: boolean) => {
        FirebaseService.submitVote(room.id, currentRound.roundNumber, cat, word, player.id, isAccept);
    };

    return (
        <div className="glass-panel flex-col gap-4" style={{ padding: '1rem', width: '100%', maxWidth: '800px' }}>
            <h2>Głosowanie nad odpowiedziami</h2>
            <p>Poniżej znajdują się słowa, których automat nie rozpoznał. Zdecyduj, czy są poprawne!</p>

            {voteItems.length === 0 ? (
                <div className="glass-panel mt-4 flex-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
                    <p style={{ margin: 0, textAlign: 'center' }}>Oczekiwanie na innych graczy...</p>
                </div>
            ) : (
                <div className="flex-col gap-4 mt-4 overflow-y-auto" style={{ maxHeight: '60vh' }}>
                    {voteItems.map(item => {
                        const hasAccepted = item.data.accept.includes(player.id);
                        const hasRejected = item.data.reject.includes(player.id);

                        return (
                            <div key={`${item.cat}-${item.word}`} className="glass-panel flex-col gap-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
                                <div className="flex-between">
                                    <span style={{ fontWeight: 'bold' }}>Kategoria:</span>
                                    <span>{item.cat}</span>
                                </div>
                                <div className="flex-between">
                                    <span style={{ fontWeight: 'bold' }}>Słowo:</span>
                                    <span style={{ color: 'var(--accent-color)' }}>{item.word}</span>
                                </div>
                                <div className="flex-between mt-2">
                                    <button
                                        className="btn"
                                        style={{
                                            background: hasAccepted ? 'var(--success-color)' : 'rgba(255,255,255,0.1)',
                                            width: '45%'
                                        }}
                                        onClick={() => handleVote(item.cat, item.word, true)}
                                    >
                                        Akceptuj
                                    </button>
                                    <button
                                        className="btn"
                                        style={{
                                            background: hasRejected ? 'var(--error-color)' : 'rgba(255,255,255,0.1)',
                                            width: '45%'
                                        }}
                                        onClick={() => handleVote(item.cat, item.word, false)}
                                    >
                                        Odrzuć
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
