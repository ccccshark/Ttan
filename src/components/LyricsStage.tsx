import { useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LyricLine } from "@/types";
import { findCurrentLyricIndex, parseLrc } from "@/utils/lyrics";
import { useSettingsStore } from "@/store/settingsStore";
import { cn } from "@/lib/utils";

interface LyricsStageProps {
  lyrics?: string;
  currentTime: number;
  onSeek?: (t: number) => void;
  className?: string;
}

// 歌词舞台（参考 SaltPlayer 仿 Apple Music 交错滚动）：
// - 当前行居中，加粗放大 + 辉光
// - 上下相邻行淡化 + 微缩放
// - 切换时整列向上平滑位移（每行延迟 60ms）
// - 顶部底部渐隐遮罩
// - 支持设置：字号、行间距、对齐、偏移、翻译、卡拉OK 逐字高亮

// 翻译行：解析 LRC 时把同时间标签的相邻行视为原文 / 译文
interface ParsedLyric extends LyricLine {
  translation?: string;
}

function parseLrcWithTranslation(lrc: string, withTranslation: boolean): ParsedLyric[] {
  const base = parseLrc(lrc);
  if (!withTranslation || base.length === 0) return base;
  // 同时间戳合并：相同时间（±0.05s）的相邻行视为原文+译文
  const out: ParsedLyric[] = [];
  for (let i = 0; i < base.length; i++) {
    const cur = base[i];
    const nxt = base[i + 1];
    if (nxt && Math.abs(nxt.time - cur.time) < 0.05 && nxt.text !== cur.text) {
      // 仅当原文与译文文本显著不同（避免重复时间标签的相同行）
      out.push({ ...cur, translation: nxt.text });
      i++; // 跳过译文行
    } else {
      out.push(cur);
    }
  }
  return out;
}

export default function LyricsStage({
  lyrics,
  currentTime,
  onSeek,
  className,
}: LyricsStageProps) {
  const settings = useSettingsStore((s) => s.settings);
  const {
    lyricsFontSize,
    lyricsLineHeight,
    lyricsAlign,
    lyricsOffsetMs,
    lyricsShowTranslation,
    lyricsKaraokeMode,
  } = settings;

  const lines = useMemo<ParsedLyric[]>(
    () => parseLrcWithTranslation(lyrics ?? "", lyricsShowTranslation),
    [lyrics, lyricsShowTranslation]
  );

  // 应用偏移：offsetMs > 0 让歌词提前，<0 让歌词延后
  const adjustedTime = currentTime + lyricsOffsetMs / 1000;
  const activeIdx = useMemo(
    () => findCurrentLyricIndex(lines, adjustedTime),
    [lines, adjustedTime]
  );

  const containerRef = useRef<HTMLDivElement>(null);

  // 当前行变化时，平滑滚动使当前行居中
  useEffect(() => {
    if (activeIdx < 0) return;
    const container = containerRef.current;
    if (!container) return;
    const target = container.querySelector<HTMLElement>(
      `[data-lyric-idx="${activeIdx}"]`
    );
    if (!target) return;
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const offset =
      targetRect.top -
      containerRect.top -
      containerRect.height / 2 +
      targetRect.height / 2;
    container.scrollBy({ top: offset, behavior: "smooth" });
  }, [activeIdx]);

  if (lines.length === 0) {
    return (
      <div
        className={cn(
          "flex h-full flex-col items-center justify-center gap-3 text-white/55",
          className
        )}
      >
        <div className="text-3xl tracking-widest">♪ ♪ ♪</div>
        <div className="text-[11px] uppercase tracking-[0.4em]">pure music</div>
      </div>
    );
  }

  // 字号派生：当前行 +6，相邻行使用基础字号
  const baseSize = lyricsFontSize;
  const activeSize = lyricsFontSize + 6;

  // 对齐 class
  const alignClass =
    lyricsAlign === "left"
      ? "items-start text-left"
      : "items-center text-center";

  // 当前行在卡拉OK 模式下的进度（0-1）
  const karaokeProgress = (() => {
    if (!lyricsKaraokeMode || activeIdx < 0) return 0;
    const cur = lines[activeIdx];
    const nxt = lines[activeIdx + 1];
    const end = nxt ? nxt.time : cur.time + 4;
    const span = Math.max(0.2, end - cur.time);
    return Math.max(0, Math.min(1, (adjustedTime - cur.time) / span));
  })();

  return (
    <div
      ref={containerRef}
      className={cn(
        "no-scrollbar h-full overflow-y-auto",
        "[mask-image:linear-gradient(to_bottom,transparent_0%,black_22%,black_78%,transparent_100%)]",
        "[-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,black_22%,black_78%,transparent_100%)]",
        className
      )}
    >
      <div
        className={cn(
          "flex min-h-full flex-col px-6 py-[38%]",
          alignClass
        )}
      >
        <AnimatePresence mode="popLayout">
          {lines.map((line, i) => {
            const isActive = i === activeIdx;
            const distance = Math.abs(i - activeIdx);
            const visible = distance <= 3;

            // 卡拉OK 高亮：当前行使用线性渐变 mask 实现逐字 wipe
            const karaokeStyle: React.CSSProperties =
              isActive && lyricsKaraokeMode
                ? {
                    backgroundImage:
                      "linear-gradient(90deg, #fff 0%, #fff var(--kp, 0%), rgba(255,255,255,0.35) var(--kp, 0%), rgba(255,255,255,0.35) 100%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    ["--kp" as never]: `${Math.round(karaokeProgress * 100)}%`,
                  }
                : {};

            return (
              <motion.button
                key={`${line.time}-${i}`}
                data-lyric-idx={i}
                type="button"
                onClick={() => onSeek?.(line.time)}
                layout="position"
                initial={false}
                animate={{
                  opacity: isActive
                    ? 1
                    : visible
                    ? Math.max(0.18, 0.45 - distance * 0.12)
                    : 0,
                  scale: isActive ? 1 : 0.9,
                  y: isActive ? 0 : 0,
                  filter: isActive ? "blur(0px)" : "blur(1.5px)",
                }}
                transition={{
                  duration: 0.45,
                  ease: [0.22, 1, 0.36, 1],
                  // 交错延迟：行号距离当前行越远，延迟越大（仿 AM）
                  delay: isActive ? 0 : Math.min(distance * 0.04, 0.18),
                }}
                className={cn(
                  "max-w-full cursor-pointer transition-colors",
                  isActive
                    ? "my-4 font-bold text-white lyric-glow"
                    : "my-2 font-medium text-white/70 hover:text-white/90",
                  lyricsAlign === "left" ? "text-left" : "text-center"
                )}
                style={{
                  fontSize: isActive ? activeSize : baseSize,
                  lineHeight: lyricsLineHeight,
                  ...karaokeStyle,
                }}
              >
                <span className="block">{line.text || "♪"}</span>
                {lyricsShowTranslation && line.translation && (
                  <span
                    className={cn(
                      "mt-1 block font-normal",
                      isActive ? "text-white/65" : "text-white/35",
                      lyricsAlign === "left" ? "text-left" : "text-center"
                    )}
                    style={{
                      fontSize: isActive
                        ? Math.max(12, activeSize - 8)
                        : Math.max(11, baseSize - 6),
                      lineHeight: lyricsLineHeight,
                    }}
                  >
                    {line.translation}
                  </span>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
