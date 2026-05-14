import React, { useEffect, useState } from 'react';
import type { User } from '../../../shared/types';
import { Laptop, Smartphone, Monitor, Activity, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';

interface Props {
  user: User;
  isMe?: boolean;
}

const formatBitrate = (bps: number) => {
  if (bps < 1000) return `${bps} bps`;
  if (bps < 1000000) return `${(bps / 1000).toFixed(1)} kbps`;
  return `${(bps / 1000000).toFixed(1)} Mbps`;
};

const DeviceCard: React.FC<Props> = ({ user, isMe }) => {
  const stats = useStore(state => state.connectionStats[user.id]);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (stats?.quality === 'Weak' || stats?.quality === 'Poor') {
      setShowWarning(true);
      const timer = setTimeout(() => setShowWarning(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [stats?.quality]);

  const getIcon = () => {
    switch (user.platform) {
      case 'desktop': return <Monitor className="w-6 h-6 text-blue-500" />;
      case 'android': return <Smartphone className="w-6 h-6 text-green-500" />;
      case 'ios': return <Smartphone className="w-6 h-6 text-gray-400" />;
      default: return <Laptop className="w-6 h-6 text-primary" />;
    }
  };

  const getQualityColor = (quality?: string) => {
    switch (quality) {
      case 'Excellent': return 'text-green-500';
      case 'Good': return 'text-blue-500';
      case 'Weak': return 'text-yellow-500';
      case 'Poor': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="relative group">
  return (
    <div className="relative group">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-5 rounded-[2rem] border transition-all duration-300 w-full ${
          isMe 
            ? 'bg-primary/5 border-primary/20 shadow-inner' 
            : 'bg-secondary/40 border-border/80 shadow-lg group-hover:border-primary/20'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-transform duration-500 group-hover:scale-105 ${
              isMe ? 'bg-primary text-primary-foreground shadow-primary/20' : 'bg-background border border-border/50'
            }`}>
              {getIcon()}
            </div>
            {!isMe && stats && (
              <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-card flex items-center justify-center shadow-lg ${
                stats.quality === 'Excellent' || stats.quality === 'Good' ? 'bg-green-500' : 
                stats.quality === 'Weak' ? 'bg-yellow-500' : 'bg-red-500'
              }`}>
                <span className="w-2 h-2 rounded-full bg-white opacity-40 animate-ping" />
              </span>
            )}
          </div>

          <div className="text-left flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-black text-base truncate tracking-tight text-foreground" title={user.name}>
                {user.name}
              </p>
              {isMe && (
                <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest rounded-md border border-primary/10">You</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isMe ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : (stats?.quality === 'Connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-green-500')}`} />
              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground/60">
                {isMe ? 'Connected' : (stats?.quality === 'Connecting' ? 'Connecting' : 'Online')}
              </p>
            </div>
          </div>
        </div>

        {!isMe && stats && stats.quality !== 'Connecting' && (
          <div className="w-full mt-5 pt-5 border-t border-border/40 flex flex-col gap-3">
            <div className="flex justify-between items-center px-1">
              <div className="flex flex-col">
                <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${getQualityColor(stats.quality)}`}>
                  Signal Strength
                </span>
                <span className="text-[11px] font-bold mt-0.5">{stats.quality}</span>
              </div>
              <div className={`p-2 rounded-xl ${getQualityColor(stats.quality)} bg-current opacity-10`}>
                <Wifi className="w-3.5 h-3.5" />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 bg-background/50 rounded-2xl p-3 border border-border/50">
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-black uppercase tracking-tighter text-muted-foreground/40">Ping</span>
                <span className="text-xs font-black tabular-nums mt-1">{stats.latency}ms</span>
              </div>
              <div className="flex flex-col items-center border-x border-border/40">
                <span className="text-[8px] font-black uppercase tracking-tighter text-muted-foreground/40">Speed</span>
                <span className="text-xs font-black tabular-nums mt-1">{formatBitrate(stats.bitrate)}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-black uppercase tracking-tighter text-muted-foreground/40">Loss</span>
                <span className="text-xs font-black tabular-nums mt-1">{stats.packetLoss}%</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-56 p-3 bg-card/90 border border-yellow-500/30 rounded-2xl shadow-2xl backdrop-blur-xl z-50 flex items-start gap-3 ring-1 ring-yellow-500/10"
          >
            <div className="p-1.5 bg-yellow-500/20 rounded-lg shrink-0">
              <Activity className="w-4 h-4 text-yellow-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black tracking-tight text-yellow-600 dark:text-yellow-400">Weak Link</span>
              <span className="text-[10px] font-medium text-muted-foreground leading-tight mt-0.5">Potential slowdown detected.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeviceCard;
