import { useState, useEffect, useCallback } from 'react';

export type ThemeId = 'pink' | 'blue';

export const useTheme = () => {
  const [theme, setTheme] = useState<ThemeId>('pink');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('app_theme') as ThemeId;
      if (stored && ['pink', 'blue'].includes(stored)) {
        setTheme(stored);
      }
    } catch (e) {
      // Fallback to default
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'pink' ? 'blue' : 'pink';
      localStorage.setItem('app_theme', next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
};
