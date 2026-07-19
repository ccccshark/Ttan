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
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 * i + 0.1, type: "spring", stiffness: 300, damping: 24 }}
          whileTap={{ scale: 0.96 }}
          className={cn(
            "flex items-center gap-3 rounded-2xl p-3 text-left",
            "bg-white shadow-card transition-colors hover:bg-white/80",
            "dark:bg-surface-card dark:hover:bg-surface-elevated"
          )}
        >
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              item.bg,
              item.color
            )}
          >
            {item.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-truncate text-sm font-semibold text-ink">
              {item.label}
            </div>
            {item.count !== undefined && (
              <div className="text-xs text-ink-muted">{item.count} 首</div>
            )}
          </div>
        </motion.button>
      ))}
    </div>
  );
}
