import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, SkipForward } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import CoverArt from "./CoverArt";

// PixelPlayer 风格迷你播放条
// - 液态玻璃质感（blur 40 + saturate 200%）
// - 圆角大卡片风格
// - 紫色进度条 + 紫色播放按钮
// - 顶部细线进度条
export default function MiniPlayer() {
  const navigate = useNavigate();
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <AnimatePresence>
      {currentSong && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="fixed inset-x-0 z-30 px-3"
          style={{ bottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }}
        >
          <motion.button
            type="button"
            onClick={() => navigate("/playing")}
            whileTap={{ scale: 0.985 }}
            className="mx-auto block w-full max-w-[460px] overflow-hidden rounded-2xl border border-white/10 bg-black/30 shadow-mini backdrop-blur-2xl dark:bg-white/[0.06] dark:backdrop-saturate-200"
            style={{
              backdropFilter: "blur(40px) saturate(180%)",
              WebkitBackdropFilter: "blur(40px) saturate(180%)",
            }}
          >
            {/* 顶部进度条 - 紫色 */}
            <div className="h-[3px] w-full bg-white/8">
              <motion.div
                className="h-full bg-gradient-to-r from-pixel-purple to-pixel-pink"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center gap-3 p-2.5">
              {/* 封面 */}
              <motion.div
                key={currentSong.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className="relative shrink-0"
              >
                <CoverArt
                  src={currentSong.coverUrl}
                  alt={currentSong.title}
                  size={46}
                  rounded="lg"
                />
                {isPlaying && (
                  <motion.div
                    className="absolute -inset-1 -z-10 rounded-xl bg-pixel-purple/40 blur-md"
                    animate={{ opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                  />
                )}
              </motion.div>

              {/* 文字信息 */}
              <div className="min-w-0 flex-1 text-left">
                <motion.div
                  key={currentSong.id + "-title"}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-truncate text-sm font-bold text-ink dark:text-white"
                >
                  {currentSong.title}
                </motion.div>
                <div className="text-truncate text-xs text-ink-muted dark:text-white/55">
                  {currentSong.artist}
                </div>
              </div>

              {/* 播放/暂停按钮 - 紫色 */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                aria-label={isPlaying ? "暂停" : "播放"}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-pixel-purple text-white shadow-lg shadow-pixel-purple/30 pressable"
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
                      <Pause className="h-5 w-5 fill-white" />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="play"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <Play className="h-5 w-5 translate-x-0.5 fill-white" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              {/* 下一曲按钮 */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label="下一曲"
                className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-black/5 dark:text-white dark:hover:bg-white/10 pressable"
              >
                <SkipForward className="h-5 w-5 fill-current" />
              </button>
            </div>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
