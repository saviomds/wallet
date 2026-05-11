'use client';

import { useEffect, useState } from 'react';
import { toast } from '../lib/toast';

const TYPE_STYLES = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500',
  error: 'border-rose-500/30 bg-rose-500/10 text-rose-500',
  info: 'border-accent/30 bg-accent/10 text-accent',
};

const ICONS = {
  success: 'M5 13l4 4L19 7',
  error: 'M6 18L18 6M6 6l12 12',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsub = toast.subscribe((t) => {
      setToasts((prev) => [...prev, t]);
      if (t.duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((x) => x.id !== t.id));
        }, t.duration);
      }
    });
    return unsub;
  }, []);

  const dismiss = (id) => setToasts((prev) => prev.filter((x) => x.id !== id));

  return (
    <div className="fixed bottom-24 sm:bottom-6 right-4 left-4 sm:left-auto z-[60] flex flex-col gap-2 items-stretch sm:items-end pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto glass-card border ${TYPE_STYLES[t.type]} flex items-center gap-3 px-4 py-3 max-w-sm w-full sm:w-auto sm:min-w-[280px] animate-in fade-in slide-in-from-bottom-2 duration-200`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={ICONS[t.type]} />
          </svg>
          <p className="flex-1 text-[11px] font-bold uppercase tracking-wider text-foreground leading-tight">{t.message}</p>
          {t.action && (
            <button
              onClick={() => {
                t.action.onClick?.();
                dismiss(t.id);
              }}
              className="text-[10px] font-black uppercase tracking-widest text-accent hover:underline shrink-0"
            >
              {t.action.label}
            </button>
          )}
          <button
            onClick={() => dismiss(t.id)}
            className="text-gray-500 hover:text-foreground shrink-0"
            aria-label="Dismiss"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
