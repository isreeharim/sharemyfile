import Peer from 'peerjs';

// Chunk size for WebRTC DataChannel (64 KB is standard and optimal for LAN throughput)
const CHUNK_SIZE = 64 * 1024;
const BUFFER_THRESHOLD = 1024 * 1024; // 1 MB backpressure threshold

export class P2PManager {
  constructor({ 
    deviceInfo, 
    initialRoomId,
    initialPasskey,
    onPeerJoin, 
    onPeerLeave, 
    onProgress, 
    onFileReceived, 
    onTextReceived, 
    onStatusChange,
    onPasskeyRequired,
    onAuthFailed,
    onAuthSuccess
  }) {
    this.deviceInfo = deviceInfo;
    this.onPeerJoin = onPeerJoin || (() => {});
    this.onPeerLeave = onPeerLeave || (() => {});
    this.onProgress = onProgress || (() => {});
    this.onFileReceived = onFileReceived || (() => {});
    this.onTextReceived = onTextReceived || (() => {});
    this.onStatusChange = onStatusChange || (() => {});
    this.onPasskeyRequired = onPasskeyRequired || (() => {});
    this.onAuthFailed = onAuthFailed || (() => {});
    this.onAuthSuccess = onAuthSuccess || (() => {});

    this.peer = null;
    this.myPeerId = null;
    this.isHost = false;
    
    // Parse room and passkey from URL or parameters
    const urlParams = P2PManager.getRoomAndPinFromUrl();
    this.roomId = initialRoomId || urlParams.roomId;
    this.passkey = initialPasskey !== undefined ? initialPasskey : urlParams.pin;

    this.connections = new Map(); // peerId -> DataConnection
    this.peerDetails = new Map(); // peerId -> deviceInfo
    this.pendingAuthConns = new Map(); // peerId -> { conn, peerInfo } for unauthenticated connections

    // Active incoming transfers: fileId -> { meta, chunks, receivedBytes, startTime, lastLoaded, lastTime }
    this.incomingTransfers = new Map();

    this.init();
  }

  // Parse room and pin parameters from URL hash
  static getRoomAndPinFromUrl() {
    if (typeof window === 'undefined') return { roomId: 'default', pin: '' };
    const hash = window.location.hash || '';
    const roomMatch = hash.match(/room=([a-zA-Z0-9_-]+)/i);
    const pinMatch = hash.match(/pin=([^&]+)/i);

    const roomId = roomMatch && roomMatch[1] ? roomMatch[1].toLowerCase() : ('room-' + Math.random().toString(36).substring(2, 8));
    const pin = pinMatch && pinMatch[1] ? decodeURIComponent(pinMatch[1]) : (localStorage.getItem(`smf_pin_${roomId}`) || '');

    // Synchronize URL hash
    if (!roomMatch) {
      window.location.hash = pin ? `room=${roomId}&pin=${encodeURIComponent(pin)}` : `room=${roomId}`;
    }

    return { roomId, pin };
  }

  init() {
    this.onStatusChange({ 
      status: 'connecting', 
      roomId: this.roomId, 
      hasPasskey: !!this.passkey 
    });

    // Try to register as the Room Host first
    const hostPeerId = `smf-${this.roomId}`;
    this.tryConnectAsHost(hostPeerId);
  }

  tryConnectAsHost(hostPeerId) {
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
      this.onStatusChange({ 
        status: 'ready', 
        isHost: true, 
        peerId: id, 
        roomId: this.roomId,
        hasPasskey: !!this.passkey
      });
      this.setupHostListeners(peer);
    });

    peer.on('error', (err) => {
      // If ID is already taken, someone else is host -> connect as guest
      if (err.type === 'unavailable-id') {
        peer.destroy();
        this.connectAsGuest(hostPeerId);
      } else {
        console.warn('P2P Host Peer error:', err);
        this.onStatusChange({ status: 'error', error: err.message, roomId: this.roomId });
      }
    });
  }

  connectAsGuest(hostPeerId) {
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
      this.onStatusChange({ 
        status: 'ready', 
        isHost: false, 
        peerId: id, 
        roomId: this.roomId,
        hasPasskey: !!this.passkey
      });

      // Connect to the host
      const conn = peer.connect(hostPeerId, { reliable: true });
      this.setupConnection(conn, true);
    });

    peer.on('connection', (conn) => {
      this.setupConnection(conn, false);
    });

    peer.on('error', (err) => {
      console.warn('P2P Guest error:', err);
      this.onStatusChange({ status: 'error', error: err.message, roomId: this.roomId });
    });
  }

  setupHostListeners(peer) {
    peer.on('connection', (conn) => {
      this.setupConnection(conn, false);
    });
  }

  setupConnection(conn, isInitiator = false) {
    conn.on('open', () => {
      // Send handshake with my device info and my room passkey
      conn.send({
        type: 'handshake',
        device: this.deviceInfo,
        peerId: this.myPeerId,
        passkey: this.passkey || '',
        isInitiator
      });
    });

    conn.on('data', (data) => {
      this.handleIncomingData(conn, data);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.pendingAuthConns.delete(conn.peer);
      const departingPeer = this.peerDetails.get(conn.peer);
      this.peerDetails.delete(conn.peer);
      if (departingPeer) {
        this.onPeerLeave(conn.peer, departingPeer);
      }
    });

    conn.on('error', (err) => {
      console.warn(`Connection error with ${conn.peer}:`, err);
    });
  }

  handleIncomingData(conn, data) {
    // 1. Binary chunk transfer
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

        // If I am the Host and I have a Passkey configured:
        if (this.isHost && this.passkey) {
          if (data.passkey === this.passkey) {
            // Authentication successful
            this.connections.set(conn.peer, conn);
            this.peerDetails.set(conn.peer, peerInfo);
            conn.send({ 
              type: 'auth_success', 
              device: this.deviceInfo,
              isHost: true,
              roomName: this.roomId 
            });
            this.onPeerJoin(peerInfo);
          } else {
            // Passkey required or incorrect: challenge guest
            this.pendingAuthConns.set(conn.peer, { conn, peerInfo });
            conn.send({ 
              type: 'auth_challenge', 
              roomName: this.roomId, 
              message: 'Room passkey required to connect' 
            });
          }
        } else {
          // No host passkey needed: accept directly
          this.connections.set(conn.peer, conn);
          this.peerDetails.set(conn.peer, peerInfo);
          conn.send({ 
            type: 'auth_success', 
            device: this.deviceInfo,
            isHost: this.isHost,
            roomName: this.roomId 
          });
          this.onPeerJoin(peerInfo);
        }
        break;
      }

      // Guest receives challenge: passkey prompt
      case 'auth_challenge': {
        this.onPasskeyRequired({
          roomName: data.roomName || this.roomId,
          message: data.message,
          submitPasskey: (enteredPin) => {
            this.passkey = enteredPin;
            localStorage.setItem(`smf_pin_${this.roomId}`, enteredPin);
            conn.send({
              type: 'auth_attempt',
              passkey: enteredPin,
              device: this.deviceInfo
            });
          }
        });
        break;
      }

      // Host receives auth attempt from guest
      case 'auth_attempt': {
        const pending = this.pendingAuthConns.get(conn.peer);
        if (data.passkey === this.passkey) {
          // Success
          const peerInfo = pending ? pending.peerInfo : {
            id: conn.peer,
            name: data.device?.name || 'Remote Peer',
            deviceType: data.device?.deviceType || 'unknown',
            os: data.device?.os || 'unknown',
            browser: data.device?.browser || 'unknown',
            ip: 'Direct LAN P2P',
            joinedAt: new Date().toISOString()
          };
          this.connections.set(conn.peer, conn);
          this.peerDetails.set(conn.peer, peerInfo);
          this.pendingAuthConns.delete(conn.peer);

          conn.send({ 
            type: 'auth_success', 
            device: this.deviceInfo,
            isHost: true,
            roomName: this.roomId 
          });
          this.onPeerJoin(peerInfo);
        } else {
          // Failed attempt
          conn.send({
            type: 'auth_fail',
            reason: 'Incorrect passkey'
          });
        }
        break;
      }

      // Guest receives auth confirmation
      case 'auth_success': {
        const hostPeerInfo = {
          id: conn.peer,
          name: data.device?.name || (data.isHost ? 'Room Host' : 'Remote Peer'),
          deviceType: data.device?.deviceType || 'unknown',
          os: data.device?.os || 'unknown',
          browser: data.device?.browser || 'unknown',
          ip: 'Direct LAN P2P',
          joinedAt: new Date().toISOString()
        };
        this.connections.set(conn.peer, conn);
        this.peerDetails.set(conn.peer, hostPeerInfo);
        this.onPeerJoin(hostPeerInfo);
        this.onAuthSuccess({ roomName: data.roomName || this.roomId });
        break;
      }

      // Guest receives auth failure
      case 'auth_fail': {
        this.onAuthFailed({
          reason: data.reason || 'Invalid passkey'
        });
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

  // Switch or create a new room with an optional passkey
  switchRoom(newRoomId, newPasskey = '', includePinInUrl = false) {
    const cleanRoomId = (newRoomId || '').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '') || ('room-' + Math.random().toString(36).substring(2, 8));
    
    // Cleanup existing peer connections
    this.destroy();

    this.roomId = cleanRoomId;
    this.passkey = newPasskey || '';

    if (newPasskey) {
      localStorage.setItem(`smf_pin_${cleanRoomId}`, newPasskey);
    } else {
      localStorage.removeItem(`smf_pin_${cleanRoomId}`);
    }

    // Update URL hash
    if (typeof window !== 'undefined') {
      window.location.hash = (newPasskey && includePinInUrl) 
        ? `room=${cleanRoomId}&pin=${encodeURIComponent(newPasskey)}`
        : `room=${cleanRoomId}`;
    }

    this.connections.clear();
    this.peerDetails.clear();
    this.pendingAuthConns.clear();

    this.init();
  }

  // Update passkey on the current room
  updatePasskey(newPasskey) {
    this.passkey = newPasskey || '';
    if (newPasskey) {
      localStorage.setItem(`smf_pin_${this.roomId}`, newPasskey);
    } else {
      localStorage.removeItem(`smf_pin_${this.roomId}`);
    }
    this.onStatusChange({
      status: 'ready',
      isHost: this.isHost,
      peerId: this.myPeerId,
      roomId: this.roomId,
      hasPasskey: !!this.passkey
    });
  }

  // Send a text note
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

  // Stream file chunks over WebRTC DataChannel
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
      throw new Error('No authenticated peer connected in this room.');
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

      const headerStr = JSON.stringify({ fileId, chunkIndex: i });
      const encoder = new TextEncoder();
      const headerBytes = encoder.encode(headerStr);

      const packetBuffer = new ArrayBuffer(4 + headerBytes.byteLength + arrayBuffer.byteLength);
      const dataView = new DataView(packetBuffer);
      dataView.setUint32(0, headerBytes.byteLength);

      const packetUint8 = new Uint8Array(packetBuffer);
      packetUint8.set(headerBytes, 4);
      packetUint8.set(new Uint8Array(arrayBuffer), 4 + headerBytes.byteLength);

      // Backpressure check
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

    // 3. Complete
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
    this.pendingAuthConns.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}
