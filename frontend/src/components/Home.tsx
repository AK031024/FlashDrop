import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { socketService } from '../services/socket';
import { useStore } from '../store/useStore';
import { Laptop, Smartphone, Share2 } from 'lucide-react';
import NearbyDevices from './NearbyDevices';

const Home: React.FC = () => {
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setRoomId } = useStore();

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setJoinCode(roomParam);
      // Auto join if URL param exists
      setLoading(true);
      joinRoom(roomParam);
    }
  }, []);

  const getPlatform = () => {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'android';
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    return 'desktop';
  };

  const handleCreateRoom = () => {
    setLoading(true);
    socketService.createRoom((roomId) => {
      joinRoom(roomId);
    });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setLoading(true);
    joinRoom(joinCode.trim());
  };

  const getDeviceName = () => {
    const ua = navigator.userAgent;
    if (/iPad/.test(ua)) return 'iPad';
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/Macintosh/.test(ua)) return 'Mac';
    if (/Windows/.test(ua)) return 'Windows PC';
    if (/Android/.test(ua)) {
      const match = ua.match(/Android\s[^\;]*\;([^\)]+)\)/);
      if (match && match[1]) return match[1].trim();
      return 'Android Device';
    }
    if (/Linux/.test(ua)) return 'Linux PC';
    return 'Unknown Device';
  };

  const joinRoom = (roomId: string) => {
    const me = {
      name: `${getDeviceName()} (${Math.floor(Math.random() * 1000)})`,
      platform: getPlatform(),
    };

    socketService.joinRoom(roomId, me, (success, err) => {
      setLoading(false);
      if (!success) {
        setError(err || 'Failed to join room');
      }
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-8 mesh-bg overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-8 sm:p-10 rounded-4xl bg-card/60 backdrop-blur-2xl border border-border/80 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative overflow-hidden"
      >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      
      <div className="flex flex-col items-center mb-12">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
          className="w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center mb-6"
        >
          <img src="/logo.png" alt="FlashDrop Logo" className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]" />
        </motion.div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-4 text-shimmer">
          FlashDrop
        </h1>
        <p className="text-lg sm:text-xl font-bold tracking-tight mb-3 text-center">
          Instant encrypted file sharing
        </p>
        <p className="text-muted-foreground text-center text-balance font-medium text-sm sm:text-base max-w-[320px] mx-auto">
          Create a secure room and transfer files instantly between devices — no accounts, no cloud.
        </p>
      </div>

      <div className="space-y-10">
        <div className="space-y-4">
          <button
            onClick={handleCreateRoom}
            disabled={loading}
            className="w-full py-5 px-6 bg-primary text-primary-foreground rounded-2xl font-black text-lg shadow-[0_20px_40px_-12px_rgba(255,255,255,0.2)] hover:shadow-[0_25px_50px_-12px_rgba(255,255,255,0.3)] hover:-translate-y-1 transition-all disabled:opacity-50 flex justify-center items-center gap-3 group active:scale-95 ring-1 ring-white/20"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                Create Room
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                  <Share2 className="w-5 h-5 opacity-80" />
                </motion.div>
              </>
            )}
          </button>
          
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <div className="w-1 h-1 rounded-full bg-green-500" />
              End-to-End Encrypted
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <div className="w-1 h-1 rounded-full bg-blue-500" />
              Peer-to-Peer
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <div className="w-1 h-1 rounded-full bg-purple-500" />
              Zero Cloud Uploads
            </div>
          </div>
        </div>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-border/40"></div>
          <span className="flex-shrink-0 mx-6 text-muted-foreground text-[10px] font-black uppercase tracking-[0.3em]">Join Existing</span>
          <div className="flex-grow border-t border-border/40"></div>
        </div>

        <form onSubmit={handleJoinRoom} className="space-y-4">
          <div className="relative group">
            <input
              type="text"
              placeholder="ENTER ROOM CODE"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full bg-secondary/40 backdrop-blur-md rounded-2xl px-6 py-5 focus:outline-none focus:ring-2 focus:ring-primary/20 border border-border/60 transition-all text-center text-2xl tracking-[0.4em] font-black placeholder:tracking-[0.1em] placeholder:font-black placeholder:text-[10px] placeholder:text-muted-foreground/40 shadow-inner"
              maxLength={6}
            />
            <AnimatePresence>
              {joinCode.length === 6 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9, x: 10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: 10 }}
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 top-2 bottom-2 px-6 bg-primary text-primary-foreground rounded-xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-lg active:scale-95"
                >
                  Join
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-destructive text-[10px] font-black uppercase tracking-widest text-center px-4"
            >
              {error}
            </motion.p>
          )}
        </form>
      </div>

      {/* Nearby Device Discovery */}
      <div className="mt-12 pt-10 border-t border-border/40">
        <NearbyDevices
          onRoomJoined={(roomId) => {
            setRoomId(roomId);
          }}
        />
      </div>

      <div className="mt-10 pt-8 border-t border-border/40 flex justify-center gap-10 text-muted-foreground/40">
        <motion.div whileHover={{ scale: 1.1, color: "var(--foreground)" }} className="cursor-help">
          <Laptop className="w-7 h-7 transition-colors" />
        </motion.div>
        <motion.div whileHover={{ scale: 1.1, color: "var(--foreground)" }} className="cursor-help">
          <Smartphone className="w-7 h-7 transition-colors" />
        </motion.div>
      </div>
      </motion.div>
    </div>
  );
};

export default Home;
