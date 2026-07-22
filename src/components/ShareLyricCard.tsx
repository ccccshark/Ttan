import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Share2, X, Copy, Check } from "lucide-react";
import { parseLrc, findCurrentLyricIndex } from "@/utils/lyrics";
import { PLACEHOLDER_COVER } from "@/utils/placeholders";
import type { Song } from "@/types";
import { useToast } from "@/components/Toast";

interface ShareLyricCardProps {
  open: boolean;
  onClose: () => void;
  song: Song;
  currentTime: number;
}

type CardTheme = "dark" | "gradient" | "minimal";

/**
 * 歌词分享卡片
 * - 自动从歌词中获取当前播放的句子
 * - 支持深色 / 渐变 / 极简 三种风格
 * - 支持截图下载、复制文本、原生分享（Capacitor Share）
 */
export default function ShareLyricCard({
  open,
  onClose,
  song,
  currentTime,
}: ShareLyricCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [theme, setTheme] = useState<CardTheme>("dark");
  const [copyOk, setCopyOk] = useState(false);
  const { showToast } = useToast();

  // 解析歌词，定位当前句
  const parsed = useMemoSafe(() => parseLrc(song.lyrics ?? ""), [song.lyrics]);
  const idx = findCurrentLyricIndex(parsed, currentTime);
  const currentLine = parsed[idx]?.text ?? "";
  const nextLine = parsed[idx + 1]?.text ?? "";
  const prevLine = parsed[idx - 1]?.text ?? "";

  // 渲染到 canvas
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = 720;
    const H = 1080;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 主题背景
    if (theme === "dark") {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#0a0c1a");
      grad.addColorStop(1, "#05060f");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    } else if (theme === "gradient") {
      // 提取封面主色（简化版：直接用固定渐变）
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, "#FF6B35");
      grad.addColorStop(0.5, "#C026D3");
      grad.addColorStop(1, "#1E1B4B");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    } else {
      // minimal: 白底
      ctx.fillStyle = "#FAFAFA";
      ctx.fillRect(0, 0, W, H);
    }

    // 封面（用 Image 异步加载并绘制）
    const drawCover = (coverUrl: string) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // 在卡片右下角绘制封面
        const size = 220;
        const x = W - size - 60;
        const y = H - size - 60;
        // 阴影
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 40;
        ctx.beginPath();
        roundRect(ctx, x, y, size, size, 32);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();
        ctx.restore();

        // 封面图
        ctx.save();
        ctx.beginPath();
        roundRect(ctx, x, y, size, size, 32);
        ctx.clip();
        ctx.drawImage(img, x, y, size, size);
        ctx.restore();

        // 重新绘制其他元素（歌词、标题等）
        drawText();
      };
      img.onerror = () => {
        drawText();
      };
      img.src = coverUrl;
    };

    const drawText = () => {
      const isDark = theme !== "minimal";
      const textColor = isDark ? "#FFFFFF" : "#1c1c1e";
      const mutedColor = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)";

      // 上一句（小）
      ctx.textAlign = "left";
      ctx.font = "28px system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
      ctx.fillStyle = mutedColor;
      ctx.fillText(prevLine, 60, 200, W - 360);

      // 当前句（大、粗体）
      ctx.font = "bold 48px system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
      ctx.fillStyle = textColor;
      const lines = wrapText(ctx, currentLine, W - 120);
      lines.forEach((line, i) => {
        ctx.fillText(line, 60, 360 + i * 64);
      });

      // 下一句（小）
      ctx.font = "28px system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
      ctx.fillStyle = mutedColor;
      ctx.fillText(nextLine, 60, 600, W - 360);

      // 标题 / 艺人
      ctx.font = "bold 32px system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
      ctx.fillStyle = textColor;
      ctx.fillText(song.title, 60, H - 200, W - 360);

      ctx.font = "24px system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
      ctx.fillStyle = mutedColor;
      ctx.fillText(song.artist, 60, H - 160, W - 360);

      // 品牌
      ctx.font = "20px system-ui, sans-serif";
      ctx.fillStyle = mutedColor;
      ctx.fillText("Ttan · 本地音乐", 60, H - 100);
    };

    const coverUrl = song.coverUrl && !song.coverUrl.includes(PLACEHOLDER_COVER)
      ? song.coverUrl
      : PLACEHOLDER_COVER;

    if (coverUrl && !coverUrl.includes(PLACEHOLDER_COVER)) {
      drawCover(coverUrl);
    } else {
      drawText();
    }
  }, [open, theme, song, currentTime, prevLine, currentLine, nextLine]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${song.title}-${Date.now()}.png`;
      a.click();
      showToast("已保存到下载文件夹");
    } catch (err) {
      console.error(err);
      showToast("保存失败，请尝试长按图片手动保存");
    }
  };

  const handleCopy = async () => {
    const text = `${currentLine}\n\n— ${song.title} · ${song.artist}\nfrom Ttan`;
    try {
      await navigator.clipboard.writeText(text);
      setCopyOk(true);
      setTimeout(() => setCopyOk(false), 1500);
    } catch {
      showToast("复制失败");
    }
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        // Web Share API
        if (navigator.canShare) {
          const file = new File([blob], `${song.title}.png`, { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: song.title,
              text: `${currentLine}\n— ${song.title} · ${song.artist}`,
            });
            return;
          }
        }
        // 备选：下载
        handleDownload();
      }, "image/png");
    } catch (err) {
      console.error(err);
      showToast("分享失败");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl ring-1 ring-black/5 dark:bg-[#0f1120] dark:ring-white/10 sm:rounded-3xl"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-black/10 dark:bg-white/15 sm:hidden" />

            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-ink dark:text-white">分享歌词</h3>
                <p className="text-xs text-ink-muted dark:text-white/60">生成当前歌词卡片</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-ink-subtle hover:bg-black/10 dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 卡片预览 */}
            <div className="mb-4 overflow-hidden rounded-2xl">
              <canvas
                ref={canvasRef}
                className="aspect-[2/3] w-full bg-black"
              />
            </div>

            {/* 主题选择 */}
            <div className="mb-4 flex gap-2">
              {(["dark", "gradient", "minimal"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                    theme === t
                      ? "bg-accent text-white"
                      : "bg-black/5 text-ink-muted hover:bg-black/10 dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/20"
                  }`}
                >
                  {t === "dark" ? "深色" : t === "gradient" ? "渐变" : "极简"}
                </button>
              ))}
            </div>

            {/* 操作按钮 */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex flex-col items-center gap-1 rounded-2xl bg-black/[0.04] py-3 text-ink hover:bg-black/[0.08] dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12]"
              >
                {copyOk ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                <span className="text-xs">复制</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="flex flex-col items-center gap-1 rounded-2xl bg-black/[0.04] py-3 text-ink hover:bg-black/[0.08] dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12]"
              >
                <Download className="h-4 w-4" />
                <span className="text-xs">保存</span>
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="flex flex-col items-center gap-1 rounded-2xl bg-accent py-3 text-white"
              >
                <Share2 className="h-4 w-4" />
                <span className="text-xs">分享</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 工具函数
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [""];
  const chars = text.split("");
  const lines: string[] = [];
  let line = "";
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

// React useMemo helper without import noise
function useMemoSafe<T>(fn: () => T, deps: React.DependencyList): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(fn, deps);
}
