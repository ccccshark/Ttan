import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronDown, Music4, Play, Settings as SettingsIcon, Shuffle } from "lucide-react";
import { useLibraryStore } from "@/store/libraryStore";
import { usePlayerStore } from "@/store/playerStore";
import ImportButton from "@/components/ImportButton";
import QuickAccess from "@/components/QuickAccess";
import SongItem from "@/components/SongItem";
import SongSheet from "@/components/SongSheet";
import EmptyState from "@/components/EmptyState";
import type { Song } from "@/types";

// Ttan 首页：
// - 顶部 hero 渐变 + 浮光装饰，呼应 Mineradio 银河氛围
// - 极简卡片网格（参考 SaltPlayer 极简取向）
// - 歌曲列表带毛玻璃容器与交错入场动画
export default function Home() {
  const navigate = useNavigate();
  const songs = useLibraryStore((s) => s.songs);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const playSong = usePlayerStore((s) => s.playSong);
  const playAt = usePlayerStore((s) => s.playAt);
  const [sheetSong, setSheetSong] = useState<Song | null>(null);
  const [showAll, setShowAll] = useState(false);

  const sortedSongs = useMemo(
    () => [...songs].sort((a, b) => b.addedAt - a.addedAt),
    [songs]
  );
  const visibleSongs = showAll ? sortedSongs : sortedSongs.slice(0, 20);

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

  const hasSongs = sortedSongs.length > 0;
  const totalDuration = useMemo(
    () => sortedSongs.reduce((acc, s) => acc + (s.duration || 0), 0),
    [sortedSongs]
  );
  const totalMinutes = Math.round(totalDuration / 60);

  return (
    <div className="relative min-h-screen pb-28">
      {/* Hero 渐变背景（页面顶部装饰）*/}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[340px] overflow-hidden">
        {/* 深色基底 */}
        <div className="absolute inset-0 bg-gradient-to-b from-accent/15 via-accent/[0.04] to-transparent dark:from-accent/20 dark:via-accent/[0.06]" />
        {/* 浮光球 1 */}
        <div className="absolute -top-20 -left-16 h-72 w-72 rounded-full bg-accent/30 blur-3xl animate-flow dark:bg-accent/25" />
        {/* 浮光球 2 */}
        <div className="absolute top-10 right-[-60px] h-64 w-64 rounded-full bg-orange-400/20 blur-3xl animate-flow-slow dark:bg-orange-500/15" />
        {/* 浮光球 3 */}
        <div className="absolute top-20 left-1/3 h-48 w-48 rounded-full bg-rose-400/15 blur-3xl animate-flow dark:bg-rose-500/10" />
      </div>

      {/* 顶部导航区（不再用 AppBar，自定义更精致）*/}
      <header className="safe-top relative px-5 pt-4">
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="text-[11px] font-medium uppercase tracking-[0.32em] text-ink-muted">
              Ttan Music
            </div>
            <h1 className="mt-1 text-3xl font-extrabold leading-none tracking-tight">
              <span className="text-gradient-accent">Ttan</span>
            </h1>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-2"
          >
            <div className="flex flex-col items-end">
              <div className="text-2xl font-bold tabular-nums text-ink">
                {sortedSongs.length}
                <span className="ml-1 text-xs font-normal text-ink-muted">首</span>
              </div>
              {totalMinutes > 0 && (
                <div className="text-[11px] text-ink-subtle">
                  约 {totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}h ` : ""}
                  {totalMinutes % 60}min
                </div>
              )}
            </div>
            <motion.button
              type="button"
              onClick={() => navigate("/settings")}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.06 }}
              aria-label="设置"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/60 text-ink shadow-sm backdrop-blur-md transition-colors hover:bg-white/80 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              <SettingsIcon className="h-5 w-5" />
            </motion.button>
          </motion.div>
        </div>
        <p className="mt-3 text-sm text-ink-muted">
          {hasSongs ? "导入本地音乐，沉浸式聆听" : "导入你的第一首歌，开启音乐空间"}
        </p>
      </header>

      <div className="mx-auto max-w-[480px] space-y-5 px-4 pt-4">
        {/* 快速入口卡片 */}
        <QuickAccess onShuffle={handleShuffleAll} />

        {/* 导入区 */}
        {!hasSongs ? (
          <ImportButton variant="full" />
        ) : (
          <div className="flex items-center justify-between gap-3">
            <ImportButton variant="compact" label="添加音乐" />
            <motion.button
              type="button"
              onClick={handleShuffleAll}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-medium text-ink shadow-sm backdrop-blur-md transition-colors hover:bg-white dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
            >
              <Shuffle className="h-4 w-4 text-accent" />
              随机播放
            </motion.button>
          </div>
        )}

        {/* 歌曲列表 - 毛玻璃容器 */}
        {hasSongs ? (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="overflow-hidden rounded-3xl border border-black/[0.04] bg-white/70 shadow-card backdrop-blur-xl dark:border-white/[0.06] dark:bg-white/[0.04]"
          >
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-baseline gap-2">
                <h2 className="text-sm font-bold text-ink">最近添加</h2>
                <span className="text-xs font-normal text-ink-subtle">
                  {sortedSongs.length} 首
                </span>
              </div>
              <motion.button
                type="button"
                onClick={handlePlayAll}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 rounded-full bg-accent/12 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
              >
                <Play className="h-3.5 w-3.5 fill-accent" />
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

            {sortedSongs.length > 20 && (
              <motion.button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                whileTap={{ scale: 0.98 }}
                className="flex w-full items-center justify-center gap-1 border-t border-black/[0.04] py-3 text-sm font-medium text-ink-muted transition-colors hover:bg-black/[0.02] dark:border-white/[0.04] dark:hover:bg-white/[0.03]"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showAll ? "rotate-180" : ""}`}
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
