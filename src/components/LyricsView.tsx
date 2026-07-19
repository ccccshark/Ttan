import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Music2 } from "lucide-react";
import type { LyricLine } from "@/types";
import { findCurrentLyricIndex, parseLrc } from "@/utils/lyrics";
import { cn } from "@/lib/utils";

interface LyricsViewProps {
  lyrics?: string;
  currentTime: number;
  onSeek?: (t: number) => void;
  className?: string;
}

export default function LyricsView({
  lyrics,
  currentTime,
  onSeek,
  className,
}: LyricsViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const lines = useMemo<LyricLine[]>(() => parseLrc(lyrics ?? ""), [lyrics]);
  const activeIdx = useMemo(
    () => findCurrentLyricIndex(lines, currentTime),
    [lines, currentTime]
  );

  // 自动滚动到当前行
  useEffect(() => {
    if (activeIdx < 0) return;
    const container = containerRef.current;
    const target = lineRefs.current[activeIdx];
    if (!container || !target) return;
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const offset =
      targetRect.top - containerRect.top - containerRect.height / 2 + targetRect.height / 2;
    container.scrollBy({ top: offset, behavior: "smooth" });
  }, [activeIdx]);

  if (lines.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 py-16 text-ink-subtle",
          className
        )}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
          <Music2 className="h-8 w-8 text-accent" />
        </div>
        <div className="text-sm">暂无歌词，享受纯音乐吧</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "no-scrollbar h-full overflow-y-auto px-6 py-12",
        "[mask-image:linear-gradient(to_bottom,transparent_0%,black_15%,black_85%,transparent_100%)]",
        className
      )}
    >
      <div className="flex flex-col items-center gap-5">
        {lines.map((line, i) => {
          const isActive = i === activeIdx;
          const distance = Math.abs(i - activeIdx);
          return (
            <motion.button
              key={`${line.time}-${i}`}
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              type="button"
              onClick={() => onSeek?.(line.time)}
              animate={{
                opacity: isActive ? 1 : Math.max(0.25, 1 - distance * 0.18),
                scale: isActive ? 1 : 0.96,
              }}
              transition={{ duration: 0.3 }}
              className={cn(
                "max-w-full cursor-pointer text-center transition-colors",
                isActive
                  ? "text-base font-semibold text-accent"
                  : "text-sm font-medium text-ink/70 hover:text-ink dark:text-white/70 dark:hover:text-white"
              )}
            >
              {line.text || "♪"}
            </motion.button>
          );
        })}
        <div className="h-32" />
      </div>
    </div>
  );
}
