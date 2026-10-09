import React, { useState } from 'react';
import { MessageSquare, Send, Copy, Check, ExternalLink, Share2, Terminal } from 'lucide-react';
import { formatTimeAgo } from '../utils/formatters';

export default function TextShareCard({
  selectedPeer,
  onSendText,
  receivedTexts
}) {
  const [text, setText] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (navigator.vibrate) navigator.vibrate(20);
    onSendText({
      text: text.trim(),
      title: 'Quick Note',
      targetId: selectedPeer?.id || 'all'
    });
    setText('');
  };

  const copyToClipboard = (content, id) => {
    navigator.clipboard.writeText(content);
    if (navigator.vibrate) navigator.vibrate(15);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleNativeShare = async (content) => {
    if (navigator.share) {
      try {
        await navigator.share({
          text: content
        });
      } catch (err) {
        // user cancelled
      }
    }
  };

  const isLink = (str) => {
    return /^https?:\/\//i.test(str.trim());
  };

  return (
    <div className="cc-card p-5 sm:p-6 relative flex flex-col h-full">
      {/* Header */}
      <div className="pb-3 border-b border-black/10 dark:border-white/10 mb-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#fe7141]" />
          <h3 className="font-mono font-bold text-sm sm:text-base tracking-tight text-black dark:text-white uppercase">
            TEXT & LINK PIPELINE // INSTANT CLIPBOARD
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
          Bidirectional note and URL synchronization between mobile & workstation
        </p>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4">
        {/* Input Form */}
        <form onSubmit={handleSend} className="space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste links, authentication codes, addresses, notes here..."
            rows={3}
            className="w-full bg-black/[0.02] dark:bg-white/[0.02] border border-black/15 dark:border-white/15 rounded-sm p-3 text-xs sm:text-sm text-black dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#fe7141] font-mono resize-none transition-colors"
          />

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 font-mono truncate mr-2">
              TARGET:&nbsp;
              <strong className="text-black dark:text-white">
                {selectedPeer ? selectedPeer.name.toUpperCase() : 'ALL DEVICES'}
              </strong>
            </span>
            <button
              type="submit"
              disabled={!text.trim()}
              className={`px-3.5 py-1.5 rounded-sm text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                text.trim()
                  ? 'btn-vermilion'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>DISPATCH NOTE</span>
              <Send className="w-3 h-3" />
            </button>
          </div>
        </form>

        {/* Received Transmissions Feed */}
        <div className="flex-1 flex flex-col min-h-0 pt-3 border-t border-black/10 dark:border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
              RECEIVED NOTES ({receivedTexts.length})
            </span>
          </div>

          {receivedTexts.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 text-center text-slate-400 text-xs font-mono border border-dashed border-black/10 dark:border-white/10 rounded-sm">
              No notes received yet. Dispatch a message from any phone or PC to test!
            </div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto max-h-72 pr-1 flex-1 touch-scroll">
              {receivedTexts.map((note, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-sm border border-black/10 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.02] text-xs font-mono relative group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-[#fe7141] font-bold">
                      <span>{note.fromName}</span>
                      <span className="text-slate-400 font-normal">• {formatTimeAgo(note.timestamp)}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {typeof navigator !== 'undefined' && navigator.share && (
                        <button
                          onClick={() => handleNativeShare(note.text)}
                          className="p-1 rounded-sm text-slate-500 hover:text-black dark:hover:text-white"
                          title="Share"
                        >
                          <Share2 className="w-3 h-3" />
                        </button>
                      )}
                      {isLink(note.text) && (
                        <a
                          href={note.text}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded-sm text-slate-500 hover:text-black dark:hover:text-white"
                          title="Open Link"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <button
                        onClick={() => copyToClipboard(note.text, idx)}
                        className="p-1 rounded-sm text-slate-600 dark:text-slate-300 hover:text-[#fe7141] cursor-pointer"
                        title="Copy to clipboard"
                      >
                        {copiedId === idx ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-black dark:text-white whitespace-pre-wrap break-all select-all text-xs bg-slate-100 dark:bg-slate-900 p-2.5 rounded-sm border border-black/5 dark:border-white/5">
                    {note.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
