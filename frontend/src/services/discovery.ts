import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, NearbyDevice } from '../../../shared/types';
import { useStore } from '../store/useStore';

const SERVER_URL = import.meta.env.PROD
  ? 'https://flashdrop-production.up.railway.app'
  : `http://${window.location.hostname}:3001`;

export const getDeviceName = (): string => {
  const ua = navigator.userAgent;
  if (/iPad/.test(ua)) return 'iPad';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Android/.test(ua)) {
    const match = ua.match(/Android\s[^;]*;([^)]+)\)/);
    if (match && match[1]) return match[1].trim();
    return 'Android Device';
  }
  if (/Linux/.test(ua)) return 'Linux PC';
  return 'Unknown Device';
};

export const getPlatform = (): string => {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  return 'desktop';
};

class DiscoveryService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private onJoinRoom: ((roomId: string) => void) | null = null;

  init(onJoinRoom: (roomId: string) => void) {
    if (this.socket?.connected) return;
    this.onJoinRoom = onJoinRoom;

    this.socket = io(SERVER_URL) as unknown as Socket<ServerToClientEvents, ClientToServerEvents>;

    this.socket.on('connect', () => {
      this.announcePresence();
    });

    // Periodically re-announce to stay visible
    setInterval(() => {
      if (this.socket?.connected) {
        this.announcePresence();
      }
    }, 30000);

    // Server pushes an updated list whenever any device joins/leaves
    this.socket.on('nearby-devices', (devices: NearbyDevice[]) => {
      useStore.getState().setNearbyDevices(devices);
    });

    // Somebody tapped us → show accept/decline modal
    this.socket.on('incoming-device-request', (payload: { from: NearbyDevice; roomId: string }) => {
      useStore.getState().setPendingIncomingRequest(payload);
    });

    // We tapped someone → they responded
    this.socket.on('device-request-response', (payload: { fromId: string; accepted: boolean; roomId?: string }) => {
      if (payload.accepted && payload.roomId) {
        this.onJoinRoom?.(payload.roomId);
      }
      // If declined we just silently unblock the UI (toast handled by NearbyDevices component)
    });
  }

  private announcePresence() {
    this.socket?.emit('announce-presence', {
      name: getDeviceName(),
      platform: getPlatform(),
      ip: window.location.hostname,
    });
  }

  getMyDevice(): Omit<NearbyDevice, 'ip'> & { ip: string } {
    return {
      id: this.socket?.id ?? '',
      name: getDeviceName(),
      platform: getPlatform(),
      ip: window.location.hostname,
    };
  }

  /**
   * Called by NearbyDevices UI after the requester has already created a room.
   * Sends a connection request carrying the roomId so target can auto-join on accept.
   */
  requestConnect(targetDevice: NearbyDevice, myRoomId: string) {
    if (!this.socket) return;
    const me: NearbyDevice = this.getMyDevice();
    (this.socket as any).emit('device-request', {
      targetId: targetDevice.id,
      from: me,
      roomId: myRoomId,
    });
  }

  /** Target accepts → joins the room and notifies the requester */
  acceptRequest(req: { from: NearbyDevice; roomId: string }) {
    if (!this.socket) return;
    this.socket.emit('device-response', {
      targetId: req.from.id,
      fromId: this.socket.id as string,
      accepted: true,
      roomId: req.roomId,
    });
    this.onJoinRoom?.(req.roomId);
    useStore.getState().setPendingIncomingRequest(null);
  }

  /** Target declines */
  declineRequest(req: { from: NearbyDevice; roomId: string }) {
    if (!this.socket) return;
    this.socket.emit('device-response', {
      targetId: req.from.id,
      fromId: this.socket.id as string,
      accepted: false,
    });
    useStore.getState().setPendingIncomingRequest(null);
  }
}

export const discoveryService = new DiscoveryService();
