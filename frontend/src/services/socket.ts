import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, User } from '../../../shared/types';
import { useStore } from '../store/useStore';
import { WebRTCService } from './webrtc';

const SERVER_URL = import.meta.env.PROD 
  ? import.meta.env.VITE_BACKEND_URL 
  : `http://${window.location.hostname}:3001`;

class SocketService {
  public socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private webrtc: WebRTCService | null = null;

  // Session persistence — survives page reload caused by network toggle
  private saveSession(roomId: string, me: Omit<User, 'id'>) {
    sessionStorage.setItem('fd_room', roomId);
    sessionStorage.setItem('fd_me', JSON.stringify(me));
  }

  clearSession() {
    sessionStorage.removeItem('fd_room');
    sessionStorage.removeItem('fd_me');
  }

  getSavedSession(): { roomId: string; me: Omit<User, 'id'> } | null {
    const roomId = sessionStorage.getItem('fd_room');
    const me = sessionStorage.getItem('fd_me');
    if (roomId && me) return { roomId, me: JSON.parse(me) };
    return null;
  }

  init(webrtc: WebRTCService) {
    if (this.socket) return; // Prevent double init in StrictMode
    this.webrtc = webrtc;
    this.socket = io(SERVER_URL, {
      reconnection: true,
      reconnectionAttempts: Infinity,  // never give up
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('Connected to signaling server');
      useStore.getState().setSocketConnected(true);

      // Auto-rejoin the saved room after a reconnect / page reload
      const saved = this.getSavedSession();
      if (saved && !useStore.getState().roomId) {
        console.log('[Socket] Auto-rejoining room', saved.roomId, 'after reconnect');
        this.joinRoom(saved.roomId, saved.me, (success) => {
          if (!success) {
            console.warn('[Socket] Room no longer exists — clearing session');
            this.clearSession();
            useStore.getState().setRoomId(null);
          }
        });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
      useStore.getState().setSocketConnected(false);
      // Mark all transfers as paused so the UI shows feedback
      const transfers = useStore.getState().transfers;
      Object.entries(transfers).forEach(([id, t]) => {
        if (t.status === 'transferring') {
          useStore.getState().updateTransfer(id, { status: 'failed' });
        }
      });
    });

    this.socket.on('user-joined', (user: User) => {
      useStore.getState().addPeer(user);
      // We initiate WebRTC connection to the new user
      if (this.webrtc) {
        this.webrtc.createPeerConnection(user.id, true);
      }
    });

    this.socket.on('user-left', (userId: string) => {
      useStore.getState().removePeer(userId);
      if (this.webrtc) {
        this.webrtc.removePeerConnection(userId);
      }
    });

    this.socket.on('signal', (data) => {
      if (this.webrtc) {
        this.webrtc.handleSignal(data.senderId, data.signal);
      }
    });
  }

  createRoom(callback: (roomId: string) => void) {
    if (!this.socket) return;
    this.socket.emit('create-room' as any, (response: any) => {
      if (response.roomId) {
        callback(response.roomId);
      }
    });
  }

  joinRoom(roomId: string, user: Omit<User, 'id'>, callback: (success: boolean, error?: string) => void) {
    if (!this.socket) return;
    this.socket.emit('join-room', roomId, user, (response: any) => {
      if (response.success && response.users) {
        useStore.getState().setRoomId(roomId);
        useStore.getState().setMe({ ...user, id: this.socket!.id as string });
        useStore.getState().setPeers(response.users);
        this.saveSession(roomId, user); // persist so we can rejoin on reload

        // Prepare connections for all users already in the room
        response.users.forEach((u: User) => {
          if (this.webrtc) {
            this.webrtc.createPeerConnection(u.id, false);
          }
        });
        callback(true);
      } else {
        callback(false, response.error);
      }
    });
  }

  leaveRoom() {
    const roomId = useStore.getState().roomId;
    if (this.socket && roomId) {
      this.socket.emit('leave-room', roomId);
    }
    this.clearSession(); // forget the room so we don't auto-rejoin
  }

  sendSignal(targetId: string, signal: any) {
    if (this.socket) {
      this.socket.emit('signal', { targetId, signal });
    }
  }
}

export const socketService = new SocketService();
