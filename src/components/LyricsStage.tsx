import { useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LyricLine } from "@/types";
import { findCurrentLyricIndex, parseLrc } from "@/utils/lyrics";
import { cn } from "@/lib/utils";

interface LyricsStageProps {
  lyrics?: string;
  currentTime: number;
  onSeek?: (t: number) => void;
  className?: string;
}

// Mineradio 风格歌词舞台：
// 当前行占据画面中央，像电影字幕一样逐句推进
// 上下相邻行淡化显示，营造电影字幕的纵深感
// 切换时有平滑的位移过渡

export default function LyricsStage({
  lyrics,
  currentTime,
  onSeek,
  className,
}: LyricsStageProps) {
  const lines = useMemo<LyricLine[]>(() => parseLrc(lyrics ?? ""), [lyrics]);
  const activeIdx = useMemo(
    () => findCurrentLyricIndex(lines, currentTime),
    [lines, currentTime]
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
          "flex h-full flex-col items-center justify-center gap-3 text-white/50",
          className
        )}
      >
        <div className="text-sm tracking-wide">♪ ♪ ♪</div>
        <div className="text-xs uppercase tracking-[0.3em]">pure music</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "no-scrollbar h-full overflow-y-auto",
        "[mask-image:linear-gradient(to_bottom,transparent_0%,black_25%,black_75%,transparent_100%)]",
        "-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,black_25%,black_75%,transparent_100%)",
        className
      )}
    >
      <div className="flex min-h-full flex-col items-center justify-center px-6 py-[40%]">
        <AnimatePresence mode="popLayout">
          {lines.map((line, i) => {
            const isActive = i === activeIdx;
            const distance = Math.abs(i - activeIdx);
            const visible = distance <= 2;

            return (
              <motion.button
                key={`${line.time}-${i}`}
                data-lyric-idx={i}
                type="button"
                onClick={() => onSeek?.(line.time)}
                layout="position"
                initial={false}
                animate={{
                  opacity: isActive ? 1 : visible ? 0.32 - distance * 0.08 : 0,
                  scale: isActive ? 1 : 0.92,
                  filter: isActive ? "blur(0px)" : "blur(2px)",
                }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "max-w-full cursor-pointer text-center transition-colors",
                  isActive
                    ? "my-4 text-2xl font-semibold leading-relaxed text-white drop-shadow-[0_2px_12px_rgba(180,210,255,0.45)]"
                    : "my-2 text-base font-medium text-white/80 hover:text-white"
                )}
              >
                {line.text || "♪"}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
