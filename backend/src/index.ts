import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());

const server = http.createServer(app);

// Simple logging
const log = (msg: string) => console.log(`[${new Date().toISOString()}] ${msg}`);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

interface User {
  id: string;
  name: string;
  platform: string;
}

interface Room {
  id: string;
  users: Map<string, User>;
  createdAt: number;
}

const rooms = new Map<string, Room>();

// --- Nearby Device Discovery ---
interface NearbyDevice {
  id: string;
  name: string;
  platform: string;
  ip: string;
}
const nearbyDevices = new Map<string, NearbyDevice>(); // socketId -> device

const broadcastNearbyDevices = () => {
  const allDevices = Array.from(nearbyDevices.values());
  // Broadcast the full list to every device
  allDevices.forEach(device => {
    // Send each device the list minus itself
    const listForPeer = allDevices.filter(d => d.id !== device.id);
    io.to(device.id).emit('nearby-devices', listForPeer);
  });
};

// Helper to generate a 6-digit random room code
const generateRoomCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Cleanup inactive rooms (older than 1 hour)
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    if (now - room.createdAt > 3600000 && room.users.size === 0) {
      rooms.delete(roomId);
      log(`Room ${roomId} deleted due to inactivity.`);
    }
  }
}, 600000); // Check every 10 minutes

io.on('connection', (socket: Socket) => {
  log(`User connected: ${socket.id}`);

  socket.on('announce-presence', (device: Omit<NearbyDevice, 'id'>) => {
    nearbyDevices.set(socket.id, { ...device, id: socket.id });
    log(`Device announced: ${device.name} (${socket.id})`);
    broadcastNearbyDevices();
  });

  socket.on('device-request', (payload: { targetId: string; from: NearbyDevice; roomId: string }) => {
    log(`Device request from ${payload.from.name} to ${payload.targetId} for room ${payload.roomId}`);
    io.to(payload.targetId).emit('incoming-device-request', {
      from: payload.from,
      roomId: payload.roomId
    });
  });

  socket.on('device-response', (payload: { targetId: string; fromId: string; accepted: boolean; roomId?: string }) => {
    log(`Device response: accepted=${payload.accepted} to ${payload.targetId}`);
    io.to(payload.targetId).emit('device-request-response', {
      fromId: socket.id,
      accepted: payload.accepted,
      roomId: payload.roomId
    });
  });

  socket.on('create-room', (callback: (response: { roomId: string; error?: string }) => void) => {
    try {
      let roomId = generateRoomCode();
      while (rooms.has(roomId)) {
        roomId = generateRoomCode();
      }

      rooms.set(roomId, {
        id: roomId,
        users: new Map(),
        createdAt: Date.now()
      });

      log(`Room created: ${roomId}`);
      callback({ roomId });
    } catch (err) {
      callback({ roomId: '', error: 'Failed to create room' });
    }
  });

  socket.on('join-room', (roomId: string, user: Omit<User, 'id'>, callback: (response: { success: boolean; users?: User[]; error?: string }) => void) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      return callback({ success: false, error: 'Room not found' });
    }

    const newUser: User = { ...user, id: socket.id };
    
    // Check if user already in room
    if (room.users.has(socket.id)) {
      return callback({ success: false, error: 'Already in room' });
    }

    socket.join(roomId);
    room.users.set(socket.id, newUser);
    
    // Notify others in the room
    socket.to(roomId).emit('user-joined', newUser);
    
    log(`User ${newUser.name} (${socket.id}) joined room ${roomId}`);
    
    // Send current users to the new user
    const currentUsers = Array.from(room.users.values()).filter(u => u.id !== socket.id);
    callback({ success: true, users: currentUsers });
  });

  socket.on('signal', (payload: { targetId: string; signal: any }) => {
    io.to(payload.targetId).emit('signal', {
      senderId: socket.id,
      signal: payload.signal
    });
  });

  const handleDisconnect = () => {
    log(`User disconnected: ${socket.id}`);
    nearbyDevices.delete(socket.id);
    broadcastNearbyDevices();
    
    // Find rooms user was in
    for (const [roomId, room] of rooms.entries()) {
      if (room.users.has(socket.id)) {
        room.users.delete(socket.id);
        socket.to(roomId).emit('user-left', socket.id);
        
        log(`User ${socket.id} removed from room ${roomId}`);
        
        // Optionally delete room if empty
        if (room.users.size === 0) {
          rooms.delete(roomId);
          log(`Room ${roomId} deleted because it became empty.`);
        }
      }
    }
  };

  socket.on('leave-room', (roomId: string) => {
    const room = rooms.get(roomId);
    if (room && room.users.has(socket.id)) {
       socket.leave(roomId);
       room.users.delete(socket.id);
       socket.to(roomId).emit('user-left', socket.id);
       if (room.users.size === 0) {
          rooms.delete(roomId);
       }
    }
  });

  socket.on('disconnect', handleDisconnect);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  log(`Signaling server running on port ${PORT}`);
});
