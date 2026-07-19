import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Clock,
  Disc3,
  Flame,
  Heart,
  Music4,
  Play,
  Plus,
  Shuffle,
} from "lucide-react";
import { useLibraryStore } from "@/store/libraryStore";
import { usePlayerStore } from "@/store/playerStore";
import { useSettingsStore } from "@/store/settingsStore";
import ImportButton from "@/components/ImportButton";
import SongItem from "@/components/SongItem";
import SongSheet from "@/components/SongSheet";
import EmptyState from "@/components/EmptyState";
import CoverArt from "@/components/CoverArt";
import type { Song } from "@/types";
import { cn } from "@/lib/utils";

// 椒盐风格首页（清晰 · 沉浸 · 记忆式）
// 设计原则：
// 1. 无干扰 hero——只放问候 + 关键数据
// 2. 智能入口卡（2x2 网格）：全部 / 收藏 / 最常 / 最近
// 3. 横向卡片轮播：最近播放 / 最常播放
// 4. 列表式歌曲（默认折叠 8 首，可展开）
// 5. 动态取色：当前播放歌曲封面主色应用到强调元素
export default function Home() {
  const navigate = useNavigate();
  const songs = useLibraryStore((s) => s.songs);
  const recentIds = useLibraryStore((s) => s.recentIds);
  const playCounts = useLibraryStore((s) => s.playCounts);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const playSong = usePlayerStore((s) => s.playSong);
  const playAt = usePlayerStore((s) => s.playAt);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const settings = useSettingsStore((s) => s.settings);
  const [sheetSong, setSheetSong] = useState<Song | null>(null);
  const [showAll, setShowAll] = useState(false);

  // 动态取色：从当前播放歌曲封面提取主色
  useEffect(() => {
    if (!settings.dynamicColor || !currentSong?.coverUrl) {
      // 恢复默认强调色
      document.documentElement.style.setProperty("--accent-color", getAccentDefault(settings.accentPreset, settings.accentCustom));
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
  }, [settings.dynamicColor, settings.accentPreset, settings.accentCustom, currentSong?.coverUrl]);

  const visibleSongsAll = useMemo(() => songs.filter((s) => !s.hidden), [songs]);
  const sortedSongs = useMemo(
    () => [...visibleSongsAll].sort((a, b) => b.addedAt - a.addedAt),
    [visibleSongsAll]
  );
  const visibleSongs = showAll ? sortedSongs : sortedSongs.slice(0, 8);

  const favorites = useMemo(
    () => visibleSongsAll.filter((s) => s.favorite),
    [visibleSongsAll]
  );
  const recentSongs = useMemo(() => {
    const map = new Map(visibleSongsAll.map((s) => [s.id, s]));
    return recentIds
      .map((id) => map.get(id))
      .filter((s): s is Song => !!s)
      .slice(0, 10);
  }, [recentIds, visibleSongsAll]);
  const mostPlayed = useMemo(() => {
    return [...visibleSongsAll]
      .map((s) => ({ s, count: playCounts[s.id]?.count ?? s.playCount ?? 0 }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((x) => x.s);
  }, [visibleSongsAll, playCounts]);

  // 简单问候语
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 6) return "夜深了";
    if (h < 12) return "早上好";
    if (h < 14) return "中午好";
    if (h < 18) return "下午好";
    if (h < 22) return "晚上好";
    return "夜深了";
  }, []);

  const handlePlayAll = () => {
    if (sortedSongs.length === 0) return;
    setQueue(sortedSongs, 0);
    playAt(0);
  };

  const handleShuffleAll = () => {
    if (sortedSongs.length === 0) return;
    const shuffled = [...sortedSongs].sort(() => Math.random() - 0.5);
    setQueue(shuffled, 0);
    playSong(shuffled[0], shuffled);
  };

  const handlePlaySong = (song: Song, list: Song[]) => {
    setQueue(list, list.findIndex((s) => s.id === song.id));
    playSong(song, list);
  };

  const hasSongs = sortedSongs.length > 0;
  const totalDuration = useMemo(
    () => sortedSongs.reduce((acc, s) => acc + (s.duration || 0), 0),
    [sortedSongs]
  );
  const totalMinutes = Math.round(totalDuration / 60);

  return (
    <div className="relative min-h-screen pb-36">
      {/* 顶部问候 + 数据 */}
      <header className="safe-top px-5 pb-2 pt-2">
        <div className="flex items-start justify-between">
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-ink-subtle">
              {greeting}
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink dark:text-white">
              Ttan 音乐
            </h1>
          </motion.div>
          <motion.button
            type="button"
            onClick={() => navigate("/settings")}
            whileTap={{ scale: 0.9 }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.04] text-ink-muted transition-colors hover:bg-black/[0.08] dark:bg-white/[0.06] dark:text-white/70"
            aria-label="设置"
          >
            <Plus className="h-5 w-5 rotate-45" />
          </motion.button>
        </div>

        {hasSongs && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mt-3 flex items-center gap-3 text-[11px] text-ink-muted"
          >
            <span className="flex items-center gap-1">
              <Music4 className="h-3 w-3 text-accent" />
              <span className="font-semibold tabular-nums text-ink dark:text-white">{sortedSongs.length}</span>
              <span>首</span>
            </span>
            <span className="h-2.5 w-px bg-black/10 dark:bg-white/10" />
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-accent" />
              <span className="font-semibold tabular-nums text-ink dark:text-white">
                {totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}h ` : ""}
                {totalMinutes % 60}m
              </span>
            </span>
            {favorites.length > 0 && (
              <>
                <span className="h-2.5 w-px bg-black/10 dark:bg-white/10" />
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3 text-rose-500" />
                  <span className="font-semibold tabular-nums text-ink dark:text-white">{favorites.length}</span>
                </span>
              </>
            )}
          </motion.div>
        )}
      </header>

      <div className="mx-auto max-w-[480px] space-y-6 px-4 pt-3">
        {/* 智能入口：2x2 网格（椒盐卡片风格） */}
        {hasSongs && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="grid grid-cols-2 gap-2.5"
          >
            <SmartCard
              icon={<Music4 className="h-5 w-5" />}
              label="全部歌曲"
              count={sortedSongs.length}
              onClick={() => navigate("/playlists?tab=all")}
            />
            <SmartCard
              icon={<Heart className="h-5 w-5" />}
              label="我的收藏"
              count={favorites.length}
              onClick={() => navigate("/my")}
              tint="rose"
            />
            <SmartCard
              icon={<Flame className="h-5 w-5" />}
              label="最常播放"
              count={mostPlayed.length}
              onClick={() => navigate("/playlists?tab=recent")}
              tint="amber"
            />
            <SmartCard
              icon={<Clock className="h-5 w-5" />}
              label="最近播放"
              count={recentSongs.length}
              onClick={() => navigate("/playlists?tab=recent")}
              tint="sky"
            />
          </motion.section>
        )}

        {/* 添加 / 随机 */}
        {!hasSongs ? (
          <ImportButton variant="full" />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex items-center gap-2"
          >
            <div className="flex-1">
              <ImportButton variant="compact" label="添加音乐" />
            </div>
            <motion.button
              type="button"
              onClick={handleShuffleAll}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-glow pressable"
            >
              <Shuffle className="h-4 w-4" />
              随机播放
            </motion.button>
          </motion.div>
        )}

        {/* 最近播放：横向卡片轮播 */}
        {recentSongs.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <SectionHeader
              title="最近播放"
              actionLabel="全部"
              onAction={() => navigate("/playlists?tab=recent")}
            />
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {recentSongs.slice(0, 8).map((song, i) => (
                <RecentCard
                  key={song.id}
                  song={song}
                  index={i}
                  onClick={() => handlePlaySong(song, recentSongs)}
                />
              ))}
            </div>
          </motion.section>
        )}

        {/* 最常播放：横向卡片轮播 */}
        {mostPlayed.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <SectionHeader
              title="最常播放"
              actionLabel="全部"
              onAction={() => navigate("/playlists?tab=recent")}
            />
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {mostPlayed.slice(0, 8).map((song, i) => (
                <RecentCard
                  key={song.id}
                  song={song}
                  index={i}
                  badge={`${playCounts[song.id]?.count ?? song.playCount ?? 0} 次`}
                  onClick={() => handlePlaySong(song, mostPlayed)}
                />
              ))}
            </div>
          </motion.section>
        )}

        {/* 歌曲列表 */}
        {hasSongs ? (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <SectionHeader
              title="全部歌曲"
              action={
                <motion.button
                  type="button"
                  onClick={handlePlayAll}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/18"
                >
                  <Play className="h-3 w-3 fill-accent" />
                  播放全部
                </motion.button>
              }
            />
            <div className="space-y-0.5">
              {visibleSongs.map((song, i) => (
                <SongItem
                  key={song.id}
                  song={song}
                  index={i}
                  onMore={(s) => setSheetSong(s)}
                />
              ))}
            </div>

            {sortedSongs.length > 8 && (
              <motion.button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                whileTap={{ scale: 0.98 }}
                className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl py-2.5 text-xs font-medium text-ink-muted transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
              >
                <ChevronRight
                  className={cn("h-3.5 w-3.5 transition-transform", showAll && "rotate-90")}
                />
                {showAll ? "收起" : `展开全部 ${sortedSongs.length} 首`}
              </motion.button>
            )}
          </motion.section>
        ) : (
          <EmptyState
            icon={<Disc3 className="h-9 w-9" />}
            title="还没有音乐"
            description="从设备选择 MP3 / FLAC 等音频文件，所有解析都在本地完成，音乐永久保存在浏览器中。"
          />
        )}
      </div>

      <SongSheet song={sheetSong} onClose={() => setSheetSong(null)} />
    </div>
  );
}

// 默认强调色（关闭动态取色时使用）
function getAccentDefault(preset: string, custom: string): string {
  if (preset === "custom") return custom;
  const map: Record<string, string> = {
    salt: "#FF6B35",
    "retro-red": "#E8332F",
    "spotify-green": "#1DB954",
    "ocean-blue": "#2E8BFF",
    "apple-pink": "#FF375F",
    "mint-cyan": "#00C2A8",
    "violet-purple": "#8B5CF6",
  };
  return map[preset] ?? "#FF6B35";
}

// ============ 智能入口卡（2x2 网格大卡） ============
function SmartCard({
  icon,
  label,
  count,
  onClick,
  tint = "accent",
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  onClick: () => void;
  tint?: "accent" | "rose" | "amber" | "sky";
}) {
  const tintMap = {
    accent: "bg-accent/10 text-accent",
    rose: "bg-rose-500/10 text-rose-500",
    amber: "bg-amber-500/10 text-amber-500",
    sky: "bg-sky-500/10 text-sky-500",
  };
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -1 }}
      className="flex items-center gap-3 rounded-2xl border border-black/[0.04] bg-white px-4 py-3.5 text-left shadow-card transition-colors hover:bg-white/90 dark:border-white/[0.06] dark:bg-white/[0.05] dark:hover:bg-white/[0.08]"
    >
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", tintMap[tint])}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-ink dark:text-white">{label}</div>
        <div className="mt-0.5 text-[11px] tabular-nums text-ink-muted">
          {count} 首
        </div>
      </div>
    </motion.button>
  );
}

// ============ 区块标题 ============
function SectionHeader({
  title,
  actionLabel,
  action,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  action?: React.ReactNode;
  onAction?: () => void;
}) {
  return (
    <div className="mb-2.5 flex items-center justify-between px-1">
      <h2 className="text-base font-bold text-ink dark:text-white">{title}</h2>
      {action
        ? action
        : actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="text-xs font-medium text-ink-muted transition-colors hover:text-accent"
            >
              {actionLabel}
            </button>
          )}
    </div>
  );
}

// ============ 横向卡片 ============
function RecentCard({
  song,
  index,
  badge,
  onClick,
}: {
  song: Song;
  index: number;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.04 * index, duration: 0.4 }}
      whileTap={{ scale: 0.96 }}
      className="group relative w-[124px] shrink-0 text-left"
    >
      <div className="relative overflow-hidden rounded-2xl shadow-cover">
        <CoverArt
          src={song.coverUrl}
          alt={song.title}
          size={124}
          rounded="lg"
          className="!w-full !h-auto aspect-square"
        />
        {/* hover 播放按钮 */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100 group-active:opacity-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-lg">
            <Play className="h-4 w-4 translate-x-0.5 fill-black text-black" />
          </div>
        </div>
        {badge && (
          <div className="absolute right-1.5 top-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            {badge}
          </div>
        )}
      </div>
      <div className="mt-2 px-0.5">
        <div className="text-truncate text-xs font-semibold text-ink dark:text-white">{song.title}</div>
        <div className="text-truncate text-[11px] text-ink-muted">{song.artist}</div>
      </div>
    </motion.button>
  );
}
