import { EQ_BAND_FREQUENCIES } from "@/types";
import { cn } from "@/lib/utils";

interface EqBandsProps {
  bands: number[];
  onChange: (index: number, value: number) => void;
  className?: string;
}

// 10 段均衡器垂直滑块组件
// 在设置页内显示 32 64 125 250 500 1k 2k 4k 8k 16k Hz
export default function EqBands({ bands, onChange, className }: EqBandsProps) {
  return (
    <div className={cn("px-4 py-4", className)}>
      <div className="flex items-end justify-between gap-0.5">
        {EQ_BAND_FREQUENCIES.map((freq, i) => {
          const v = bands[i] ?? 0;
          const fmt = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
          return (
            <div
              key={freq}
              className="flex flex-col items-center gap-1.5"
            >
              <span
                className={cn(
                  "text-[9px] font-semibold tabular-nums",
                  v > 0 ? "text-accent" : v < 0 ? "text-sky-500" : "text-ink-subtle"
                )}
              >
                {v > 0 ? `+${v}` : v}
              </span>
              <input
                type="range"
                min={-12}
                max={12}
                step={1}
                value={v}
                onChange={(e) => onChange(i, Number(e.target.value))}
                className="eq-slider"
                aria-label={`${freq} Hz`}
              />
              <span className="text-[9px] tabular-nums text-ink-subtle">{fmt}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
