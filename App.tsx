import React, { useState, useRef } from 'react';
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
    bg: "bg-gradient-to-br from-rose-300 via-orange-300 to-yellow-200",
    button: "bg-[#FFC4D6] shadow-[0_20px_40px_rgba(219,39,119,0.3),inset_0_-8px_10px_rgba(0,0,0,0.1),inset_0_4px_12px_rgba(255,255,255,0.6)]",
    nostril: "bg-[#D14D72]",
    toggle: "bg-sky-400/80 text-white",
    icon: "💧"
  },
  blue: {
    bg: "bg-gradient-to-br from-cyan-400 via-sky-400 to-blue-400",
    button: "bg-[#C4E1FF] shadow-[0_20px_40px_rgba(39,119,219,0.3),inset_0_-8px_10px_rgba(0,0,0,0.1),inset_0_4px_12px_rgba(255,255,255,0.6)]",
    nostril: "bg-[#2563EB]",
    toggle: "bg-rose-400/80 text-white",
    icon: "🌸"
  }
};

const FireworkBurst = ({ x, y }: { x: string; y: string }) => (
  <div className="absolute" style={{ left: x, top: y }}>
    {Array.from({ length: 12 }).map((_, i) => (
      <div
        key={i}
        className="absolute w-[2px] h-[20px] bg-white origin-bottom animate-firework"
        style={{ '--angle': `${i * 30}deg`, '--distance': '60px' } as any}
      />
    ))}
  </div>
);

export default function App() {
  const { lastPause, pause, stats, history } = usePause();
  const { theme, toggleTheme } = useTheme();
  const { soundEnabled, toggleSound, playOink } = useSound();
  
  const [state, setState] = useState({ ripple: false, boop: false, zen: false, longPress: false, elapsed: 0, statsOpen: false, msg: null as string | null, msgVisible: false });
  const timerRef = useRef<number | null>(null);
  const longPressRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const activeRef = useRef(false);

  const curTheme = themes[theme as keyof typeof themes] || themes.pink;

  const handleStart = (e: React.PointerEvent) => {
    if (state.statsOpen || state.msgVisible) return;
    activeRef.current = true;
    playOink();
    if (navigator.vibrate) navigator.vibrate(15);
    setState(s => ({ ...s, ripple: false, boop: true }));
    setTimeout(() => setState(s => ({ ...s, ripple: true })), 10);
    setTimeout(() => setState(s => ({ ...s, boop: false })), 800);
    startRef.current = Date.now();
    longPressRef.current = window.setTimeout(() => {
      if (activeRef.current) {
        setState(s => ({ ...s, longPress: true, zen: true }));
        timerRef.current = window.setInterval(() => setState(s => ({ ...s, elapsed: Date.now() - startRef.current })), 40);
      }
    }, 300);
  };

  const handleEnd = async () => {
    if (!activeRef.current) return;
    activeRef.current = false;
    if (longPressRef.current) clearTimeout(longPressRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    const dur = Date.now() - startRef.current;
    if (state.longPress) {
      pause(dur);
      setState(s => ({ ...s, longPress: false }));
      const msg = dur > 3000 ? (await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: 'Short zen quote (max 8 words).' })).text?.trim() || COMFORT_MESSAGES[0] : COMFORT_MESSAGES[0];
      setState(s => ({ ...s, msg, msgVisible: true }));
      setTimeout(() => setState(s => ({ ...s, msgVisible: false, zen: false })), 5000);
    } else {
      pause(0);
      setState(s => ({ ...s, zen: false }));
    }
  };

  return (
    <div className={`w-full h-full min-h-screen text-white flex flex-col items-center select-none touch-none overflow-hidden relative bg-black`}>
      <div className={`absolute inset-0 transition-opacity duration-1000 ${state.zen ? 'opacity-0' : 'opacity-100'} ${curTheme.bg}`} />
      {state.zen && <div className="absolute inset-0 bg-gradient-to-b from-blue-600 to-cyan-300 animate-fade-in" />}
      
      {state.msg && (
        <div className={`fixed inset-0 flex items-center justify-center z-[60] transition-all duration-1000 ${state.msgVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="bg-white/10 backdrop-blur-3xl p-12 rounded-[3rem] text-center border border-white/10 shadow-2xl mx-6">
            <FireworkBurst x="50%" y="50%" />
            <p className="text-2xl font-light leading-relaxed">{state.msg}</p>
          </div>
        </div>
      )}

      <div className={`relative z-10 w-full flex-1 flex flex-col px-6 transition-opacity ${state.msgVisible ? 'opacity-0' : 'opacity-100'}`}>
        <div className="w-full flex justify-between py-6 pointer-events-auto">
          <button onClick={toggleSound} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md">{soundEnabled ? '🔊' : '🔇'}</button>
          <button onClick={toggleTheme} className={`w-10 h-10 rounded-full transition-colors ${curTheme.toggle}`}>{curTheme.icon}</button>
        </div>

        <div className="flex flex-col items-center pt-12 transform-gpu">
          <span className="text-[10px] font-bold tracking-widest opacity-50 uppercase">{state.longPress ? "Breathe" : "Last Pause"}</span>
          <h1 className="text-6xl font-black tracking-tighter tabular-nums text-shadow-zen">
            {state.longPress ? (state.elapsed / 1000).toFixed(1) + 's' : (lastPause ? new Date(lastPause).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Ready")}
          </h1>
        </div>

        <div className="mt-auto flex flex-col items-center pb-20">
          <div className="relative pointer-events-auto">
            {state.ripple && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border-[8px] border-white/30 animate-pop-ring" />}
            <button onPointerDown={handleStart} onPointerUp={handleEnd} className={`w-36 h-28 rounded-[3rem] flex items-center justify-center transition-all ${curTheme.button} ${state.boop ? 'scale-110' : 'active:scale-95'}`}>
              <div className={`w-5 h-12 rounded-full mx-3 shadow-inner ${curTheme.nostril}`} />
              <div className={`w-5 h-12 rounded-full mx-3 shadow-inner ${curTheme.nostril}`} />
            </button>
          </div>
          <button onClick={() => setState(s => ({ ...s, statsOpen: true }))} className="mt-8 text-[10px] font-bold tracking-widest opacity-30 pointer-events-auto">HISTORY</button>
        </div>
      </div>

      {state.statsOpen && (
        <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end animate-fade-in" onClick={() => setState(s => ({ ...s, statsOpen: false }))}>
          <div className="w-full bg-gray-900/90 rounded-t-[3rem] p-8 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-white/20 mx-auto mb-6 rounded-full" />
            <h2 className="text-2xl font-black mb-6">Traces</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/5 p-4 rounded-2xl"><p className="text-[10px] opacity-40">TOTAL</p><p className="text-2xl font-bold">{stats.totalCount}</p></div>
              <div className="bg-white/5 p-4 rounded-2xl"><p className="text-[10px] opacity-40">TODAY</p><p className="text-2xl font-bold">{stats.todayCount}</p></div>
            </div>
            <div className="space-y-2 mb-8">
              {history.slice(-3).reverse().map((s, i) => (
                <div key={i} className="flex justify-between p-3 bg-white/5 rounded-xl text-sm opacity-60">
                  <span>{new Date(s.timestamp).toLocaleTimeString()}</span>
                  <span>{s.duration > 0 ? (s.duration / 1000).toFixed(1) + 's' : 'Tap'}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setState(s => ({ ...s, statsOpen: false }))} className="w-full py-4 bg-white text-black font-bold rounded-2xl">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
