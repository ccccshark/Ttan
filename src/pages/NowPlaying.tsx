import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import {
  ChevronDown,
  Disc3,
  Heart,
  ListMusic,
  Mic2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Share2,
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
import ParticleField from "@/components/ParticleField";
import FlowingLight from "@/components/FlowingLight";
import LyricsStage from "@/components/LyricsStage";
import ProgressBar from "@/components/ProgressBar";
import IconButton from "@/components/IconButton";
import CoverArt from "@/components/CoverArt";
import SpectrumVisualizer from "@/components/SpectrumVisualizer";
import type { PlayMode } from "@/types";
import { formatTime } from "@/utils/format";
import { cn } from "@/lib/utils";

// 椒盐风格播放页：
// - 流光 V2 背景（封面取色高斯模糊）
// - 左对齐歌曲信息（不居中，更克制）
// - 大圆角封面（24px）+ 黑胶模式可选
// - 底部 5 按钮控制：随机 / 上一首 / 播放(64px) / 下一首 / 循环
// - 双面：封面 / 歌词
// - 频谱可视化条带
type View = "stage" | "cover";

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

  // 动态取色（流光 V2）
  useEffect(() => {
    if (!currentSong?.coverUrl) return;
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
          if (lum < 40 || lum > 220) continue;
          const max = Math.max(cr, cg, cb);
          const min = Math.min(cr, cg, cb);
          if (max - min < 25) continue;
          r += cr; g += cg; b += cb; count++;
        }
        if (count > 0) {
          const color = `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`;
          document.documentElement.style.setProperty("--accent-color", color);
        }
      } catch {
        // 跨域或读取失败
      }
    };
    img.src = currentSong.coverUrl;
  }, [currentSong?.coverUrl]);

  const [view, setView] = useState<View>("cover");
  const [showQueue, setShowQueue] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  // 长按快进状态：记录当前正在快进的方向与速度
  const [seekHint, setSeekHint] = useState<"" | "rewind" | "forward">("");

  // 双击检测
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

  // 长按快进/快退：按下 500ms 后开始，每 250ms 跳 5s
  const longPressTimerRef = useRef<number | null>(null);
  const seekIntervalRef = useRef<number | null>(null);
  // 标记是否已经触发长按：避免松开时再触发 click 切歌
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
  // 长按后短延迟内拦截 click
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
        if (info.offset.x < -threshold) {
          next();
          return;
        }
        if (info.offset.x > threshold) {
          prev();
          return;
        }
      }
    }
    if (info.offset.x < -threshold && view === "cover") {
      setView("stage");
    } else if (info.offset.x > threshold && view === "stage") {
      setView("cover");
    }
  };

  if (!currentSong) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 bg-[#05060f] px-6 text-center text-white">
        <FlowingLight isPlaying={false} bass={0} className="absolute inset-0" />
        <ParticleField
          analysis={{ level: 0, bass: 0, mid: 0, treble: 0, beat: false }}
          isPlaying={false}
          className="absolute inset-0 opacity-60"
        />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur-md ring-1 ring-white/15"
          >
            <Play className="h-9 w-9 text-white" />
          </motion.div>
          <div>
            <h2 className="text-base font-semibold">银河静默中</h2>
            <p className="mt-1 text-sm text-white/60">
              从音乐库选择一首歌，开启你的私人音乐空间
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-full bg-white/15 px-5 py-2 text-sm font-medium text-white backdrop-blur-md pressable hover:bg-white/25"
          >
            去音乐库
          </button>
        </div>
      </div>
    );
  }

  const playModeIcon: Record<PlayMode, React.ReactNode> = {
    order: <Repeat className="h-[18px] w-[18px]" />,
    "repeat-one": <Repeat1 className="h-[18px] w-[18px]" />,
    shuffle: <Shuffle className="h-[18px] w-[18px]" />,
  };
  const playModeLabel: Record<PlayMode, string> = {
    order: "顺序播放",
    "repeat-one": "单曲循环",
    shuffle: "随机播放",
  };

  const hasLyrics = !!currentSong.lyrics;
  const effectiveView: View = hasLyrics ? view : "cover";
  const isFavorite = !!currentSong.favorite;
  const isVinyl = settings.coverStyle === "vinyl";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05060f] text-white">
      {/* === 流光 V2 背景层 === */}
      {settings.playbackBackground === "flowLight" && (
        <FlowingLight
          coverUrl={currentSong.coverUrl}
          isPlaying={isPlaying}
          bass={analysis.bass}
          intensity={settings.flowLightIntensity}
          className="absolute inset-0 -z-20"
        />
      )}
      {settings.playbackBackground === "particle" && (
        <div className="absolute inset-0 -z-20">
          <FlowingLight
            coverUrl={currentSong.coverUrl}
            isPlaying={isPlaying}
            bass={analysis.bass}
            intensity={settings.flowLightIntensity * 0.4}
          />
          <ParticleField analysis={analysis} isPlaying={isPlaying} />
        </div>
      )}
      {settings.playbackBackground === "blurCover" && currentSong.coverUrl && (
        <>
          <div
            className="absolute inset-0 -z-20 scale-125 bg-cover bg-center opacity-60"
            style={{
              backgroundImage: `url(${currentSong.coverUrl})`,
              filter: "blur(80px) saturate(180%)",
            }}
          />
          <div className="absolute inset-0 -z-20 bg-black/50" />
        </>
      )}
      {settings.playbackBackground === "solid" && (
        <div className="absolute inset-0 -z-20 bg-[#05060f]" />
      )}
      {settings.playbackBackground === "none" && (
        <div className="absolute inset-0 -z-20 bg-black" />
      )}

      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black/30 via-transparent to-black/70" />

      {/* === 顶部栏 === */}
      <div className="safe-top relative flex items-center justify-between px-4 pt-3">
        <IconButton
          ariaLabel="返回"
          onClick={() => navigate(-1)}
          className="text-white/90 hover:bg-white/15"
        >
          <ChevronDown className="h-6 w-6" />
        </IconButton>
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/45">
            NOW PLAYING
          </span>
          <span className="text-xs font-medium text-white/80">
            {playModeLabel[playMode]}
          </span>
        </div>
        <IconButton
          ariaLabel="播放队列"
          onClick={() => setShowQueue(true)}
          className="text-white/90 hover:bg-white/15"
        >
          <ListMusic className="h-5 w-5" />
        </IconButton>
      </div>

      {/* === 主区域：封面 / 歌词双面 === */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        onDragEnd={handleDragEnd}
        onTap={handleDoubleTap}
        className="relative mx-auto flex min-h-[calc(100vh-280px)] max-w-[480px] cursor-grab touch-pan-y px-2 active:cursor-grabbing"
      >
        <AnimatePresence mode="wait">
          {effectiveView === "stage" ? (
            <motion.div
              key="stage"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1"
            >
              <LyricsStage
                lyrics={currentSong.lyrics}
                currentTime={currentTime}
                onSeek={(t) => _onRequestSeek?.(t)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="cover"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-1 flex-col items-center justify-center"
            >
              {/* 封面 + 节拍光环 */}
              <motion.div
                animate={{
                  scale: isPlaying ? 1 : 0.94,
                }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="relative"
                style={{
                  filter: `drop-shadow(0 16px 50px rgba(80, 130, 255, ${
                    0.35 + analysis.bass * 0.4
                  }))`,
                }}
              >
                <div className={cn("relative", isVinyl && "rounded-full overflow-hidden")}>
                  <CoverArt
                    src={currentSong.coverUrl}
                    alt={currentSong.title}
                    size={280}
                    rounded={isVinyl ? "full" : "lg"}
                    spinning={isVinyl && isPlaying}
                    className={cn(
                      "ring-1 ring-white/15",
                      isVinyl && "shadow-[0_0_60px_rgba(0,0,0,0.5)]"
                    )}
                  />
                  {isVinyl && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="h-16 w-16 rounded-full bg-[#05060f] ring-4 ring-black/40 flex items-center justify-center">
                        <div className="h-3 w-3 rounded-full bg-white/30" />
                      </div>
                    </div>
                  )}
                </div>
                {!isVinyl && (
                  <motion.div
                    className="absolute -inset-3 -z-10 rounded-3xl"
                    animate={{
                      boxShadow: `0 0 ${30 + analysis.bass * 90}px rgba(120, 160, 255, ${
                        0.4 + analysis.bass * 0.5
                      })`,
                    }}
                  />
                )}
              </motion.div>

              {/* 频谱可视化 */}
              {settings.spectrumStyle !== "off" && (
                <div className="mt-6 h-12 w-full max-w-[280px] opacity-80">
                  <SpectrumVisualizer
                    isPlaying={isPlaying}
                    style={settings.spectrumStyle}
                    mirror={settings.spectrumStyle === "mirror"}
                    barCount={48}
                  />
                </div>
              )}

              {/* 歌曲信息：左对齐（椒盐风格） */}
              <motion.div
                key={currentSong.id + "-info"}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="mt-6 w-full max-w-[320px] px-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h1 className="text-truncate text-2xl font-bold leading-tight">
                      {currentSong.title}
                    </h1>
                    <p className="mt-1.5 text-truncate text-sm text-white/65">
                      {currentSong.artist}
                      {currentSong.album && currentSong.album !== "未知" && (
                        <>
                          <span className="mx-2 text-white/35">·</span>
                          {currentSong.album}
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(currentSong.id)}
                    aria-label="收藏"
                    className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/8 backdrop-blur-md transition-colors hover:bg-white/15"
                  >
                    <Heart
                      className={cn(
                        "h-5 w-5 transition-all",
                        isFavorite ? "fill-rose-500 text-rose-500 scale-110" : "text-white/70"
                      )}
                    />
                  </button>
                </div>

                {/* 技术信息小标签（发烧友向） */}
                {(currentSong.codec || currentSong.bitrate) && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {currentSong.codec && (
                      <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/70 backdrop-blur-md">
                        {currentSong.codec}
                      </span>
                    )}
                    {currentSong.bitrate && (
                      <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium tabular-nums text-white/70 backdrop-blur-md">
                        {currentSong.bitrate} kbps
                      </span>
                    )}
                    {currentSong.sampleRate && (
                      <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium tabular-nums text-white/70 backdrop-blur-md">
                        {(currentSong.sampleRate / 1000).toFixed(1)} kHz
                      </span>
                    )}
                    {currentSong.bitsPerSample && (
                      <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium tabular-nums text-white/70 backdrop-blur-md">
                        {currentSong.bitsPerSample}-bit
                      </span>
                    )}
                  </div>
                )}

                {/* 歌词切换按钮 */}
                <div className="mt-4 flex items-center gap-2">
                  {hasLyrics && (
                    <button
                      type="button"
                      onClick={() => setView(view === "stage" ? "cover" : "stage")}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-colors",
                        view === "stage"
                          ? "bg-white/12 text-white/80 hover:bg-white/20"
                          : "bg-white text-[#05060f]"
                      )}
                    >
                      {view === "stage" ? (
                        <>
                          <Disc3 className="h-3.5 w-3.5" />
                          封面
                        </>
                      ) : (
                        <>
                          <Mic2 className="h-3.5 w-3.5" />
                          歌词
                        </>
                      )}
                    </button>
                  )}
                  {settings.shareLyricCard && (
                    <button
                      type="button"
                      aria-label="分享"
                      onClick={() => {
                        const text = `🎵 ${currentSong.title} - ${currentSong.artist}`;
                        if (navigator.share) {
                          void navigator
                            .share({ title: currentSong.title, text, url: window.location.href })
                            .catch(() => {});
                        } else if (navigator.clipboard) {
                          void navigator.clipboard.writeText(text).catch(() => {});
                        }
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 backdrop-blur-md transition-colors hover:bg-white/15"
                    >
                      <Share2 className="h-[18px] w-[18px] text-white/70" />
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* === 底部：进度条 + 5 按钮控制 === */}
      <div className="safe-bottom relative mx-auto w-full max-w-[480px] px-5 pb-4 pt-2">
        {/* 长按快进/快退提示 */}
        <AnimatePresence>
          {seekHint && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-[10px] font-medium text-white backdrop-blur-md"
            >
              {seekHint === "forward" ? "» 快进中" : "« 快退中"}
            </motion.div>
          )}
        </AnimatePresence>
        {/* 进度条 */}
        <div className="mb-3">
          <ProgressBar
            current={currentTime}
            duration={duration}
            onSeek={(t) => _onRequestSeek?.(t)}
            className="[&_span]:!text-white/55"
          />
        </div>

        {/* 5 按钮控制：随机 / 上一首 / 播放 / 下一首 / 循环 */}
        <div className="flex items-center justify-between">
          <IconButton
            ariaLabel={playModeLabel[playMode]}
            onClick={cyclePlayMode}
            className="text-white/75 hover:bg-white/15"
            active
            size="sm"
          >
            {playModeIcon[playMode]}
          </IconButton>

          <motion.button
            type="button"
            onClick={guardClickAfterSeek(() => prev())}
            onPointerDown={() => startLongPressSeek("rewind")}
            onPointerUp={endLongPressSeek}
            onPointerLeave={endLongPressSeek}
            onPointerCancel={endLongPressSeek}
            aria-label="上一曲（长按快退）"
            whileTap={{ scale: 0.85 }}
            className="flex h-12 w-12 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
          >
            <SkipBack className="h-6 w-6 fill-white" />
          </motion.button>

          <motion.button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "暂停" : "播放"}
            whileTap={{ scale: 0.9 }}
            animate={{
              boxShadow: `0 0 ${20 + analysis.bass * 50}px rgba(180, 210, 255, ${
                0.45 + analysis.bass * 0.4
              })`,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#05060f]"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isPlaying ? (
                <motion.span
                  key="pause"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <Pause className="h-7 w-7 fill-[#05060f]" />
                </motion.span>
              ) : (
                <motion.span
                  key="play"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <Play className="h-7 w-7 translate-x-0.5 fill-[#05060f]" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          <motion.button
            type="button"
            onClick={guardClickAfterSeek(() => next())}
            onPointerDown={() => startLongPressSeek("forward")}
            onPointerUp={endLongPressSeek}
            onPointerLeave={endLongPressSeek}
            onPointerCancel={endLongPressSeek}
            aria-label="下一曲（长按快进）"
            whileTap={{ scale: 0.85 }}
            className="flex h-12 w-12 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
          >
            <SkipForward className="h-6 w-6 fill-white" />
          </motion.button>

          <IconButton
            ariaLabel="音量"
            onClick={() => {
              toggleMute();
              setShowVolume((v) => !v);
            }}
            className="text-white/75 hover:bg-white/15"
            size="sm"
          >
            {muted || volume === 0 ? (
              <VolumeX className="h-[18px] w-[18px]" />
            ) : (
              <Volume2 className="h-[18px] w-[18px]" />
            )}
          </IconButton>
        </div>

        {/* 音量滑出条 */}
        <AnimatePresence>
          {showVolume && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mt-3 flex items-center gap-3 rounded-2xl bg-white/8 px-4 py-2 backdrop-blur-md"
            >
              <VolumeX className="h-4 w-4 text-white/55" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="slider h-1.5 flex-1"
                style={
                  {
                    background: `linear-gradient(to right, #fff 0%, #fff ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.18) ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.18) 100%)`,
                    borderRadius: 999,
                  } as React.CSSProperties
                }
              />
              <Volume2 className="h-4 w-4 text-white/55" />
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
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 36 }}
              onClick={(e) => e.stopPropagation()}
              className="safe-bottom relative z-10 max-h-[60vh] w-full max-w-[480px] overflow-hidden rounded-t-3xl border border-white/10 bg-[#0a1230]/90 backdrop-blur-2xl"
            >
              <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/20" />
              <div className="flex items-center justify-between px-4 py-3">
                <h3 className="text-base font-semibold text-white">
                  播放队列
                  <span className="ml-2 text-xs font-normal text-white/50">
                    {queue.length} 首
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowQueue(false)}
                  className="text-sm text-cyan-300"
                >
                  关闭
                </button>
              </div>
              <div className="thin-scrollbar max-h-[50vh] overflow-y-auto px-2 pb-4">
                {queue.length === 0 ? (
                  <div className="py-8 text-center text-sm text-white/50">
                    队列为空
                  </div>
                ) : (
                  queue.map((s, i) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        playAt(i);
                        setShowQueue(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors",
                        i === currentIndex ? "bg-cyan-400/15" : "hover:bg-white/8"
                      )}
                    >
                      <div className="w-5 text-center text-xs tabular-nums text-white/45">
                        {i === currentIndex && isPlaying ? (
                          <span className="flex h-3 items-end justify-center gap-[2px]">
                            <span className="w-[2px] animate-pulse-soft bg-cyan-300" style={{ height: "100%" }} />
                            <span className="w-[2px] animate-pulse-soft bg-cyan-300" style={{ height: "60%", animationDelay: "0.2s" }} />
                            <span className="w-[2px] animate-pulse-soft bg-cyan-300" style={{ height: "85%", animationDelay: "0.4s" }} />
                          </span>
                        ) : (
                          i + 1
                        )}
                      </div>
                      <CoverArt src={s.coverUrl} alt={s.title} size={36} rounded="sm" />
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            "text-truncate text-sm font-medium",
                            i === currentIndex ? "text-cyan-300" : "text-white"
                          )}
                        >
                          {s.title}
                        </div>
                        <div className="text-truncate text-xs text-white/50">
                          {s.artist}
                        </div>
                      </div>
                      <div className="text-[10px] tabular-nums text-white/40">
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
