import { useState, useCallback, useMemo } from 'react';
import { PauseSession } from '../types';

export const usePause = () => {
  const [history, setHistory] = useState<PauseSession[]>(() => {
    try {
      const stored = localStorage.getItem('pause_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const lastPause = useMemo(() => {
    return history.length > 0 ? history[history.length - 1].timestamp : null;
  }, [history]);

  const pause = useCallback((duration: number = 0) => {
    const newSession: PauseSession = {
      timestamp: Date.now(),
      duration: duration
    };
    
    setHistory(prev => {
      const next = [...prev, newSession];
      // Keep only last 100 entries for performance
      const trimmed = next.slice(-100);
      localStorage.setItem('pause_history', JSON.stringify(trimmed));
      localStorage.setItem('pause_timestamp', newSession.timestamp.toString());
      return trimmed;
    });
  }, []);

  const stats = useMemo(() => {
    const totalCount = history.length;
    const totalDuration = history.reduce((acc, session) => acc + session.duration, 0);
    const today = new Date().toDateString();
    const todayCount = history.filter(s => new Date(s.timestamp).toDateString() === today).length;

    return { totalCount, totalDuration, todayCount };
  }, [history]);

  return { lastPause, pause, history, stats };
};