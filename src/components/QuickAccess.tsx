import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Clock,
  ListMusic,
  Music4,
  Shuffle,
} from "lucide-react";
import { useLibraryStore } from "@/store/libraryStore";
import { usePlayerStore } from "@/store/playerStore";
import { formatCount } from "@/utils/format";
import { cn } from "@/lib/utils";

interface QuickAccessProps {
  onShuffle?: () => void;
}

interface QuickItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  onClick: () => void;
  count?: string;
}

export default function QuickAccess({ onShuffle }: QuickAccessProps) {
  const navigate = useNavigate();
  const songs = useLibraryStore((s) => s.songs);
  const recentIds = useLibraryStore((s) => s.recentIds);
  const playlists = useLibraryStore((s) => s.playlists);
  const playSong = usePlayerStore((s) => s.playSong);
  const setQueue = usePlayerStore((s) => s.setQueue);

  const handleShuffle = () => {
    if (songs.length === 0) return;
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    setQueue(shuffled, 0);
    if (onShuffle) onShuffle();
    else playSong(shuffled[0], shuffled);
  };

  const items: QuickItem[] = [
    {
      key: "all",
      label: "全部歌曲",
      icon: <Music4 className="h-5 w-5" />,
      color: "text-accent",
      bg: "bg-accent/12",
      count: formatCount(songs.length),
      onClick: () => navigate("/playlists"),
    },
    {
      key: "recent",
      label: "最近播放",
      icon: <Clock className="h-5 w-5" />,
      color: "text-sky-500",
      bg: "bg-sky-500/12",
      count: formatCount(recentIds.length),
      onClick: () => navigate("/playlists?tab=recent"),
    },
    {
      key: "playlists",
      label: "我的歌单",
      icon: <ListMusic className="h-5 w-5" />,
      color: "text-emerald-500",
      bg: "bg-emerald-500/12",
      count: formatCount(playlists.length),
      onClick: () => navigate("/playlists?tab=mine"),
    },
    {
      key: "shuffle",
      label: "随机播放",
      icon: <Shuffle className="h-5 w-5" />,
      color: "text-violet-500",
      bg: "bg-violet-500/12",
      onClick: handleShuffle,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {items.map((item, i) => (
        <motion.button
          key={item.key}
          type="button"
          onClick={item.onClick}
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            delay: 0.05 * i + 0.1,
            type: "spring",
            stiffness: 320,
            damping: 22,
          }}
          whileTap={{ scale: 0.95 }}
          whileHover={{ y: -2 }}
          className={cn(
            "group relative flex items-center gap-3 overflow-hidden rounded-2xl p-3 text-left",
            "border border-black/[0.04] bg-white/80 shadow-card backdrop-blur-md",
            "transition-colors hover:bg-white",
            "dark:border-white/[0.06] dark:bg-white/[0.06] dark:hover:bg-white/[0.1]"
          )}
        >
          {/* 卡片右上角微光晕（hover 时显现）*/}
          <div
            className={cn(
              "pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-0 blur-2xl transition-opacity group-hover:opacity-100",
              item.bg
            )}
          />
          <div
            className={cn(
              "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm",
              item.bg,
              item.color
            )}
          >
            {item.icon}
          </div>
          <div className="relative min-w-0 flex-1">
            <div className="text-truncate text-sm font-bold text-ink">
              {item.label}
            </div>
            {item.count !== undefined && (
              <div className="mt-0.5 text-xs text-ink-muted">{item.count} 首</div>
            )}
          </div>
        </motion.button>
      ))}
    </div>
  );
}
