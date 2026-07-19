import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, SkipForward } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import CoverArt from "./CoverArt";

// 迷你播放条（SaltPlayer V12 风格）：
// - 液态玻璃质感（blur 40 + saturate 200%）
// - 顶部细线进度条
// - 播放/暂停按钮 crossfade 动画
// - 上滑可展开为全屏播放页（通过点击触发）
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
          className="safe-bottom fixed inset-x-0 bottom-0 z-30 px-3 pb-2"
        >
          <motion.button
            type="button"
            onClick={() => navigate("/playing")}
            whileTap={{ scale: 0.985 }}
            className="mx-auto block w-full max-w-[480px] overflow-hidden rounded-2xl border border-white/10 bg-black/30 shadow-mini backdrop-blur-2xl dark:bg-white/[0.06] dark:backdrop-saturate-200"
            style={{
              // 液态玻璃质感
              backdropFilter: "blur(40px) saturate(180%)",
              WebkitBackdropFilter: "blur(40px) saturate(180%)",
            }}
          >
            {/* 顶部进度条 */}
            <div className="h-[2px] w-full bg-white/8">
              <motion.div
                className="h-full bg-gradient-to-r from-accent to-accent-300"
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
                  size={44}
                  rounded="md"
                />
                {/* 节拍光环（迷你版）*/}
                {isPlaying && (
                  <motion.div
                    className="absolute -inset-1 -z-10 rounded-xl bg-accent/40 blur-md"
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
                  className="text-truncate text-sm font-semibold text-ink dark:text-white"
                >
                  {currentSong.title}
                </motion.div>
                <div className="text-truncate text-xs text-ink-muted dark:text-white/55">
                  {currentSong.artist}
                </div>
              </div>

              {/* 播放/暂停按钮 */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                aria-label={isPlaying ? "暂停" : "播放"}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white shadow-glow pressable"
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
