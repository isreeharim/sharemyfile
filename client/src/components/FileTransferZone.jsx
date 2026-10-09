import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  File, 
  X, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Image as ImageIcon, 
  FolderPlus,
  Camera
} from 'lucide-react';
import { formatBytes, formatSpeed } from '../utils/formatters';

export default function FileTransferZone({
  selectedPeer,
  peers,
  onSendFiles,
  uploadState,
  requireApproval,
  onToggleRequireApproval
}) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const mediaInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
      if (navigator.vibrate) navigator.vibrate(20);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = Array.from(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...dropped]);
      if (navigator.vibrate) navigator.vibrate(20);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    if (navigator.vibrate) navigator.vibrate(15);
  };

  const clearAll = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (mediaInputRef.current) mediaInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  const handleStartTransfer = () => {
    if (selectedFiles.length === 0) return;
    if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
    onSendFiles(selectedFiles, selectedPeer?.id || 'all');
    setSelectedFiles([]);
  };

  const isUploading = uploadState?.status === 'uploading';

  return (
    <div className="cc-card p-5 sm:p-6 relative">
      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={mediaInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-black/10 dark:border-white/10 gap-2 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-[#fe7141]" />
            <h3 className="font-mono font-bold text-sm sm:text-base tracking-tight text-black dark:text-white uppercase">
              TRANSMISSION DESK // DISPATCH PAYLOAD
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
            TARGET NODE:&nbsp;
            <span className="font-bold text-[#fe7141]">
              {selectedPeer ? selectedPeer.name.toUpperCase() : 'ALL DEVICES (BROADCAST)'}
            </span>
          </p>
        </div>

        {/* Security toggle */}
        <button
          onClick={onToggleRequireApproval}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-mono font-bold border transition-colors self-start sm:self-auto ${
            requireApproval
              ? 'bg-[#fff1ec] dark:bg-[#fe7141]/10 text-[#fe7141] border-[#fed7c7] dark:border-[#fe7141]/40'
              : 'border-black/10 dark:border-white/15 text-slate-500 hover:text-black dark:hover:text-white'
          }`}
          title="Require receiver device to click Accept before starting transfer"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{requireApproval ? 'APPROVAL ENFORCED' : 'ZERO-CONFIRMATION SEND'}</span>
        </button>
      </div>

      <div className="space-y-4">
        {/* Real-time Upload Progress Bar if active */}
        {isUploading && (
          <div className="p-4 rounded-sm border border-[#fed7c7] dark:border-[#fe7141]/30 bg-[#fff1ec]/50 dark:bg-[#fe7141]/5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#fe7141] animate-bounce" />
                <span className="text-xs font-mono font-bold text-black dark:text-white uppercase">
                  TRANSMITTING DATA STREAM...
                </span>
              </div>
              <span className="font-mono text-[#fe7141] font-bold text-sm">
                {uploadState.progress}%
              </span>
            </div>

            <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-sm overflow-hidden">
              <div
                className="h-full bg-[#fe7141] transition-all duration-150 rounded-sm"
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500 font-mono">
              <span className="font-bold text-[#fe7141]">VELOCITY: {formatSpeed(uploadState.speed)}</span>
              <span>{formatBytes(uploadState.transferred)} / {formatBytes(uploadState.total)}</span>
            </div>
          </div>
        )}

        {/* Mobile & Desktop 3-Grid Quick Action Pods */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => mediaInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-sm border border-[#fed7c7] dark:border-[#fe7141]/30 bg-[#fff1ec]/30 dark:bg-[#fe7141]/5 hover:bg-[#fff1ec] dark:hover:bg-[#fe7141]/10 transition-colors group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-sm bg-[#fff1ec] dark:bg-[#fe7141]/20 flex items-center justify-center mb-1 text-[#fe7141]">
              <ImageIcon className="w-4 h-4" />
            </div>
            <span className="text-xs font-mono font-bold text-black dark:text-white">PHOTOS & VIDEO</span>
            <span className="text-[10px] font-mono text-slate-500 hidden sm:block">Gallery Media</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-sm border border-[#597e87]/30 bg-[#d1ddd3]/10 hover:bg-[#d1ddd3]/20 transition-colors group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-sm bg-[#d1ddd3]/30 flex items-center justify-center mb-1 text-[#597e87]">
              <FolderPlus className="w-4 h-4" />
            </div>
            <span className="text-xs font-mono font-bold text-black dark:text-white">ALL FILES / DOCS</span>
            <span className="text-[10px] font-mono text-slate-500 hidden sm:block">Any format</span>
          </button>

          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-sm border border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 transition-colors group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-sm bg-slate-100 dark:bg-slate-900 flex items-center justify-center mb-1 text-black dark:text-white">
              <Camera className="w-4 h-4" />
            </div>
            <span className="text-xs font-mono font-bold text-black dark:text-white">TAKE PHOTO</span>
            <span className="text-[10px] font-mono text-slate-500 hidden sm:block">Direct capture</span>
          </button>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-sm p-6 sm:p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-[#fe7141] bg-[#fff1ec]/50 dark:bg-[#fe7141]/10'
              : 'border-black/15 dark:border-white/15 hover:border-[#fe7141]/60 bg-black/[0.01] dark:bg-white/[0.01]'
          }`}
        >
          <div className="w-10 h-10 rounded-sm bg-[#fff1ec] dark:bg-[#fe7141]/15 text-[#fe7141] flex items-center justify-center mx-auto mb-2 border border-[#fed7c7] dark:border-[#fe7141]/30">
            <UploadCloud className="w-5 h-5" />
          </div>

          <h3 className="text-xs sm:text-sm font-mono font-bold text-black dark:text-white mb-0.5 uppercase">
            DROP FILES HERE OR <span className="text-[#fe7141] underline underline-offset-4">BROWSE STORAGE</span>
          </h3>
          <p className="text-[11px] text-slate-500 font-mono">
            Unrestricted file size • High-speed LAN transfer directly between devices
          </p>
        </div>

        {/* Selected Files Staging List */}
        {selectedFiles.length > 0 && (
          <div className="mt-4 pt-3 border-t border-black/10 dark:border-white/10">
            <div className="flex items-center justify-between mb-2 text-xs font-mono">
              <span className="font-bold text-black dark:text-white">
                STAGED FOR TRANSMISSION ({selectedFiles.length}) • TOTAL: {formatBytes(totalSize)}
              </span>
              <button
                onClick={clearAll}
                className="text-rose-500 hover:text-rose-600 font-bold uppercase text-[11px] cursor-pointer"
              >
                Clear All
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 touch-scroll">
              {selectedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-sm border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-xs font-mono"
                >
                  <div className="flex items-center gap-2.5 truncate mr-2">
                    <div className="w-6 h-6 rounded-sm bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                      <File className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-black dark:text-white truncate">{file.name}</p>
                      <p className="text-slate-400 text-[10px]">{formatBytes(file.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(idx);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Transmit Button (Vermilion Accent) */}
            <div className="mt-4">
              <button
                onClick={handleStartTransfer}
                disabled={isUploading}
                className={`w-full py-3 px-6 rounded-sm font-mono font-bold text-xs sm:text-sm flex items-center justify-center gap-2 text-white uppercase tracking-wider cursor-pointer ${
                  isUploading
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'btn-vermilion'
                }`}
              >
                <span>
                  {isUploading
                    ? 'STREAMING PAYLOAD ACROSS NETWORK...'
                    : `TRANSMIT ${selectedFiles.length} FILE${selectedFiles.length > 1 ? 'S' : ''} (${formatBytes(totalSize)})`}
                </span>
                {!isUploading && <ArrowRight className="w-4 h-4 ml-1" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
