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

// 歌词舞台（参考 SaltPlayer 仿 Apple Music 交错滚动）：
// - 当前行居中，加粗放大 + 辉光
// - 上下相邻行淡化 + 微缩放
// - 切换时整列向上平滑位移（每行延迟 60ms）
// - 顶部底部渐隐遮罩

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
          "flex h-full flex-col items-center justify-center gap-3 text-white/55",
          className
        )}
      >
        <div className="text-3xl tracking-widest">♪ ♪ ♪</div>
        <div className="text-[11px] uppercase tracking-[0.4em]">pure music</div>
      </div>
    );
  }

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
      <div className="flex min-h-full flex-col items-center justify-center px-6 py-[38%]">
        <AnimatePresence mode="popLayout">
          {lines.map((line, i) => {
            const isActive = i === activeIdx;
            const distance = Math.abs(i - activeIdx);
            const visible = distance <= 3;

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
                  "max-w-full cursor-pointer text-center transition-colors",
                  isActive
                    ? "my-4 text-[26px] font-bold leading-snug text-white lyric-glow"
                    : "my-2 text-base font-medium text-white/70 hover:text-white/90"
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
