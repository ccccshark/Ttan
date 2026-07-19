import { useEffect, useRef, useState } from "react";
import { getAudioElement } from "@/utils/audioElement";

// Web Audio API 频谱分析 Hook
// 将 audio 元素接入 AudioContext + AnalyserNode，提供实时音量与频谱数据
// 注意：createMediaElementSource 只能调用一次，本 Hook 做了幂等处理

export interface AudioAnalysis {
  // 综合音量 (0-1)
  level: number;
  // 低频能量 (kick drum 区间，0-1)
  bass: number;
  // 中频能量 (人声/旋律区间，0-1)
  mid: number;
  // 高频能量 (镲片/空气感，0-1)
  treble: number;
  // 是否检测到节拍（瞬时能量陡升）
  beat: boolean;
}

let sharedCtx: AudioContext | null = null;
let sharedAnalyser: AnalyserNode | null = null;
let sharedSource: MediaElementAudioSourceNode | null = null;
let refCount = 0;

/** 获取共享的 AnalyserNode（供可视化组件使用） */
export function getSharedAnalyser(): AnalyserNode | null {
  return sharedAnalyser;
}

function getAnalyser(audio: HTMLAudioElement): AnalyserNode | null {
  if (typeof window === "undefined") return null;
  try {
    if (!sharedCtx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      sharedCtx = new Ctx();
    }
    if (sharedCtx.state === "suspended") {
      void sharedCtx.resume();
    }
    if (!sharedAnalyser) {
      sharedAnalyser = sharedCtx.createAnalyser();
      sharedAnalyser.fftSize = 512;
      sharedAnalyser.smoothingTimeConstant = 0.8;
    }
    if (!sharedSource) {
      sharedSource = sharedCtx.createMediaElementSource(audio);
      sharedSource.connect(sharedAnalyser);
      sharedAnalyser.connect(sharedCtx.destination);
      // 暴露到 window 供 useEqualizer 复用
      (window as unknown as { __ttanAudioCtx?: AudioContext }).__ttanAudioCtx = sharedCtx;
      (window as unknown as { __ttanAudioSource?: MediaElementAudioSourceNode }).__ttanAudioSource = sharedSource;
      (window as unknown as { __ttanAudioAnalyser?: AnalyserNode }).__ttanAudioAnalyser = sharedAnalyser;
    }
    return sharedAnalyser;
  } catch (err) {
    console.warn("AudioContext 初始化失败:", err);
    return null;
  }
}

export function useAudioAnalyser(enabled: boolean): AudioAnalysis {
  const [analysis, setAnalysis] = useState<AudioAnalysis>({
    level: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    beat: false,
  });
  const rafRef = useRef<number | null>(null);
  const lastBeatRef = useRef(0);
  const bassHistoryRef = useRef<number[]>([]);

  useEffect(() => {
    if (!enabled) {
      setAnalysis({ level: 0, bass: 0, mid: 0, treble: 0, beat: false });
      return;
    }
    const audio = getAudioElement();
    if (!audio) return;

    const analyser = getAnalyser(audio);
    if (!analyser) return;
    refCount += 1;

    const buffer = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(buffer);

      // 分频段统计
      const len = buffer.length;
      const bassEnd = Math.floor(len * 0.1); // 0-10%: 低频
      const midEnd = Math.floor(len * 0.5); // 10-50%: 中频
      // 50-100%: 高频

      let bassSum = 0;
      for (let i = 0; i < bassEnd; i++) bassSum += buffer[i];
      let midSum = 0;
      for (let i = bassEnd; i < midEnd; i++) midSum += buffer[i];
      let trebleSum = 0;
      for (let i = midEnd; i < len; i++) trebleSum += buffer[i];

      const bass = bassEnd > 0 ? bassSum / bassEnd / 255 : 0;
      const mid = midEnd - bassEnd > 0 ? midSum / (midEnd - bassEnd) / 255 : 0;
      const treble = len - midEnd > 0 ? trebleSum / (len - midEnd) / 255 : 0;
      const level = (bass + mid + treble) / 3;

      // 节拍检测：低频能量陡升
      const history = bassHistoryRef.current;
      history.push(bass);
      if (history.length > 30) history.shift();
      const avg =
        history.reduce((a, b) => a + b, 0) / Math.max(1, history.length);
      const now = performance.now();
      const beat =
        bass > avg * 1.35 &&
        bass > 0.35 &&
        now - lastBeatRef.current > 220 &&
        history.length >= 10;
      if (beat) lastBeatRef.current = now;

      setAnalysis({ level, bass, mid, treble, beat });
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      refCount = Math.max(0, refCount - 1);
      // 不关闭 sharedCtx，因为切回页面时 audio 仍依赖它
    };
  }, [enabled]);

  return analysis;
}
