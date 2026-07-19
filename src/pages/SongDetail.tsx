import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Disc3,
  FileAudio,
  Gauge,
  Heart,
  ListPlus,
  Mic2,
  Play,
  Share2,
  Trash2,
  User2,
  Volume2,
} from "lucide-react";
import { useLibraryStore } from "@/store/libraryStore";
import { usePlayerStore } from "@/store/playerStore";
import IconButton from "@/components/IconButton";
import CoverArt from "@/components/CoverArt";
import EmptyState from "@/components/EmptyState";
import { formatFileSize, formatTime } from "@/utils/format";
import { cn } from "@/lib/utils";

// 歌曲详情页：展示元数据、技术信息、播放统计、相关操作
export default function SongDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const songs = useLibraryStore((s) => s.songs);
  const playlists = useLibraryStore((s) => s.playlists);
  const playCounts = useLibraryStore((s) => s.playCounts);
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);
  const removeSong = useLibraryStore((s) => s.removeSong);
  const addToPlaylist = useLibraryStore((s) => s.addToPlaylist);
  const createPlaylist = useLibraryStore((s) => s.createPlaylist);

  const playSong = usePlayerStore((s) => s.playSong);
  const insertNext = usePlayerStore((s) => s.insertNext);
  const appendToQueue = usePlayerStore((s) => s.appendToQueue);

  const song = songs.find((s) => s.id === id);

  if (!song) {
    return (
      <div className="min-h-screen pb-28">
        <div className="glass glass-light safe-top sticky top-0 z-30 px-4 pb-3 pt-2">
          <div className="flex items-center gap-2">
            <IconButton ariaLabel="返回" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </IconButton>
            <h1 className="flex-1 text-lg font-bold text-ink">歌曲详情</h1>
          </div>
        </div>
        <EmptyState
          icon={<Disc3 className="h-9 w-9" />}
          title="歌曲不存在"
          description="可能已被删除或备份未恢复。"
        />
      </div>
    );
  }

  const pc = playCounts[song.id];
  const count = pc?.count ?? song.playCount ?? 0;
  const lastPlayedAt = pc?.lastPlayedAt ?? song.lastPlayedAt;
  const isFavorite = !!song.favorite;

  const handlePlay = () => {
    playSong(song);
    navigate("/playing");
  };

  const handleAddNext = () => {
    insertNext(song);
    navigate(-1);
  };

  const handleAddToQueue = () => {
    appendToQueue(song);
    navigate(-1);
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    await addToPlaylist(playlistId, [song.id]);
    navigate(-1);
  };

  const handleCreatePlaylistForSong = async () => {
    const name = `歌单 ${new Date().toLocaleDateString("zh-CN")}`;
    await createPlaylist(name, [song.id]);
    navigate(-1);
  };

  const handleRemove = () => {
    if (!confirm(`从音乐库移除「${song.title}」？`)) return;
    removeSong(song.id);
    navigate(-1);
  };

  const handleShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: song.title,
        text: `${song.title} - ${song.artist}`,
      });
    } catch {
      // 用户取消
    }
  };

  // 同艺人其他歌曲
  const moreFromArtist = songs
    .filter((s) => s.id !== song.id && s.artist === song.artist)
    .slice(0, 5);

  // 同专辑其他歌曲
  const moreFromAlbum = song.album
    ? songs.filter((s) => s.id !== song.id && s.album === song.album).slice(0, 5)
    : [];

  return (
    <div className="min-h-screen pb-28">
      {/* 顶部 */}
      <div className="glass glass-light safe-top sticky top-0 z-30 px-4 pb-3 pt-2">
        <div className="flex items-center gap-2">
          <IconButton ariaLabel="返回" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </IconButton>
          <h1 className="flex-1 text-truncate text-lg font-bold text-ink">
            歌曲详情
          </h1>
          <IconButton ariaLabel="分享" onClick={handleShare}>
            <Share2 className="h-5 w-5" />
          </IconButton>
        </div>
      </div>

      <div className="mx-auto max-w-[480px] px-4 pt-4">
        {/* 头部信息卡 */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 pb-6 text-center"
        >
          <CoverArt
            src={song.coverUrl}
            alt={song.title}
            size={180}
            rounded="lg"
            className="shadow-cover"
          />
          <div className="mt-2 min-w-0">
            <h2 className="text-truncate text-xl font-bold text-ink">
              {song.title}
            </h2>
            <button
              type="button"
              onClick={() => {
                // 跳到艺人页（暂用 search 兜底）
                navigate(`/search?q=${encodeURIComponent(song.artist)}`);
              }}
              className="mt-1 text-sm text-ink-muted transition-colors hover:text-accent"
            >
              {song.artist}
            </button>
            {song.album && song.album !== "未知" && (
              <div className="mt-0.5 text-xs text-ink-subtle">{song.album}</div>
            )}
          </div>
        </motion.div>

        {/* 主操作 */}
        <div className="mb-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handlePlay}
            className="flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white shadow-glow pressable"
          >
            <Play className="h-4 w-4 fill-white" />
            立即播放
          </button>
          <button
            type="button"
            onClick={handleAddNext}
            className="flex items-center justify-center gap-2 rounded-full bg-black/[0.05] px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-black/[0.08] dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]"
          >
            <ListPlus className="h-4 w-4" />
            下一首播放
          </button>
        </div>

        {/* 元数据卡 */}
        <section className="mb-4 overflow-hidden rounded-3xl border border-black/[0.04] bg-white/80 shadow-card backdrop-blur-xl dark:border-white/[0.06] dark:bg-white/[0.04]">
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            <MetaRow icon={<User2 className="h-4 w-4" />} label="艺人" value={song.artist} />
            {song.album && song.album !== "未知" && (
              <MetaRow icon={<Disc3 className="h-4 w-4" />} label="专辑" value={song.album} />
            )}
            {song.genre && (
              <MetaRow icon={<Mic2 className="h-4 w-4" />} label="流派" value={song.genre} />
            )}
            {song.year && (
              <MetaRow icon={<Calendar className="h-4 w-4" />} label="年份" value={String(song.year)} />
            )}
            <MetaRow
              icon={<Volume2 className="h-4 w-4" />}
              label="时长"
              value={formatTime(song.duration)}
            />
            <MetaRow
              icon={<FileAudio className="h-4 w-4" />}
              label="文件大小"
              value={formatFileSize(song.fileSize)}
            />
            <MetaRow
              icon={<FileAudio className="h-4 w-4" />}
              label="文件名"
              value={song.fileName}
              mono
            />
          </div>
        </section>

        {/* 技术信息卡 */}
        <section className="mb-4 overflow-hidden rounded-3xl border border-black/[0.04] bg-white/80 shadow-card backdrop-blur-xl dark:border-white/[0.06] dark:bg-white/[0.04]">
          <div className="flex items-center gap-2 px-4 pb-1 pt-3.5">
            <Gauge className="h-3.5 w-3.5 text-accent" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              技术信息
            </h3>
          </div>
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            <MetaRow label="编码格式" value={song.codec || "未知"} />
            <MetaRow
              label="比特率"
              value={song.bitrate ? `${song.bitrate} kbps` : "未知"}
            />
            <MetaRow
              label="采样率"
              value={song.sampleRate ? `${(song.sampleRate / 1000).toFixed(1)} kHz` : "未知"}
            />
            <MetaRow
              label="位深"
              value={song.bitsPerSample ? `${song.bitsPerSample} bit` : "未知"}
            />
            <MetaRow
              label="声道"
              value={
                song.channels
                  ? song.channels === 1
                    ? "单声道"
                    : song.channels === 2
                      ? "立体声"
                      : `${song.channels} 声道`
                  : "未知"
              }
            />
          </div>
        </section>

        {/* 播放统计卡 */}
        <section className="mb-4 overflow-hidden rounded-3xl border border-black/[0.04] bg-white/80 shadow-card backdrop-blur-xl dark:border-white/[0.06] dark:bg-white/[0.04]">
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            <MetaRow label="播放次数" value={`${count} 次`} />
            {lastPlayedAt && (
              <MetaRow
                label="上次播放"
                value={new Date(lastPlayedAt).toLocaleString("zh-CN")}
              />
            )}
            <MetaRow
              label="添加时间"
              value={new Date(song.addedAt).toLocaleDateString("zh-CN")}
            />
          </div>
        </section>

        {/* 收藏与删除 */}
        <section className="mb-4 overflow-hidden rounded-3xl border border-black/[0.04] bg-white/80 shadow-card backdrop-blur-xl dark:border-white/[0.06] dark:bg-white/[0.04]">
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            <button
              type="button"
              onClick={() => toggleFavorite(song.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
            >
              <Heart
                className={cn(
                  "h-5 w-5",
                  isFavorite ? "fill-rose-500 text-rose-500" : "text-ink-muted"
                )}
              />
              <span className="flex-1 text-sm font-medium text-ink">
                {isFavorite ? "已收藏" : "添加到收藏"}
              </span>
            </button>
            <button
              type="button"
              onClick={handleAddToQueue}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
            >
              <ListPlus className="h-5 w-5 text-accent" />
              <span className="flex-1 text-sm font-medium text-ink">加入播放队列</span>
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-rose-500/5 dark:hover:bg-rose-500/10"
            >
              <Trash2 className="h-5 w-5 text-rose-500" />
              <span className="flex-1 text-sm font-medium text-rose-500">
                从音乐库移除
              </span>
            </button>
          </div>
        </section>

        {/* 添加到歌单 */}
        {playlists.length > 0 && (
          <section className="mb-4 overflow-hidden rounded-3xl border border-black/[0.04] bg-white/80 shadow-card backdrop-blur-xl dark:border-white/[0.06] dark:bg-white/[0.04]">
            <div className="flex items-center gap-2 px-4 pb-1 pt-3.5">
              <ListPlus className="h-3.5 w-3.5 text-accent" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                添加到歌单
              </h3>
            </div>
            <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
              <button
                type="button"
                onClick={handleCreatePlaylistForSong}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <ListPlus className="h-5 w-5" />
                </div>
                <span className="flex-1 text-sm font-medium text-ink">新建歌单</span>
              </button>
              {playlists.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleAddToPlaylist(p.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/[0.04] text-ink-muted dark:bg-white/[0.08]">
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
              ))}
            </div>
          </section>
        )}

        {/* 同艺人其他歌曲 */}
        {moreFromArtist.length > 0 && (
          <section className="mb-4">
            <h3 className="mb-2 px-1 text-sm font-bold text-ink">
              {song.artist} 的更多歌曲
            </h3>
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {moreFromArtist.map((s) => (
                <motion.button
                  key={s.id}
                  type="button"
                  onClick={() => navigate(`/song/${s.id}`)}
                  whileTap={{ scale: 0.96 }}
                  className="w-[120px] shrink-0 text-left"
                >
                  <CoverArt
                    src={s.coverUrl}
                    alt={s.title}
                    size={120}
                    rounded="lg"
                    className="!w-full !h-auto aspect-square shadow-cover"
                  />
                  <div className="mt-1.5 text-truncate text-xs font-semibold text-ink">
                    {s.title}
                  </div>
                  <div className="text-truncate text-[11px] text-ink-muted">
                    {s.album || s.artist}
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {/* 同专辑其他歌曲 */}
        {moreFromAlbum.length > 0 && (
          <section className="mb-4">
            <h3 className="mb-2 px-1 text-sm font-bold text-ink">
              {song.album} 中的更多歌曲
            </h3>
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {moreFromAlbum.map((s) => (
                <motion.button
                  key={s.id}
                  type="button"
                  onClick={() => navigate(`/song/${s.id}`)}
                  whileTap={{ scale: 0.96 }}
                  className="w-[120px] shrink-0 text-left"
                >
                  <CoverArt
                    src={s.coverUrl}
                    alt={s.title}
                    size={120}
                    rounded="lg"
                    className="!w-full !h-auto aspect-square shadow-cover"
                  />
                  <div className="mt-1.5 text-truncate text-xs font-semibold text-ink">
                    {s.title}
                  </div>
                  <div className="text-truncate text-[11px] text-ink-muted">
                    {s.artist}
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ============ 元数据行 ============
function MetaRow({
  icon,
  label,
  value,
  mono,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {icon && <span className="text-ink-muted">{icon}</span>}
      <span className="text-xs font-medium text-ink-muted">{label}</span>
      <span
        className={cn(
          "ml-auto max-w-[60%] text-truncate text-right text-sm text-ink",
          mono && "font-mono text-xs"
        )}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}
