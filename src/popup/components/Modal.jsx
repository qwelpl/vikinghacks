import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className={`w-full bg-[#13131a] rounded-t-2xl border border-[#1f1f2e] animate-slide-up overflow-hidden ${wide ? 'max-h-[520px]' : 'max-h-[480px]'}`}
        style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.5)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-8 h-1 rounded-full bg-[#2d2d3e]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1f1f2e]">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8b8a9b] hover:text-white hover:bg-[#1f1f2e] rounded-lg transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto" style={{ maxHeight: wide ? '440px' : '390px', minHeight: '200px' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
