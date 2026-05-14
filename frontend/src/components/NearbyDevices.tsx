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
      <div className="flex flex-col items-center py-6 gap-4 opacity-80">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            className="absolute inset-0 bg-primary/20 rounded-full"
          />
          <motion.div
            animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
            transition={{ duration: 2, delay: 0.5, repeat: Infinity, ease: 'easeOut' }}
            className="absolute inset-0 bg-primary/20 rounded-full"
          />
          <div className="relative z-10 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
            <Radar className="w-5 h-5 text-primary" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Scanning Airwaves</p>
          <p className="text-[9px] font-bold text-muted-foreground/50 mt-1">Looking for nearby devices...</p>
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
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => !requestingDevice && handleTapDevice(device)}
                  className={`w-full group flex items-center gap-4 p-4 rounded-2xl border transition-all relative overflow-hidden ${
                    isPending 
                      ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20' 
                      : 'border-border/40 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/30'
                  } ${requestingDevice && !isPending ? 'opacity-40 grayscale pointer-events-none' : ''}`}
                >
                  <div className="relative z-10 w-10 h-10 rounded-xl bg-background flex items-center justify-center shadow-sm border border-border/50 transition-transform group-hover:scale-110">
                    <DeviceIcon platform={device.platform} />
                    {isPending && (
                      <motion.div
                        className="absolute inset-0 rounded-xl border-2 border-primary"
                        animate={{ scale: [1, 1.2], opacity: [1, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    )}
                  </div>
                  
                  <div className="flex-1 text-left relative z-10 min-w-0">
                    <p className="font-black text-sm text-foreground truncate tracking-tight">{device.name}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
                      {isPending ? 'Requesting Access' : 'Tap to Connect'}
                    </p>
                  </div>

                  <div className="relative z-10">
                    {isPending ? (
                      <button
                        className="p-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
                        onClick={(e) => { e.stopPropagation(); cancelRequest(); }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <Wifi className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
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
