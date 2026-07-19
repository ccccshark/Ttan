import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronDown,
  Clock,
  Flame,
  Heart,
  Music4,
  Play,
  Settings as SettingsIcon,
  Shuffle,
} from "lucide-react";
import { useLibraryStore } from "@/store/libraryStore";
import { usePlayerStore } from "@/store/playerStore";
import ImportButton from "@/components/ImportButton";
import SongItem from "@/components/SongItem";
import SongSheet from "@/components/SongSheet";
import EmptyState from "@/components/EmptyState";
import CoverArt from "@/components/CoverArt";
import type { Song } from "@/types";
import { cn } from "@/lib/utils";

// Ttan 首页（简约高级感）：
// - 极简 hero：单色渐变 + 一行品牌字 + 关键数据
// - 智能入口（4 张卡）：全部 / 收藏 / 最常播放 / 最近播放
// - 「最近添加」与「最近播放」横向卡片轮播 + 列表
// - 整页采用 16px 主间距 + 1px hairline 分隔
export default function Home() {
  const navigate = useNavigate();
  const songs = useLibraryStore((s) => s.songs);
  const recentIds = useLibraryStore((s) => s.recentIds);
  const playCounts = useLibraryStore((s) => s.playCounts);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const playSong = usePlayerStore((s) => s.playSong);
  const playAt = usePlayerStore((s) => s.playAt);
  const [sheetSong, setSheetSong] = useState<Song | null>(null);
  const [showAll, setShowAll] = useState(false);

  // 过滤掉黑名单
  const visibleSongsAll = useMemo(
    () => songs.filter((s) => !s.hidden),
    [songs]
  );
  const sortedSongs = useMemo(
    () => [...visibleSongsAll].sort((a, b) => b.addedAt - a.addedAt),
    [visibleSongsAll]
  );
  const visibleSongs = showAll ? sortedSongs : sortedSongs.slice(0, 15);

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
    <div className="relative min-h-screen pb-28">
      {/* Hero 渐变背景：克制单色，避免多色噪点 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[280px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/12 via-accent/[0.03] to-transparent dark:from-accent/18 dark:via-accent/[0.04]" />
        {/* 单颗大浮光 */}
        <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl dark:bg-accent/25" />
      </div>

      {/* 顶部 */}
      <header className="safe-top relative px-5 pt-5">
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.42em] text-ink-muted">
              Ttan Music
            </div>
            <h1 className="mt-1.5 text-[28px] font-extrabold leading-none tracking-tight">
              <span className="text-gradient-accent">私人音乐空间</span>
            </h1>
          </motion.div>
          <motion.button
            type="button"
            onClick={() => navigate("/settings")}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.06 }}
            aria-label="设置"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/60 text-ink shadow-sm backdrop-blur-md transition-colors hover:bg-white/90 dark:bg-white/8 dark:text-white dark:hover:bg-white/14"
          >
            <SettingsIcon className="h-[18px] w-[18px]" />
          </motion.button>
        </div>

        {/* 数据行 */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="mt-4 flex items-center gap-4 text-xs text-ink-muted"
        >
          <div className="flex items-center gap-1.5">
            <Music4 className="h-3.5 w-3.5 text-accent" />
            <span className="font-semibold tabular-nums text-ink">{sortedSongs.length}</span>
            <span>首</span>
          </div>
          <div className="h-3 w-px bg-black/10 dark:bg-white/10" />
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-accent" />
            <span className="font-semibold tabular-nums text-ink">
              {totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}h ` : ""}
              {totalMinutes % 60}min
            </span>
          </div>
          {favorites.length > 0 && (
            <>
              <div className="h-3 w-px bg-black/10 dark:bg-white/10" />
              <div className="flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 text-rose-500" />
                <span className="font-semibold tabular-nums text-ink">{favorites.length}</span>
              </div>
            </>
          )}
        </motion.div>
      </header>

      <div className="mx-auto max-w-[480px] space-y-7 px-4 pt-6">
        {/* 智能入口：4 张极简卡 */}
        {hasSongs && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.45 }}
            className="grid grid-cols-4 gap-2"
          >
            <SmartEntry
              icon={<Music4 className="h-4 w-4" />}
              label="全部"
              count={sortedSongs.length}
              onClick={() => navigate("/playlists")}
            />
            <SmartEntry
              icon={<Heart className="h-4 w-4" />}
              label="收藏"
              count={favorites.length}
              onClick={() => navigate("/playlists?tab=favorites")}
              tint="text-rose-500"
            />
            <SmartEntry
              icon={<Flame className="h-4 w-4" />}
              label="最常"
              count={mostPlayed.length}
              onClick={() => navigate("/playlists?tab=most")}
              tint="text-amber-500"
            />
            <SmartEntry
              icon={<Clock className="h-4 w-4" />}
              label="最近"
              count={recentSongs.length}
              onClick={() => navigate("/playlists?tab=recent")}
              tint="text-sky-500"
            />
          </motion.section>
        )}

        {/* 添加 / 随机 */}
        {!hasSongs ? (
          <ImportButton variant="full" />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.45 }}
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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.45 }}
          >
            <SectionHeader
              title="最常播放"
              actionLabel="全部"
              onAction={() => navigate("/playlists?tab=most")}
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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.45 }}
            className="overflow-hidden rounded-3xl border border-black/[0.04] bg-white/70 shadow-card backdrop-blur-xl dark:border-white/[0.06] dark:bg-white/[0.04]"
          >
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-baseline gap-2">
                <h2 className="text-sm font-bold text-ink">最近添加</h2>
                <span className="text-[11px] font-normal tabular-nums text-ink-subtle">
                  {sortedSongs.length} 首
                </span>
              </div>
              <motion.button
                type="button"
                onClick={handlePlayAll}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/18"
              >
                <Play className="h-3 w-3 fill-accent" />
                播放全部
              </motion.button>
            </div>

            <div className="space-y-0.5 px-1.5 pb-1.5">
              {visibleSongs.map((song, i) => (
                <SongItem
                  key={song.id}
                  song={song}
                  index={i}
                  onMore={(s) => setSheetSong(s)}
                />
              ))}
            </div>

            {sortedSongs.length > 15 && (
              <motion.button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                whileTap={{ scale: 0.98 }}
                className="flex w-full items-center justify-center gap-1 border-t border-black/[0.04] py-3 text-xs font-medium text-ink-muted transition-colors hover:bg-black/[0.02] dark:border-white/[0.04] dark:hover:bg-white/[0.03]"
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${showAll ? "rotate-180" : ""}`}
                />
                {showAll ? "收起" : `展开全部 ${sortedSongs.length} 首`}
              </motion.button>
            )}
          </motion.section>
        ) : (
          <EmptyState
            icon={<Music4 className="h-9 w-9" />}
            title="还没有音乐"
            description="点击上方按钮，从设备中选择 MP3 / FLAC 等音频文件，所有解析都在本地完成。"
          />
        )}
      </div>

      <SongSheet song={sheetSong} onClose={() => setSheetSong(null)} />
    </div>
  );
}

// ============ 智能入口卡 ============
function SmartEntry({
  icon,
  label,
  count,
  onClick,
  tint = "text-accent",
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  onClick: () => void;
  tint?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      whileHover={{ y: -1 }}
      className="flex flex-col items-center gap-1.5 rounded-2xl border border-black/[0.04] bg-white/70 px-2 py-3 shadow-card backdrop-blur-md transition-colors hover:bg-white dark:border-white/[0.06] dark:bg-white/[0.05] dark:hover:bg-white/[0.09]"
    >
      <div className={cn("flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/[0.08]", tint)}>
        {icon}
      </div>
      <div className="text-xs font-semibold text-ink">{label}</div>
      <div className="text-[10px] tabular-nums text-ink-subtle">{count}</div>
    </motion.button>
  );
}

// ============ 区块标题 ============
function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-2.5 flex items-center justify-between px-1">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      {actionLabel && onAction && (
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
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
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
        <div className="text-truncate text-xs font-semibold text-ink">{song.title}</div>
        <div className="text-truncate text-[11px] text-ink-muted">{song.artist}</div>
      </div>
    </motion.button>
  );
}
