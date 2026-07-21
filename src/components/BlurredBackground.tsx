import { useEffect, useState } from "react";
import { usePlayerStore } from "@/store/playerStore";
import { useThemeStore } from "@/store/themeStore";

/**
 * 高斯模糊动态背景
 * 
 * 当有歌曲播放时，使用当前歌曲封面作为模糊背景
 * 无歌曲时使用渐变背景
 * 
 * 在所有页面下方渲染（-z-10），不影响交互
 */
export default function BlurredBackground() {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const theme = useThemeStore((s) => s.theme);
  const [coverLoaded, setCoverLoaded] = useState(false);

  useEffect(() => {
    setCoverLoaded(false);
  }, [currentSong?.coverUrl]);

  const isDark = theme === "dark";

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* 封面模糊背景 */}
      {currentSong?.coverUrl && (
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            backgroundImage: `url(${currentSong.coverUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(80px) saturate(180%) brightness(0.5)",
            transform: "scale(1.3)",
            opacity: coverLoaded ? (isDark ? 0.4 : 0.25) : 0,
          }}
          onLoad={() => setCoverLoaded(true)}
        />
      )}

      {/* 渐变遮罩层 - 确保文字可读性 */}
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? "linear-gradient(180deg, rgba(5,6,15,0.85) 0%, rgba(5,6,15,0.92) 50%, rgba(5,6,15,0.95) 100%)"
            : "linear-gradient(180deg, rgba(245,245,247,0.8) 0%, rgba(245,245,247,0.9) 50%, rgba(245,245,247,0.95) 100%)",
        }}
      />

      {/* 装饰光晕 - 增加层次感 */}
      <div
        className="absolute -top-1/4 left-1/2 h-[60vh] w-[60vh] -translate-x-1/2 rounded-full opacity-30"
        style={{
          background: "radial-gradient(circle, var(--accent-color, #FF6B35) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
    </div>
  );
}
