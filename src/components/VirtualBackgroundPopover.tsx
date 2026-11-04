
import React from 'react';
import {
  BackgroundEffect,
  BACKGROUND_OPTIONS,
} from '../services/virtualBackground';
import { Check, Sparkles, X, Eye } from 'lucide-react';

interface VirtualBackgroundPopoverProps {
  currentEffect: BackgroundEffect;
  onSelectEffect: (effect: BackgroundEffect) => void;
  onClose: () => void;
}

export const VirtualBackgroundPopover: React.FC<
  VirtualBackgroundPopoverProps
> = ({ currentEffect, onSelectEffect, onClose }) => {

  const handleSelect = (effect: BackgroundEffect) => {
    onSelectEffect(effect);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="background-title"
        className="relative w-full max-w-md max-h-[90dvh] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>

            <div>
              <h4
                id="background-title"
                className="text-sm font-bold text-white"
              >
                Virtual Background &amp; Blur
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Choose your preferred background
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close background selector"
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Background Options */}
        <div className="p-4 overflow-y-auto overscroll-contain min-h-0">
          <div className="grid grid-cols-2 gap-3">
            {BACKGROUND_OPTIONS.map((opt) => {
              const isSelected = currentEffect === opt.id;

              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  aria-pressed={isSelected}
                  className={`flex flex-col text-left p-3 rounded-xl border transition relative overflow-hidden ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500/40 text-white'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-indigo-500/60 hover:bg-slate-800/60'
                  }`}
                >
                  {/* Preview */}
                  <div
                    style={{ backgroundColor: opt.previewColor }}
                    className="w-full h-16 rounded-lg mb-3 flex items-center justify-center shadow-inner relative border border-white/10"
                  >
                    {opt.iconType === 'blur' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-black/40 px-2 py-1 rounded-md">
                        Bokeh
                      </span>
                    )}

                    {opt.iconType === 'none' && (
                      <span className="text-xs font-bold text-white">
                        Off
                      </span>
                    )}

                    {opt.iconType === 'image' && (
                      <span className="text-2xl">
                        {opt.id === 'office' ? '🏢' : '🌆'}
                      </span>
                    )}

                    {opt.iconType === 'gradient' && (
                      <span className="text-2xl">
                        {opt.id === 'sunset' ? '🌅' : '🔮'}
                      </span>
                    )}

                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  <span className="text-sm font-semibold leading-tight">
                    {opt.name}
                  </span>

                  <span className="text-[11px] text-slate-400 mt-1 leading-snug">
                    {opt.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <span className="flex items-center gap-2 text-[11px] text-slate-400">
            <Eye className="w-4 h-4 text-indigo-400 shrink-0" />
            Live WebRTC preview
          </span>

          {currentEffect !== 'none' && (
            <button
              type="button"
              onClick={() => handleSelect('none')}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
