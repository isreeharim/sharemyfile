import React from 'react';
import { ShieldCheck, File, Check, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { formatBytes } from '../utils/formatters';

export default function TransferApprovalModal({
  request,
  onAccept,
  onDecline
}) {
  if (!request) return null;

  const totalSize = request.files?.reduce((acc, f) => acc + (f.size || 0), 0) || 0;

  const handleAccept = () => {
    if (navigator.vibrate) navigator.vibrate([20, 20]);
    onAccept(request);
  };

  const handleDecline = () => {
    if (navigator.vibrate) navigator.vibrate(20);
    onDecline(request);
  };

  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && onDecline(request)}>
      <DialogContent onClose={() => onDecline(request)} className="max-w-sm sm:max-w-md bg-white dark:bg-[#121212] border-black/10 dark:border-white/15 rounded-sm p-5 font-mono">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-sm bg-[#fff1ec] dark:bg-[#fe7141]/10 text-[#fe7141] border border-[#fed7c7] dark:border-[#fe7141]/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle className="text-sm font-bold uppercase text-black dark:text-white">
              INCOMING TRANSMISSION
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-mono">
              <strong className="text-[#fe7141]">{request.fromName}</strong> is attempting to send files
            </DialogDescription>
          </div>
        </div>

        {/* Files Info Box */}
        <div className="border border-black/10 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.02] rounded-sm p-3 mb-3 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span>{request.files?.length || 1} file(s)</span>
            <span className="font-bold text-[#fe7141]">{formatBytes(totalSize)}</span>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 touch-scroll">
            {request.files?.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <File className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate flex-1">{f.name}</span>
                <span className="text-[10px] text-slate-400">{formatBytes(f.size)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <DialogFooter className="grid grid-cols-2 gap-2 pt-2">
          <button
            onClick={handleDecline}
            className="py-2 px-3 rounded-sm border border-black/10 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase cursor-pointer"
          >
            DECLINE
          </button>

          <button
            onClick={handleAccept}
            className="btn-vermilion py-2 px-3 text-xs font-bold uppercase cursor-pointer"
          >
            ACCEPT & STREAM
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
