import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import Lobby from './views/Lobby';
import GameRoom from './views/GameRoom';
import { useGameStore } from './store/gameStore';
import { FirebaseService } from './services/FirebaseService';
import { Toaster, toast } from 'react-hot-toast';

function App() {
  const { currentPlayerId, room } = useGameStore();

  useEffect(() => {
    // Listen for app state changes for Anti-cheat mechanism
    const setupAppListener = async () => {
      await CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
        console.log('App state changed. Is active?', isActive);
        if (currentPlayerId && room?.id) {
          await FirebaseService.setPlayerActive(room.id, currentPlayerId, isActive);
          if (!isActive) {
            console.warn('Anti-cheat: Player minimized the app!');
            toast.error('Anti-cheat: Nie opuszczaj aplikacji podczas gry!', {
              duration: 4000,
              position: 'top-center',
            });
          } else {
            toast.success('Witaj z powrotem!', { position: 'top-center' });
          }
        }
      });
    };

    setupAppListener();

    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, [currentPlayerId, room?.id]);

  return (
    <>
      <Toaster />
      <BrowserRouter>
        <div className="app-container">
          <Routes>
            <Route path="/" element={<Lobby />} />
            <Route path="/lobby" element={<Lobby />} />
            <Route path="/room/:id" element={<GameRoom />} />
          </Routes>
        </div>
      </BrowserRouter>
    </>
  );
}

export default App;
