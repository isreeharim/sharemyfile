import Peer from 'peerjs';

// Chunk size for WebRTC DataChannel (64 KB is standard and optimal for LAN throughput)
const CHUNK_SIZE = 64 * 1024;
const BUFFER_THRESHOLD = 1024 * 1024; // 1 MB backpressure threshold

export class P2PManager {
  constructor({ deviceInfo, onPeerJoin, onPeerLeave, onProgress, onFileReceived, onTextReceived, onStatusChange }) {
    this.deviceInfo = deviceInfo;
    this.onPeerJoin = onPeerJoin || (() => {});
    this.onPeerLeave = onPeerLeave || (() => {});
    this.onProgress = onProgress || (() => {});
    this.onFileReceived = onFileReceived || (() => {});
    this.onTextReceived = onTextReceived || (() => {});
    this.onStatusChange = onStatusChange || (() => {});

    this.peer = null;
    this.myPeerId = null;
    this.isHost = false;
    this.roomId = null;
    this.connections = new Map(); // peerId -> DataConnection
    this.peerDetails = new Map(); // peerId -> deviceInfo

    // Active incoming transfers: fileId -> { meta, chunks, receivedBytes, startTime, lastLoaded, lastTime }
    this.incomingTransfers = new Map();

    this.init();
  }

  // Get or generate a room code
  static getOrCreateRoomId() {
    const hash = window.location.hash;
    const match = hash.match(/room=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
    // Generate a clean 6-character room code
    const generated = 'room-' + Math.random().toString(36).substring(2, 8);
    window.location.hash = `room=${generated}`;
    return generated;
  }

  init() {
    this.roomId = P2PManager.getOrCreateRoomId();
    this.onStatusChange({ status: 'connecting', roomId: this.roomId });

    // Try to register as the Room Host first
    const hostPeerId = `smf-${this.roomId}`;
    this.tryConnectAsHost(hostPeerId);
  }

  tryConnectAsHost(hostPeerId) {
    // Attempt to register as host
    const peer = new Peer(hostPeerId, {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on('open', (id) => {
      this.peer = peer;
      this.myPeerId = id;
      this.isHost = true;
      this.onStatusChange({ status: 'ready', isHost: true, peerId: id, roomId: this.roomId });
      this.setupHostListeners(peer);
    });

    peer.on('error', (err) => {
      // If ID is already taken, someone else is the room host -> connect as guest
      if (err.type === 'unavailable-id') {
        peer.destroy();
        this.connectAsGuest(hostPeerId);
      } else {
        console.warn('P2P Host Peer error:', err);
        this.onStatusChange({ status: 'error', error: err.message });
      }
    });
  }

  connectAsGuest(hostPeerId) {
    // Connect with a random guest ID
    const guestId = `guest-${Math.random().toString(36).substring(2, 9)}`;
    const peer = new Peer(guestId, {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on('open', (id) => {
      this.peer = peer;
      this.myPeerId = id;
      this.isHost = false;
      this.onStatusChange({ status: 'ready', isHost: false, peerId: id, roomId: this.roomId });

      // Connect to the host
      const conn = peer.connect(hostPeerId, { reliable: true });
      this.setupConnection(conn);
    });

    peer.on('connection', (conn) => {
      this.setupConnection(conn);
    });

    peer.on('error', (err) => {
      console.warn('P2P Guest error:', err);
      this.onStatusChange({ status: 'error', error: err.message });
    });
  }

  setupHostListeners(peer) {
    peer.on('connection', (conn) => {
      this.setupConnection(conn);
    });
  }

  setupConnection(conn) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);

      // Send my device info
      conn.send({
        type: 'handshake',
        device: this.deviceInfo,
        peerId: this.myPeerId
      });
    });

    conn.on('data', (data) => {
      this.handleIncomingData(conn, data);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      const departingPeer = this.peerDetails.get(conn.peer);
      this.peerDetails.delete(conn.peer);
      this.onPeerLeave(conn.peer, departingPeer);
    });

    conn.on('error', (err) => {
      console.warn(`Connection error with ${conn.peer}:`, err);
    });
  }

  handleIncomingData(conn, data) {
    // Handle binary chunk (ArrayBuffer)
    if (data instanceof ArrayBuffer || data?.byteLength !== undefined) {
      this.handleBinaryChunk(conn, data);
      return;
    }

    if (typeof data !== 'object' || !data.type) return;

    switch (data.type) {
      case 'handshake': {
        const peerInfo = {
          id: conn.peer,
          name: data.device?.name || 'Remote Peer',
          deviceType: data.device?.deviceType || 'unknown',
          os: data.device?.os || 'unknown',
          browser: data.device?.browser || 'unknown',
          ip: 'Direct LAN P2P',
          joinedAt: new Date().toISOString()
        };
        this.peerDetails.set(conn.peer, peerInfo);
        this.onPeerJoin(peerInfo);
        break;
      }

      case 'text-message': {
        this.onTextReceived({
          id: data.id || Date.now().toString(),
          fromId: conn.peer,
          fromName: data.fromName || 'Peer',
          text: data.text,
          timestamp: data.timestamp || new Date().toISOString()
        });
        break;
      }

      case 'file-meta': {
        // Initialize incoming transfer
        const transfer = {
          meta: data,
          chunks: [],
          receivedBytes: 0,
          startTime: Date.now(),
          lastLoaded: 0,
          lastTime: Date.now()
        };
        this.incomingTransfers.set(data.fileId, transfer);
        this.onProgress({
          fileId: data.fileId,
          fileName: data.name,
          progress: 0,
          speed: 0,
          transferred: 0,
          total: data.size,
          status: 'transferring'
        });
        break;
      }

      case 'file-complete': {
        const transfer = this.incomingTransfers.get(data.fileId);
        if (transfer) {
          const blob = new Blob(transfer.chunks, { type: transfer.meta.mimeType || 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          const receivedFile = {
            id: transfer.meta.fileId,
            originalName: transfer.meta.name,
            size: transfer.meta.size,
            mimeType: transfer.meta.mimeType,
            uploadedAt: new Date().toISOString(),
            uploaderName: this.peerDetails.get(conn.peer)?.name || 'Peer',
            uploaderType: this.peerDetails.get(conn.peer)?.deviceType || 'unknown',
            uploaderIp: 'Wi-Fi P2P',
            downloadUrl: url,
            isBlob: true
          };

          this.incomingTransfers.delete(data.fileId);

          this.onProgress({
            fileId: data.fileId,
            progress: 100,
            speed: 0,
            transferred: transfer.meta.size,
            total: transfer.meta.size,
            status: 'completed'
          });

          this.onFileReceived(receivedFile);
        }
        break;
      }

      default:
        break;
    }
  }

  handleBinaryChunk(conn, arrayBuffer) {
    // ArrayBuffer received: header is 36 bytes (fileId UUID or string)
    // We package the chunk as: [4 bytes headerLength][header JSON][raw chunk bytes]
    try {
      const dataView = new DataView(arrayBuffer);
      const headerLength = dataView.getUint32(0);
      const decoder = new TextDecoder();
      const headerBytes = new Uint8Array(arrayBuffer, 4, headerLength);
      const header = JSON.parse(decoder.decode(headerBytes));

      const chunkData = arrayBuffer.slice(4 + headerLength);
      const transfer = this.incomingTransfers.get(header.fileId);

      if (transfer) {
        transfer.chunks.push(chunkData);
        transfer.receivedBytes += chunkData.byteLength;

        const now = Date.now();
        const timeDiff = (now - transfer.lastTime) / 1000;
        let speed = 0;
        if (timeDiff >= 0.25) {
          speed = (transfer.receivedBytes - transfer.lastLoaded) / timeDiff;
          transfer.lastLoaded = transfer.receivedBytes;
          transfer.lastTime = now;
        }

        const pct = Math.min(100, Math.round((transfer.receivedBytes / transfer.meta.size) * 100));

        this.onProgress({
          fileId: header.fileId,
          fileName: transfer.meta.name,
          progress: pct,
          speed,
          transferred: transfer.receivedBytes,
          total: transfer.meta.size,
          status: 'transferring'
        });
      }
    } catch (e) {
      console.error('Error handling binary chunk:', e);
    }
  }

  // Send a text note to all or specific peer
  sendText(text, targetPeerId = null) {
    const payload = {
      type: 'text-message',
      id: Date.now().toString(),
      fromName: this.deviceInfo.name,
      text,
      timestamp: new Date().toISOString()
    };

    if (targetPeerId && this.connections.has(targetPeerId)) {
      this.connections.get(targetPeerId).send(payload);
    } else {
      this.connections.forEach((conn) => {
        if (conn.open) conn.send(payload);
      });
    }
  }

  // Stream a file directly over WebRTC DataChannel with chunking & backpressure
  async sendFile(file, targetPeerId = null, onLocalProgress = () => {}) {
    const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    const targets = [];
    if (targetPeerId && this.connections.has(targetPeerId)) {
      targets.push(this.connections.get(targetPeerId));
    } else {
      this.connections.forEach((conn) => {
        if (conn.open) targets.push(conn);
      });
    }

    if (targets.length === 0) {
      throw new Error('No peer connected on this Wi-Fi network yet.');
    }

    // 1. Send file metadata
    targets.forEach(conn => {
      conn.send({
        type: 'file-meta',
        fileId,
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        totalChunks
      });
    });

    let transferredBytes = 0;
    let startTime = Date.now();
    let lastLoaded = 0;
    let lastTime = startTime;

    // 2. Stream chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const blobSlice = file.slice(start, end);
      const arrayBuffer = await blobSlice.arrayBuffer();

      // Encode header
      const headerStr = JSON.stringify({ fileId, chunkIndex: i });
      const encoder = new TextEncoder();
      const headerBytes = encoder.encode(headerStr);

      const packetBuffer = new ArrayBuffer(4 + headerBytes.byteLength + arrayBuffer.byteLength);
      const dataView = new DataView(packetBuffer);
      dataView.setUint32(0, headerBytes.byteLength);

      const packetUint8 = new Uint8Array(packetBuffer);
      packetUint8.set(headerBytes, 4);
      packetUint8.set(new Uint8Array(arrayBuffer), 4 + headerBytes.byteLength);

      // Backpressure check on data channels
      for (const conn of targets) {
        if (conn.dataChannel && conn.dataChannel.bufferedAmount > BUFFER_THRESHOLD) {
          await new Promise((resolve) => {
            const check = () => {
              if (!conn.dataChannel || conn.dataChannel.bufferedAmount <= BUFFER_THRESHOLD / 2) {
                resolve();
              } else {
                setTimeout(check, 10);
              }
            };
            check();
          });
        }
        conn.send(packetBuffer);
      }

      transferredBytes += (end - start);
      const now = Date.now();
      const timeDiff = (now - lastTime) / 1000;
      let speed = 0;
      if (timeDiff >= 0.2) {
        speed = (transferredBytes - lastLoaded) / timeDiff;
        lastLoaded = transferredBytes;
        lastTime = now;
      }

      const progress = Math.min(100, Math.round((transferredBytes / file.size) * 100));
      onLocalProgress({
        fileId,
        fileName: file.name,
        progress,
        speed,
        transferred: transferredBytes,
        total: file.size,
        status: 'uploading'
      });
    }

    // 3. Send file completion
    targets.forEach(conn => {
      conn.send({
        type: 'file-complete',
        fileId
      });
    });

    onLocalProgress({
      fileId,
      fileName: file.name,
      progress: 100,
      speed: 0,
      transferred: file.size,
      total: file.size,
      status: 'idle'
    });
  }

  destroy() {
    this.connections.forEach(conn => conn.close());
    this.connections.clear();
    if (this.peer) this.peer.destroy();
  }
}
