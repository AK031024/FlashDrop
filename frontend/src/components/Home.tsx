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
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md p-8 sm:p-10 rounded-4xl bg-card/60 backdrop-blur-2xl border border-border/80 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] my-auto relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      
      <div className="flex flex-col items-center mb-10">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-40 h-40 flex items-center justify-center mb-2"
        >
          <img src="/logo.png" alt="FlashDrop Logo" className="w-full h-full object-contain drop-shadow-[0_0_25px_rgba(45,212,191,0.4)]" />
        </motion.div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tighter mb-3 text-shimmer">
          FlashDrop
        </h1>
        <p className="text-muted-foreground text-center text-balance font-medium">
          Instant, encrypted, peer-to-peer file sharing between your devices.
        </p>
      </div>

      <div className="space-y-8">
        <button
          onClick={handleCreateRoom}
          disabled={loading}
          className="w-full py-5 px-6 bg-primary text-primary-foreground rounded-2xl font-bold text-lg shadow-[0_8px_30px_rgb(255,255,255,0.1)] hover:shadow-[0_8px_30px_rgb(255,255,255,0.2)] hover:-translate-y-1 transition-all disabled:opacity-50 flex justify-center items-center gap-3 group active:scale-95"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <>
              Create New Room
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Share2 className="w-5 h-5 opacity-70" />
              </motion.div>
            </>
          )}
        </button>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-border/50"></div>
          <span className="flex-shrink-0 mx-4 text-muted-foreground text-[10px] font-bold uppercase tracking-widest">or join existing</span>
          <div className="flex-grow border-t border-border/50"></div>
        </div>

        <form onSubmit={handleJoinRoom} className="space-y-3">
          <div className="flex gap-2 p-1 bg-secondary/50 rounded-3xl border border-border/50 focus-within:border-primary/30 transition-all shadow-inner">
            <input
              type="text"
              placeholder="ROOM CODE"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="flex-1 bg-transparent rounded-2xl px-5 py-4 focus:outline-none transition-all text-center text-xl tracking-[0.3em] font-black placeholder:tracking-normal placeholder:font-bold placeholder:text-xs placeholder:opacity-50"
              maxLength={6}
            />
            <button
              type="submit"
              disabled={loading || !joinCode}
              className="px-8 bg-primary text-primary-foreground rounded-2xl font-bold hover:opacity-90 transition-all disabled:opacity-0 disabled:scale-90 active:scale-95"
            >
              Join
            </button>
          </div>
          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-destructive text-xs font-bold text-center px-4"
            >
              {error}
            </motion.p>
          )}
        </form>
      </div>

      {/* Nearby Device Discovery */}
      <div className="mt-8 pt-6 border-t border-border/40">
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
  );
};

export default Home;
