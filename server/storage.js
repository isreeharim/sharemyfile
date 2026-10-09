import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mime from 'mime-types';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
const META_FILE = path.join(UPLOAD_DIR, '.metadata.json');

// Ensure directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function loadMetadata() {
  if (!fs.existsSync(META_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(META_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveMetadata(list) {
  try {
    fs.writeFileSync(META_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save metadata:', e);
  }
}

export function getAllFiles() {
  const meta = loadMetadata();
  // Filter out any entries where file was removed from disk
  const existing = meta.filter(item => {
    const p = path.join(UPLOAD_DIR, item.savedName);
    return fs.existsSync(p);
  });
  if (existing.length !== meta.length) {
    saveMetadata(existing);
  }
  return existing.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getFileById(fileId) {
  const list = getAllFiles();
  return list.find(f => f.id === fileId) || null;
}

export function registerUploadedFile({ originalName, savedName, size, mimeType, uploader, targetDevice }) {
  const id = crypto.randomUUID();
  const fileExt = path.extname(originalName);
  const detectedMime = mimeType || mime.lookup(originalName) || 'application/octet-stream';

  const entry = {
    id,
    originalName,
    savedName,
    size,
    mimeType: detectedMime,
    extension: fileExt.toLowerCase().replace('.', ''),
    createdAt: new Date().toISOString(),
    uploader: uploader || { name: 'Anonymous', deviceType: 'unknown' },
    targetDevice: targetDevice || 'all'
  };

  const list = loadMetadata();
  list.unshift(entry);
  saveMetadata(list);
  return entry;
}

export function deleteFileById(fileId) {
  const list = loadMetadata();
  const index = list.findIndex(f => f.id === fileId);
  if (index === -1) return false;

  const [removed] = list.splice(index, 1);
  const filePath = path.join(UPLOAD_DIR, removed.savedName);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error('Error deleting file:', e);
    }
  }
  saveMetadata(list);
  return true;
}

export function getStorageStats() {
  const files = getAllFiles();
  const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
  return {
    count: files.length,
    totalBytes,
    uploadDir: UPLOAD_DIR
  };
}

export { UPLOAD_DIR };
