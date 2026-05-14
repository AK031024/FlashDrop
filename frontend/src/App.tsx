import React, { useEffect } from 'react';
import { useStore } from './store/useStore';
import { socketService } from './services/socket';
import { webrtcService } from './services/webrtc';
import { discoveryService, getDeviceName, getPlatform } from './services/discovery';
import Home from './components/Home';
import Room from './components/Room';
import { Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const { roomId, isDarkMode, toggleDarkMode } = useStore();

  useEffect(() => {
    socketService.init(webrtcService);

    // Init discovery separately — it uses its own socket connection
    discoveryService.init((roomId: string) => {
      // Called when a device-request we sent gets accepted:
      // join the room that was created and navigate into it
      const me = {
        name: `${getDeviceName()} (You)`,
        platform: getPlatform(),
      };
      socketService.joinRoom(roomId, me, (success) => {
        if (success) {
          useStore.getState().setRoomId(roomId);
        }
      });
    });
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className={`min-h-[100dvh] flex flex-col bg-background text-foreground transition-all duration-700 font-sans selection:bg-primary/10 selection:text-primary ${isDarkMode ? 'dark mesh-bg' : ''}`}>
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="fixed top-6 right-6 z-[100]">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleDarkMode}
          className="p-3 rounded-2xl bg-card/60 backdrop-blur-2xl border border-border/80 shadow-2xl hover:bg-secondary/80 transition-all ring-1 ring-white/10"
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]" />
          ) : (
            <Moon className="w-5 h-5 text-indigo-600" />
          )}
        </motion.button>
      </div>

      <main className="container mx-auto px-6 py-12 sm:py-20 flex-1 flex flex-col items-center relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={roomId ? 'room' : 'home'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full flex justify-center"
          >
            {roomId ? <Room /> : <Home />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Subtle Footer */}
      <footer className="py-8 px-6 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/30">
          Peer-to-Peer • End-to-End Encrypted • Open Source
        </p>
      </footer>
    </div>
  );
}

export default App;
