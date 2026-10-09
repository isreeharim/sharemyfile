import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { getLocalIpAddresses, getPrimaryIpAddress, generateQrDataUrl, printTerminalQr } from './network.js';
import {
  UPLOAD_DIR,
  registerUploadedFile,
  getAllFiles,
  getFileById,
  deleteFileById,
  getStorageStats
} from './storage.js';

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Unique filename on disk to avoid collisions, preserving extension
    const ext = path.extname(file.originalname);
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 * 1024 // 50 GB file limit
  }
});

// Map of connected WebSocket clients
// ws.id -> { id, name, deviceType, os, browser, ip, ws }
const clients = new Map();

function broadcastPeers() {
  const peerList = Array.from(clients.values()).map(c => ({
    id: c.id,
    name: c.name,
    deviceType: c.deviceType,
    os: c.os,
    browser: c.browser,
    ip: c.ip,
    connectedAt: c.connectedAt
  }));

  const msg = JSON.stringify({
    type: 'peers_update',
    peers: peerList
  });

  for (const client of clients.values()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(msg);
    }
  }
}

function sendToPeer(targetId, data) {
  const target = clients.get(targetId);
  if (target && target.ws.readyState === WebSocket.OPEN) {
    target.ws.send(JSON.stringify(data));
    return true;
  }
  return false;
}

// WebSocket Connection Handler
wss.on('connection', (ws, req) => {
  const clientId = crypto.randomUUID();
  const remoteIp = req.socket.remoteAddress?.replace('::ffff:', '') || 'Unknown';

  const clientInfo = {
    id: clientId,
    name: `Device-${clientId.slice(0, 4)}`,
    deviceType: 'unknown',
    os: 'Unknown',
    browser: 'Unknown',
    ip: remoteIp,
    connectedAt: new Date().toISOString(),
    ws
  };

  clients.set(clientId, clientInfo);

  // Send initialization info to newly connected client
  ws.send(JSON.stringify({
    type: 'init',
    yourId: clientId,
    serverTime: new Date().toISOString()
  }));

  broadcastPeers();

  ws.on('message', (messageRaw) => {
    try {
      const data = JSON.parse(messageRaw.toString());

      switch (data.type) {
        case 'register': {
          clientInfo.name = data.name || clientInfo.name;
          clientInfo.deviceType = data.deviceType || 'unknown';
          clientInfo.os = data.os || 'Unknown';
          clientInfo.browser = data.browser || 'Unknown';
          broadcastPeers();
          break;
        }

        case 'transfer_request': {
          // Sender asking receiver to accept file
          // data: { targetId, files: [{ name, size, type }], transferId }
          sendToPeer(data.targetId, {
            type: 'incoming_transfer_request',
            fromId: clientId,
            fromName: clientInfo.name,
            fromType: clientInfo.deviceType,
            transferId: data.transferId,
            files: data.files,
            pin: data.pin || null
          });
          break;
        }

        case 'transfer_response': {
          // Receiver responded (accept or decline)
          // data: { senderId, transferId, accepted, reason }
          sendToPeer(data.senderId, {
            type: 'transfer_response',
            fromId: clientId,
            fromName: clientInfo.name,
            transferId: data.transferId,
            accepted: data.accepted,
            reason: data.reason
          });
          break;
        }

        case 'text_share': {
          // Quick clipboard / text message share
          // data: { targetId: 'all' | id, text, title }
          const payload = {
            type: 'incoming_text',
            fromId: clientId,
            fromName: clientInfo.name,
            fromType: clientInfo.deviceType,
            text: data.text,
            title: data.title || 'Text Note',
            timestamp: new Date().toISOString()
          };

          if (data.targetId === 'all') {
            for (const [id, c] of clients.entries()) {
              if (id !== clientId && c.ws.readyState === WebSocket.OPEN) {
                c.ws.send(JSON.stringify(payload));
              }
            }
          } else {
            sendToPeer(data.targetId, payload);
          }
          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
    broadcastPeers();
  });

  ws.on('error', (err) => {
    console.error(`WebSocket error for ${clientId}:`, err.message);
    clients.delete(clientId);
    broadcastPeers();
  });
});

// Periodic heartbeat to prune stale sockets
setInterval(() => {
  for (const [id, client] of clients.entries()) {
    if (client.ws.readyState !== WebSocket.OPEN) {
      clients.delete(id);
      broadcastPeers();
    }
  }
}, 15000);

// ==================== REST API ENDPOINTS ====================

// Server & Network info
app.get('/api/info', async (req, res) => {
  const allIps = getLocalIpAddresses();
  const primaryIp = getPrimaryIpAddress();
  const url = `http://${primaryIp}:${PORT}`;
  const qrCode = await generateQrDataUrl(url);

  res.json({
    primaryIp,
    port: PORT,
    url,
    qrCode,
    allIps,
    hostname: os.hostname(),
    platform: os.platform(),
    activePeersCount: clients.size,
    storage: getStorageStats()
  });
});

// Dynamic QR code endpoint for custom URL or default
app.get('/api/qr', async (req, res) => {
  const primaryIp = getPrimaryIpAddress();
  const targetUrl = req.query.url || `http://${primaryIp}:${PORT}`;
  const qrData = await generateQrDataUrl(targetUrl);
  res.json({ qrCode: qrData, url: targetUrl });
});

// List saved files on host computer
app.get('/api/files', (req, res) => {
  const files = getAllFiles();
  res.json({ files, storage: getStorageStats() });
});

// Upload files
app.post('/api/upload', upload.array('files'), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploader = {
      id: req.body.uploaderId || 'unknown',
      name: req.body.uploaderName || 'Anonymous',
      deviceType: req.body.uploaderType || 'unknown'
    };

    const targetDeviceId = req.body.targetDeviceId || 'all';
    const transferId = req.body.transferId || null;

    const savedEntries = [];
    for (const file of req.files) {
      // Decode properly if utf8 characters in originalname
      const safeOriginalName = Buffer.from(file.originalname, 'latin1').toString('utf8');

      const entry = registerUploadedFile({
        originalName: safeOriginalName,
        savedName: file.filename,
        size: file.size,
        mimeType: file.mimetype,
        uploader,
        targetDevice: targetDeviceId
      });
      savedEntries.push(entry);
    }

    // Broadcast or send notification to specific target
    const notifyPayload = {
      type: 'files_received',
      from: uploader,
      transferId,
      files: savedEntries,
      timestamp: new Date().toISOString()
    };

    if (targetDeviceId === 'all') {
      for (const [id, c] of clients.entries()) {
        if (id !== uploader.id && c.ws.readyState === WebSocket.OPEN) {
          c.ws.send(JSON.stringify(notifyPayload));
        }
      }
    } else {
      sendToPeer(targetDeviceId, notifyPayload);
    }

    res.json({
      success: true,
      message: `Successfully uploaded ${savedEntries.length} file(s)`,
      files: savedEntries
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to process file upload' });
  }
});

// Download a file
app.get('/api/download/:fileId', (req, res) => {
  const file = getFileById(req.params.fileId);
  if (!file) {
    return res.status(404).send('File not found');
  }

  const filePath = path.join(UPLOAD_DIR, file.savedName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File missing from disk');
  }

  // Set headers for download
  res.download(filePath, file.originalName);
});

// Stream preview (images, audio, video, pdf, text)
app.get('/api/preview/:fileId', (req, res) => {
  const file = getFileById(req.params.fileId);
  if (!file) {
    return res.status(404).send('File not found');
  }

  const filePath = path.join(UPLOAD_DIR, file.savedName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File missing from disk');
  }

  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

// Delete a file
app.delete('/api/files/:fileId', (req, res) => {
  const success = deleteFileById(req.params.fileId);
  if (!success) {
    return res.status(404).json({ error: 'File not found' });
  }
  res.json({ success: true, message: 'File deleted successfully' });
});

// Text snippet share fallback
app.post('/api/text-share', (req, res) => {
  const { text, title, targetDeviceId, uploader } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text content required' });
  }

  const payload = {
    type: 'incoming_text',
    fromId: uploader?.id || 'host',
    fromName: uploader?.name || 'Host Computer',
    fromType: uploader?.deviceType || 'laptop',
    text,
    title: title || 'Quick Note',
    timestamp: new Date().toISOString()
  };

  if (targetDeviceId && targetDeviceId !== 'all') {
    sendToPeer(targetDeviceId, payload);
  } else {
    for (const c of clients.values()) {
      if (c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(JSON.stringify(payload));
      }
    }
  }

  res.json({ success: true });
});

// ==================== STATIC CLIENT SERVING ====================
const clientDistPath = path.resolve(process.cwd(), 'client', 'dist');

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  // Express 5 catch-all SPA fallback
  app.use((req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // Helpful fallback when running during development
  app.use((req, res) => {
    const primaryIp = getPrimaryIpAddress();
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>ShareMyFile Server</title></head>
      <body style="font-family:system-ui; background:#0b0f19; color:#f3f4f6; padding:40px; text-align:center;">
        <h1 style="color:#60a5fa;">🚀 ShareMyFile Server Running</h1>
        <p>Local WiFi IP: <strong>${primaryIp}:${PORT}</strong></p>
        <p>Frontend is currently building or running in Vite dev mode.</p>
      </body>
      </html>
    `);
  });
}

// Start Server
server.listen(PORT, '0.0.0.0', () => {
  const primaryIp = getPrimaryIpAddress();
  const localUrl = `http://localhost:${PORT}`;
  const wifiUrl = `http://${primaryIp}:${PORT}`;

  console.log('\n======================================================');
  console.log('       ⚡ SHARE MY FILE - Local WiFi Sharing ⚡');
  console.log('======================================================');
  console.log(`💻 Open in PC Browser:  ${localUrl}`);
  console.log(`📱 Phone / WiFi Link:   ${wifiUrl}`);
  console.log('📁 Storage folder:     ', UPLOAD_DIR);
  console.log('------------------------------------------------------');
  console.log('📲 QR Code for phone camera:');
  printTerminalQr(wifiUrl);
  console.log('------------------------------------------------------');
  console.log(`💡 TIP: The full, high-res QR code is also displayed`);
  console.log(`   on your PC screen at: ${localUrl}`);
  console.log('======================================================\n');
});
