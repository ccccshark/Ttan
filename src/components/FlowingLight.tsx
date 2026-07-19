import { useEffect, useMemo, useRef, useState } from "react";

interface FlowingLightProps {
  /** 封面图 URL，用于提取主色 */
  coverUrl?: string;
  /** 是否在播放，影响流动速度 */
  isPlaying: boolean;
  /** 音频低频强度 0-1，驱动光球脉动 */
  bass?: number;
  /** 强度 0-1，控制光球亮度与模糊半径 */
  intensity?: number;
  className?: string;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

// SaltPlayer 风格动态流光背景：
// - 从封面提取主色（降采样 + 简单聚类）
// - 3 层径向渐变光球缓慢漂移
// - 高斯模糊营造柔和氛围
// - 节拍驱动光球半径与亮度脉动

function extractColors(img: HTMLImageElement): RGB[] {
  try {
    const sampleSize = 32;
    const canvas = document.createElement("canvas");
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return [];
    ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
    const data = ctx.getImageData(0, 0, sampleSize, sampleSize).data;

    // 简单颜色量化：把 RGB 量化到 4 位，统计频次
    const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 128) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // 跳过过暗（接近纯黑）和过亮（接近纯白）的像素
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < 25 || lum > 235) continue;
      const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
      const prev = buckets.get(key);
      if (prev) {
        prev.count++;
        prev.r += r;
        prev.g += g;
        prev.b += b;
      } else {
        buckets.set(key, { count: 1, r, g, b });
      }
    }
    const sorted = [...buckets.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map((b) => ({
        r: Math.round(b.r / b.count),
        g: Math.round(b.g / b.count),
        b: Math.round(b.b / b.count),
      }));
    return sorted;
  } catch {
    return [];
  }
}

// 默认深空蓝青色调（无封面时使用）
const DEFAULT_COLORS: RGB[] = [
  { r: 80, g: 130, b: 255 },
  { r: 120, g: 80, b: 220 },
  { r: 60, g: 180, b: 220 },
];

export default function FlowingLight({
  coverUrl,
  isPlaying,
  bass = 0,
  intensity = 0.6,
  className,
}: FlowingLightProps) {
  const [colors, setColors] = useState<RGB[]>(DEFAULT_COLORS);
  const bassRef = useRef(bass);
  const playingRef = useRef(isPlaying);

  useEffect(() => {
    bassRef.current = bass;
  }, [bass]);
  useEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);

  // 从封面提取主色
  useEffect(() => {
    if (!coverUrl) {
      setColors(DEFAULT_COLORS);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const extracted = extractColors(img);
      if (extracted.length >= 2) setColors(extracted);
    };
    img.onerror = () => setColors(DEFAULT_COLORS);
    img.src = coverUrl;
  }, [coverUrl]);

  // 光球位置（每次切歌重新随机）
  const orbs = useMemo(() => {
    return colors.slice(0, 3).map((_, i) => ({
      startX: 0.2 + Math.random() * 0.6,
      startY: 0.2 + Math.random() * 0.6,
      driftX: (Math.random() - 0.5) * 0.3,
      driftY: (Math.random() - 0.5) * 0.3,
      duration: 22 + i * 6 + Math.random() * 6,
      delay: -i * 4,
      sizeBase: 0.55 + Math.random() * 0.2,
    }));
  }, [colors]);

  const toRgb = (c: RGB, alpha = 1) => `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
  // 强度系数：0 时几乎不可见，1 时全亮
  const intensityK = Math.max(0, Math.min(1, intensity));

  return (
    <div
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: "#05060f",
      }}
      aria-hidden="true"
    >
      {/* 底色径向渐变 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(20,30,70,0.6) 0%, rgba(8,10,25,0.9) 50%, #05060f 100%)",
        }}
      />

      {/* 3 层流动光球 */}
      {orbs.map((orb, i) => {
        const color = colors[i % colors.length];
        const sizePct = (orb.sizeBase + bassRef.current * 0.15) * 100;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${orb.startX * 100}%`,
              top: `${orb.startY * 100}%`,
              width: `${sizePct}%`,
              height: `${sizePct}%`,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              background: `radial-gradient(circle, ${toRgb(
                color,
                (0.55 + bassRef.current * 0.2) * intensityK
              )} 0%, ${toRgb(color, 0.15 * intensityK)} 40%, transparent 70%)`,
              filter: `blur(${(50 + i * 15) * (1 - intensityK * 0.3)}px)`,
              mixBlendMode: "screen",
              opacity: 0.85 * intensityK,
              animation: `flow-orb-${i} ${orb.duration}s ease-in-out infinite`,
              animationDelay: `${orb.delay}s`,
            }}
          />
        );
      })}

      {/* 顶部暗色渐变（提升顶部状态栏可读性）*/}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 20%, transparent 70%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      <style>{`
        ${orbs
          .map(
            (orb, i) => `
          @keyframes flow-orb-${i} {
            0%, 100% {
              transform: translate(-50%, -50%) scale(1) rotate(0deg);
            }
            33% {
              transform: translate(calc(-50% + ${orb.driftX * 100}vw), calc(-50% + ${
                orb.driftY * 100
              }vh)) scale(1.12) rotate(120deg);
            }
            66% {
              transform: translate(calc(-50% + ${-orb.driftX * 80}vw), calc(-50% + ${
                orb.driftY * 60
              }vh)) scale(0.92) rotate(240deg);
            }
          }
        `
          )
          .join("\n")}
      `}</style>
    </div>
  );
}
