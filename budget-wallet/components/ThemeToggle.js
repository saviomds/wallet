'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

const accents = [
  { name: 'Gold', color: '#D4AF37', hover: '#b5952f' },
  { name: 'Platinum', color: '#E5E4E2', hover: '#c5c4c2' },
  { name: 'Emerald', color: '#10b981', hover: '#059669' },
  { name: 'Sapphire', color: '#3b82f6', hover: '#2563eb' },
  { name: 'Amethyst', color: '#8b5cf6', hover: '#7c3aed' }
];

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const [activeAccent, setActiveAccent] = useState(accents[0].color);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      const savedAccent = localStorage.getItem('accentColor');
      const savedHover = localStorage.getItem('accentHover');
      if (savedAccent && savedHover) {
        setActiveAccent(savedAccent);
        document.documentElement.style.setProperty('--accent-color', savedAccent);
        document.documentElement.style.setProperty('--accent-hover', savedHover);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const changeAccent = (accent) => {
    setActiveAccent(accent.color);
    localStorage.setItem('accentColor', accent.color);
    localStorage.setItem('accentHover', accent.hover);
    document.documentElement.style.setProperty('--accent-color', accent.color);
    document.documentElement.style.setProperty('--accent-hover', accent.hover);
  };

  if (!mounted) {
    return <div className="w-[160px] h-8"></div>; // Placeholder to avoid layout shift
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
      <div className="flex bg-card rounded-full p-1 border border-card-border shadow-sm">
        {['light', 'dark', 'system'].map((t) => (
          <button key={t} onClick={() => setTheme(t)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-500 capitalize ${theme === t ? 'bg-accent text-white dark:text-black shadow-md scale-105' : 'text-gray-500 hover:text-foreground'}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="flex space-x-2 bg-card px-4 py-2 rounded-full border border-card-border shadow-sm">
        {accents.map((a) => (
          <button
            key={a.name}
            onClick={() => changeAccent(a)}
            className={`w-4 h-4 rounded-full transition-all duration-300 ${activeAccent === a.color ? 'scale-125 ring-2 ring-offset-2 ring-offset-background' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
            style={{ backgroundColor: a.color, '--tw-ring-color': a.color }}
            title={a.name}
          />
        ))}
      </div>
    </div>
  );
}