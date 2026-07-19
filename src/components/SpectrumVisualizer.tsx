import { useEffect, useRef } from "react";
import { getSharedAnalyser } from "@/hooks/useAudioAnalyser";
import { useSettingsStore } from "@/store/settingsStore";
import type { SpectrumStyle } from "@/types";
import { cn } from "@/lib/utils";

interface SpectrumVisualizerProps {
  isPlaying: boolean;
  className?: string;
  style?: SpectrumStyle;
  barCount?: number;
  /** 是否镜像（左右对称） */
  mirror?: boolean;
  /** 颜色：默认跟随 accent CSS 变量 */
  color?: string;
}

// 实时频谱可视化组件
// - bars: 经典柱状频谱
// - wave: 波形曲线
// - mirror: 中心向两侧对称柱状
// 数据源来自 useAudioAnalyser 共享的 AnalyserNode
export default function SpectrumVisualizer({
  isPlaying,
  className,
  style = "bars",
  barCount = 48,
  mirror = false,
  color,
}: SpectrumVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const settings = useSettingsStore((s) => s.settings);
  const effectiveStyle = style || settings.spectrumStyle;
  const accentColor = color || settings.accentPreset === "custom"
    ? settings.accentCustom
    : getComputedStyle(document.documentElement).getPropertyValue("--accent-color").trim() || "#FF6B35";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = getSharedAnalyser();
    if (!analyser) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const buffer = new Uint8Array(analyser.frequencyBinCount);
    const drawColor = accentColor || "#FF6B35";

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      if (effectiveStyle === "wave") {
        analyser.getByteTimeDomainData(buffer);
        ctx.lineWidth = 2;
        ctx.strokeStyle = drawColor;
        ctx.beginPath();
        const slice = w / buffer.length;
        for (let i = 0; i < buffer.length; i++) {
          const v = buffer[i] / 128.0;
          const y = (v * h) / 2;
          const x = i * slice;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        analyser.getByteFrequencyData(buffer);
        const count = mirror ? Math.floor(barCount / 2) : barCount;
        const gap = 2;
        const barW = (w - gap * (count - 1)) / (mirror ? count * 2 - 1 : count);
        const center = mirror ? w / 2 : 0;
        for (let i = 0; i < count; i++) {
          // 对数采样：低频密集，高频稀疏
          const idx = Math.floor(Math.pow(i / count, 1.6) * buffer.length);
          const v = buffer[idx] / 255;
          const barH = Math.max(2, v * h * 0.92);
          if (mirror) {
            // 右侧
            const x = center + i * (barW + gap);
            const grad = ctx.createLinearGradient(0, h - barH, 0, h);
            grad.addColorStop(0, drawColor);
            grad.addColorStop(1, `${drawColor}40`);
            ctx.fillStyle = grad;
            roundRect(ctx, x, h - barH, barW, barH, barW / 2);
            ctx.fill();
            // 左侧镜像
            const x2 = center - (i + 1) * (barW + gap);
            ctx.fillStyle = grad;
            roundRect(ctx, x2, h - barH, barW, barH, barW / 2);
            ctx.fill();
          } else {
            const x = i * (barW + gap);
            const grad = ctx.createLinearGradient(0, h - barH, 0, h);
            grad.addColorStop(0, drawColor);
            grad.addColorStop(1, `${drawColor}30`);
            ctx.fillStyle = grad;
            roundRect(ctx, x, h - barH, barW, barH, barW / 2);
            ctx.fill();
          }
        }
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    if (isPlaying) {
      rafRef.current = requestAnimationFrame(draw);
    } else {
      // 暂停时绘制一条平直的低基线
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = `${drawColor}30`;
      const h = rect.height;
      const barH = 3;
      const count = mirror ? Math.floor(barCount / 2) : barCount;
      const gap = 2;
      const barW = (rect.width - gap * (count - 1)) / (mirror ? count * 2 - 1 : count);
      const center = mirror ? rect.width / 2 : 0;
      for (let i = 0; i < count; i++) {
        if (mirror) {
          ctx.fillRect(center + i * (barW + gap), h - barH, barW, barH);
          ctx.fillRect(center - (i + 1) * (barW + gap), h - barH, barW, barH);
        } else {
          ctx.fillRect(i * (barW + gap), h - barH, barW, barH);
        }
      }
    }

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [isPlaying, effectiveStyle, barCount, mirror, accentColor]);

  if (effectiveStyle === "off") return null;

  return (
    <canvas
      ref={canvasRef}
      className={cn("h-full w-full", className)}
      aria-hidden
    />
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}
