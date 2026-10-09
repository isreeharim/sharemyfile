import React, { useState } from 'react';
import { 
  Lock, 
  Unlock, 
  Hash, 
  Key, 
  ShieldCheck, 
  Copy, 
  Check, 
  Shuffle, 
  ArrowRight,
  Eye,
  EyeOff,
  Radio
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

export default function RoomManagerModal({
  isOpen,
  onClose,
  currentRoomId,
  hasPasskey,
  currentPasskey,
  onSwitchRoom,
  shareUrl
}) {
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'join'
  
  // Create Room State
  const [newRoomId, setNewRoomId] = useState('');
  const [enablePasskey, setEnablePasskey] = useState(false);
  const [newPasskey, setNewPasskey] = useState('');
  const [includePinInUrl, setIncludePinInUrl] = useState(true);
  const [showPasskey, setShowPasskey] = useState(false);

  // Join Room State
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinPasskey, setJoinPasskey] = useState('');
  const [showJoinPasskey, setShowJoinPasskey] = useState(false);

  // Copied indicator
  const [copiedLink, setCopiedLink] = useState(false);

  const generateRandomRoom = () => {
    const random = 'room-' + Math.random().toString(36).substring(2, 8);
    setNewRoomId(random);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    const finalRoom = newRoomId.trim() || ('room-' + Math.random().toString(36).substring(2, 8));
    const finalPin = enablePasskey ? newPasskey.trim() : '';
    onSwitchRoom(finalRoom, finalPin, includePinInUrl);
    onClose();
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!joinRoomId.trim()) return;
    onSwitchRoom(joinRoomId.trim(), joinPasskey.trim(), false);
    onClose();
  };

  const copyRoomLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent onClose={onClose} className="max-w-md bg-white dark:bg-[#121212] border-black/10 dark:border-white/15 rounded-sm p-5 sm:p-6 text-black dark:text-white font-mono">
        
        {/* Header Icon */}
        <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-[#fff1ec] dark:bg-[#fe7141]/10 text-[#fe7141] mx-auto mb-2 border border-[#fed7c7] dark:border-[#fe7141]/30">
          <Key className="w-5 h-5" />
        </div>

        <DialogHeader className="text-center sm:text-center mb-3">
          <DialogTitle className="text-center text-sm sm:text-base font-bold uppercase tracking-tight text-black dark:text-white">
            ROOM SELECTOR & SECURITY // ACCESS CONTROL
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-slate-500">
            Create or join private rooms. Secure with passkey PIN authentication.
          </DialogDescription>
        </DialogHeader>

        {/* Current Active Room Info Card */}
        <div className="p-3 rounded-sm border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] space-y-2 mb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-semibold uppercase">ACTIVE ROOM:</span>
            <div className="flex items-center gap-1.5 font-bold text-[#fe7141]">
              <Hash className="w-3.5 h-3.5" />
              <span>{currentRoomId?.toUpperCase()}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-black/5 dark:border-white/5">
            <span className="text-slate-500 font-semibold uppercase">SECURITY STATUS:</span>
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-sm ${
              hasPasskey 
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' 
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
            }`}>
              {hasPasskey ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              {hasPasskey ? 'PASSKEY PROTECTED' : 'OPEN ACCESS (NO PIN)'}
            </span>
          </div>

          <button
            onClick={copyRoomLink}
            className="w-full mt-2 py-1.5 px-3 rounded-sm border border-black/10 dark:border-white/15 bg-white dark:bg-black text-[11px] font-bold flex items-center justify-center gap-1.5 hover:border-[#fe7141] transition-colors cursor-pointer"
          >
            {copiedLink ? <Check className="w-3 h-3 text-[#fe7141]" /> : <Copy className="w-3 h-3 text-slate-400" />}
            <span>{copiedLink ? 'ROOM LINK COPIED TO CLIPBOARD' : 'COPY ROOM SHARE LINK'}</span>
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-black/[0.04] dark:bg-white/[0.04] rounded-sm mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`py-1.5 text-xs font-bold uppercase transition-all rounded-sm cursor-pointer ${
              activeTab === 'create'
                ? 'bg-white dark:bg-[#1e1e1e] text-black dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-black dark:hover:text-white'
            }`}
          >
            CREATE NEW ROOM
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('join')}
            className={`py-1.5 text-xs font-bold uppercase transition-all rounded-sm cursor-pointer ${
              activeTab === 'join'
                ? 'bg-white dark:bg-[#1e1e1e] text-black dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-black dark:hover:text-white'
            }`}
          >
            JOIN EXISTING ROOM
          </button>
        </div>

        {/* Tab 1: Create Custom Room */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreate} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                ROOM NAME / CODE
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newRoomId}
                  onChange={(e) => setNewRoomId(e.target.value)}
                  placeholder="e.g. office-wifi, team-alpha..."
                  className="flex-1 bg-black/[0.02] dark:bg-white/[0.02] border border-black/15 dark:border-white/15 px-3 py-1.5 rounded-sm text-xs font-mono text-black dark:text-white focus:outline-none focus:border-[#fe7141]"
                />
                <button
                  type="button"
                  onClick={generateRandomRoom}
                  title="Generate random room code"
                  className="px-2.5 py-1.5 border border-black/15 dark:border-white/15 rounded-sm text-xs text-slate-600 dark:text-slate-300 hover:border-[#fe7141] transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">RANDOM</span>
                </button>
              </div>
            </div>

            {/* Passkey Toggle */}
            <div className="p-3 rounded-sm border border-black/10 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.02] space-y-2.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enablePasskey}
                  onChange={(e) => setEnablePasskey(e.target.checked)}
                  className="accent-[#fe7141] w-4 h-4 rounded-sm"
                />
                <span className="text-xs font-bold text-black dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#fe7141]" />
                  REQUIRE SECURITY PASSKEY / PIN
                </span>
              </label>

              {enablePasskey && (
                <div className="space-y-2 pt-1 border-t border-black/5 dark:border-white/5 animate-fade-in">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase mb-1">
                      PASSKEY / PIN CODE (REQUIRED BY PEERS TO CONNECT)
                    </label>
                    <div className="relative">
                      <input
                        type={showPasskey ? 'text' : 'password'}
                        value={newPasskey}
                        onChange={(e) => setNewPasskey(e.target.value)}
                        placeholder="e.g. 1234 or secretpass"
                        required={enablePasskey}
                        className="w-full bg-white dark:bg-[#181818] border border-black/15 dark:border-white/15 px-3 py-1.5 pr-8 rounded-sm text-xs font-mono text-black dark:text-white focus:outline-none focus:border-[#fe7141]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasskey(!showPasskey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black dark:hover:text-white"
                      >
                        {showPasskey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includePinInUrl}
                      onChange={(e) => setIncludePinInUrl(e.target.checked)}
                      className="accent-[#fe7141] w-3.5 h-3.5"
                    />
                    <span>Include PIN in QR code for automatic 1-scan mobile login</span>
                  </label>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn-vermilion w-full py-2 px-4 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <span>INITIALIZE & SWITCH ROOM</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Tab 2: Join Existing Room */}
        {activeTab === 'join' && (
          <form onSubmit={handleJoin} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                TARGET ROOM NAME / IDENTIFIER
              </label>
              <input
                type="text"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="e.g. room-alpha, office-7..."
                required
                className="w-full bg-black/[0.02] dark:bg-white/[0.02] border border-black/15 dark:border-white/15 px-3 py-1.5 rounded-sm text-xs font-mono text-black dark:text-white focus:outline-none focus:border-[#fe7141]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                ROOM PASSKEY / PIN (IF SECURED)
              </label>
              <div className="relative">
                <input
                  type={showJoinPasskey ? 'text' : 'password'}
                  value={joinPasskey}
                  onChange={(e) => setJoinPasskey(e.target.value)}
                  placeholder="Leave empty if room is open"
                  className="w-full bg-black/[0.02] dark:bg-white/[0.02] border border-black/15 dark:border-white/15 px-3 py-1.5 pr-8 rounded-sm text-xs font-mono text-black dark:text-white focus:outline-none focus:border-[#fe7141]"
                />
                <button
                  type="button"
                  onClick={() => setShowJoinPasskey(!showJoinPasskey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black dark:hover:text-white"
                >
                  {showJoinPasskey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-vermilion w-full py-2 px-4 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <span>CONNECT TO ROOM</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

      </DialogContent>
    </Dialog>
  );
}
