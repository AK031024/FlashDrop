import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Laptop, Smartphone, Monitor, Radar, Wifi, X, Check, UserCheck } from 'lucide-react';
import { useStore } from '../store/useStore';
import { discoveryService } from '../services/discovery';
import { socketService } from '../services/socket';
import type { NearbyDevice } from '../../../shared/types';
import { getDeviceName, getPlatform } from '../services/discovery';

interface Props {
  onRoomJoined: (roomId: string) => void;
}

const DeviceIcon: React.FC<{ platform: string; size?: number }> = ({ platform, size = 20 }) => {
  const cls = `w-${size === 20 ? 5 : 6} h-${size === 20 ? 5 : 6}`;
  switch (platform) {
    case 'android': return <Smartphone className={`${cls} text-emerald-400`} />;
    case 'ios': return <Smartphone className={`${cls} text-slate-300`} />;
    case 'desktop': return <Monitor className={`${cls} text-blue-400`} />;
    default: return <Laptop className={`${cls} text-violet-400`} />;
  }
};

const NearbyDevices: React.FC<Props> = ({ onRoomJoined }) => {
  const nearbyDevices = useStore(s => s.nearbyDevices);
  const pendingIncomingRequest = useStore(s => s.pendingIncomingRequest);
  const [requestingDevice, setRequestingDevice] = useState<NearbyDevice | null>(null);
  const [declinedBy, setDeclinedBy] = useState<string | null>(null);
  const createdRoomRef = useRef<string | null>(null);

  const handleTapDevice = (device: NearbyDevice) => {
    if (requestingDevice) return; 
    setRequestingDevice(device);
    setDeclinedBy(null);

    socketService.createRoom((roomId) => {
      createdRoomRef.current = roomId;
      discoveryService.requestConnect(device, roomId);

      const me = {
        name: `${getDeviceName()} (You)`,
        platform: getPlatform(),
      };
      socketService.joinRoom(roomId, me, (success) => {
        if (!success) {
          setRequestingDevice(null);
          createdRoomRef.current = null;
        }
      });
    });
  };

  const cancelRequest = () => {
    setRequestingDevice(null);
    createdRoomRef.current = null;
  };

  const handleAccept = () => {
    if (!pendingIncomingRequest) return;
    const me = {
      name: `${getDeviceName()} (You)`,
      platform: getPlatform(),
    };
    socketService.joinRoom(pendingIncomingRequest.roomId, me, (success) => {
      if (success) {
        discoveryService.acceptRequest(pendingIncomingRequest);
        onRoomJoined(pendingIncomingRequest.roomId);
      }
    });
  };

  const handleDecline = () => {
    if (!pendingIncomingRequest) return;
    discoveryService.declineRequest(pendingIncomingRequest);
  };

  if (nearbyDevices.length === 0 && !pendingIncomingRequest) {
    return (
      <div className="flex flex-col items-center py-8 gap-5">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 2], opacity: [0.2, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeOut' }}
            className="absolute inset-0 bg-primary/20 rounded-full"
          />
          <motion.div
            animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
            transition={{ duration: 3, delay: 0.8, repeat: Infinity, ease: 'easeOut' }}
            className="absolute inset-0 bg-primary/20 rounded-full"
          />
          <div className="relative z-10 w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center border border-border shadow-xl">
            <Radar className="w-6 h-6 text-primary" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Searching for devices</p>
          <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Looking for FlashDrop on your network</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            >
              <Radar className="w-3.5 h-3.5 text-primary" />
            </motion.div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Nearby Devices</span>
          </div>
          <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black rounded-full ring-1 ring-primary/20">
            {nearbyDevices.length} FOUND
          </span>
        </div>

        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
          <AnimatePresence mode="popLayout">
            {nearbyDevices.map((device) => {
              const isPending = requestingDevice?.id === device.id;
              return (
                <motion.button
                  key={device.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => !requestingDevice && handleTapDevice(device)}
                  className={`w-full group flex items-center gap-4 p-4 rounded-2xl border transition-all relative overflow-hidden ${
                    isPending 
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/10' 
                      : 'border-border bg-secondary/30 hover:bg-secondary/60 hover:border-primary/40 hover:-translate-y-0.5'
                  } ${requestingDevice && !isPending ? 'opacity-30 grayscale pointer-events-none' : ''}`}
                >
                  <div className="relative z-10 w-12 h-12 rounded-xl bg-background flex items-center justify-center shadow-lg border border-border transition-transform group-hover:scale-105">
                    <DeviceIcon platform={device.platform} size={24} />
                    {isPending && (
                      <motion.div
                        className="absolute inset-0 rounded-xl border-2 border-primary"
                        animate={{ scale: [1, 1.3], opacity: [1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                  </div>
                  
                  <div className="flex-1 text-left relative z-10 min-w-0">
                    <p className="font-bold text-base text-foreground truncate tracking-tight">{device.name}</p>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
                      {isPending ? 'Waiting for approval' : 'Tap to Connect'}
                    </p>
                  </div>

                  <div className="relative z-10">
                    {isPending ? (
                      <button
                        className="p-2.5 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-all active:scale-90"
                        onClick={(e) => { e.stopPropagation(); cancelRequest(); }}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="p-2 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors">
                        <Wifi className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {pendingIncomingRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="w-full max-w-sm bg-card border border-border/80 rounded-[2.5rem] p-8 shadow-[0_32px_80px_rgba(0,0,0,0.6)] flex flex-col items-center text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
              
              <div className="relative mb-6">
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-primary/20"
                  animate={{ scale: [1, 1.6], opacity: [1, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center ring-1 ring-primary/20">
                  <UserCheck className="w-10 h-10 text-primary" />
                </div>
              </div>

              <h3 className="text-2xl font-black tracking-tighter mb-2">Connect Device</h3>
              <p className="text-sm font-medium text-muted-foreground mb-8">
                <span className="text-foreground font-black tracking-tight">{pendingIncomingRequest.from.name}</span>
                <br />is asking to join your room.
              </p>

              <div className="flex gap-3 w-full">
                <button
                  className="flex-1 py-4 px-6 bg-secondary text-foreground rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-border transition-all active:scale-95"
                  onClick={handleDecline}
                >
                  Decline
                </button>
                <button
                  className="flex-1 py-4 px-6 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-lg active:scale-95"
                  onClick={handleAccept}
                >
                  Accept
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NearbyDevices;
