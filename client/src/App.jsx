import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Send, 
  MessageSquare, 
  HardDrive, 
  QrCode, 
  CheckCircle2, 
  AlertCircle,
  Radio
} from 'lucide-react';

import Header from './components/Header';
import RadarView from './components/RadarView';
import FileTransferZone from './components/FileTransferZone';
import TextShareCard from './components/TextShareCard';
import FileManager from './components/FileManager';
import QrModal from './components/QrModal';
import TransferApprovalModal from './components/TransferApprovalModal';
import RoomManagerModal from './components/RoomManagerModal';
import PasskeyPromptModal from './components/PasskeyPromptModal';
import { BackgroundGrid } from './components/BackgroundGrid';
import { P2PManager } from './lib/p2p';

import { detectDevice } from './utils/deviceDetector';

export default function App() {
  const [deviceInfo, setDeviceInfo] = useState(() => detectDevice());
  const [currentDeviceId, setCurrentDeviceId] = useState(null);
  const [peers, setPeers] = useState([]);
  const [p2pPeers, setP2pPeers] = useState([]);
  const [p2pInfo, setP2pInfo] = useState({ isHost: false, roomId: '', peerId: '', status: 'init', hasPasskey: false });
  const p2pManagerRef = useRef(null);

  // Room & Passkey Security Modals
  const [isRoomManagerOpen, setIsRoomManagerOpen] = useState(false);
  const [passkeyPrompt, setPasskeyPrompt] = useState({
    isOpen: false,
    roomName: '',
    errorMessage: '',
    submitPasskey: null
  });

  const [selectedPeerId, setSelectedPeerId] = useState(null);
  const [serverInfo, setServerInfo] = useState(null);
  const [selectedIp, setSelectedIp] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);

  // Theme state: dark / light (Collegecentre style)
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('collegecentre_theme') === 'dark' || 
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('collegecentre_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('collegecentre_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

  // Active view tab: 'transfer' | 'text' | 'storage'
  const [activeTab, setActiveTab] = useState('transfer');

  // Files & storage
  const [files, setFiles] = useState([]);
  const [storageStats, setStorageStats] = useState(null);

  // Uploading state
  const [uploadState, setUploadState] = useState({
    status: 'idle',
    progress: 0,
    speed: 0,
    transferred: 0,
    total: 0
  });

  // Security approval modal
  const [requireApproval, setRequireApproval] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState(null);
  const pendingTransferRef = useRef(null);

  // Text notes
  const [receivedTexts, setReceivedTexts] = useState([]);

  // Toast / Notification
  const [notification, setNotification] = useState(null);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const showNotification = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // 1. Fetch server & storage info
  const fetchServerInfo = async () => {
    try {
      const res = await fetch('/api/info');
      if (res.ok) {
        const data = await res.json();
        setServerInfo(data);
        if (data.storage) setStorageStats(data.storage);
      }
    } catch (e) {
      console.warn('Could not fetch server info:', e);
    }
  };

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/files');
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
        if (data.storage) setStorageStats(data.storage);
      }
    } catch (e) {
      console.warn('Could not fetch files:', e);
    }
  };

  useEffect(() => {
    fetchServerInfo();
    fetchFiles();
  }, []);

  // 2. Setup WebSocket connection
  useEffect(() => {
    const connectWs = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        ws.send(JSON.stringify({
          type: 'register',
          name: deviceInfo.name,
          deviceType: deviceInfo.deviceType,
          os: deviceInfo.os,
          browser: deviceInfo.browser
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'init':
              setCurrentDeviceId(data.yourId);
              break;

            case 'peers_update':
              setPeers(data.peers || []);
              break;

            case 'incoming_transfer_request':
              if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
              setIncomingRequest(data);
              break;

            case 'transfer_response':
              if (pendingTransferRef.current && pendingTransferRef.current.transferId === data.transferId) {
                if (data.accepted) {
                  showNotification(`${data.fromName} accepted! Initiating transfer stream...`, 'success');
                  executeUpload(pendingTransferRef.current.files, pendingTransferRef.current.targetId, data.transferId);
                } else {
                  showNotification(`${data.fromName} declined transfer.`, 'error');
                  setUploadState({ status: 'idle', progress: 0, speed: 0, transferred: 0, total: 0 });
                }
                pendingTransferRef.current = null;
              }
              break;

            case 'incoming_text':
              setReceivedTexts(prev => [data, ...prev]);
              showNotification(`Note received from ${data.fromName}`, 'info');
              if (navigator.vibrate) navigator.vibrate(30);
              break;

            case 'files_received':
              fetchFiles();
              showNotification(`Received ${data.files.length} file(s) from ${data.from.name}!`, 'success');
              if (navigator.vibrate) navigator.vibrate([50, 50, 100]);
              confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 }
              });
              break;

            default:
              break;
          }
        } catch (err) {
          console.error('Error processing WS message:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimeoutRef.current = setTimeout(connectWs, 3000);
      };

      ws.onerror = (err) => {
        console.warn('WS error:', err);
        ws.close();
      };
    };

    connectWs();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [deviceInfo]);

  // 3. Setup WebRTC Peer-to-Peer Manager (Vercel & LAN P2P)
  useEffect(() => {
    const p2p = new P2PManager({
      deviceInfo,
      onPeerJoin: (newPeer) => {
        setP2pPeers(prev => {
          if (prev.some(p => p.id === newPeer.id)) return prev;
          return [...prev, newPeer];
        });
        showNotification(`${newPeer.name} connected over Wi-Fi!`, 'info');
        if (navigator.vibrate) navigator.vibrate(30);
      },
      onPeerLeave: (peerId, departed) => {
        setP2pPeers(prev => prev.filter(p => p.id !== peerId));
        if (departed?.name) {
          showNotification(`${departed.name} disconnected`, 'info');
        }
      },
      onProgress: (prog) => {
        setUploadState(prog);
      },
      onFileReceived: (newFile) => {
        setFiles(prev => [newFile, ...prev]);
        showNotification(`Received ${newFile.originalName} via direct Wi-Fi!`, 'success');
        if (navigator.vibrate) navigator.vibrate([60, 50, 100]);
        confetti({
          particleCount: 100,
          spread: 75,
          origin: { y: 0.6 }
        });
      },
      onTextReceived: (data) => {
        setReceivedTexts(prev => [data, ...prev]);
        showNotification(`Note received from ${data.fromName}`, 'info');
        if (navigator.vibrate) navigator.vibrate(30);
      },
      onStatusChange: (status) => {
        setP2pInfo(prev => ({ ...prev, ...status }));
      },
      onPasskeyRequired: ({ roomName, message, submitPasskey }) => {
        setPasskeyPrompt({
          isOpen: true,
          roomName,
          errorMessage: '',
          submitPasskey
        });
        showNotification(`Passkey required to enter #${roomName?.toUpperCase()}`, 'info');
      },
      onAuthFailed: ({ reason }) => {
        setPasskeyPrompt(prev => ({
          ...prev,
          errorMessage: reason || 'Invalid passkey. Please try again.'
        }));
        showNotification('Passkey authentication failed.', 'error');
      },
      onAuthSuccess: ({ roomName }) => {
        setPasskeyPrompt(prev => ({ ...prev, isOpen: false, errorMessage: '' }));
        showNotification(`Authenticated to #${roomName?.toUpperCase()}!`, 'success');
        if (navigator.vibrate) navigator.vibrate([40, 40, 80]);
        confetti({ particleCount: 75, spread: 65, origin: { y: 0.6 } });
      }
    });

    p2pManagerRef.current = p2p;

    return () => {
      p2p.destroy();
    };
  }, [deviceInfo]);

  const handleSwitchRoom = (newRoomId, newPasskey, includePinInUrl = false) => {
    if (p2pManagerRef.current) {
      p2pManagerRef.current.switchRoom(newRoomId, newPasskey, includePinInUrl);
      setP2pPeers([]);
      showNotification(`Switched to room #${newRoomId.toUpperCase()}${newPasskey ? ' (Passkey Protected)' : ''}`, 'info');
    }
  };

  const handleUpdateDeviceName = (name) => {
    setDeviceInfo(prev => ({ ...prev, name }));
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'register',
        name,
        deviceType: deviceInfo.deviceType,
        os: deviceInfo.os,
        browser: deviceInfo.browser
      }));
    }
  };

  const executeUpload = (fileList, targetId, transferId = null) => {
    const formData = new FormData();
    fileList.forEach(file => {
      formData.append('files', file);
    });

    formData.append('uploaderId', currentDeviceId || 'unknown');
    formData.append('uploaderName', deviceInfo.name);
    formData.append('uploaderType', deviceInfo.deviceType);
    formData.append('targetDeviceId', targetId || 'all');
    if (transferId) formData.append('transferId', transferId);

    const xhr = new XMLHttpRequest();
    let startTime = Date.now();
    let lastLoaded = 0;
    let lastTime = startTime;

    setUploadState({
      status: 'uploading',
      progress: 0,
      speed: 0,
      transferred: 0,
      total: fileList.reduce((acc, f) => acc + f.size, 0)
    });

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const now = Date.now();
        const timeDiff = (now - lastTime) / 1000;
        let speed = 0;

        if (timeDiff >= 0.2) {
          speed = (event.loaded - lastLoaded) / timeDiff;
          lastLoaded = event.loaded;
          lastTime = now;
        }

        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadState(prev => ({
          ...prev,
          status: 'uploading',
          progress: percent,
          speed: speed || prev.speed,
          transferred: event.loaded,
          total: event.total
        }));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setUploadState({
          status: 'completed',
          progress: 100,
          speed: 0,
          transferred: 0,
          total: 0
        });
        showNotification('Transfer stream finished successfully!', 'success');
        if (navigator.vibrate) navigator.vibrate([50, 50, 100]);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        fetchFiles();
        setTimeout(() => {
          setUploadState({ status: 'idle', progress: 0, speed: 0, transferred: 0, total: 0 });
        }, 2500);
      } else {
        setUploadState({ status: 'error', progress: 0, speed: 0, transferred: 0, total: 0 });
        showNotification('Upload failed. Check Wi-Fi connection.', 'error');
      }
    };

    xhr.onerror = () => {
      setUploadState({ status: 'error', progress: 0, speed: 0, transferred: 0, total: 0 });
      showNotification('Network transmission error.', 'error');
    };

    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  };

  const handleSendFiles = async (fileList, targetId) => {
    const p2pHasPeers = p2pManagerRef.current && p2pPeers.length > 0;
    const isLocalWsConnected = wsRef.current && wsRef.current.readyState === WebSocket.OPEN;

    if (p2pHasPeers || !isLocalWsConnected) {
      try {
        setUploadState({
          status: 'uploading',
          progress: 0,
          speed: 0,
          transferred: 0,
          total: fileList.reduce((acc, f) => acc + f.size, 0)
        });

        for (const file of fileList) {
          await p2pManagerRef.current.sendFile(file, targetId, (prog) => {
            setUploadState(prog);
          });
        }

        setUploadState({ status: 'completed', progress: 100, speed: 0, transferred: 0, total: 0 });
        showNotification('Direct Wi-Fi P2P transfer completed!', 'success');
        if (navigator.vibrate) navigator.vibrate([50, 50, 100]);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        setTimeout(() => {
          setUploadState({ status: 'idle', progress: 0, speed: 0, transferred: 0, total: 0 });
        }, 2500);
      } catch (err) {
        console.warn('P2P transfer error:', err);
        if (isLocalWsConnected) {
          executeUpload(fileList, targetId);
        } else {
          setUploadState({ status: 'error', progress: 0, speed: 0, transferred: 0, total: 0 });
          showNotification(err.message || 'Transfer failed. Check Wi-Fi connection.', 'error');
        }
      }
    } else {
      if (requireApproval && targetId !== 'all') {
        const transferId = Math.random().toString(36).substring(2, 9);
        pendingTransferRef.current = {
          transferId,
          files: fileList,
          targetId
        };

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'transfer_request',
            targetId,
            transferId,
            files: fileList.map(f => ({ name: f.name, size: f.size, type: f.type }))
          }));
          showNotification('Enforcing approval request on recipient device...', 'info');
        }
      } else {
        executeUpload(fileList, targetId);
      }
    }
  };

  const handleAcceptRequest = (req) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'transfer_response',
        senderId: req.fromId,
        transferId: req.transferId,
        accepted: true
      }));
    }
    setIncomingRequest(null);
    showNotification('Accepted incoming transmission.', 'info');
  };

  const handleDeclineRequest = (req) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'transfer_response',
        senderId: req.fromId,
        transferId: req.transferId,
        accepted: false,
        reason: 'User declined'
      }));
    }
    setIncomingRequest(null);
  };

  const handleSendText = ({ text, title, targetId }) => {
    // 1. Send over P2P DataChannel
    if (p2pManagerRef.current) {
      p2pManagerRef.current.sendText(text, targetId);
    }
    // 2. Send over local WebSocket if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'text_share',
        targetId,
        text,
        title
      }));
    }
    // 3. Add to local notes list
    setReceivedTexts(prev => [
      {
        id: Date.now().toString(),
        fromName: `${deviceInfo.name} (You)`,
        text,
        timestamp: new Date().toISOString()
      },
      ...prev
    ]);
    showNotification('Note dispatched over Wi-Fi!', 'success');
  };

  const handleDeleteFile = async (fileId) => {
    if (!confirm('Permanently remove this file from computer storage?')) return;
    try {
      const res = await fetch(`/api/files/${fileId}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification('File removed from vault', 'info');
        fetchFiles();
      }
    } catch (e) {
      showNotification('Delete operation failed', 'error');
    }
  };

  const switchTab = (tab) => {
    if (navigator.vibrate) navigator.vibrate(15);
    setActiveTab(tab);
  };

  const combinedPeers = [
    ...peers,
    ...p2pPeers.filter(p => !peers.some(existing => existing.id === p.id))
  ];

  const shareUrl = typeof window !== 'undefined'
    ? (window.location.hostname === 'localhost' && serverInfo?.primaryIp
        ? `http://${serverInfo.primaryIp}:${serverInfo?.port || 5000}#room=${p2pInfo.roomId || ''}`
        : `${window.location.origin}${window.location.pathname}#room=${p2pInfo.roomId || ''}`)
    : '';

  const selectedPeer = combinedPeers.find(p => p.id === selectedPeerId) || null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors relative selection:bg-[#fe7141] selection:text-white">
      {/* Collegecentre Architectural Hairline Grid */}
      <BackgroundGrid />

      {/* Collegecentre Editorial Notification */}
      {notification && (
        <div className="fixed top-16 right-4 z-50 flex items-center gap-2 px-3.5 py-2 rounded-sm border border-black/10 dark:border-white/15 bg-white dark:bg-[#121212] shadow-md animate-fade-in text-xs font-mono font-bold max-w-[92vw]">
          {notification.type === 'success' && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
          {notification.type === 'error' && <span className="w-2 h-2 rounded-full bg-rose-500" />}
          {notification.type === 'info' && <span className="w-2 h-2 rounded-full bg-[#fe7141]" />}
          <span className="text-black dark:text-white">{notification.msg}</span>
        </div>
      )}

      {/* Header */}
      <Header
        deviceInfo={deviceInfo}
        onUpdateDeviceName={handleUpdateDeviceName}
        isConnected={isConnected}
        serverInfo={serverInfo}
        onOpenQr={() => setIsQrOpen(true)}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenRoomManager={() => setIsRoomManagerOpen(true)}
        currentRoomId={p2pInfo.roomId}
        hasPasskey={p2pInfo.hasPasskey}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6 pb-24 sm:pb-8 relative z-10">
        
        {/* Collegecentre Monospace Nav Tabs (Desktop) */}
        <div className="hidden sm:flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
          <div className="flex items-center gap-1 font-mono text-xs tracking-tight">
            <button
              onClick={() => switchTab('transfer')}
              className={`px-3 py-1.5 rounded-sm transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'transfer'
                  ? 'bg-black dark:bg-white text-white dark:text-black font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>DISCOVER & DISPATCH</span>
            </button>

            <button
              onClick={() => switchTab('text')}
              className={`px-3 py-1.5 rounded-sm transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'text'
                  ? 'bg-black dark:bg-white text-white dark:text-black font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>QUICK NOTES</span>
            </button>

            <button
              onClick={() => switchTab('storage')}
              className={`px-3 py-1.5 rounded-sm transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'storage'
                  ? 'bg-black dark:bg-white text-white dark:text-black font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>VAULT STORAGE</span>
              {files.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-sm bg-[#fff1ec] dark:bg-[#fe7141]/20 text-[#fe7141] font-bold text-[10px] border border-[#fed7c7] dark:border-[#fe7141]/40">
                  {files.length}
                </span>
              )}
            </button>
          </div>

          <div className="text-xs font-mono text-slate-500">
            NETWORK: <span className="font-bold text-black dark:text-white">LOCAL WI-FI (PEER-TO-PEER)</span>
          </div>
        </div>

        {/* Tab 1: Transfer */}
        {activeTab === 'transfer' && (
          <div className="space-y-6">
            <RadarView
              peers={combinedPeers}
              currentDeviceId={currentDeviceId}
              selectedPeerId={selectedPeerId}
              onSelectPeer={setSelectedPeerId}
              onOpenQr={() => setIsQrOpen(true)}
              serverInfo={serverInfo}
              selectedIp={selectedIp}
              onSelectIp={setSelectedIp}
              targetUrl={shareUrl}
            />

            <FileTransferZone
              selectedPeer={selectedPeer}
              peers={combinedPeers}
              onSendFiles={handleSendFiles}
              uploadState={uploadState}
              requireApproval={requireApproval}
              onToggleRequireApproval={() => setRequireApproval(!requireApproval)}
            />
          </div>
        )}

        {/* Tab 2: Text */}
        {activeTab === 'text' && (
          <div className="max-w-2xl mx-auto">
            <TextShareCard
              selectedPeer={selectedPeer}
              onSendText={handleSendText}
              receivedTexts={receivedTexts}
            />
          </div>
        )}

        {/* Tab 3: Storage */}
        {activeTab === 'storage' && (
          <div>
            <FileManager
              files={files}
              storage={storageStats}
              onDeleteFile={handleDeleteFile}
              onRefreshFiles={fetchFiles}
            />
          </div>
        )}

      </main>

      {/* Collegecentre Mobile Bottom Navigation Dock */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0a0a0a]/95 border-t border-black/10 dark:border-white/15 backdrop-blur-md pb-safe">
        <div className="grid grid-cols-4 h-13">
          <button
            onClick={() => switchTab('transfer')}
            className={`flex flex-col items-center justify-center space-y-1 cursor-pointer ${
              activeTab === 'transfer' ? 'text-[#fe7141] font-bold' : 'text-slate-500'
            }`}
          >
            <Send className="w-4 h-4" />
            <span className="text-[10px] font-mono">Send</span>
          </button>

          <button
            onClick={() => switchTab('text')}
            className={`flex flex-col items-center justify-center space-y-1 cursor-pointer ${
              activeTab === 'text' ? 'text-[#fe7141] font-bold' : 'text-slate-500'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-[10px] font-mono">Notes</span>
          </button>

          <button
            onClick={() => switchTab('storage')}
            className={`flex flex-col items-center justify-center space-y-1 relative cursor-pointer ${
              activeTab === 'storage' ? 'text-[#fe7141] font-bold' : 'text-slate-500'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span className="text-[10px] font-mono">Vault</span>
            {files.length > 0 && (
              <span className="absolute top-1.5 right-6 w-3.5 h-3.5 rounded-full bg-[#fe7141] text-white font-bold text-[8px] flex items-center justify-center">
                {files.length > 9 ? '9+' : files.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(15);
              setIsQrOpen(true);
            }}
            className="flex flex-col items-center justify-center space-y-1 text-slate-500 cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span className="text-[10px] font-mono">Scan QR</span>
          </button>
        </div>
      </nav>

      {/* Collegecentre Editorial Footer */}
      <footer className="hidden sm:block border-t border-black/10 dark:border-white/10 py-4 text-center text-xs font-mono text-slate-500">
        <p>COLLEGECENTRE THEME // SHAREMYFILE • 100% FREE LOCAL LAN TRANSFERS • ZERO PAYWALLS</p>
      </footer>

      {/* QR Code Modal */}
      <QrModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        serverInfo={serverInfo}
        selectedIp={selectedIp}
        onSelectIp={setSelectedIp}
        targetUrl={shareUrl}
      />

      {/* Room Manager & Security Passkey Modal */}
      <RoomManagerModal
        isOpen={isRoomManagerOpen}
        onClose={() => setIsRoomManagerOpen(false)}
        currentRoomId={p2pInfo.roomId}
        hasPasskey={p2pInfo.hasPasskey}
        onSwitchRoom={handleSwitchRoom}
        shareUrl={shareUrl}
      />

      {/* Passkey Authentication Prompt Modal */}
      <PasskeyPromptModal
        isOpen={passkeyPrompt.isOpen}
        roomName={passkeyPrompt.roomName}
        errorMessage={passkeyPrompt.errorMessage}
        onSubmitPasskey={(pin) => {
          if (passkeyPrompt.submitPasskey) {
            passkeyPrompt.submitPasskey(pin);
          }
        }}
        onClose={() => setPasskeyPrompt(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Transfer Approval Modal */}
      <TransferApprovalModal
        request={incomingRequest}
        onAccept={handleAcceptRequest}
        onDecline={handleDeclineRequest}
      />

    </div>
  );
}
