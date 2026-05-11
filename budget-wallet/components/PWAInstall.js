'use client';

import { useEffect, useState } from 'react';

export default function PWAInstall() {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setPrompt(null);
  };

  if (installed || !prompt) return null;

  return (
    <button
      onClick={install}
      className="btn btn-ghost"
      style={{ padding: '8px 14px', fontSize: 11, gap: 6, flexShrink: 0 }}
      title="Install B1Overs Wallet as an app"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
        <path d="M12 16V4M8 12l4 4 4-4"/>
        <path d="M4 20h16"/>
      </svg>
      Install App
    </button>
  );
}
