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
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2, scale: 1.02 }}
        className={`p-5 rounded-3xl border transition-all duration-300 w-full ${
          isMe 
            ? 'bg-primary/5 border-primary/20 shadow-inner' 
            : 'bg-card/40 backdrop-blur-md border-border/80 shadow-lg'
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl transition-transform duration-500 group-hover:rotate-6 ${
              isMe ? 'bg-primary text-primary-foreground' : 'bg-secondary border border-border/50'
            }`}>
              {getIcon()}
            </div>
            {!isMe && stats && (
              <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-card flex items-center justify-center shadow-sm ${
                stats.quality === 'Excellent' || stats.quality === 'Good' ? 'bg-green-500' : 
                stats.quality === 'Weak' ? 'bg-yellow-500' : 'bg-red-500'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-white opacity-40 animate-ping" />
              </span>
            )}
          </div>

          <div className="text-center w-full min-w-0">
            <p className="font-black text-sm truncate tracking-tight text-foreground/90 px-1" title={user.name}>
              {user.name}
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <div className={`w-1.5 h-1.5 rounded-full ${isMe ? 'bg-primary animate-pulse' : (stats?.quality === 'Connecting' ? 'bg-yellow-500 animate-bounce' : 'bg-green-500')}`} />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                {isMe ? 'You' : (stats?.quality === 'Connecting' ? 'Connecting' : 'Online')}
              </p>
            </div>
          </div>
        </div>

        {isMe && (() => {
          const conn = (navigator as any).connection;
          const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
          if (!conn || !isMobile) return null;
          const effectiveType: string = conn?.effectiveType ?? '4g';
          const downlink: number = conn?.downlink ?? 10;
          const isSlow = effectiveType === '2g' || effectiveType === 'slow-2g' || downlink < 1;
          if (!isSlow) return null;
          return (
            <div className="mt-4 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center justify-center gap-2">
              <span className="text-[10px] font-black uppercase text-yellow-600 dark:text-yellow-400">🐢 Slow Net</span>
            </div>
          );
        })()}

        {!isMe && stats && stats.quality !== 'Connecting' && (
          <div className="w-full mt-5 pt-5 border-t border-border/40 flex flex-col gap-2.5">
            <div className="flex justify-between items-center px-1">
              <span className={`text-[10px] font-black uppercase tracking-widest ${getQualityColor(stats.quality)}`}>
                {stats.quality} Signal
              </span>
              <Wifi className={`w-3.5 h-3.5 ${getQualityColor(stats.quality)}`} />
            </div>
            
            <div className="grid grid-cols-1 gap-2 bg-secondary/30 rounded-2xl p-3 border border-border/30">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground/60">Ping</span>
                <span className="text-[11px] font-black tabular-nums">{stats.latency}ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground/60">Rate</span>
                <span className="text-[11px] font-black tabular-nums">{formatBitrate(stats.bitrate)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground/60">Loss</span>
                <span className="text-[11px] font-black tabular-nums">{stats.packetLoss}%</span>
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
