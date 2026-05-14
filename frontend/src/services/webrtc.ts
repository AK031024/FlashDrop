import { socketService } from './socket';
import { useStore } from '../store/useStore';
import type { FileChunkData, FileMetadata, SharedText } from '../../../shared/types';
import { v4 as uuidv4 } from 'uuid';

// Binary header layout per chunk: [fileId: 36 bytes][chunkIndex: 4 bytes][totalChunks: 4 bytes] = 44 bytes
const HEADER_SIZE = 44;

interface IncomingFile {
  metadata: FileMetadata;
  chunks: (ArrayBuffer | null)[];  // sparse, indexed by chunkIndex
  receivedCount: number;
  totalChunks: number;
  receivedSize: number;
}

export class WebRTCService {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private incomingFiles: Map<string, IncomingFile> = new Map();
  private activeOutgoingFiles: Map<string, File> = new Map();

  private config: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
      // Coturn / Free TURN Relay Fallback
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ]
  };

  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private statsIntervals: Map<string, NodeJS.Timeout> = new Map();
  private lastBytes: Map<string, number> = new Map();

  createPeerConnection(peerId: string, initiator: boolean) {
    if (this.peerConnections.has(peerId)) return;

    const pc = new RTCPeerConnection(this.config);
    this.peerConnections.set(peerId, pc);
    this.pendingCandidates.set(peerId, []);
    
    useStore.getState().updateConnectionStats(peerId, {
      latency: 0, bitrate: 0, packetLoss: 0, quality: 'Connecting'
    });

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        this.startStatsMonitoring(peerId, pc);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.stopStatsMonitoring(peerId);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.sendSignal(peerId, { type: 'candidate', candidate: event.candidate.toJSON() });
      }
    };

    if (initiator) {
      const dc = pc.createDataChannel('flashdrop-data');
      this.setupDataChannel(peerId, dc);

      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          if (pc.localDescription) {
            socketService.sendSignal(peerId, pc.localDescription.toJSON());
          }
        })
        .catch(console.error);
    } else {
      pc.ondatachannel = (event) => {
        this.setupDataChannel(peerId, event.channel);
      };
    }
  }

  removePeerConnection(peerId: string) {
    this.stopStatsMonitoring(peerId);
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
    const dc = this.dataChannels.get(peerId);
    if (dc) {
      dc.close();
      this.dataChannels.delete(peerId);
    }
    this.pendingCandidates.delete(peerId);

    const transfers = useStore.getState().transfers;
    Object.values(transfers).forEach(transfer => {
      if (transfer.peerId === peerId && transfer.status === 'transferring') {
        useStore.getState().updateTransfer(transfer.id, { status: 'failed' });
      }
    });
  }

  async handleSignal(peerId: string, signal: any) {
    let pc = this.peerConnections.get(peerId);
    if (!pc) {
      this.createPeerConnection(peerId, false);
      pc = this.peerConnections.get(peerId)!;
    }

    try {
      if (signal.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (pc.localDescription) {
          socketService.sendSignal(peerId, pc.localDescription.toJSON());
        }
        this.processPendingCandidates(peerId, pc);
      } else if (signal.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        this.processPendingCandidates(peerId, pc);
      } else if (signal.type === 'candidate') {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } else {
          this.pendingCandidates.get(peerId)?.push(signal.candidate);
        }
      }
    } catch (err) {
      console.error('Error handling WebRTC signal', err);
    }
  }

  private async processPendingCandidates(peerId: string, pc: RTCPeerConnection) {
    const candidates = this.pendingCandidates.get(peerId) || [];
    for (const candidate of candidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error adding pending ICE candidate', e);
      }
    }
    this.pendingCandidates.set(peerId, []);
  }

  private stopStatsMonitoring(peerId: string) {
    const interval = this.statsIntervals.get(peerId);
    if (interval) clearInterval(interval);
    this.statsIntervals.delete(peerId);
    this.lastBytes.delete(peerId);
  }

  private startStatsMonitoring(peerId: string, pc: RTCPeerConnection) {
    if (this.statsIntervals.has(peerId)) return;

    const interval = setInterval(async () => {
      if (pc.connectionState !== 'connected') return;

      try {
        const stats = await pc.getStats();
        let latency = 0;
        let totalBytes = 0;
        let packetLoss = 0;

        stats.forEach(report => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            if (report.currentRoundTripTime) latency = report.currentRoundTripTime * 1000;
            if (report.requestsSent && report.responsesReceived) {
              const loss = Math.max(0, report.requestsSent - report.responsesReceived);
              packetLoss = (loss / report.requestsSent) * 100;
            }
          }
          if (report.type === 'transport') {
            totalBytes = (report.bytesSent || 0) + (report.bytesReceived || 0);
          }
        });

        const lastB = this.lastBytes.get(peerId) || 0;
        const bitrate = Math.max(0, (totalBytes - lastB) * 8 / 2); // bits per second (divided by 2 for the 2 second interval)
        this.lastBytes.set(peerId, totalBytes);

        let quality: 'Excellent' | 'Good' | 'Weak' | 'Poor' = 'Excellent';
        if (latency > 300 || packetLoss > 5) quality = 'Poor';
        else if (latency > 150 || packetLoss > 2) quality = 'Weak';
        else if (latency > 80 || packetLoss > 0) quality = 'Good';

        useStore.getState().updateConnectionStats(peerId, {
          latency: Math.round(latency),
          bitrate: Math.round(bitrate),
          packetLoss: Number(packetLoss.toFixed(1)),
          quality
        });
      } catch (err) {
        console.error('Stats error:', err);
      }
    }, 2000);

    this.statsIntervals.set(peerId, interval);
  }

  private setupDataChannel(peerId: string, dc: RTCDataChannel) {
    dc.binaryType = 'arraybuffer';
    this.dataChannels.set(peerId, dc);

    dc.onopen = () => {
      console.log(`Data channel open with ${peerId}`);
      // Auto-resume any failed outgoing transfers for this peer
      const transfers = useStore.getState().transfers;
      Object.values(transfers).forEach(transfer => {
        if (transfer.peerId === peerId && transfer.direction === 'outgoing' && transfer.status === 'failed') {
          const file = this.activeOutgoingFiles.get(transfer.id);
          if (file) {
            console.log(`Auto-resuming transfer for ${file.name}`);
            this.sendFile(peerId, file);
          }
        }
      });
    };
    dc.onclose = () => console.log(`Data channel closed with ${peerId}`);
    
    dc.onmessage = (event) => this.handleDataChannelMessage(peerId, event.data);
  }

  private handleDataChannelMessage(peerId: string, data: any) {
    if (typeof data === 'string') {
      const message = JSON.parse(data);
      if (message.type === 'text') {
        useStore.getState().addSharedText(message.payload as SharedText);
      } else if (message.type === 'file-meta') {
        this.handleFileMeta(peerId, message.payload as FileMetadata);
      } else if (message.type === 'file-ack') {
        this.handleFileAck(peerId, message.payload);
      }
    } else if (data instanceof ArrayBuffer) {
      this.handleFileChunk(peerId, data);
    }
  }

  private handleFileAck(peerId: string, payload: { fileId: string; resumeFrom: number }) {
    console.log('[WebRTC] Got file-ack, fileId:', payload.fileId, 'resumeFrom:', payload.resumeFrom);
    const file = this.activeOutgoingFiles.get(payload.fileId);
    if (!file) {
      console.error('[WebRTC] handleFileAck: file NOT found in activeOutgoingFiles for id:', payload.fileId, 'keys:', [...this.activeOutgoingFiles.keys()]);
      return;
    }
    console.log('[WebRTC] Starting sendFileChunks for:', file.name);

    const dc = this.dataChannels.get(peerId);
    if (!dc || dc.readyState !== 'open') return;

    const turbo = useStore.getState().turboLanMode;
    const CHUNK_SIZE = turbo ? 250 * 1024 : 64 * 1024;
    const offset = payload.resumeFrom * CHUNK_SIZE;

    const existingTransfer = useStore.getState().transfers[payload.fileId];
    if (!existingTransfer) {
      useStore.getState().addTransfer({
        id: payload.fileId,
        name: file.name,
        size: file.size,
        progress: (offset / file.size) * 100,
        speed: 0,
        eta: 0,
        status: 'transferring',
        direction: 'outgoing',
        peerId
      });
    } else {
      useStore.getState().updateTransfer(payload.fileId, { status: 'transferring' });
    }

    this.sendFileChunks(dc, file, payload.fileId, offset);
  }

  sendText(text: string) {
    const me = useStore.getState().me;
    if (!me) return;

    const message: SharedText = {
      id: uuidv4(),
      text,
      senderId: me.id,
      timestamp: Date.now()
    };

    const payload = JSON.stringify({ type: 'text', payload: message });
    
    this.dataChannels.forEach(dc => {
      if (dc.readyState === 'open') {
        dc.send(payload);
      }
    });

    useStore.getState().addSharedText(message);
  }

  sendFile(peerId: string, file: File) {
    const dc = this.dataChannels.get(peerId);
    if (!dc || dc.readyState !== 'open') {
      console.error('Data channel not open');
      return;
    }

    const str = `${file.name}-${file.size}-${file.lastModified}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    const fileId = `file-${Math.abs(hash).toString(16)}-${file.size}`.padEnd(36, '0').substring(0, 36);

    const meta: FileMetadata = {
      fileId,
      name: file.name,
      size: file.size,
      type: file.type
    };

    this.activeOutgoingFiles.set(fileId, file);
    console.log('[WebRTC] Sending file-meta, fileId:', fileId, 'name:', file.name);
    dc.send(JSON.stringify({ type: 'file-meta', payload: meta }));
  }

  private async sendFileChunks(dc: RTCDataChannel, file: File, fileId: string, initialOffset: number) {
    const turbo = useStore.getState().turboLanMode;

    // Detect slow network (Android/Chrome only — unreliable on desktop)
    const conn = (navigator as any).connection;
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    const effectiveType: string = isMobile ? (conn?.effectiveType ?? '4g') : '4g';
    const downlinkMbps: number  = isMobile ? (conn?.downlink ?? 10) : 10;
    const isSlow = !turbo && (effectiveType === '2g' || effectiveType === 'slow-2g' || downlinkMbps < 1);

    // ── Tier config ──────────────────────────────────────────────────────────
    // Turbo LAN : 250 KB chunks × 16 lanes  → saturate Gigabit / Wi-Fi 6 (max safe size for WebRTC is 256KB)
    // Normal    : 64 KB chunks × 8  lanes   → solid on good broadband / 4G
    // Slow net  : 16 KB chunks × 2  lanes   → stable on 2G / weak signal
    const CHUNK_SIZE       = turbo ? 250 * 1024 : isSlow ? 16 * 1024 : 64 * 1024;
    const PARALLEL_LANES   = turbo ? 16         : isSlow ? 2         : 8;
    // Keep buffer full: at least 2 full chunks per lane in flight
    const BUFFER_THRESHOLD = CHUNK_SIZE * PARALLEL_LANES * 2;

    const totalSize    = file.size;
    const totalChunks  = Math.ceil(totalSize / CHUNK_SIZE);
    const startChunk   = Math.floor(initialOffset / CHUNK_SIZE);

    let nextChunk      = startChunk;
    let doneChunks     = startChunk;
    let aborted        = false;

    // Throttle UI updates — do NOT update on every chunk (kills React perf)
    let lastUiTick     = Date.now();
    let bytesSinceTick = 0;

    const encoder = new TextEncoder();
    const idBytes  = encoder.encode(fileId.padEnd(36, ' '));

    const buildPacket = (ci: number, data: ArrayBuffer): ArrayBuffer => {
      const pkt  = new ArrayBuffer(HEADER_SIZE + data.byteLength);
      const view = new DataView(pkt);
      new Uint8Array(pkt, 0, 36).set(idBytes);
      view.setUint32(36, ci, false);
      view.setUint32(40, totalChunks, false);
      new Uint8Array(pkt, HEADER_SIZE).set(new Uint8Array(data));
      return pkt;
    };

    // ── Event-driven backpressure ─────────────────────────────────────────
    const waitForDrain = (): Promise<void> => {
      if (dc.bufferedAmount < BUFFER_THRESHOLD) return Promise.resolve();
      return new Promise(resolve => {
        const prev = dc.bufferedAmountLowThreshold;
        dc.bufferedAmountLowThreshold = Math.floor(BUFFER_THRESHOLD / 2);
        const onLow = () => {
          dc.removeEventListener('bufferedamountlow', onLow);
          dc.bufferedAmountLowThreshold = prev;
          resolve();
        };
        dc.addEventListener('bufferedamountlow', onLow);
      });
    };

    // ── Lane worker ───────────────────────────────────────────────────────
    const runLane = async () => {
      while (!aborted) {
        const ci = nextChunk++;
        if (ci >= totalChunks) break;
        if (dc.readyState !== 'open') { aborted = true; break; }

        await waitForDrain();
        if (aborted) break;

        // ✅ Native Promise API — 5-10× faster than FileReader
        const chunkData = await file.slice(ci * CHUNK_SIZE, (ci + 1) * CHUNK_SIZE).arrayBuffer();
        if (aborted) break;

        dc.send(buildPacket(ci, chunkData));
        doneChunks++;
        bytesSinceTick += chunkData.byteLength;

        // Throttled UI update — max once every 150 ms
        const now     = Date.now();
        const elapsed = now - lastUiTick;
        if (elapsed >= 150) {
          const speed     = (bytesSinceTick / elapsed) * 1000;
          const remaining = (totalChunks - doneChunks) * CHUNK_SIZE;
          const eta       = speed > 0 ? remaining / speed : 0;
          useStore.getState().updateTransfer(fileId, {
            progress: (doneChunks / totalChunks) * 100,
            speed,
            eta,
          });
          lastUiTick    = now;
          bytesSinceTick = 0;
        }
      }
    };

    // Launch all lanes simultaneously
    await Promise.all(Array.from({ length: PARALLEL_LANES }, runLane));

    if (aborted || dc.readyState !== 'open') {
      useStore.getState().updateTransfer(fileId, { status: 'failed' });
    } else {
      useStore.getState().updateTransfer(fileId, { progress: 100, status: 'completed' });
    }
  }

  private handleFileMeta(peerId: string, meta: FileMetadata) {
    let resumeFrom = 0;

    if (this.incomingFiles.has(meta.fileId)) {
      const incoming = this.incomingFiles.get(meta.fileId)!;
      // resumeFrom = number of chunks already received; sender will skip those
      resumeFrom = incoming.receivedCount;
      useStore.getState().updateTransfer(meta.fileId, { status: 'transferring' });
    } else {
      this.incomingFiles.set(meta.fileId, {
        metadata: meta,
        chunks: [],
        receivedCount: 0,
        totalChunks: 0,
        receivedSize: 0
      });

      useStore.getState().addTransfer({
        id: meta.fileId,
        name: meta.name,
        size: meta.size,
        progress: 0,
        speed: 0,
        eta: 0,
        status: 'transferring',
        direction: 'incoming',
        peerId
      });
    }

    const dc = this.dataChannels.get(peerId);
    if (dc && dc.readyState === 'open') {
      dc.send(JSON.stringify({
        type: 'file-ack',
        payload: { fileId: meta.fileId, resumeFrom }
      }));
    }
  }

  private handleFileChunk(_peerId: string, buffer: ArrayBuffer) {
    if (buffer.byteLength < HEADER_SIZE) return;

    const view = new DataView(buffer);
    const decoder = new TextDecoder();
    const fileId = decoder.decode(new Uint8Array(buffer, 0, 36)).trim();
    const chunkIndex = view.getUint32(36, false);
    const totalChunks = view.getUint32(40, false);
    const chunkData = buffer.slice(HEADER_SIZE);

    const incoming = this.incomingFiles.get(fileId);
    if (!incoming) return;

    // First time we learn totalChunks — pre-allocate the index array
    if (incoming.totalChunks === 0) {
      incoming.totalChunks = totalChunks;
      incoming.chunks = new Array(totalChunks).fill(null);
    }

    // Deduplicate (parallel lanes can rarely produce a duplicate on resume)
    if (incoming.chunks[chunkIndex] !== null) return;

    incoming.chunks[chunkIndex] = chunkData;
    incoming.receivedCount++;
    incoming.receivedSize += chunkData.byteLength;

    useStore.getState().updateTransfer(fileId, {
      progress: (incoming.receivedCount / incoming.totalChunks) * 100
    });

    if (incoming.receivedCount >= incoming.totalChunks) {
      this.saveFile(incoming);
      this.incomingFiles.delete(fileId);
    }
  }

  private saveFile(incoming: IncomingFile) {
    // chunks[] is indexed — filter nulls (shouldn't be any) and assemble in order
    const ordered = (incoming.chunks as (ArrayBuffer | null)[]).filter(Boolean) as ArrayBuffer[];
    const blob = new Blob(ordered, { type: incoming.metadata.type });
    const url = URL.createObjectURL(blob);
    
    const { autoDownload } = useStore.getState();
    if (autoDownload) {
      const a = document.createElement('a');
      a.href = url;
      a.download = incoming.metadata.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    
    useStore.getState().updateTransfer(incoming.metadata.fileId, { 
      status: 'completed', 
      progress: 100,
      blobUrl: url 
    });
  }
}

export const webrtcService = new WebRTCService();
