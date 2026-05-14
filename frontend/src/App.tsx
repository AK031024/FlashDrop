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
    <div className={`min-h-[100dvh] flex flex-col bg-background text-foreground transition-all duration-700 font-sans selection:bg-primary selection:text-primary-foreground ${isDarkMode ? 'dark mesh-bg' : ''}`}>
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[140px]" />
        {isDarkMode && (
          <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-blue-500/5 blur-[120px]" />
        )}
      </div>

      <div className="fixed top-8 right-8 z-[100]">
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleDarkMode}
          className="p-3.5 rounded-[1.25rem] bg-card border border-border shadow-[0_20px_40px_-12px_rgba(0,0,0,0.5)] hover:border-primary/20 transition-all ring-1 ring-white/5 group"
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)] group-hover:rotate-12 transition-transform" />
          ) : (
            <Moon className="w-5 h-5 text-indigo-600 group-hover:-rotate-12 transition-transform" />
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
