import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Heart,
  Info,
  ListMusic,
  Plus,
  Settings as SettingsIcon,
  Sliders,
  X,
} from "lucide-react";
import { useLibraryStore } from "@/store/libraryStore";
import { usePlayerStore } from "@/store/playerStore";
import { useStatusBarHeight } from "@/hooks/useStatusBarHeight";
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
  const statusBarHeight = useStatusBarHeight();

  const setQueue = usePlayerStore((s) => s.setQueue);
  const playAt = usePlayerStore((s) => s.playAt);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

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
    const name = newName.trim() || `歌单 ${playlists.length + 1}`;
    await createPlaylist(name);
    setNewName("");
    setShowCreate(false);
  };

  return (
    <div className="min-h-screen pb-36">
      <header className="sticky top-0 z-30 border-b border-black/[0.04] bg-white/80 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#0a0c14]/80" style={{ paddingTop: `${statusBarHeight}px` }}>
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
            onClick={() => {
              if (favorites.length > 0) {
                handlePlayFavorites();
                navigate("/playing");
              }
            }}
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
              onClick={() => setShowCreate(true)}
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
                onClick={() => navigate(`/playlists?tab=mine&playlistId=${p.id}`)}
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

      {/* 新建歌单弹窗 */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
            onClick={() => setShowCreate(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl dark:bg-[#1a1d2e] sm:rounded-3xl"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-black/10 dark:bg-white/10 sm:hidden" />
              
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5">
                  <ListMusic className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink dark:text-white">新建歌单</h3>
                  <p className="text-xs text-ink-muted">创建你的精选合集</p>
                </div>
              </div>
              
              <div className="relative mb-5">
                <input
                  type="text"
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="输入歌单名称"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleCreatePlaylist();
                  }}
                  className="w-full rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3.5 text-base font-medium text-ink outline-none transition-colors focus:border-accent focus:bg-accent/5 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:focus:bg-accent/10"
                />
                {newName.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setNewName("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-black/10 text-ink-muted hover:bg-black/20 dark:bg-white/10 dark:text-white/50"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 rounded-2xl bg-black/[0.06] py-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-black/[0.1] dark:bg-white/[0.08] dark:text-white/60 dark:hover:bg-white/[0.12]"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreatePlaylist()}
                  className="flex-1 rounded-2xl bg-accent py-3 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  创建歌单
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
