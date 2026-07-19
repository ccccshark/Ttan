import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ============ 设置卡片容器 ============
export function SettingsCard({
  title,
  icon,
  children,
  className,
}: {
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-3xl border border-black/[0.04] bg-white/80 shadow-card backdrop-blur-xl dark:border-white/[0.06] dark:bg-white/[0.04]", className)}>
      {title && (
        <div className="flex items-center gap-2 px-4 pb-1 pt-3.5">
          {icon && <span className="text-accent">{icon}</span>}
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            {title}
          </h3>
        </div>
      )}
      <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
        {children}
      </div>
    </section>
  );
}

// ============ 行容器 ============
interface RowProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  onClick?: () => void;
  /** 是否显示右侧箭头（onClick 不为 null 时自动显示） */
  chevron?: boolean;
  /** 行内自定义右侧内容（如开关、滑块） */
  trailing?: ReactNode;
}

export function Row({ title, subtitle, trailing, onClick, chevron }: RowProps) {
  const clickable = !!onClick;
  return (
    <motion.div
      whileTap={clickable ? { scale: 0.99 } : undefined}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        clickable && "cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-ink">{title}</div>
        {subtitle && (
          <div className="mt-0.5 text-xs text-ink-muted">{subtitle}</div>
        )}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
      {clickable && (chevron ?? true) && (
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-subtle" />
      )}
    </motion.div>
  );
}

// ============ 开关 ============
export function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200",
        checked ? "bg-accent" : "bg-black/15 dark:bg-white/15"
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className={cn(
          "absolute top-1 h-5 w-5 rounded-full bg-white shadow-md",
          checked ? "left-6" : "left-1"
        )}
      />
    </button>
  );
}

// ============ 分段选择（SegmentedControl）============
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { label: string; value: T }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-lg bg-black/[0.06] p-0.5 dark:bg-white/[0.08]" onClick={(e) => e.stopPropagation()}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "relative flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            value === opt.value
              ? "text-ink dark:text-white"
              : "text-ink-muted hover:text-ink"
          )}
        >
          {value === opt.value && (
            <motion.span
              layoutId="segmented-active"
              className="absolute inset-0 rounded-md bg-white shadow-sm dark:bg-white/15"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <span className="relative z-10">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

// ============ 滑块 ============
export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex w-40 items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider h-1.5 flex-1"
        style={
          {
            background: `linear-gradient(to right, var(--accent-color, #FF6B35) 0%, var(--accent-color, #FF6B35) ${pct}%, rgba(127,127,127,0.2) ${pct}%, rgba(127,127,127,0.2) 100%)`,
            borderRadius: 999,
          } as React.CSSProperties
        }
      />
      {format && (
        <span className="w-12 text-right text-xs tabular-nums text-ink-muted">
          {format(value)}
        </span>
      )}
    </div>
  );
}
