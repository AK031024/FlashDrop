# FlashDrop

FlashDrop is a production-ready, full-stack web platform for instant real-time file sharing between devices (PC, Android, iPhone) over local networks or the internet. It uses WebRTC Data Channels for direct peer-to-peer file transfer, and Socket.IO purely for signaling.

## Features

- **No Login / No Setup**: Just open the site, scan a QR code, and you are paired.
- **Peer-to-Peer**: Files go directly from device to device. They never touch a backend server.
- **Large File Support**: Files are chunked and streamed efficiently, easily handling 500MB+ files without freezing the browser.
- **Multi-Device Rooms**: Multiple devices can join the same room to share files with everyone simultaneously.
- **Text & Link Sharing**: Instant real-time clipboard/text sharing.
- **Cross-Platform**: Works perfectly on Windows, macOS, Linux, Android Chrome, iPhone Safari, etc.
- **Modern UI**: Built with React, Tailwind CSS, and Framer Motion for a sleek glassmorphism design with Dark Mode support.

## Architecture

- **Frontend**: React + Vite, Tailwind CSS, Zustand (State Management), Framer Motion (Animations), Socket.IO Client (Signaling), Native WebRTC (P2P).
- **Backend**: Node.js, Express, Socket.IO Server.

### WebRTC Flow
1. Device A creates a room on the Signaling Server.
2. Device B joins the room via QR code or short link.
3. The Signaling Server notifies Device A that B has joined.
4. Device A creates an `RTCPeerConnection` and an `RTCDataChannel`, then sends an SDP "Offer" through the Signaling Server to B.
5. Device B receives the offer, creates an `RTCPeerConnection`, and sends an SDP "Answer" back.
6. ICE candidates are exchanged through the server to establish the best network path (Local IP, STUN, or TURN).
7. Once connected, the `RTCDataChannel` opens, and direct file/text transfer begins!

## Setup & Installation

### Requirements
- Node.js v18+
- npm or yarn

### 1. Install Backend Dependencies
```bash
cd backend
npm install
```

### 2. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 3. Start Development Servers

You will need two terminals running simultaneously.

**Terminal 1: Backend**
```bash
cd backend
npm run dev
```
*Runs the signaling server on `http://localhost:3001`*

**Terminal 2: Frontend**
```bash
cd frontend
npm run dev -- --host
```
*Runs the Vite frontend and exposes it to your local network.*

## Testing Guide

### 1. Same Device (PC)
- Open `http://localhost:5173` in two different browser windows or tabs.
- Create a room in Tab A.
- Copy the Room Code and enter it in Tab B (or copy the Join Link).
- Try sending a file or text back and forth.

### 2. Local Network (PC ↔ Android/iPhone)
- Ensure both devices are on the **same Wi-Fi network**.
- Start the frontend with `npm run dev -- --host` on your PC.
- Vite will output a Network URL (e.g., `http://192.168.1.50:5173`).
- Open this Network URL on your PC browser.
- Create a room on the PC.
- Use your phone's camera to scan the QR code displayed on the PC screen.
- Your phone will instantly join the room.
- Drag a file on your PC or tap the drop zone on your phone to transfer!

### 3. Different Networks (Hotspot / Internet)
- WebRTC uses public STUN servers (Google and Twilio) to bypass NATs.
- This allows connections even if devices are on different networks, provided they are not behind symmetric NAT firewalls (which would require a TURN server fallback).

## Production Deployment
- **Backend**: Can be deployed to Heroku, Render, or Railway. Ensure to set the `PORT` environment variable.
- **Frontend**: Can be built using `npm run build` and deployed to Vercel, Netlify, or AWS S3/Cloudfront. Remember to change `VITE_BACKEND_URL` in your deployment environment variables to point to your live backend.
