export interface User {
  id: string;
  name: string;
  platform: string; // 'desktop' | 'mobile'
}

export interface NearbyDevice {
  id: string;       // socket.id
  name: string;
  platform: string;
  ip: string;       // LAN IP bucket (subnet prefix) for proximity filtering
}

export interface RoomState {
  roomId: string;
  users: User[];
}

export interface SignalData {
  targetId: string;
  signal: any;
}

export interface FileChunkData {
  fileId: string;
  chunk: ArrayBuffer;
  offset: number;
}

export interface FileMetadata {
  fileId: string;
  name: string;
  size: number;
  type: string;
}

export interface TextMessageData {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
}

// Client to Server Events
export interface ClientToServerEvents {
  'join-room': (roomId: string, user: Omit<User, 'id'>, callback: (response: { success: boolean; users?: User[]; error?: string }) => void) => void;
  'leave-room': (roomId: string) => void;
  'signal': (data: SignalData) => void;
  'announce-presence': (device: Omit<NearbyDevice, 'id'>) => void;
  'device-request': (payload: { targetId: string; from: NearbyDevice }) => void;
  'device-response': (payload: { targetId: string; fromId: string; accepted: boolean; roomId?: string }) => void;
}

// Server to Client Events
export interface ServerToClientEvents {
  'user-joined': (user: User) => void;
  'user-left': (userId: string) => void;
  'signal': (data: { senderId: string; signal: any }) => void;
  'room-closed': () => void;
  'nearby-devices': (devices: NearbyDevice[]) => void;
  'incoming-device-request': (payload: { from: NearbyDevice; roomId: string }) => void;
  'device-request-response': (payload: { fromId: string; accepted: boolean; roomId?: string }) => void;
}
