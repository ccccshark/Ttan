import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import {
  ChevronDown,
  Heart,
  ListMusic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useLibraryStore } from "@/store/libraryStore";
import { useAudioAnalyser } from "@/hooks/useAudioAnalyser";
import { useStatusBarHeight } from "@/hooks/useStatusBarHeight";
import ParticleField from "@/components/ParticleField";
import FlowingLight from "@/components/FlowingLight";
import LyricsStage from "@/components/LyricsStage";
import ProgressBar from "@/components/ProgressBar";
import CoverArt from "@/components/CoverArt";
import SpectrumVisualizer from "@/components/SpectrumVisualizer";
import type { PlayMode } from "@/types";
import { formatTime } from "@/utils/format";
import { cn } from "@/lib/utils";

// mineRadio 风格播放页：
// - 玻璃拟态（heavy blur + saturation）
// - 封面取色渐变背景 + 流动光晕
// - 超大圆角封面（32px）+ 呼吸式节拍动画
// - 浮动玻璃控制栏（底部半透明面板）
// - 歌词全屏沉浸模式
// - 极简顶部栏（仅返回 + 队列）
// - 音频反应式光晕与粒子
type View = "cover" | "lyrics";

export default function NowPlaying() {
  const navigate = useNavigate();
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const playMode = usePlayerStore((s) => s.playMode);
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const cyclePlayMode = usePlayerStore((s) => s.cyclePlayMode);
  const playAt = usePlayerStore((s) => s.playAt);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const _onRequestSeek = usePlayerStore((s) => s._onRequestSeek);

  const analysis = useAudioAnalyser(isPlaying && !!currentSong);
  const settings = useSettingsStore((s) => s.settings);
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);
  const songs = useLibraryStore((s) => s.songs);
  const statusBarHeight = useStatusBarHeight();

  // 动态取色：从封面提取主色注入 CSS 变量
  useEffect(() => {
    if (!currentSong?.coverUrl) {
      document.documentElement.style.setProperty("--accent-color", "#FF6B35");
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 32, 32);
        const data = ctx.getImageData(0, 0, 32, 32).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const cr = data[i], cg = data[i + 1], cb = data[i + 2];
          const lum = 0.299 * cr + 0.587 * cg + 0.114 * cb;
          if (lum < 30 || lum > 230) continue;
          const max = Math.max(cr, cg, cb);
          const min = Math.min(cr, cg, cb);
          if (max - min < 20) continue;
          r += cr; g += cg; b += cb; count++;
        }
        if (count > 0) {
          const color = `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`;
          document.documentElement.style.setProperty("--accent-color", color);
        }
      } catch {}
    };
    img.src = currentSong.coverUrl;
  }, [currentSong?.coverUrl]);

  const [view, setView] = useState<View>("cover");
  const [showQueue, setShowQueue] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [seekHint, setSeekHint] = useState<"" | "rewind" | "forward">("");

  const lastTapRef = useRef(0);
  const handleDoubleTap = () => {
    if (!settings.doubleTapToPause) return;
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      togglePlay();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  // 长按快进
  const longPressTimerRef = useRef<number | null>(null);
  const seekIntervalRef = useRef<number | null>(null);
  const seekTriggeredRef = useRef(false);
  const startLongPressSeek = (direction: "rewind" | "forward") => {
    if (!settings.longPressSeek) return;
    seekTriggeredRef.current = false;
    setSeekHint(direction);
    const tick = () => {
      seekTriggeredRef.current = true;
      const cur = usePlayerStore.getState().currentTime;
      const dur = usePlayerStore.getState().duration;
      const delta = direction === "forward" ? 5 : -5;
      const target = Math.max(0, Math.min(dur, cur + delta));
      _onRequestSeek?.(target);
    };
    longPressTimerRef.current = window.setTimeout(() => {
      tick();
      seekIntervalRef.current = window.setInterval(tick, 250);
    }, 500);
  };
  const endLongPressSeek = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (seekIntervalRef.current !== null) {
      window.clearInterval(seekIntervalRef.current);
      seekIntervalRef.current = null;
    }
    setSeekHint("");
  };
  const guardClickAfterSeek = (handler: () => void) => () => {
    if (seekTriggeredRef.current) {
      seekTriggeredRef.current = false;
      return;
    }
    handler();
  };
  useEffect(() => () => endLongPressSeek(), []);

  const handleDragEnd = (_e: unknown, info: PanInfo) => {
    const threshold = 60;
    if (Math.abs(info.offset.x) > Math.abs(info.offset.y) * 1.4) {
      if (settings.swipeToSwitch) {
        if (info.offset.x < -threshold) { next(); return; }
        if (info.offset.x > threshold) { prev(); return; }
      }
    }
    if (info.offset.x < -threshold && view === "cover") {
      setView("lyrics");
    } else if (info.offset.x > threshold && view === "lyrics") {
      setView("cover");
    }
  };

  if (!currentSong) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-slate-950 via-[#05060f] to-black px-6 text-center text-white">
        <FlowingLight isPlaying={false} bass={0} className="absolute inset-0 opacity-40" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 16 }}
            className="flex h-24 w-24 items-center justify-center rounded-full bg-white/8 backdrop-blur-xl ring-1 ring-white/10"
          >
            <Play className="h-10 w-10 text-white" />
          </motion.div>
          <div>
            <h2 className="text-xl font-semibold tracking-wide">暂无播放</h2>
            <p className="mt-2 text-sm text-white/50">选择一首歌曲开始播放</p>
          </div>
          <motion.button
            type="button"
            onClick={() => navigate("/")}
            whileTap={{ scale: 0.95 }}
            className="rounded-full bg-white/12 px-6 py-2.5 text-sm font-medium text-white backdrop-blur-md hover:bg-white/20"
          >
            返回音乐库
          </motion.button>
        </div>
      </div>
    );
  }

  const playModeIcon: Record<PlayMode, React.ReactNode> = {
    order: <Repeat className="h-4 w-4" />,
    "repeat-one": <Repeat1 className="h-4 w-4" />,
    shuffle: <Shuffle className="h-4 w-4" />,
  };
  const playModeLabel: Record<PlayMode, string> = {
    order: "顺序",
    "repeat-one": "单曲",
    shuffle: "随机",
  };

  const hasLyrics = !!currentSong.lyrics;
  const isFavorite = currentSong ? !!songs.find((s) => s.id === currentSong.id)?.favorite : false;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-[#05060f] to-black text-white">
      {/* === 背景层：根据设置动态切换 === */}
      {settings.playbackBackground === "blurCover" && currentSong.coverUrl && (
        <>
          <div
            className="absolute inset-0 -z-30 scale-130"
            style={{
              backgroundImage: `url(${currentSong.coverUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(100px) saturate(200%) brightness(0.7)",
            }}
          />
          <div className="absolute inset-0 -z-20 bg-gradient-to-b from-black/40 via-black/60 to-black/80" />
        </>
      )}

      {/* 流光效果 */}
      {settings.playbackBackground === "flowLight" && (
        <FlowingLight
          coverUrl={currentSong.coverUrl}
          isPlaying={isPlaying}
          bass={analysis.bass}
          intensity={settings.flowLightIntensity}
          className="absolute inset-0 -z-10 opacity-60"
        />
      )}

      {/* 粒子效果 */}
      {settings.playbackBackground === "particle" && (
        <ParticleField
          analysis={analysis}
          isPlaying={isPlaying}
          className="absolute inset-0 z-0"
        />
      )}

      {/* 纯色背景 */}
      {settings.playbackBackground === "solid" && (
        <div
          className="absolute inset-0 -z-30"
          style={{
            background: settings.dynamicColor && currentSong.coverUrl
              ? `var(--accent-color, #FF6B35)`
              : "#05060f",
          }}
        />
      )}

      {/* 自定义图片背景 */}
      {settings.playbackBackground === "customImage" && settings.customBackgroundImage && (
        <>
          <img
            src={settings.customBackgroundImage}
            alt=""
            className="absolute inset-0 -z-30 h-full w-full object-cover"
            style={{ filter: "brightness(0.6)" }}
          />
          <div className="absolute inset-0 -z-20 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />
        </>
      )}

      {/* === 顶部极简栏 === */}
      <div
        className="relative flex items-center justify-between px-4"
        style={{ paddingTop: `${statusBarHeight}px` }}
      >
        <motion.button
          type="button"
          onClick={() => navigate(-1)}
          whileTap={{ scale: 0.9 }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/20 text-white/80 backdrop-blur-md hover:bg-black/30"
        >
          <ChevronDown className="h-5 w-5" />
        </motion.button>
        <div className="text-[10px] uppercase tracking-[0.25em] text-white/35">
          {playModeLabel[playMode]}
        </div>
        <motion.button
          type="button"
          onClick={() => setShowQueue(true)}
          whileTap={{ scale: 0.9 }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/20 text-white/80 backdrop-blur-md hover:bg-black/30"
        >
          <ListMusic className="h-4 w-4" />
        </motion.button>
      </div>

      {/* === 主区域：封面 / 歌词 === */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        onTap={handleDoubleTap}
        className="relative mx-auto flex min-h-[calc(100vh-260px)] max-w-[480px] cursor-grab px-6 active:cursor-grabbing"
      >
        <AnimatePresence mode="wait">
          {view === "lyrics" ? (
            <motion.div
              key="lyrics"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-1 flex-col"
            >
              <LyricsStage
                lyrics={currentSong.lyrics}
                currentTime={currentTime}
                onSeek={(t) => _onRequestSeek?.(t)}
                className="flex-1"
              />
              <motion.button
                type="button"
                onClick={() => setView("cover")}
                whileTap={{ scale: 0.95 }}
                className="mb-4 rounded-full bg-white/8 px-4 py-2 text-xs font-medium text-white/80 backdrop-blur-md hover:bg-white/15"
              >
                查看封面
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="cover"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-1 flex-col items-center justify-center"
            >
              {/* 封面卡片 */}
              <motion.div
                className="relative"
                animate={{
                  scale: isPlaying ? 1.02 : 0.95,
                }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              >
                {/* 封面光晕 - 更柔和宽广的效果 */}
                <motion.div
                  className="absolute -inset-6 -z-10 rounded-[40px]"
                  animate={{
                    opacity: isPlaying ? [0.4, 0.6, 0.4] : 0.15,
                    boxShadow: isPlaying
                      ? `0 0 ${80 + analysis.bass * 100}px var(--accent-color, #FF6B35), 0 0 ${120 + analysis.bass * 150}px var(--accent-color, #FF6B35)`
                      : "0 0 40px rgba(255,255,255,0.08)",
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* 封面图 - 更大尺寸、圆角、边框、阴影 */}
                <div className="relative rounded-[24px] overflow-hidden shadow-2xl ring-1 ring-white/10">
                  <CoverArt
                    src={currentSong.coverUrl}
                    alt={currentSong.title}
                    size={300}
                    rounded="lg"
                    spinning={settings.coverStyle === "vinyl" && isPlaying}
                    className={cn(
                      "ring-1 ring-white/5",
                      settings.coverStyle === "vinyl" && "rounded-full"
                    )}
                  />
                  {settings.coverStyle === "vinyl" && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="h-16 w-16 rounded-full bg-[#05060f] ring-3 ring-black/30 flex items-center justify-center">
                        <div className="h-3 w-3 rounded-full bg-white/25" />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* 频谱可视化 */}
              {settings.spectrumStyle !== "off" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 0.7, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-8 h-10 w-full max-w-[260px]"
                >
                  <SpectrumVisualizer
                    isPlaying={isPlaying}
                    style={settings.spectrumStyle}
                    mirror={settings.spectrumStyle === "mirror"}
                    barCount={40}
                  />
                </motion.div>
              )}

              {/* 歌曲信息 */}
              <motion.div
                key={currentSong.id + "-info"}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mt-8 w-full text-center"
              >
                <h1 className="text-[22px] font-bold tracking-tight">
                  {currentSong.title}
                </h1>
                <p className="mt-1.5 text-sm text-white/60">
                  {currentSong.artist}
                  {currentSong.album && currentSong.album !== "未知" && (
                    <>
                      <span className="mx-1.5 text-white/30">·</span>
                      {currentSong.album}
                    </>
                  )}
                </p>

                {/* 技术标签 */}
                {(currentSong.codec || currentSong.bitrate) && (
                  <div className="mt-2.5 flex justify-center gap-1.5">
                    {currentSong.codec && (
                      <span className="rounded-full bg-white/6 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/50">
                        {currentSong.codec}
                      </span>
                    )}
                    {currentSong.bitrate && (
                      <span className="rounded-full bg-white/6 px-2 py-0.5 text-[10px] font-medium tabular-nums text-white/50">
                        {currentSong.bitrate} kbps
                      </span>
                    )}
                  </div>
                )}

                {/* 收藏 + 歌词切换 */}
                <div className="mt-5 flex items-center justify-center gap-2">
                  <motion.button
                    type="button"
                    onClick={() => toggleFavorite(currentSong.id)}
                    whileTap={{ scale: 0.85 }}
                    className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition-colors",
                      isFavorite
                        ? "bg-rose-500/20 text-rose-400"
                        : "bg-white/6 text-white/60 hover:bg-white/12"
                    )}
                  >
                    <AnimatePresence mode="wait">
                      {isFavorite ? (
                        <motion.div
                          key="filled"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: [1.3, 0.9, 1.1, 1], opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                        >
                          <Heart className="h-5 w-5 fill-rose-400 text-rose-400" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="outline"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Heart className="h-5 w-5" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {/* 收藏时扩散光环 */}
                    <AnimatePresence>
                      {isFavorite && (
                        <motion.span
                          key="ring"
                          initial={{ scale: 0.8, opacity: 0.6 }}
                          animate={{ scale: 1.8, opacity: 0 }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="absolute inset-0 rounded-full border-2 border-rose-400"
                        />
                      )}
                    </AnimatePresence>
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => setView("lyrics")}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "rounded-full px-4 py-2 text-xs font-medium backdrop-blur-md transition-colors",
                      hasLyrics
                        ? "bg-white/6 text-white/70 hover:bg-white/12"
                        : "bg-white/4 text-white/40"
                    )}
                  >
                    歌词
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* === 底部浮动玻璃控制栏 === */}
      <div className="safe-bottom relative px-4 pb-4">
        {/* 进度条 */}
        <div className="mb-4">
          <ProgressBar
            current={currentTime}
            duration={duration}
            onSeek={(t) => _onRequestSeek?.(t)}
            className="[&_span]:!text-white/40"
          />
        </div>

        {/* 控制按钮面板 */}
        <div className="flex items-center justify-between">
          {/* 播放模式 */}
          <motion.button
            type="button"
            onClick={cyclePlayMode}
            whileTap={{ scale: 0.9 }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/6 text-white/50 backdrop-blur-md hover:bg-white/12 hover:text-white/70"
          >
            {playModeIcon[playMode]}
          </motion.button>

          {/* 上一首 */}
          <motion.button
            type="button"
            onClick={guardClickAfterSeek(() => prev())}
            onPointerDown={() => startLongPressSeek("rewind")}
            onPointerUp={endLongPressSeek}
            onPointerLeave={endLongPressSeek}
            onPointerCancel={endLongPressSeek}
            whileTap={{ scale: 0.9 }}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white/70 backdrop-blur-md hover:bg-white/15"
          >
            <SkipBack className="h-5 w-5 fill-white" />
          </motion.button>

          {/* 播放/暂停（核心按钮） */}
          <motion.button
            type="button"
            onClick={togglePlay}
            whileTap={{ scale: 0.92 }}
            animate={{
              scale: isPlaying ? [1, 1.02, 1] : 1,
              boxShadow: isPlaying
                ? `0 0 ${15 + analysis.bass * 40}px var(--accent-color, #FF6B35)`
                : "0 0 20px rgba(255,255,255,0.2)",
            }}
            transition={{
              duration: isPlaying ? 1.5 : 0.2,
              repeat: isPlaying ? Infinity : 0,
              ease: "easeInOut",
            }}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#05060f]"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isPlaying ? (
                <motion.span
                  key="pause"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Pause className="h-7 w-7 fill-[#05060f]" />
                </motion.span>
              ) : (
                <motion.span
                  key="play"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Play className="h-7 w-7 translate-x-0.5 fill-[#05060f]" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          {/* 下一首 */}
          <motion.button
            type="button"
            onClick={guardClickAfterSeek(() => next())}
            onPointerDown={() => startLongPressSeek("forward")}
            onPointerUp={endLongPressSeek}
            onPointerLeave={endLongPressSeek}
            onPointerCancel={endLongPressSeek}
            whileTap={{ scale: 0.9 }}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white/70 backdrop-blur-md hover:bg-white/15"
          >
            <SkipForward className="h-5 w-5 fill-white" />
          </motion.button>

          {/* 音量 */}
          <motion.button
            type="button"
            onClick={() => { toggleMute(); setShowVolume((v) => !v); }}
            whileTap={{ scale: 0.9 }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/6 text-white/50 backdrop-blur-md hover:bg-white/12 hover:text-white/70"
          >
            {muted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </motion.button>
        </div>

        {/* 音量滑出条 */}
        <AnimatePresence>
          {showVolume && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mt-3 flex items-center gap-3 rounded-2xl bg-white/6 px-4 py-2 backdrop-blur-md"
            >
              <VolumeX className="h-3.5 w-3.5 text-white/40" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="slider h-1 flex-1"
                style={{
                  background: `linear-gradient(to right, #fff 0%, #fff ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.15) ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.15) 100%)`,
                  borderRadius: 999,
                } as React.CSSProperties}
              />
              <Volume2 className="h-3.5 w-3.5 text-white/40" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 长按快进提示 */}
        <AnimatePresence>
          {seekHint && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-6 rounded-full bg-white/12 px-3 py-1 text-[10px] font-medium text-white backdrop-blur-md"
            >
              {seekHint === "forward" ? "快进中" : "快退中"}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 播放队列抽屉 */}
      <AnimatePresence>
        {showQueue && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end"
            onClick={() => setShowQueue(false)}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 36 }}
              onClick={(e) => e.stopPropagation()}
              className="safe-bottom relative z-10 max-h-[65vh] w-full max-w-[480px] overflow-hidden rounded-t-3xl bg-[#0a0e25]/95 backdrop-blur-2xl"
            >
              <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/15" />
              <div className="flex items-center justify-between px-4 py-3">
                <h3 className="text-base font-semibold text-white">
                  播放队列
                  <span className="ml-2 text-xs font-normal text-white/45">
                    {queue.length} 首
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowQueue(false)}
                  className="text-sm text-white/50 hover:text-white"
                >
                  关闭
                </button>
              </div>
              <div className="thin-scrollbar max-h-[55vh] overflow-y-auto px-2 pb-4">
                {queue.length === 0 ? (
                  <div className="py-10 text-center text-sm text-white/40">
                    队列为空
                  </div>
                ) : (
                  queue.map((s, i) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { playAt(i); setShowQueue(false); }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors",
                        i === currentIndex ? "bg-white/8" : "hover:bg-white/4"
                      )}
                    >
                      <div className="w-5 text-center text-xs tabular-nums text-white/35">
                        {i === currentIndex && isPlaying ? (
                          <span className="flex h-3 items-end justify-center gap-[2px]">
                            <motion.span
                              className="w-[2px] bg-white/60"
                              animate={{ height: ["60%", "100%", "60%"] }}
                              transition={{ duration: 0.8, repeat: Infinity }}
                            />
                            <motion.span
                              className="w-[2px] bg-white/60"
                              animate={{ height: ["85%", "60%", "85%"] }}
                              transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                            />
                            <motion.span
                              className="w-[2px] bg-white/60"
                              animate={{ height: ["45%", "85%", "45%"] }}
                              transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                            />
                          </span>
                        ) : (
                          i + 1
                        )}
                      </div>
                      <CoverArt src={s.coverUrl} alt={s.title} size={40} rounded="sm" />
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            "text-truncate text-sm font-medium",
                            i === currentIndex ? "text-white/90" : "text-white/70"
                          )}
                        >
                          {s.title}
                        </div>
                        <div className="text-truncate text-xs text-white/40">
                          {s.artist}
                        </div>
                      </div>
                      <div className="text-[10px] tabular-nums text-white/30">
                        {formatTime(s.duration)}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
