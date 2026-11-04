import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Download, ExternalLink, Code2, FileCode } from 'lucide-react';

interface ExportHtmlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportHtmlModal: React.FC<ExportHtmlModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [code, setCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/syncroom-standalone.html')
        .then((res) => res.text())
        .then((text) => {
          setCode(text);
          setLoading(false);
        })
        .catch(() => {
          setCode('<!-- Could not load file directly from public, please check public/syncroom-standalone.html -->');
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'syncroom-standalone.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full h-[88vh] flex flex-col shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Single-File HTML Web Application Code</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  Ready to Copy &amp; Run
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Standalone HTML + Tailwind CDN + Firebase SDK + WebRTC Video &amp; Chat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/syncroom-standalone.html"
              target="_blank"
              rel="noreferrer"
              className="text-xs px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center gap-1.5 transition hidden sm:flex"
            >
              <span>Test Standalone File</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={handleDownload}
              className="text-xs px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 flex items-center gap-1.5 transition font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .html</span>
            </button>

            <button
              onClick={handleCopy}
              className="text-xs px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center gap-1.5 font-bold transition shadow-lg shadow-indigo-600/20"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied All!' : 'Copy Code'}</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Code Content View */}
        <div className="flex-1 p-4 bg-slate-950 overflow-hidden flex flex-col">
          <div className="text-[11px] text-slate-500 mb-2 flex items-center justify-between">
            <span>File: <code>public/syncroom-standalone.html</code> (~650 lines)</span>
            <span>Includes Tailwind CDN &bull; WebRTC STUN &bull; Firebase SDK</span>
          </div>

          <pre className="flex-1 overflow-auto bg-slate-900/90 rounded-2xl p-4 text-[12px] font-mono text-indigo-200 border border-slate-800/80 leading-relaxed selection:bg-indigo-600 selection:text-white">
            {loading ? 'Loading single-file HTML code...' : code}
          </pre>
        </div>
      </div>
    </div>
  );
};
