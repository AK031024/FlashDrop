import React from 'react';
import { useStore } from '../store/useStore';
import { socketService } from '../services/socket';
import { QRCodeSVG } from 'qrcode.react';
import DeviceCard from './DeviceCard';
import DropZone from './DropZone';
import TransferList from './TransferList';
import TextShare from './TextShare';
import { LogOut, Link2, WifiOff, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Room: React.FC = () => {
  const { roomId, me, peers, setRoomId, setMe, setPeers, isSocketConnected } = useStore();

  const handleLeave = () => {
    socketService.leaveRoom();
    setRoomId(null);
    setMe(null);
    setPeers([]);
  };

  const shareUrl = `${window.location.origin}?room=${roomId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
  };

  return (
    <>
      {/* Reconnecting banner */}
      <AnimatePresence>
        {!isSocketConnected && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-2.5 bg-yellow-500/90 backdrop-blur-md text-black text-sm font-semibold shadow-lg"
          >
            <WifiOff className="w-4 h-4" />
            Network lost — reconnecting… Transfer will resume automatically.
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-7xl flex flex-col lg:flex-row gap-8 items-start"
      >
        {/* Main Content - Transfer & Chat (Moved up on mobile) */}
        <div className="flex-1 flex flex-col gap-8 w-full order-1 lg:order-2">
          <div className="bg-card border border-border rounded-[2.5rem] p-2 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] flex flex-col min-h-[450px] lg:min-h-[550px]">
             <div className="p-5 lg:p-8 pb-0">
                <DropZone />
             </div>
             <div className="flex-1 p-5 lg:p-8">
                <TransferList />
             </div>
          </div>
          
          <div className="bg-card/60 backdrop-blur-xl border border-border/80 rounded-[2.5rem] p-8 shadow-2xl">
             <TextShare />
          </div>
        </div>

        {/* Sidebar - Room Info & Peers (Moved down on mobile) */}
        <div className="w-full lg:w-80 flex flex-col gap-8 sticky top-8 order-2 lg:order-1">
          {/* Room ID & Leave Button - Compact on mobile */}
          <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
              <Share2 className="w-32 h-32 -mr-8 -mt-8" />
            </div>
            
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2">Room Code</p>
                <h2 className="text-3xl font-black tracking-tight mb-1">{roomId}</h2>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-green-500/80">Active Session</span>
                </div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.1, backgroundColor: "rgba(244, 63, 94, 0.2)" }}
                whileTap={{ scale: 0.9 }}
                onClick={handleLeave} 
                className="p-3.5 text-destructive bg-destructive/10 rounded-2xl transition-all shadow-sm border border-destructive/10"
                title="Leave Room"
              >
                <LogOut className="w-5 h-5" />
              </motion.button>
            </div>
            
            <div className="mt-8 space-y-8">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="hidden sm:flex flex-col items-center bg-white p-6 rounded-3xl w-full shadow-inner ring-1 ring-black/5"
              >
                <QRCodeSVG value={shareUrl} size={160} level="H" includeMargin={false} />
              </motion.div>
              
              <button 
                onClick={copyLink} 
                className="w-full flex items-center justify-center gap-3 py-4 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:opacity-90 active:scale-[0.98] transition-all ring-1 ring-white/10"
              >
                <Link2 className="w-4 h-4" /> Copy Link
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-2xl flex-1">
            <div className="flex items-center justify-between mb-8">
              <div className="flex flex-col">
                <h3 className="font-black text-[10px] text-muted-foreground uppercase tracking-[0.3em]">Connected</h3>
                <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-1">{peers.length + 1} Device{peers.length !== 0 ? 's' : ''} Online</p>
              </div>
              <div className="p-2 rounded-xl bg-secondary border border-border">
                <Monitor className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            
            <div className="flex flex-col gap-4">
              {me && (
                <motion.div layout>
                  <DeviceCard user={me} isMe />
                </motion.div>
              )}
              <AnimatePresence mode="popLayout">
                {peers.map(peer => (
                  <motion.div 
                    key={peer.id} 
                    layout 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <DeviceCard user={peer} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Room;
