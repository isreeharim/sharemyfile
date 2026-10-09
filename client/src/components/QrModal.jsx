import React, { useState } from 'react';
import { Smartphone, Share2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import QrCodeDisplay from './QrCodeDisplay';

export default function QrModal({ isOpen, onClose, serverInfo, selectedIp, onSelectIp, targetUrl: propTargetUrl }) {
  const primaryIp = selectedIp || serverInfo?.primaryIp;
  const port = serverInfo?.port || 5000;
  
  let targetUrl = propTargetUrl || '';
  if (!targetUrl) {
    if (primaryIp && primaryIp !== '127.0.0.1' && primaryIp !== 'localhost') {
      targetUrl = `http://${primaryIp}:${port}`;
    } else if (serverInfo?.url && !serverInfo.url.includes('localhost') && !serverInfo.url.includes('127.0.0.1')) {
      targetUrl = serverInfo.url;
    } else if (typeof window !== 'undefined') {
      const hostIp = window.location.hostname;
      if (hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
        targetUrl = `${window.location.protocol}//${window.location.host}`;
      } else if (primaryIp) {
        targetUrl = `http://${primaryIp}:${port}`;
      } else {
        targetUrl = `http://${window.location.hostname}:${port}`;
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent onClose={onClose} className="max-w-sm sm:max-w-md text-center max-h-[95vh] overflow-y-auto bg-white dark:bg-[#121212] border-black/10 dark:border-white/15 rounded-sm p-5 sm:p-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-[#fff1ec] dark:bg-[#fe7141]/10 text-[#fe7141] mx-auto mb-2 border border-[#fed7c7] dark:border-[#fe7141]/30">
          <Smartphone className="w-5 h-5" />
        </div>

        <DialogHeader className="text-center sm:text-center mb-3">
          <DialogTitle className="text-center text-sm sm:text-base font-mono font-bold uppercase text-black dark:text-white">
            CONNECT PHONE // WI-FI PAIRING
          </DialogTitle>
          <DialogDescription className="text-center text-xs font-mono text-slate-500">
            Open camera on iPhone or Android to pair instantly. Zero install required.
          </DialogDescription>
        </DialogHeader>

        {/* Client-Rendered Canvas QR Code */}
        <QrCodeDisplay
          url={targetUrl}
          allIps={serverInfo?.allIps || []}
          onSelectIp={onSelectIp}
        />

        {/* Steps */}
        <div className="mt-4 text-left border border-black/10 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.02] rounded-sm p-3 space-y-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-400">
          <div className="flex items-start gap-2">
            <span className="font-bold text-[#fe7141]">01.</span>
            <span>Ensure mobile is on the <strong>same Wi-Fi network</strong>.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-[#fe7141]">02.</span>
            <span>Open device <strong>Camera app</strong> and aim at QR code.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-[#fe7141]">03.</span>
            <span>Tap browser notification to begin direct transfers!</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
