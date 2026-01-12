
import { useState, useCallback, useEffect, useRef } from 'react';

export const useSound = () => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [useCustomIfAvailable, setUseCustomIfAvailable] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const samplesRef = useRef<Record<string, AudioBuffer>>({});
  const [customSoundData, setCustomSoundData] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedSound = localStorage.getItem('app_sound');
      if (storedSound !== null) setSoundEnabled(storedSound === 'true');
      
      const savedCustomSound = localStorage.getItem('app_custom_oink_data');
      if (savedCustomSound) {
        setCustomSoundData(savedCustomSound);
        setUseCustomIfAvailable(true); // 如果有自定义声音，默认开启它
      }
    } catch (e) {}
  }, []);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    return audioCtxRef.current;
  }, []);

  const loadSample = useCallback(async (name: string, dataUrl: string) => {
    if (!dataUrl) return;
    const ctx = getCtx();
    try {
      const response = await fetch(dataUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      samplesRef.current[name] = audioBuffer;
    } catch (e) {
      console.error("Failed to load sample", name, e);
    }
  }, [getCtx]);

  const saveCustomSound = useCallback((base64Data: string) => {
    localStorage.setItem('app_custom_oink_data', base64Data);
    setCustomSoundData(base64Data);
    setUseCustomIfAvailable(true);
    loadSample('custom_oink', base64Data);
  }, [loadSample]);

  const clearCustomSound = useCallback(() => {
    localStorage.removeItem('app_custom_oink_data');
    setCustomSoundData(null);
    setUseCustomIfAvailable(false);
    delete samplesRef.current['custom_oink'];
  }, []);

  const createSnort = (ctx: AudioContext, startTime: number, pitch = 120, grit = 35) => {
    const duration = 0.15;
    const t = startTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(pitch, t); 
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.6, t + duration);
    const vca = ctx.createGain();
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.setValueAtTime(grit, t); 
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0.5, t);
    lfo.connect(lfoGain);
    lfoGain.connect(vca.gain);
    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(0, t);
    mainGain.gain.linearRampToValueAtTime(0.4, t + 0.02);
    mainGain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    const formant = ctx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.Q.value = 4;
    formant.frequency.setValueAtTime(600, t);
    osc.connect(vca);
    vca.connect(formant);
    formant.connect(mainGain);
    mainGain.connect(ctx.destination);
    osc.start(t); lfo.start(t);
    osc.stop(t + duration); lfo.stop(t + duration);
  };

  const playNative = useCallback(() => {
    const ctx = getCtx();
    const now = ctx.currentTime;
    createSnort(ctx, now, 110, 30);
    createSnort(ctx, now + 0.12, 90, 40);
  }, [getCtx]);

  const playOink = useCallback(() => {
    if (!soundEnabled) return;
    
    // 如果开启了自定义模式且采样已加载
    if (useCustomIfAvailable && samplesRef.current['custom_oink']) {
      const ctx = getCtx();
      const source = ctx.createBufferSource();
      source.buffer = samplesRef.current['custom_oink'];
      source.connect(ctx.destination);
      source.start();
    } else {
      // 否则永远播放最简单的原生合成音
      playNative();
    }
  }, [soundEnabled, useCustomIfAvailable, getCtx, playNative]);

  return { 
    soundEnabled, toggleSound: () => setSoundEnabled(!soundEnabled), 
    playOink, playNative,
    loadSample, customSoundData, saveCustomSound, clearCustomSound,
    useCustomIfAvailable, setUseCustomIfAvailable
  };
};
