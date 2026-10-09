import React, { useState } from 'react';
import { 
  Wifi, 
  QrCode, 
  Laptop, 
  Smartphone, 
  Tablet, 
  Edit3, 
  Check, 
  Copy, 
  Sun, 
  Moon,
  Lock,
  Unlock,
  Hash,
  Key
} from 'lucide-react';
import { saveDeviceName } from '../utils/deviceDetector';

export default function Header({
  deviceInfo,
  onUpdateDeviceName,
  isConnected,
  serverInfo,
  onOpenQr,
  isDark,
  onToggleTheme,
  onOpenRoomManager,
  currentRoomId,
  hasPasskey
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(deviceInfo.name);
  const [copiedIp, setCopiedIp] = useState(false);

  const handleSave = () => {
    if (newName.trim()) {
      saveDeviceName(newName.trim());
      onUpdateDeviceName(newName.trim());
    }
    setIsEditing(false);
  };

  const getDeviceIcon = () => {
    if (deviceInfo.deviceType === 'mobile') return <Smartphone className="w-3.5 h-3.5 text-[#fe7141] shrink-0" />;
    if (deviceInfo.deviceType === 'tablet') return <Tablet className="w-3.5 h-3.5 text-[#597e87] shrink-0" />;
    return <Laptop className="w-3.5 h-3.5 text-black dark:text-white shrink-0" />;
  };

  const copyIp = () => {
    if (serverInfo?.url) {
      navigator.clipboard.writeText(serverInfo.url);
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 2000);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-black/10 dark:border-white/15 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-md transition-colors pt-safe">
      <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
        
        {/* Brand Mark (Collegecentre Editorial Style) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 select-none">
            <div className="h-7 w-7 rounded-sm bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-mono font-bold text-xs shadow-sm">
              SMF
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-bold text-sm tracking-tight text-black dark:text-white uppercase">
                SHAREMYFILE
              </span>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.2 rounded-sm text-[10px] font-mono font-semibold uppercase tracking-wider bg-[#fff1ec] dark:bg-[#fe7141]/10 text-[#fe7141] border border-[#fed7c7] dark:border-[#fe7141]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#fe7141] animate-pulse mr-1" />
                LAN ONLINE
              </span>
            </div>
          </div>
        </div>

        {/* Server IP Pill (Editorial Monospace) */}
        {serverInfo?.url && (
          <button
            onClick={copyIp}
            title="Click to copy sharing URL"
            className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-sm border border-black/10 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.04] text-xs font-mono text-slate-700 dark:text-slate-300 hover:border-black/30 dark:hover:border-white/40 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{serverInfo.url}</span>
            <Copy className="w-3 h-3 text-slate-400 ml-0.5" />
            {copiedIp && <span className="text-[#fe7141] text-[10px] font-bold">COPIED</span>}
          </button>
        )}

        {/* Room & Security Passkey Badge */}
        {currentRoomId && (
          <button
            onClick={onOpenRoomManager}
            title="Configure or Switch Room / Security Passkey"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-black/10 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.04] text-xs font-mono text-slate-700 dark:text-slate-300 hover:border-[#fe7141] transition-colors cursor-pointer"
          >
            {hasPasskey ? (
              <Lock className="w-3 h-3 text-[#fe7141]" />
            ) : (
              <Hash className="w-3 h-3 text-slate-400" />
            )}
            <span className="font-bold text-[11px] truncate max-w-[110px] sm:max-w-none">
              #{currentRoomId.toUpperCase()}
            </span>
            {hasPasskey && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#fe7141] animate-pulse" />
            )}
          </button>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle (Light / Dark) */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-sm border border-black/10 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
            title="Toggle Light/Dark Theme"
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
          </button>

          {/* Device Profile Tag */}
          <div className="flex items-center border border-black/10 dark:border-white/15 rounded-sm px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 font-mono bg-black/[0.02] dark:bg-white/[0.03]">
            {getDeviceIcon()}
            {isEditing ? (
              <div className="flex items-center ml-1.5 gap-1">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  className="bg-transparent border border-[#fe7141] px-1 py-0.5 text-xs w-20 focus:outline-none text-black dark:text-white font-mono"
                  autoFocus
                />
                <button onClick={handleSave} className="text-[#fe7141] hover:text-[#e05828]">
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center ml-1.5 gap-1">
                <span className="font-semibold max-w-[85px] sm:max-w-[120px] truncate">{deviceInfo.name}</span>
                <button
                  onClick={() => {
                    setNewName(deviceInfo.name);
                    setIsEditing(true);
                  }}
                  title="Rename device"
                  className="text-slate-400 hover:text-black dark:hover:text-white"
                >
                  <Edit3 className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
          </div>

          {/* Connect Phone Button (Vermilion Accent) */}
          <button
            onClick={onOpenQr}
            className="btn-vermilion px-3 py-1.5 text-xs font-mono font-bold tracking-tight flex items-center gap-1.5 cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CONNECT PHONE</span>
            <span className="sm:hidden text-[11px]">QR</span>
          </button>
        </div>

      </div>
    </header>
  );
}
