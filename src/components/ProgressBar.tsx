import { useEffect, useRef, useState } from "react";
import { formatTime } from "@/utils/format";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  current: number;
  duration: number;
  onSeek: (t: number) => void;
  showTime?: boolean;
  className?: string;
}

export default function ProgressBar({
  current,
  duration,
  onSeek,
  showTime = true,
  className,
}: ProgressBarProps) {
  const [dragging, setDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const displayValue = dragging ? dragValue : current;
  const percent = duration > 0 ? (displayValue / duration) * 100 : 0;

  const updateFromClientX = (clientX: number) => {
    const el = ref.current;
    if (!el || duration <= 0) return 0;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const t = ratio * duration;
    setDragValue(t);
    return t;
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => updateFromClientX(e.clientX);
    const onUp = () => {
      setDragging(false);
      onSeek(dragValue);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, dragValue, duration, onSeek]);

  return (
    <div className={cn("flex w-full items-center gap-3", className)}>
      {showTime && (
        <span className="w-10 text-right text-[11px] tabular-nums text-ink-subtle">
          {formatTime(displayValue)}
        </span>
      )}
      <div
        ref={ref}
        onPointerDown={(e) => {
          e.preventDefault();
          setDragging(true);
          updateFromClientX(e.clientX);
        }}
        className="relative h-6 flex-1 cursor-pointer touch-none"
      >
        {/* 轨道 */}
        <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-black/10 dark:bg-white/12">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-100"
            style={{ width: `${percent}%` }}
          />
        </div>
        {/* 手柄 */}
        <div
          className={cn(
            "absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white border-2 border-accent shadow-sm transition-transform",
            dragging ? "scale-125" : "scale-100 hover:scale-110"
          )}
          style={{ left: `${percent}%` }}
        />
      </div>
      {showTime && (
        <span className="w-10 text-[11px] tabular-nums text-ink-subtle">
          {formatTime(duration)}
        </span>
      )}
    </div>
  );
}
