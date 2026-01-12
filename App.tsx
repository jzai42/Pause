import React, { useState, useEffect, useRef } from 'react';
import { usePause } from './hooks/usePause';
import { useTheme } from './hooks/useTheme';
import { useSound } from './hooks/useSound';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const COMFORT_MESSAGES = [
  "You’re in control.",
  "Taking a pause was your choice.",
  "This moment belongs to you.",
  "That was a good place to stop.",
  "You listened to yourself."
];

const themes = {
  pink: {
    id: 'pink',
    bg: "bg-gradient-to-br from-rose-300 via-orange-300 to-yellow-200",
    button: {
      wrapper: "bg-[#FFC4D6] shadow-[0_20px_40px_rgba(219,39,119,0.3),inset_0_-8px_10px_rgba(0,0,0,0.1),inset_0_4px_12px_rgba(255,255,255,0.6)]",
      nostril: "bg-[#D14D72]",
      highlight: "bg-white/40",
    },
    toggleBtn: "bg-sky-400/80 hover:bg-sky-400 text-white", 
    toggleIcon: "💧" 
  },
  blue: {
    id: 'blue',
    bg: "bg-gradient-to-br from-cyan-400 via-sky-400 to-blue-400",
    button: {
      wrapper: "bg-[#C4E1FF] shadow-[0_20px_40px_rgba(39,119,219,0.3),inset_0_-8px_10px_rgba(0,0,0,0.1),inset_0_4px_12px_rgba(255,255,255,0.6)]",
      nostril: "bg-[#2563EB]", 
      highlight: "bg-white/50",
    },
    toggleBtn: "bg-rose-400/80 hover:bg-rose-400 text-white", 
    toggleIcon: "🌸" 
  }
};

const SkyScene = () => (
  <div className="absolute inset-0 z-0 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-b from-blue-600 via-sky-500 to-cyan-300" />
    <div className="absolute top-[-5%] right-[-5%] w-64 h-64 bg-white/20 rounded-full blur-[80px]" />
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent w-[200%] animate-sway pointer-events-none" />
  </div>
);

const FireworkBurst = ({ x, y, delay = 0 }: { x: string, y: string, delay?: number }) => {
  const lineCount = 12;
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      {Array.from({ length: lineCount }).map((_, i) => (
        <div
          key={i}
          className="absolute w-[2px] h-[20px] bg-white origin-bottom animate-firework"
          style={{
            '--angle': `${(360 / lineCount) * i}deg`,
            '--distance': `${40 + Math.random() * 40}px`,
            animationDelay: `${delay}s`
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

export default function App() {
  const { lastPause, pause, stats, history } = usePause();
  const { theme, toggleTheme } = useTheme();
  const { soundEnabled, toggleSound, playOink } = useSound();
  
  const [isRippling, setIsRippling] = useState(false);
  const [isBooping, setIsBooping] = useState(false);
  const [isZen, setIsZen] = useState(false);
  const [isLongPressMode, setIsLongPressMode] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  const [comfortMsg, setComfortMsg] = useState<string | null>(null);
  const [msgVisible, setMsgVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const timerIntervalRef = useRef<number | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const isPointerDownRef = useRef(false);

  const currentTheme = themes[theme as keyof typeof themes] || themes.pink;

  const generateZenKoan = async (durationSec: number) => {
    setIsGenerating(true);
    try {
      const timeOfDay = new Date().getHours();
      let context = "day";
      if (timeOfDay < 6 || timeOfDay > 21) context = "night";
      else if (timeOfDay < 12) context = "morning";

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate a minimalist, modern zen koan (max 8 words) for someone who just paused their life for ${durationSec} seconds during the ${context}. Focus on clarity and simplicity.`,
      });
      return response.text?.trim() || COMFORT_MESSAGES[0];
    } catch (e) {
      return COMFORT_MESSAGES[Math.floor(Math.random() * COMFORT_MESSAGES.length)];
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isStatsOpen || msgVisible) return;
    e.preventDefault();
    isPointerDownRef.current = true;
    playOink();
    if (navigator.vibrate) navigator.vibrate([15]);

    setIsRippling(false);
    setIsBooping(true);
    setTimeout(() => setIsRippling(true), 10);
    setTimeout(() => setIsBooping(false), 800); 

    startTimeRef.current = Date.now();
    setElapsed(0);
    setShowResult(false);
    
    longPressTimeoutRef.current = window.setTimeout(() => {
      if (isPointerDownRef.current) {
        setIsLongPressMode(true);
        setIsZen(true);
        if (navigator.vibrate) navigator.vibrate([40]); 
        timerIntervalRef.current = window.setInterval(() => setElapsed(Date.now() - startTimeRef.current), 37);
      }
    }, 300);
  };

  const handlePointerUp = async (e: React.PointerEvent) => {
    if (!isPointerDownRef.current) return;
    e.preventDefault();
    isPointerDownRef.current = false;

    if (longPressTimeoutRef.current) { clearTimeout(longPressTimeoutRef.current); longPressTimeoutRef.current = null; }
    if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; }

    const finalDuration = Date.now() - startTimeRef.current;
    const durationSec = Math.floor(finalDuration / 1000);

    if (isLongPressMode) {
        pause(finalDuration); 
        setIsLongPressMode(false);
        setShowResult(true);

        const koan = durationSec >= 3 
          ? await generateZenKoan(durationSec)
          : COMFORT_MESSAGES[Math.floor(Math.random() * COMFORT_MESSAGES.length)];
        
        setComfortMsg(koan);
        setMsgVisible(true);

        setTimeout(() => { 
          setMsgVisible(false);
          setShowResult(false);
          setIsZen(false);
          setTimeout(() => setComfortMsg(null), 1000);
        }, 5000);
    } else {
        pause(0); 
        setIsZen(false); 
    }
  };

  const formatDuration = (ms: number) => {
    return (ms / 1000).toFixed(1) + 's';
  };

  return (
    <div className={`w-full h-full min-h-screen text-white flex flex-col items-center select-none touch-none overflow-hidden relative bg-black`}>
       <div style={{ height: 'max(20px, var(--safe-area-inset-top))' }} className="w-full shrink-0" />

       {/* Background */}
       <div className={`absolute inset-0 transition-opacity duration-[1500ms] ${isZen ? 'opacity-0' : 'opacity-100'} ${currentTheme.bg}`}>
         <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIi8+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMwMDAiIG9wYWNpdHk9IjAuMiIvPgo8L3N2Zz4=')] pointer-events-none" />
       </div>

       <div className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out ${isZen ? 'opacity-100' : 'opacity-0'}`}>
          <SkyScene />
       </div>

       {/* Zen Aura */}
       {isLongPressMode && (
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[80vw] aspect-square rounded-full bg-white/10 blur-[100px] animate-pulse scale-[1.5]" />
         </div>
       )}

       {/* Card Reward */}
       {comfortMsg && (
         <div className={`fixed inset-0 flex items-center justify-center z-[60] pointer-events-none transition-all duration-1000 ${msgVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
           <div className="relative w-full max-w-sm mx-6 p-12 bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/10 flex flex-col items-center justify-center text-center shadow-2xl">
              {msgVisible && <div className="absolute inset-0 overflow-hidden rounded-[3rem]"><FireworkBurst x="50%" y="50%" /></div>}
              <p className="text-2xl sm:text-3xl font-light tracking-tight text-white leading-relaxed z-10">{comfortMsg}</p>
              <div className="mt-8 w-8 h-[1px] bg-white/30 z-10" />
              <p className="mt-4 text-[10px] font-bold tracking-[0.4em] text-white/40 uppercase z-10">A Trace of Quiet</p>
           </div>
         </div>
       )}

       {/* Main UI */}
       <div className={`relative z-10 w-full h-full flex flex-col items-center flex-1 px-6 pointer-events-none transition-opacity duration-700 ${msgVisible ? 'opacity-0' : 'opacity-100'}`}>
          <div className="w-full flex justify-between px-2 my-4 pointer-events-auto">
              <button onClick={toggleSound} className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-xl bg-white/20 border border-white/20 shadow-lg active:scale-90">
                <span className="text-sm">{soundEnabled ? '🔊' : '🔇'}</span>
              </button>
              <button onClick={toggleTheme} className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-xl border border-white/20 shadow-lg active:scale-90 ${currentTheme.toggleBtn}`}>
                <span className="text-lg">{currentTheme.toggleIcon}</span>
              </button>
          </div>

          <div className="flex flex-col items-center justify-start pt-20 gap-3 transform-gpu">
            <span className="text-[10px] font-bold tracking-[0.4em] text-white/50 uppercase">
              {isLongPressMode ? "Breathe" : "Last Pause"}
            </span>
            <h1 className="text-5xl sm:text-7xl font-black tracking-tighter tabular-nums text-center text-white text-shadow-zen">
              {isLongPressMode ? formatDuration(elapsed) : (lastPause ? new Date(lastPause).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Ready")}
            </h1>
          </div>

          <div className="mt-auto w-full flex flex-col items-center pb-12">
            <div className="flex flex-col items-center gap-6 relative pointer-events-auto w-full max-w-xs">
              {isRippling && <div className="absolute top-[64px] left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border-[8px] border-white/40 animate-pop-ring pointer-events-none" />}
              
              <button onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerLeave={(e) => isPointerDownRef.current && handlePointerUp(e as any)} className={`group relative flex items-center justify-center w-36 h-28 sm:w-40 sm:h-32 rounded-[3.5rem] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer touch-none ${currentTheme.button.wrapper} ${isBooping ? 'animate-snoot-breath' : ''}`}>
                  <div className={`w-4 h-11 sm:w-5 sm:h-12 rounded-full mx-2.5 sm:mx-3 shadow-[inset_0_4px_8px_rgba(0,0,0,0.4)] transition-all duration-300 ${currentTheme.button.nostril} ${isBooping ? 'animate-nostril-l' : 'group-hover:scale-y-110'}`} />
                  <div className={`w-4 h-11 sm:w-5 sm:h-12 rounded-full mx-2.5 sm:mx-3 shadow-[inset_0_4px_8px_rgba(0,0,0,0.4)] transition-all duration-300 ${currentTheme.button.nostril} ${isBooping ? 'animate-nostril-r' : 'group-hover:scale-y-110'}`} />
                  <div className={`absolute top-4 left-8 w-6 h-3 rounded-full -rotate-12 blur-[1px] transition-colors duration-300 ${currentTheme.button.highlight}`} />
              </button>
              
              <p className={`text-[10px] font-black tracking-[0.3em] text-white/30 uppercase transition-opacity duration-1000 ${isZen ? 'opacity-0' : 'opacity-100'}`}>
                {isLongPressMode ? 'Letting Go...' : 'Hold to Pause'}
              </p>
            </div>
            
            <button onClick={() => setIsStatsOpen(true)} className="mt-12 w-12 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 pointer-events-auto transition-all active:scale-90">
               <div className="w-1 h-1 rounded-full bg-white/40 mx-0.5" /><div className="w-1 h-1 rounded-full bg-white/40 mx-0.5" /><div className="w-1 h-1 rounded-full bg-white/40 mx-0.5" />
            </button>
          </div>
          <div style={{ height: 'max(20px, var(--safe-area-inset-bottom))' }} className="w-full shrink-0" />
       </div>

       {/* Stats Drawer */}
       {isStatsOpen && (
         <div className="absolute inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in pointer-events-auto" onClick={() => setIsStatsOpen(false)}>
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-gray-900/60 backdrop-blur-3xl rounded-t-[3.5rem] border-t border-white/20 shadow-2xl p-8 animate-slide-up custom-scrollbar" style={{ paddingBottom: 'calc(2.5rem + var(--safe-area-inset-bottom))' }} onClick={e => e.stopPropagation()}>
               <div className="w-16 h-1 bg-white/20 rounded-full mx-auto mb-6" />
               <header className="flex justify-between items-end mb-8">
                  <h2 className="text-3xl font-black tracking-tight">Traces</h2>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Today</p>
                    <p className="text-xl font-black">{stats.todayCount} Times</p>
                  </div>
               </header>
               
               <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-white/5 rounded-[2rem] p-6 border border-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">Total</p>
                    <p className="text-3xl font-black">{stats.totalCount}</p>
                  </div>
                  <div className="bg-white/5 rounded-[2rem] p-6 border border-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">Zen Time</p>
                    <p className="text-3xl font-black">{(stats.totalDuration / 1000).toFixed(0)}s</p>
                  </div>
               </div>

               <div className="flex flex-col gap-2 mb-8">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2 px-2">History</p>
                  {history.length === 0 ? <p className="text-sm opacity-30 italic px-2">A blank canvas...</p> : 
                    [...history].reverse().slice(0, 5).map((session, i) => (
                      <div key={i} className="flex justify-between items-center px-4 py-3 bg-white/5 rounded-2xl">
                          <span className="font-bold text-sm opacity-60">{new Date(session.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          <span className="font-black text-xs opacity-90">{session.duration > 0 ? (session.duration/1000).toFixed(1) + 's' : 'Tap'}</span>
                      </div>
                    ))
                  }
               </div>
               <button onClick={() => setIsStatsOpen(false)} className="w-full py-5 bg-white text-black font-black rounded-3xl active:scale-[0.98]">Close</button>
            </div>
         </div>
       )}
    </div>
  );
}
