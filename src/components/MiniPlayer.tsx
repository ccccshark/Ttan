import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, SkipForward } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import CoverArt from "./CoverArt";
import { formatTime } from "@/utils/format";

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
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="safe-bottom fixed inset-x-0 bottom-0 z-30 px-3 pb-2"
        >
          <div className="glass glass-light mx-auto max-w-[480px] overflow-hidden rounded-2xl shadow-mini">
            {/* 顶部进度条 */}
            <div className="h-[2px] w-full bg-black/5 dark:bg-white/8">
              <motion.div
                className="h-full bg-accent"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center gap-3 p-2.5">
              <button
                type="button"
                onClick={() => navigate("/playing")}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <CoverArt
                  src={currentSong.coverUrl}
                  alt={currentSong.title}
                  size={44}
                  rounded="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-truncate text-sm font-semibold text-ink">
                    {currentSong.title}
                  </div>
                  <div className="text-truncate text-xs text-ink-muted">
                    {currentSong.artist}
                    {duration > 0 && (
                      <span className="ml-2 tabular-nums text-ink-subtle">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? "暂停" : "播放"}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white shadow-glow pressable"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 fill-white" />
                ) : (
                  <Play className="h-5 w-5 fill-white translate-x-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => next()}
                aria-label="下一曲"
                className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-black/5 dark:hover:bg-white/10 pressable"
              >
                <SkipForward className="h-5 w-5 fill-current" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
