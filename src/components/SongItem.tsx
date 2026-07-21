import { motion } from "framer-motion";
import { MoreHorizontal, Play } from "lucide-react";
import type { Song } from "@/types";
import { formatTime } from "@/utils/format";
import { usePlayerStore } from "@/store/playerStore";
import CoverArt from "./CoverArt";
import { cn } from "@/lib/utils";

interface SongItemProps {
  song: Song;
  index?: number;
  onMore?: (song: Song) => void;
  onClick?: (song: Song) => void;
  showIndex?: boolean;
}

export default function SongItem({
  song,
  index,
  onMore,
  onClick,
  showIndex = false,
}: SongItemProps) {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playSong = usePlayerStore((s) => s.playSong);

  const isActive = currentSong?.id === song.id;

  const handleClick = () => {
    if (onClick) onClick(song);
    else playSong(song);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min((index ?? 0) * 0.03, 0.3) }}
      whileTap={{ scale: 0.985 }}
      onClick={handleClick}
      className={cn(
        "group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 font-sans",
        "transition-colors hover:bg-white/[0.06]",
        isActive && "bg-accent/12"
      )}
      style={{ WebkitFontSmoothing: "antialiased" }}
    >
      {/* 序号或封面 */}
      {showIndex && typeof index === "number" ? (
        <div className="flex h-12 w-8 items-center justify-center text-sm text-white/50">
          {isActive && isPlaying ? (
            <div className="flex h-3.5 items-end gap-[2px]">
              <span className="w-[2px] animate-pulse-soft bg-accent" style={{ height: "100%" }} />
              <span className="w-[2px] animate-pulse-soft bg-accent" style={{ height: "60%", animationDelay: "0.2s" }} />
              <span className="w-[2px] animate-pulse-soft bg-accent" style={{ height: "85%", animationDelay: "0.4s" }} />
            </div>
          ) : (
            <span className={cn("tabular-nums", isActive && "text-accent")}>
              {index + 1}
            </span>
          )}
        </div>
      ) : (
        <div className="relative">
          <CoverArt src={song.coverUrl} alt={song.title} size={48} rounded="md" />
          <div className="absolute inset-0 hidden items-center justify-center rounded-xl bg-black/40 group-hover:flex">
            <Play className="h-5 w-5 fill-white text-white" />
          </div>
        </div>
      )}

      {/* 信息 */}
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "text-truncate text-[15px] font-medium leading-tight",
            isActive ? "text-accent" : "text-white"
          )}
        >
          {song.title}
        </div>
        <div className="text-truncate mt-0.5 text-xs text-white/60">
          {song.artist}
          {song.album && song.album !== "未知" && (
            <>
              <span className="mx-1 text-white/40">·</span>
              {song.album}
            </>
          )}
        </div>
      </div>

      {/* 时长 */}
      {song.duration > 0 && (
        <div className="text-xs tabular-nums text-white/50">
          {formatTime(song.duration)}
        </div>
      )}

      {/* 更多 */}
      {onMore && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMore(song);
          }}
          aria-label="更多操作"
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      )}
    </motion.div>
  );
}
