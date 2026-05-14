import { create } from 'zustand';
import type { User, NearbyDevice } from '../../../shared/types';

export interface TransferState {
  id: string; // fileId
  name: string;
  size: number;
  progress: number;
  speed: number;
  eta: number;
  status: 'pending' | 'transferring' | 'completed' | 'failed' | 'cancelled';
  direction: 'incoming' | 'outgoing';
  peerId: string;
  type?: string;
  blobUrl?: string;
}

export interface SharedText {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
}

export type ConnectionQuality = 'Excellent' | 'Good' | 'Weak' | 'Poor' | 'Connecting';

export interface ConnectionStats {
  latency: number;
  bitrate: number;
  packetLoss: number;
  quality: ConnectionQuality;
}

interface AppState {
  // Room
  roomId: string | null;
  me: User | null;
  peers: User[];
  
  // Theme
  isDarkMode: boolean;
  
  // Data
  transfers: Record<string, TransferState>;
  sharedTexts: SharedText[];
  connectionStats: Record<string, ConnectionStats>;
  nearbyDevices: NearbyDevice[];
  pendingIncomingRequest: { from: NearbyDevice; roomId: string } | null;

  // Settings
  autoDownload: boolean;
  turboLanMode: boolean;

  // Connectivity
  isSocketConnected: boolean;
  setSocketConnected: (v: boolean) => void;

  // Actions
  setRoomId: (id: string | null) => void;
  setMe: (me: User | null) => void;
  setPeers: (peers: User[]) => void;
  addPeer: (peer: User) => void;
  removePeer: (peerId: string) => void;
  
  toggleDarkMode: () => void;
  toggleAutoDownload: () => void;
  toggleTurboLanMode: () => void;

  addTransfer: (transfer: TransferState) => void;
  updateTransfer: (id: string, updates: Partial<TransferState>) => void;
  removeTransfer: (id: string) => void;
  
  addSharedText: (text: SharedText) => void;
  updateConnectionStats: (peerId: string, stats: ConnectionStats) => void;
  setNearbyDevices: (devices: NearbyDevice[]) => void;
  setPendingIncomingRequest: (req: { from: NearbyDevice; roomId: string } | null) => void;
}

export const useStore = create<AppState>((set) => ({
  roomId: null,
  me: null,
  peers: [],
  isDarkMode: true,
  transfers: {},
  sharedTexts: [],
  connectionStats: {},
  nearbyDevices: [],
  pendingIncomingRequest: null,
  autoDownload: true,
  turboLanMode: false,
  isSocketConnected: true,

  setRoomId: (id) => set({ roomId: id }),
  setMe: (me) => set({ me }),
  setPeers: (peers) => set({ peers }),
  addPeer: (peer) => set((state) => ({ peers: [...state.peers.filter(p => p.id !== peer.id), peer] })),
  removePeer: (peerId) => set((state) => ({ peers: state.peers.filter(p => p.id !== peerId) })),
  
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  toggleAutoDownload: () => set((state) => ({ autoDownload: !state.autoDownload })),
  toggleTurboLanMode: () => set((state) => ({ turboLanMode: !state.turboLanMode })),
  setSocketConnected: (v) => set({ isSocketConnected: v }),

  addTransfer: (transfer) => set((state) => ({
    transfers: { ...state.transfers, [transfer.id]: transfer }
  })),
  updateTransfer: (id, updates) => set((state) => ({
    transfers: {
      ...state.transfers,
      [id]: { ...state.transfers[id], ...updates }
    }
  })),
  removeTransfer: (id) => set((state) => {
    const newTransfers = { ...state.transfers };
    delete newTransfers[id];
    return { transfers: newTransfers };
  }),

  addSharedText: (text) => set((state) => ({
    sharedTexts: [...state.sharedTexts, text]
  })),

  updateConnectionStats: (peerId, stats) => set((state) => ({
    connectionStats: {
      ...state.connectionStats,
      [peerId]: stats
    }
  })),

  setNearbyDevices: (devices) => set({ nearbyDevices: devices }),
  setPendingIncomingRequest: (req) => set({ pendingIncomingRequest: req }),
}));
