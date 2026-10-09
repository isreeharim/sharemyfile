import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, Download, AlertTriangle } from 'lucide-react';

export default function QrCodeDisplay({ url, allIps = [], onSelectIp }) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url || !canvasRef.current) return;

    setError(null);
    QRCode.toCanvas(
      canvasRef.current,
      url,
      {
        errorCorrectionLevel: 'H',
        margin: 4,
        width: 250,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      },
      (err) => {
        if (err) {
          console.error('Canvas QR code error:', err);
          setError('Failed to render QR code');
        }
      }
    );
  }, [url]);

  const handleCopy = () => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    if (navigator.vibrate) navigator.vibrate(15);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!canvasRef.current) return;
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'sharemyfile-qr.png';
      a.click();
    } catch (e) {
      console.error('Download QR failed:', e);
    }
  };

  const isLocalhost = url?.includes('localhost') || url?.includes('127.0.0.1');

  return (
    <div className="flex flex-col items-center">
      {/* Warning if localhost */}
      {isLocalhost && (
        <div className="mb-3 p-2 rounded-sm bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-mono flex items-center gap-2 text-left w-full">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Notice: On phones, use your Wi-Fi address (192.168.x.x), not localhost.</span>
        </div>
      )}

      {/* QR Canvas Container with Clean Architectural Frame */}
      <div className="relative p-3 bg-white rounded-sm shadow-sm border border-black/15 dark:border-white/20 transition-all">
        {error ? (
          <div className="w-56 h-56 flex flex-col items-center justify-center text-slate-800 text-xs font-mono">
            <AlertTriangle className="w-6 h-6 text-rose-500 mb-2" />
            <span>{error}</span>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="w-48 h-48 sm:w-56 sm:h-56 object-contain block mx-auto rounded-none"
            style={{ imageRendering: 'pixelated' }}
          />
        )}
      </div>

      {/* Network adapter selector chips if multiple */}
      {allIps.length > 1 && (
        <div className="mt-3 w-full text-left">
          <label className="text-[10px] font-mono uppercase font-bold text-slate-500 block mb-1">
            NETWORK ADAPTER:
          </label>
          <div className="flex flex-wrap gap-1.5 font-mono">
            {allIps.map((net, idx) => (
              <button
                key={idx}
                onClick={() => onSelectIp && onSelectIp(net.address)}
                className={`px-2 py-0.5 rounded-sm text-[11px] font-bold border transition-colors cursor-pointer ${
                  url?.includes(net.address)
                    ? 'bg-[#fe7141] text-white border-transparent'
                    : 'border-black/10 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.04] text-slate-600 dark:text-slate-300'
                }`}
              >
                {net.interfaceName}: {net.address}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* URL Box & Actions */}
      <div className="mt-3.5 w-full flex items-center justify-between border border-black/10 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.03] rounded-sm p-2 font-mono">
        <div className="truncate mr-2 text-left min-w-0">
          <p className="text-[9px] uppercase font-bold text-slate-400">WI-FI URL</p>
          <p className="text-xs sm:text-sm text-black dark:text-white truncate font-bold select-all">
            {url}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleDownloadQr}
            className="p-1 rounded-sm border border-black/10 dark:border-white/15 text-slate-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            title="Download QR Image"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopy}
            className="btn-vermilion px-2.5 py-1 text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                <span>COPIED</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>COPY</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
