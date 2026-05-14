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
        className="w-full max-w-7xl flex flex-col lg:flex-row gap-6 lg:gap-8 items-start"
      >
        {/* Main Content - Transfer & Chat (Moved up on mobile) */}
        <div className="flex-1 flex flex-col gap-6 lg:gap-8 w-full order-1 lg:order-2">
          <div className="bg-card/40 backdrop-blur-xl border border-border/80 rounded-4xl p-2 shadow-2xl flex flex-col min-h-[400px] lg:min-h-[500px]">
             <div className="p-4 lg:p-6 pb-0">
                <DropZone />
             </div>
             <div className="flex-1 p-4 lg:p-6">
                <TransferList />
             </div>
          </div>
          
          <div className="bg-card/40 backdrop-blur-xl border border-border/80 rounded-4xl p-6 lg:p-8 shadow-2xl">
             <TextShare />
          </div>
        </div>

        {/* Sidebar - Room Info & Peers (Moved down on mobile) */}
        <div className="w-full lg:w-80 flex flex-col gap-6 sticky top-8 order-2 lg:order-1">
          {/* Room ID & Leave Button - Compact on mobile */}
          <div className="bg-card/40 backdrop-blur-xl border border-border/80 rounded-4xl p-6 lg:p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
              <Share2 className="w-20 h-20 -mr-6 -mt-6 lg:w-24 lg:h-24 lg:-mr-8 lg:-mt-8" />
            </div>
            
            <div className="flex justify-between items-center relative z-10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Active Room</p>
                <h2 className="text-xl lg:text-2xl font-black tracking-tighter">{roomId}</h2>
              </div>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleLeave} 
                className="p-3 text-destructive bg-destructive/10 hover:bg-destructive/20 rounded-2xl transition-colors shadow-sm"
                title="Leave Room"
              >
                <LogOut className="w-5 h-5" />
              </motion.button>
            </div>
            
            <div className="mt-6 lg:mt-8 space-y-6 lg:space-y-8 block">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="hidden sm:flex flex-col items-center bg-white p-4 lg:p-6 rounded-3xl w-full shadow-[0_12px_24px_-8px_rgba(0,0,0,0.1)] ring-1 ring-black/5"
              >
                <QRCodeSVG value={shareUrl} size={150} level="H" includeMargin={false} />
              </motion.div>
              
              <button 
                onClick={copyLink} 
                className="w-full flex items-center justify-center gap-3 py-3 lg:py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-xs lg:text-sm shadow-lg hover:opacity-90 active:scale-[0.98] transition-all"
              >
                <Link2 className="w-4 h-4" /> Copy Join Link
              </button>
            </div>
          </div>

          <div className="bg-card/40 backdrop-blur-xl border border-border/80 rounded-4xl p-6 lg:p-8 shadow-2xl flex-1">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-[10px] text-muted-foreground uppercase tracking-[0.2em]">Connected Devices</h3>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 opacity-50" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              {me && (
                <motion.div layout>
                  <DeviceCard user={me} isMe />
                </motion.div>
              )}
              {peers.map(peer => (
                <motion.div key={peer.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                  <DeviceCard user={peer} />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Room;
