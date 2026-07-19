import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Music4, Play, Shuffle } from "lucide-react";
import { useLibraryStore } from "@/store/libraryStore";
import { usePlayerStore } from "@/store/playerStore";
import AppBar from "@/components/AppBar";
import ImportButton from "@/components/ImportButton";
import QuickAccess from "@/components/QuickAccess";
import SongItem from "@/components/SongItem";
import SongSheet from "@/components/SongSheet";
import EmptyState from "@/components/EmptyState";
import type { Song } from "@/types";

export default function Home() {
  const songs = useLibraryStore((s) => s.songs);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const playSong = usePlayerStore((s) => s.playSong);
  const playAt = usePlayerStore((s) => s.playAt);
  const [sheetSong, setSheetSong] = useState<Song | null>(null);
  const [showAll, setShowAll] = useState(false);

  // 按添加时间倒序，最新导入在前
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

  return (
    <div className="min-h-screen pb-28">
      <AppBar
        title="Ttan"
        subtitle={hasSongs ? `${sortedSongs.length} 首本地音乐` : "导入你的第一首歌"}
      />

      <div className="mx-auto max-w-[480px] space-y-5 px-4 pt-3">
        {/* 快速入口 */}
        <QuickAccess onShuffle={handleShuffleAll} />

        {/* 导入区 - 仅在没歌曲或滚动到顶部时显示 */}
        {!hasSongs ? (
          <ImportButton variant="full" />
        ) : (
          <div className="flex items-center justify-between gap-3">
            <ImportButton variant="compact" label="添加音乐" />
            <button
              type="button"
              onClick={handleShuffleAll}
              className="flex items-center gap-2 rounded-full bg-black/5 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
            >
              <Shuffle className="h-4 w-4" />
              随机播放
            </button>
          </div>
        )}

        {/* 歌曲列表 */}
        {hasSongs ? (
          <section className="rounded-2xl bg-white/60 p-2 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between px-3 py-2">
              <h2 className="text-sm font-semibold text-ink">
                最近添加
                <span className="ml-2 text-xs font-normal text-ink-subtle">
                  {sortedSongs.length} 首
                </span>
              </h2>
              <button
                type="button"
                onClick={handlePlayAll}
                className="flex items-center gap-1 text-xs font-medium text-accent"
              >
                <Play className="h-3.5 w-3.5 fill-accent" />
                播放全部
              </button>
            </div>

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

            {sortedSongs.length > 20 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl py-2.5 text-sm text-ink-muted transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showAll ? "rotate-180" : ""}`}
                />
                {showAll ? "收起" : `展开全部 ${sortedSongs.length} 首`}
              </button>
            )}
          </section>
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
