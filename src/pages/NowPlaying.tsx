import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Disc3,
  ListMusic,
  Mic2,
  MoreHorizontal,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import { useAudioAnalyser } from "@/hooks/useAudioAnalyser";
import ParticleField from "@/components/ParticleField";
import LyricsStage from "@/components/LyricsStage";
import ProgressBar from "@/components/ProgressBar";
import IconButton from "@/components/IconButton";
import CoverArt from "@/components/CoverArt";
import type { PlayMode } from "@/types";
import { formatTime } from "@/utils/format";
import { cn } from "@/lib/utils";

// Mineradio 风格播放页
// - 全屏深空粒子背景，跟随音乐节奏律动
// - 中央歌词舞台（电影字幕式）
// - 顶部最小化导航与歌曲信息
// - 底部专辑封面 + 播放控制
// - 右下角低调播放状态指示

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
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const cyclePlayMode = usePlayerStore((s) => s.cyclePlayMode);
  const playAt = usePlayerStore((s) => s.playAt);
  const _onRequestSeek = usePlayerStore((s) => s._onRequestSeek);

  // 仅在播放时启用频谱分析（暂停时停用节省性能）
  const analysis = useAudioAnalyser(isPlaying && !!currentSong);

  const [view, setView] = useState<View>("stage");
  const [showQueue, setShowQueue] = useState(false);

  if (!currentSong) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 bg-[#05060f] px-6 text-center text-white">
        <ParticleField
          analysis={{ level: 0, bass: 0, mid: 0, treble: 0, beat: false }}
          isPlaying={false}
          className="absolute inset-0"
        />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
            <Play className="h-9 w-9 text-white" />
          </div>
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05060f] text-white">
      {/* 粒子背景 */}
      <div className="absolute inset-0 -z-10">
        <ParticleField analysis={analysis} isPlaying={isPlaying} />
      </div>

      {/* 暗色渐变遮罩 - 提升前景文字可读性 */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black/40 via-transparent to-black/70" />

      {/* 顶部栏 */}
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

      {/* 主区域：歌词舞台 / 封面视图切换 */}
      <div className="relative mx-auto flex min-h-[calc(100vh-200px)] max-w-[480px] flex-col px-2">
        <AnimatePresence mode="wait">
          {view === "stage" ? (
            <motion.div
              key="stage"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex-1"
            >
              {hasLyrics ? (
                <LyricsStage
                  lyrics={currentSong.lyrics}
                  currentTime={currentTime}
                  onSeek={(t) => _onRequestSeek?.(t)}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-6">
                  <motion.div
                    animate={{
                      scale: isPlaying ? 1 : 0.92,
                      rotate: isPlaying ? 360 : 0,
                    }}
                    transition={{
                      scale: { type: "spring", stiffness: 200, damping: 20 },
                      rotate: {
                        duration: 30,
                        ease: "linear",
                        repeat: isPlaying ? Infinity : 0,
                      },
                    }}
                  >
                    <CoverArt
                      src={currentSong.coverUrl}
                      alt={currentSong.title}
                      size={220}
                      rounded="full"
                      className="ring-1 ring-white/15 shadow-cover"
                    />
                  </motion.div>
                  <div className="text-center">
                    <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">
                      PURE MUSIC
                    </div>
                    <div className="mt-2 text-sm text-white/70">
                      这首曲目没有内嵌歌词
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="cover"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4 }}
              className="flex flex-1 flex-col items-center justify-center"
            >
              <motion.div
                animate={{
                  scale: isPlaying ? 1 : 0.92,
                }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="relative"
                style={{
                  filter: `drop-shadow(0 12px 40px rgba(80, 130, 255, ${
                    0.3 + analysis.bass * 0.4
                  }))`,
                }}
              >
                <CoverArt
                  src={currentSong.coverUrl}
                  alt={currentSong.title}
                  size={280}
                  rounded="lg"
                  className="ring-1 ring-white/20"
                />
                {/* 节拍光环 */}
                <motion.div
                  className="absolute -inset-2 -z-10 rounded-3xl"
                  animate={{
                    boxShadow: `0 0 ${30 + analysis.bass * 80}px rgba(120, 160, 255, ${
                      0.4 + analysis.bass * 0.5
                    })`,
                  }}
                />
              </motion.div>

              <motion.div
                key={currentSong.id + "-info"}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 w-full max-w-[320px] text-center"
              >
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
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 底部：歌曲信息 + 进度条 + 控制 */}
      <div className="safe-bottom relative mx-auto w-full max-w-[480px] px-5 pb-3 pt-2">
        {/* 歌曲信息行 + 视图切换 */}
        <div className="mb-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setView(view === "stage" ? "cover" : "stage")}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <motion.div
              animate={{
                boxShadow: `0 0 ${10 + analysis.bass * 25}px rgba(120, 160, 255, ${
                  0.3 + analysis.bass * 0.5
                })`,
              }}
              className="rounded-lg"
            >
              <CoverArt
                src={currentSong.coverUrl}
                alt={currentSong.title}
                size={40}
                rounded="md"
              />
            </motion.div>
            <div className="min-w-0 flex-1">
              <div className="text-truncate text-sm font-semibold">
                {currentSong.title}
              </div>
              <div className="text-truncate text-xs text-white/55">
                {currentSong.artist}
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setView(view === "stage" ? "cover" : "stage")}
            disabled={!hasLyrics && view === "stage"}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              view === "cover"
                ? "bg-white text-[#0a1230]"
                : "bg-white/12 text-white/80 hover:bg-white/20",
              !hasLyrics && view === "stage" && "cursor-not-allowed opacity-50"
            )}
          >
            {view === "cover" ? (
              <>
                <Mic2 className="h-3.5 w-3.5" />
                歌词舞台
              </>
            ) : (
              <>
                <Disc3 className="h-3.5 w-3.5" />
                封面
              </>
            )}
          </button>
        </div>

        {/* 进度条 */}
        <div className="mb-3">
          <ProgressBar
            current={currentTime}
            duration={duration}
            onSeek={(t) => _onRequestSeek?.(t)}
            className="[&_span]:!text-white/55"
          />
        </div>

        {/* 控制按钮 */}
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

          <button
            type="button"
            onClick={() => prev()}
            aria-label="上一曲"
            className="flex h-12 w-12 items-center justify-center rounded-full text-white transition-transform pressable hover:bg-white/10"
          >
            <SkipBack className="h-6 w-6 fill-white" />
          </button>

          <motion.button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "暂停" : "播放"}
            whileTap={{ scale: 0.9 }}
            animate={{
              boxShadow: `0 0 ${20 + analysis.bass * 40}px rgba(180, 210, 255, ${
                0.4 + analysis.bass * 0.4
              })`,
            }}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#0a1230]"
          >
            {isPlaying ? (
              <Pause className="h-7 w-7 fill-[#0a1230]" />
            ) : (
              <Play className="h-7 w-7 translate-x-0.5 fill-[#0a1230]" />
            )}
          </motion.button>

          <button
            type="button"
            onClick={() => next()}
            aria-label="下一曲"
            className="flex h-12 w-12 items-center justify-center rounded-full text-white transition-transform pressable hover:bg-white/10"
          >
            <SkipForward className="h-6 w-6 fill-white" />
          </button>

          <IconButton ariaLabel="更多" className="text-white/75 hover:bg-white/15" size="sm">
            <MoreHorizontal className="h-[18px] w-[18px]" />
          </IconButton>
        </div>
      </div>

      {/* 右下角低调播放状态指示 */}
      <div className="pointer-events-none absolute bottom-3 right-4 z-20">
        <motion.div
          animate={{ opacity: isPlaying ? 1 : 0.4 }}
          className="flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1 backdrop-blur-md"
        >
          <div className="flex h-3 items-end gap-[2px]">
            <motion.span
              className="w-[2px] rounded-full bg-cyan-300"
              animate={{ height: isPlaying ? ["30%", "100%", "30%"] : "30%" }}
              transition={{
                duration: 0.6,
                repeat: isPlaying ? Infinity : 0,
                ease: "easeInOut",
              }}
              style={{ height: "30%" }}
            />
            <motion.span
              className="w-[2px] rounded-full bg-cyan-300"
              animate={{ height: isPlaying ? ["60%", "30%", "60%"] : "30%" }}
              transition={{
                duration: 0.6,
                repeat: isPlaying ? Infinity : 0,
                ease: "easeInOut",
                delay: 0.15,
              }}
              style={{ height: "30%" }}
            />
            <motion.span
              className="w-[2px] rounded-full bg-cyan-300"
              animate={{ height: isPlaying ? ["100%", "50%", "100%"] : "30%" }}
              transition={{
                duration: 0.6,
                repeat: isPlaying ? Infinity : 0,
                ease: "easeInOut",
                delay: 0.3,
              }}
              style={{ height: "30%" }}
            />
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-white/70">
            {isPlaying ? "Live" : "Paused"}
          </span>
        </motion.div>
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
                        i === currentIndex
                          ? "bg-cyan-400/15"
                          : "hover:bg-white/8"
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
