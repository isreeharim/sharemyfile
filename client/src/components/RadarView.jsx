import React from 'react';
import { Laptop, Smartphone, Tablet, Radio, QrCode, Check, ArrowRight } from 'lucide-react';
import QrCodeDisplay from './QrCodeDisplay';

export default function RadarView({
  peers,
  currentDeviceId,
  selectedPeerId,
  onSelectPeer,
  onOpenQr,
  serverInfo,
  selectedIp,
  onSelectIp,
  targetUrl: propTargetUrl
}) {
  const otherPeers = peers.filter(p => p.id !== currentDeviceId);

  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="w-5 h-5 text-[#fe7141]" />;
      case 'tablet':
        return <Tablet className="w-5 h-5 text-[#597e87]" />;
      default:
        return <Laptop className="w-5 h-5 text-black dark:text-white" />;
    }
  };

  const handleSelect = (id) => {
    if (navigator.vibrate) navigator.vibrate(15);
    onSelectPeer(id);
  };

  const primaryIp = selectedIp || serverInfo?.primaryIp;
  const port = serverInfo?.port || 5000;
  const targetUrl = propTargetUrl || ((primaryIp && primaryIp !== '127.0.0.1' && primaryIp !== 'localhost')
    ? `http://${primaryIp}:${port}`
    : (serverInfo?.url || `http://localhost:${port}`));

  return (
    <div className="cc-card p-5 sm:p-6 relative">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-black/10 dark:border-white/10 gap-2 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#fe7141] animate-pulse" />
            <h3 className="font-mono font-bold text-sm sm:text-base tracking-tight text-black dark:text-white uppercase">
              NETWORK RADAR // ACTIVE PEERS
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
            {otherPeers.length === 0
              ? 'SCANNING LOCAL 5GHz/2.4GHz SUBNET FOR DEVICES...'
              : `${otherPeers.length} ACTIVE PEER DEVICE${otherPeers.length > 1 ? 'S' : ''} DETECTED`}
          </p>
        </div>

        {/* Broadcast selector button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSelect(null)}
            className={`px-3 py-1.5 rounded-sm text-xs font-mono font-bold transition-all border ${
              selectedPeerId === null
                ? 'bg-black dark:bg-white text-white dark:text-black border-transparent shadow-sm'
                : 'border-black/10 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:border-black/30'
            }`}
          >
            BROADCAST (ALL DEVICES)
          </button>
        </div>
      </div>

      {/* Discovered devices grid / QR display state */}
      <div className="min-h-[160px] flex items-center justify-center">
        {otherPeers.length === 0 ? (
          <div className="text-center py-2 px-2 max-w-md mx-auto w-full">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm bg-[#fff1ec] dark:bg-[#fe7141]/10 border border-[#fed7c7] dark:border-[#fe7141]/30 text-[#fe7141] text-[11px] font-mono font-bold mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#fe7141] animate-ping" />
              <span>AWAITING REMOTE CONNECTION</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-mono mb-4">
              Scan with your iPhone or Android camera to join this Wi-Fi room:
            </p>

            {/* Direct In-Dashboard Canvas QR Code */}
            <div className="max-w-xs mx-auto">
              <QrCodeDisplay
                url={targetUrl}
                allIps={serverInfo?.allIps || []}
                onSelectIp={onSelectIp}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
            {otherPeers.map((peer) => {
              const isSelected = selectedPeerId === peer.id;
              return (
                <div
                  key={peer.id}
                  onClick={() => handleSelect(isSelected ? null : peer.id)}
                  className={`group relative p-4 rounded-sm cursor-pointer transition-all border ${
                    isSelected
                      ? 'border-[#fe7141] bg-[#fff1ec]/30 dark:bg-[#fe7141]/10 shadow-sm'
                      : 'border-black/10 dark:border-white/10 hover:border-[#fe7141]/50 bg-black/[0.01] dark:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-sm flex items-center justify-center transition-all shrink-0 border ${
                        isSelected
                          ? 'bg-[#fe7141] text-white border-transparent'
                          : 'border-black/10 dark:border-white/10 bg-slate-100 dark:bg-slate-900'
                      }`}
                    >
                      {getDeviceIcon(peer.deviceType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs sm:text-sm font-bold text-black dark:text-white truncate">
                          {peer.name}
                        </h4>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                        {peer.os} • {peer.browser}
                      </p>
                      <p className="text-[10px] font-mono text-[#597e87] mt-0.5">
                        {peer.ip}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-500">
                      {isSelected ? (
                        <span className="text-[#fe7141] font-bold">✓ TARGET LOCKED</span>
                      ) : (
                        'SELECT DEVICE'
                      )}
                    </span>
                    <span className="text-black dark:text-white font-bold group-hover:text-[#fe7141] transition-colors flex items-center gap-1">
                      <span>SEND</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
