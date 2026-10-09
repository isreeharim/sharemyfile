import React, { useState } from 'react';
import {
  Folder,
  Download,
  Trash2,
  Eye,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  Search,
  HardDrive,
  X
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { formatBytes, formatTimeAgo, getFileTypeCategory } from '../utils/formatters';

export default function FileManager({
  files,
  storage,
  onDeleteFile,
  onRefreshFiles
}) {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewFile, setPreviewFile] = useState(null);

  const getFileIcon = (mimeType, name) => {
    const cat = getFileTypeCategory(mimeType, name);
    switch (cat) {
      case 'image':
        return <ImageIcon className="w-4 h-4 text-[#fe7141]" />;
      case 'video':
        return <Film className="w-4 h-4 text-[#597e87]" />;
      case 'audio':
        return <Music className="w-4 h-4 text-emerald-600" />;
      case 'archive':
        return <Archive className="w-4 h-4 text-purple-600" />;
      case 'pdf':
      case 'document':
        return <FileText className="w-4 h-4 text-blue-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  const filteredFiles = files.filter(f => {
    const matchesSearch = f.originalName.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'all') return true;
    const cat = getFileTypeCategory(f.mimeType, f.originalName);
    return cat === filter;
  });

  return (
    <div className="cc-card p-5 sm:p-6 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-black/10 dark:border-white/10 gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#fe7141]" />
            <h3 className="font-mono font-bold text-sm sm:text-base tracking-tight text-black dark:text-white uppercase">
              LOCAL STORAGE DESK // HOST VAULT
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
            {files.length} STORED FILES • {formatBytes(storage?.totalBytes || 0)} PERSISTED ON COMPUTER
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-auto">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search filenames..."
            className="bg-black/[0.02] dark:bg-white/[0.02] border border-black/15 dark:border-white/15 text-xs font-mono text-black dark:text-white placeholder-slate-400 pl-8 pr-3 py-1.5 rounded-sm focus:outline-none focus:border-[#fe7141] w-full sm:w-56"
          />
        </div>
      </div>

      <div className="space-y-4">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 touch-scroll font-mono">
          {['all', 'image', 'video', 'audio', 'document', 'archive'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-2.5 py-1 rounded-sm capitalize text-[11px] font-bold transition-colors shrink-0 uppercase cursor-pointer ${
                filter === tab
                  ? 'bg-[#fe7141] text-white shadow-sm'
                  : 'border border-black/10 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.02] text-slate-600 dark:text-slate-300 hover:border-black/30'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Files Grid */}
        {filteredFiles.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-black/10 dark:border-white/10 rounded-sm">
            <Folder className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-xs sm:text-sm font-mono font-bold text-black dark:text-white uppercase">Vault Empty</p>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              Transferred files from connected phones or laptops are saved safely here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[460px] overflow-y-auto pr-1 touch-scroll">
            {filteredFiles.map((file) => {
              const isImage = file.mimeType.startsWith('image/');
              const isVideo = file.mimeType.startsWith('video/');
              const isAudio = file.mimeType.startsWith('audio/');
              const canPreview = isImage || isVideo || isAudio || file.mimeType.includes('pdf');

              return (
                <div
                  key={file.id}
                  className="p-3 rounded-sm border border-black/10 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.02] hover:border-[#fe7141]/50 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 truncate mr-2 min-w-0">
                    <div className="w-9 h-9 rounded-sm bg-slate-100 dark:bg-slate-900 border border-black/5 dark:border-white/5 flex items-center justify-center shrink-0">
                      {getFileIcon(file.mimeType, file.originalName)}
                    </div>
                    <div className="truncate min-w-0 font-mono">
                      <p className="font-bold text-xs text-black dark:text-white truncate" title={file.originalName}>
                        {file.originalName}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                        <span className="text-[#fe7141] font-semibold">{formatBytes(file.size)}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(file.createdAt)}</span>
                        <span>•</span>
                        <span className="truncate">{file.uploader?.name || 'Device'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Preview button */}
                    {canPreview && (
                      <button
                        onClick={() => setPreviewFile(file)}
                        className="p-1.5 rounded-sm border border-black/10 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white hover:border-black/30 transition-colors"
                        title="Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Download button */}
                    <a
                      href={file.downloadUrl || `/api/download/${file.id}`}
                      download={file.originalName}
                      className="p-1.5 rounded-sm bg-black dark:bg-white text-white dark:text-black hover:bg-[#fe7141] dark:hover:bg-[#fe7141] dark:hover:text-white transition-colors"
                      title="Download to device"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>

                    {/* Delete button */}
                    <button
                      onClick={() => onDeleteFile(file.id)}
                      className="p-1.5 rounded-sm text-slate-400 hover:text-rose-500 transition-colors"
                      title="Delete file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        {previewFile && (
          <DialogContent onClose={() => setPreviewFile(null)} className="max-w-3xl max-h-[92vh] flex flex-col bg-white dark:bg-[#121212] border-black/10 dark:border-white/15 rounded-sm">
            <DialogHeader>
              <DialogTitle className="truncate pr-8 font-mono text-black dark:text-white text-sm">
                {previewFile.originalName}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-black rounded-sm p-2 border border-black/10 dark:border-white/10">
              {previewFile.mimeType.startsWith('image/') && (
                <img
                  src={previewFile.downloadUrl || `/api/preview/${previewFile.id}`}
                  alt={previewFile.originalName}
                  className="max-h-[55vh] max-w-full object-contain rounded-sm"
                />
              )}

              {previewFile.mimeType.startsWith('video/') && (
                <video
                  controls
                  playsInline
                  autoPlay
                  src={previewFile.downloadUrl || `/api/preview/${previewFile.id}`}
                  className="max-h-[55vh] max-w-full rounded-sm"
                />
              )}

              {previewFile.mimeType.startsWith('audio/') && (
                <div className="py-8 w-full max-w-md text-center px-4">
                  <Music className="w-10 h-10 text-[#fe7141] mx-auto mb-3" />
                  <audio
                    controls
                    autoPlay
                    src={previewFile.downloadUrl || `/api/preview/${previewFile.id}`}
                    className="w-full"
                  />
                </div>
              )}

              {previewFile.mimeType.includes('pdf') && (
                <iframe
                  src={previewFile.downloadUrl || `/api/preview/${previewFile.id}`}
                  title="PDF Preview"
                  className="w-full h-[55vh] rounded-sm"
                />
              )}
            </div>

            <DialogFooter className="flex items-center justify-between mt-3 font-mono">
              <span className="text-xs text-slate-500">
                {formatBytes(previewFile.size)}
              </span>
              <a
                href={previewFile.downloadUrl || `/api/download/${previewFile.id}`}
                download={previewFile.originalName}
                className="btn-vermilion px-3.5 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 uppercase"
              >
                <Download className="w-3.5 h-3.5" />
                <span>DOWNLOAD FILE</span>
              </a>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
