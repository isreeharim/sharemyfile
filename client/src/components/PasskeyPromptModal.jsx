import React, { useState } from 'react';
import { Lock, ShieldAlert, Key, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

export default function PasskeyPromptModal({
  isOpen,
  roomName,
  onSubmitPasskey,
  errorMessage,
  onClose
}) {
  const [passkey, setPasskey] = useState('');
  const [showPasskey, setShowPasskey] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (passkey.trim()) {
      onSubmitPasskey(passkey.trim());
      setPasskey('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose && onClose()}>
      <DialogContent onClose={onClose} className="max-w-sm bg-white dark:bg-[#121212] border-black/10 dark:border-white/15 rounded-sm p-5 sm:p-6 text-black dark:text-white font-mono">
        
        <div className="flex items-center justify-center w-11 h-11 rounded-sm bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 mx-auto mb-2 border border-rose-200 dark:border-rose-900/50">
          <Lock className="w-5 h-5 animate-pulse" />
        </div>

        <DialogHeader className="text-center sm:text-center mb-3">
          <DialogTitle className="text-center text-sm sm:text-base font-bold uppercase tracking-tight text-black dark:text-white">
            ROOM ACCESS SECURED // ENTER PASSKEY
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-slate-500">
            Room <strong>#{roomName?.toUpperCase()}</strong> is protected by the host. Enter the security passkey or PIN to connect.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="p-2.5 rounded-sm bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
              SECURITY PASSKEY / PIN
            </label>
            <div className="relative">
              <input
                type={showPasskey ? 'text' : 'password'}
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                placeholder="Enter room passkey..."
                autoFocus
                required
                className="w-full bg-black/[0.02] dark:bg-white/[0.02] border border-black/15 dark:border-white/15 px-3 py-2 pr-9 rounded-sm text-xs font-mono text-black dark:text-white focus:outline-none focus:border-[#fe7141]"
              />
              <button
                type="button"
                onClick={() => setShowPasskey(!showPasskey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black dark:hover:text-white cursor-pointer"
              >
                {showPasskey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-vermilion w-full py-2.5 px-4 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <span>AUTHENTICATE & ENTER ROOM</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

      </DialogContent>
    </Dialog>
  );
}
