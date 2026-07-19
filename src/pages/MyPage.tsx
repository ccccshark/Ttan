import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Heart,
  Info,
  ListMusic,
  Plus,
  Settings as SettingsIcon,
  Sliders,
} from "lucide-react";
import { useLibraryStore } from "@/store/libraryStore";
import { usePlayerStore } from "@/store/playerStore";
import CoverArt from "@/components/CoverArt";
import EmptyState from "@/components/EmptyState";
import { formatCount } from "@/utils/format";
import type { Song } from "@/types";

// 椒盐风格「我的」页：歌单管理 + 收藏 + 设置入口 + 统计
export default function MyPage() {
  const navigate = useNavigate();
  const songs = useLibraryStore((s) => s.songs);
  const playlists = useLibraryStore((s) => s.playlists);
  const playCounts = useLibraryStore((s) => s.playCounts);
  const recentIds = useLibraryStore((s) => s.recentIds);
  const loadPlaylists = useLibraryStore((s) => s.loadPlaylists);
  const loadRecents = useLibraryStore((s) => s.loadRecents);
  const createPlaylist = useLibraryStore((s) => s.createPlaylist);

  const setQueue = usePlayerStore((s) => s.setQueue);
  const playAt = usePlayerStore((s) => s.playAt);

  useEffect(() => {
    void loadPlaylists();
    void loadRecents();
  }, [loadPlaylists, loadRecents]);

  const favorites = useMemo(() => songs.filter((s) => s.favorite && !s.hidden), [songs]);

  const totalPlayCount = useMemo(
    () => Object.values(playCounts).reduce((acc, pc) => acc + pc.count, 0),
    [playCounts]
  );

  const totalMinutes = useMemo(() => {
    const totalSec = songs.reduce((acc, s) => acc + (s.duration || 0), 0);
    return Math.round(totalSec / 60);
  }, [songs]);

  const handlePlayFavorites = () => {
    if (favorites.length === 0) return;
    setQueue(favorites, 0);
    playAt(0);
  };

  const handleCreatePlaylist = async () => {
    const name = prompt("输入歌单名称", `歌单 ${playlists.length + 1}`);
    if (!name) return;
    await createPlaylist(name);
  };

  return (
    <div className="min-h-screen pb-36">
      <header className="safe-top sticky top-0 z-30 border-b border-black/[0.04] bg-white/80 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#0a0c14]/80">
        <div className="mx-auto flex max-w-[480px] items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-ink dark:text-white">我的</h1>
          <button
            type="button"
            onClick={() => navigate("/settings")}
            aria-label="设置"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.08]"
          >
            <SettingsIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[480px] space-y-6 px-4 pt-4">
        {/* 数据统计卡 */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-2"
        >
          <StatCell label="歌曲" value={formatCount(songs.length)} />
          <StatCell label="歌单" value={formatCount(playlists.length)} />
          <StatCell label="总时长" value={totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}h` : `${totalMinutes}m`} />
          <StatCell label="收藏" value={formatCount(favorites.length)} />
          <StatCell label="播放次数" value={formatCount(totalPlayCount)} />
          <StatCell label="最近" value={formatCount(recentIds.length)} />
        </motion.section>

        {/* 收藏快捷入口 */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="overflow-hidden rounded-3xl border border-black/[0.04] bg-white shadow-card dark:border-white/[0.06] dark:bg-white/[0.04]"
        >
          <button
            type="button"
            onClick={handlePlayFavorites}
            disabled={favorites.length === 0}
            className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-black/[0.02] disabled:opacity-60 dark:hover:bg-white/[0.03]"
          >
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/20 to-rose-500/5">
                <Heart className="h-7 w-7 fill-rose-500 text-rose-500" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base font-bold text-ink dark:text-white">我的收藏</div>
              <div className="mt-0.5 text-xs text-ink-muted">
                {favorites.length} 首歌曲
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-ink-subtle" />
          </button>
        </motion.section>

        {/* 歌单 */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="mb-2.5 flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-ink dark:text-white">歌单</h2>
            <button
              type="button"
              onClick={handleCreatePlaylist}
              className="flex items-center gap-1 text-xs font-medium text-accent transition-opacity hover:opacity-80"
            >
              <Plus className="h-3.5 w-3.5" />
              新建
            </button>
          </div>

          {playlists.length === 0 ? (
            <EmptyState
              icon={<ListMusic className="h-8 w-8" />}
              title="还没有歌单"
              description="点击右上角「新建」创建你的第一个歌单。"
            />
          ) : (
            <div className="space-y-2">
              {playlists.map((p, i) => (
                <PlaylistRow
                  key={p.id}
                  name={p.name}
                  count={p.songIds.length}
                  coverSong={songs.find((s) => s.id === p.songIds[0])}
                  index={i}
                  onClick={() => navigate("/playlists")}
                />
              ))}
            </div>
          )}
        </motion.section>

        {/* 设置入口列表 */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="overflow-hidden rounded-3xl border border-black/[0.04] bg-white shadow-card dark:border-white/[0.06] dark:bg-white/[0.04]"
        >
          <SettingRow
            icon={<Sliders className="h-5 w-5" />}
            label="设置"
            subtitle="外观 / 播放 / 音效 / 数据"
            onClick={() => navigate("/settings")}
          />
          <SettingRow
            icon={<Info className="h-5 w-5" />}
            label="关于 Ttan"
            subtitle="版本信息与开源协议"
            onClick={() => navigate("/about")}
          />
        </motion.section>
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/[0.04] bg-white px-3 py-3 text-center shadow-card dark:border-white/[0.06] dark:bg-white/[0.04]">
      <div className="text-base font-bold tabular-nums text-ink dark:text-white">{value}</div>
      <div className="mt-0.5 text-[10px] text-ink-muted">{label}</div>
    </div>
  );
}

function PlaylistRow({
  name,
  count,
  coverSong,
  index,
  onClick,
}: {
  name: string;
  count: number;
  coverSong?: Song;
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index }}
      whileTap={{ scale: 0.99 }}
      className="flex w-full items-center gap-3 rounded-2xl border border-black/[0.04] bg-white px-3 py-2.5 text-left shadow-card transition-colors hover:bg-white/90 dark:border-white/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
    >
      <CoverArt src={coverSong?.coverUrl} alt={name} size={48} rounded="md" />
      <div className="min-w-0 flex-1">
        <div className="text-truncate text-sm font-semibold text-ink dark:text-white">{name}</div>
        <div className="mt-0.5 text-xs text-ink-muted">{count} 首</div>
      </div>
      <ChevronRight className="h-4 w-4 text-ink-subtle" />
    </motion.button>
  );
}

function SettingRow({
  icon,
  label,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-ink dark:text-white">{label}</div>
        {subtitle && <div className="mt-0.5 text-xs text-ink-muted">{subtitle}</div>}
      </div>
      <ChevronRight className="h-4 w-4 text-ink-subtle" />
    </button>
  );
}
