'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return <div className="w-[160px] h-8"></div>; // Placeholder to avoid layout shift
  }

  return (
    <div className="flex bg-gray-200 dark:bg-gray-800 rounded-lg p-1 border border-gray-300 dark:border-gray-700">
      {['light', 'dark', 'system'].map((t) => (
        <button
          key={t}
          onClick={() => setTheme(t)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
            theme === t
              ? 'bg-white dark:bg-gray-600 text-black dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}