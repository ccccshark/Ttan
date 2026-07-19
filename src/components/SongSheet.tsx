import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Disc3,
  Heart,
  ListPlus,
  Play,
  Trash2,
  X,
} from "lucide-react";
import type { Song } from "@/types";
import { useLibraryStore } from "@/store/libraryStore";
import { usePlayerStore } from "@/store/playerStore";
import CoverArt from "./CoverArt";
import { formatFileSize, formatTime } from "@/utils/format";

interface SongSheetProps {
  song: Song | null;
  onClose: () => void;
}

export default function SongSheet({ song, onClose }: SongSheetProps) {
  const navigate = useNavigate();
  const playlists = useLibraryStore((s) => s.playlists);
  const createPlaylist = useLibraryStore((s) => s.createPlaylist);
  const addToPlaylist = useLibraryStore((s) => s.addToPlaylist);
  const removeSong = useLibraryStore((s) => s.removeSong);
  const playSong = usePlayerStore((s) => s.playSong);
  const [showPlaylists, setShowPlaylists] = useState(false);

  if (!song) return null;

  const handleAddToPlaylist = async (playlistId: string) => {
    await addToPlaylist(playlistId, [song.id]);
    setShowPlaylists(false);
    onClose();
  };

  const handleCreatePlaylist = async () => {
    const name = `歌单 ${new Date().toLocaleDateString("zh-CN")}`;
    const p = await createPlaylist(name, [song.id]);
    setShowPlaylists(false);
    onClose();
    void p;
  };

  const handleRemove = () => {
    removeSong(song.id);
    onClose();
  };

  return (
    <AnimatePresence>
      {song && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 36 }}
            className="safe-bottom relative z-10 w-full max-w-[480px] rounded-t-3xl bg-white p-4 shadow-2xl dark:bg-surface-card"
          >
            {/* 顶部拖动条 */}
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15 dark:bg-white/15" />

            <div className="flex items-center gap-3 pb-4">
              <CoverArt src={song.coverUrl} alt={song.title} size={56} rounded="lg" />
              <div className="min-w-0 flex-1">
                <div className="text-truncate text-base font-semibold text-ink">
                  {song.title}
                </div>
                <div className="text-truncate text-sm text-ink-muted">
                  {song.artist}
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-subtle">
                  {song.duration > 0 && <span>{formatTime(song.duration)}</span>}
                  <span>·</span>
                  <span>{formatFileSize(song.fileSize)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="关闭"
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-subtle hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="h-px bg-black/5 dark:bg-white/8" />

            {!showPlaylists ? (
              <div className="grid grid-cols-2 gap-2 py-3">
                <SheetAction
                  icon={<Play className="h-5 w-5" />}
                  label="立即播放"
                  onClick={() => {
                    playSong(song);
                    navigate("/playing");
                    onClose();
                  }}
                />
                <SheetAction
                  icon={<Disc3 className="h-5 w-5" />}
                  label="下一首播放"
                  onClick={() => {
                    // 简化：直接添加到队列末尾
                    const { queue, setQueue } = usePlayerStore.getState();
                    setQueue([...queue, song], usePlayerStore.getState().currentIndex);
                    onClose();
                  }}
                />
                <SheetAction
                  icon={<ListPlus className="h-5 w-5" />}
                  label="添加到歌单"
                  onClick={() => setShowPlaylists(true)}
                />
                <SheetAction
                  icon={<Heart className="h-5 w-5" />}
                  label="收藏"
                  onClick={() => {
                    // 简化：创建/添加到「我的收藏」歌单
                    const fav = playlists.find((p) => p.name === "我的收藏");
                    if (fav) {
                      void addToPlaylist(fav.id, [song.id]);
                    } else {
                      void createPlaylist("我的收藏", [song.id]);
                    }
                    onClose();
                  }}
                />
                <SheetAction
                  icon={<Trash2 className="h-5 w-5" />}
                  label="从音乐库移除"
                  danger
                  onClick={handleRemove}
                />
              </div>
            ) : (
              <div className="py-3">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-sm font-semibold text-ink">添加到歌单</span>
                  <button
                    type="button"
                    onClick={() => setShowPlaylists(false)}
                    className="text-xs text-accent"
                  >
                    返回
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleCreatePlaylist}
                  className="mb-2 flex w-full items-center gap-3 rounded-xl bg-accent/10 p-3 text-accent"
                >
                  <ListPlus className="h-5 w-5" />
                  <span className="text-sm font-medium">新建歌单</span>
                </button>
                <div className="max-h-60 overflow-y-auto thin-scrollbar">
                  {playlists.length === 0 ? (
                    <div className="py-6 text-center text-sm text-ink-muted">
                      暂无歌单，先创建一个吧
                    </div>
                  ) : (
                    playlists.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddToPlaylist(p.id)}
                        className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/8"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                          <Disc3 className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-truncate text-sm font-medium text-ink">
                            {p.name}
                          </div>
                          <div className="text-xs text-ink-muted">
                            {p.songIds.length} 首
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SheetAction({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/8 ${
        danger
          ? "text-rose-500 hover:bg-rose-500/10 dark:hover:bg-rose-500/15"
          : "text-ink"
      }`}
    >
      <span className={danger ? "" : "text-accent"}>{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
