import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  Disc3,
  Heart,
  ListMusic,
  Play,
  Plus,
  Trash2,
  User2,
  X,
} from "lucide-react";
import { useLibraryStore } from "@/store/libraryStore";
import { usePlayerStore } from "@/store/playerStore";
import { useStatusBarHeight } from "@/hooks/useStatusBarHeight";
import AppBar from "@/components/AppBar";
import SongItem from "@/components/SongItem";
import EmptyState from "@/components/EmptyState";
import CoverArt from "@/components/CoverArt";
import IconButton from "@/components/IconButton";
import type { Playlist, Song } from "@/types";
import { cn } from "@/lib/utils";

type Tab = "all" | "recent" | "albums" | "artists" | "mine" | "favorites";

interface AlbumGroup {
  key: string;
  name: string;
  artist: string;
  coverUrl: string;
  songs: Song[];
}

interface ArtistGroup {
  key: string;
  name: string;
  coverUrl: string;
  songs: Song[];
  albumCount: number;
}

export default function Playlists() {
  const [params, setParams] = useSearchParams();
  const playlistId = params.get("playlistId");
  
  const tab = (params.get("tab") as Tab) ?? "all";

  const songs = useLibraryStore((s) => s.songs);
  const playlists = useLibraryStore((s) => s.playlists);
  const recentIds = useLibraryStore((s) => s.recentIds);
  const loadPlaylists = useLibraryStore((s) => s.loadPlaylists);
  const loadRecents = useLibraryStore((s) => s.loadRecents);
  const createPlaylist = useLibraryStore((s) => s.createPlaylist);
  const deletePlaylist = useLibraryStore((s) => s.deletePlaylist);
  const addToPlaylist = useLibraryStore((s) => s.addToPlaylist);

  const setQueue = usePlayerStore((s) => s.setQueue);
  const playAt = usePlayerStore((s) => s.playAt);
  const playSong = usePlayerStore((s) => s.playSong);

  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumGroup | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<ArtistGroup | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [showAddSongs, setShowAddSongs] = useState(false);
  const statusBarHeight = useStatusBarHeight();

  useEffect(() => {
    void loadPlaylists();
    void loadRecents();
  }, [loadPlaylists, loadRecents]);

  useEffect(() => {
    if (playlistId && playlists.length > 0) {
      const playlist = playlists.find((p) => p.id === playlistId);
      if (playlist) {
        setSelectedPlaylist(playlist);
      }
    }
  }, [playlistId, playlists]);

  const recentSongs = useMemo(() => {
    const map = new Map(songs.map((s) => [s.id, s]));
    return recentIds
      .map((id) => map.get(id))
      .filter((s): s is Song => !!s);
  }, [recentIds, songs]);

  const favorites = useMemo(() => songs.filter((s) => s.favorite && !s.hidden), [songs]);

  const availableSongs = useMemo(() => {
    if (!selectedPlaylist) return [];
    const ids = new Set(selectedPlaylist.songIds);
    return songs.filter((s) => !ids.has(s.id) && !s.hidden);
  }, [selectedPlaylist, songs]);

  // 按专辑分组
  const albums = useMemo<AlbumGroup[]>(() => {
    const map = new Map<string, AlbumGroup>();
    for (const s of songs) {
      const name = s.album && s.album !== "未知" ? s.album : "未知专辑";
      const key = `${name}__${s.artist || "未知"}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          name,
          artist: s.artist || "未知艺人",
          coverUrl: s.coverUrl,
          songs: [],
        });
      }
      map.get(key)!.songs.push(s);
    }
    return Array.from(map.values()).sort((a, b) => b.songs.length - a.songs.length);
  }, [songs]);

  // 按艺人分组
  const artists = useMemo<ArtistGroup[]>(() => {
    const map = new Map<string, ArtistGroup>();
    for (const s of songs) {
      const name = s.artist && s.artist !== "未知" ? s.artist : "未知艺人";
      const key = name;
      if (!map.has(key)) {
        map.set(key, {
          key,
          name,
          coverUrl: s.coverUrl,
          songs: [],
          albumCount: 0,
        });
      }
      map.get(key)!.songs.push(s);
    }
    // 统计每人的专辑数
    for (const artist of map.values()) {
      const albumSet = new Set<string>();
      for (const s of artist.songs) {
        if (s.album && s.album !== "未知") albumSet.add(s.album);
      }
      artist.albumCount = albumSet.size;
    }
    return Array.from(map.values()).sort((a, b) => b.songs.length - a.songs.length);
  }, [songs]);

  const setTab = (t: Tab) => {
    const nextParams = new URLSearchParams(params);
    nextParams.set("tab", t);
    nextParams.delete("playlistId");
    setParams(nextParams, { replace: true });
    setSelectedPlaylist(null);
    setSelectedAlbum(null);
    setSelectedArtist(null);
  };

  const handlePlayList = (list: Song[]) => {
    if (list.length === 0) return;
    setQueue(list, 0);
    playAt(0);
  };

  const handleCreate = async () => {
    const name = newName.trim() || `歌单 ${playlists.length + 1}`;
    await createPlaylist(name);
    setNewName("");
    setShowCreate(false);
  };

  const handleBackFromPlaylist = () => {
    if (playlistId) {
      const nextParams = new URLSearchParams(params);
      nextParams.delete("playlistId");
      setParams(nextParams, { replace: true });
    }
    setSelectedPlaylist(null);
  };

  // 歌单详情视图
  if (selectedPlaylist) {
    const map = new Map(songs.map((s) => [s.id, s]));
    const playlistSongs = selectedPlaylist.songIds
      .map((id) => map.get(id))
      .filter((s): s is Song => !!s);

    return (
      <div className="min-h-screen pb-28 bg-surface-subtle dark:bg-[#05060f] font-sans" style={{ WebkitFontSmoothing: "antialiased" }}>
        <div className="sticky top-0 z-30 px-4 pb-3 bg-[#0a0c1a]/95 backdrop-blur-lg" style={{ paddingTop: `${statusBarHeight}px` }}>
          <div className="flex items-center gap-2">
            <IconButton ariaLabel="返回" onClick={handleBackFromPlaylist}>
              <ArrowLeft className="h-5 w-5 text-ink dark:text-white" />
            </IconButton>
            <h1 className="flex-1 text-truncate text-lg font-bold text-ink dark:text-white">
              {selectedPlaylist.name}
            </h1>
            <button
              type="button"
              onClick={() => {
                if (confirm(`删除歌单「${selectedPlaylist.name}」？`)) {
                  void deletePlaylist(selectedPlaylist.id);
                  setSelectedPlaylist(null);
                }
              }}
              aria-label="删除歌单"
              className="flex h-9 w-9 items-center justify-center rounded-full text-rose-500 hover:bg-rose-500/10"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-[480px] px-4 pt-3">
          <div className="mb-4 flex items-center gap-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] p-4 backdrop-blur-sm">
            <CoverArt
              src={playlistSongs[0]?.coverUrl}
              alt={selectedPlaylist.name}
              size={88}
              rounded="lg"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-truncate text-xl font-bold text-ink dark:text-white">
                {selectedPlaylist.name}
              </h2>
              <p className="mt-1 text-sm text-ink-muted dark:text-white/70">
                {playlistSongs.length} 首歌曲
              </p>
              <button
                type="button"
                onClick={() => handlePlayList(playlistSongs)}
                disabled={playlistSongs.length === 0}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-ink dark:text-white shadow-glow pressable disabled:opacity-50"
              >
                <Play className="h-4 w-4 fill-white" />
                播放全部
              </button>
              <button
                type="button"
                onClick={() => setShowAddSongs(true)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-black/[0.03] dark:bg-white/6 px-4 py-1.5 text-sm font-medium text-ink-muted dark:text-white/70 backdrop-blur-md transition-colors hover:bg-black/[0.06] dark:hover:bg-white/12"
              >
                <Plus className="h-4 w-4" />
                添加歌曲
              </button>
            </div>
          </div>

          {playlistSongs.length === 0 ? (
            <>
              <EmptyState
                icon={<Disc3 className="h-9 w-9" />}
                title="歌单暂无歌曲"
                description="从音乐库中选择歌曲，添加到此歌单。"
              />
              <div className="mt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAddSongs(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.03] dark:bg-white/6 px-4 py-1.5 text-sm font-medium text-ink-muted dark:text-white/70 backdrop-blur-md transition-colors hover:bg-black/[0.06] dark:hover:bg-white/12"
                >
                  <Plus className="h-4 w-4" />
                  添加歌曲
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-0.5">
              {playlistSongs.map((song, i) => (
                <SongItem key={song.id} song={song} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 专辑详情视图
  if (selectedAlbum) {
    return (
      <div className="min-h-screen pb-28 bg-surface-subtle dark:bg-[#05060f] font-sans" style={{ WebkitFontSmoothing: "antialiased" }}>
        <div className="sticky top-0 z-30 px-4 pb-3 bg-[#0a0c1a]/95 backdrop-blur-lg" style={{ paddingTop: `${statusBarHeight}px` }}>
          <div className="flex items-center gap-2">
            <IconButton ariaLabel="返回" onClick={() => setSelectedAlbum(null)}>
              <ArrowLeft className="h-5 w-5 text-ink dark:text-white" />
            </IconButton>
            <h1 className="flex-1 text-truncate text-lg font-bold text-ink dark:text-white">
              {selectedAlbum.name}
            </h1>
          </div>
        </div>

        <div className="mx-auto max-w-[480px] px-4 pt-3">
          <div className="mb-4 flex items-center gap-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] p-4 backdrop-blur-sm">
            <CoverArt
              src={selectedAlbum.coverUrl}
              alt={selectedAlbum.name}
              size={88}
              rounded="lg"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-truncate text-xl font-bold text-ink dark:text-white">
                {selectedAlbum.name}
              </h2>
              <p className="mt-1 text-sm text-ink-muted dark:text-white/70">{selectedAlbum.artist}</p>
              <p className="mt-0.5 text-xs text-ink-subtle dark:text-white/50">
                {selectedAlbum.songs.length} 首歌曲
              </p>
              <button
                type="button"
                onClick={() => handlePlayList(selectedAlbum.songs)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-ink dark:text-white shadow-glow pressable"
              >
                <Play className="h-4 w-4 fill-white" />
                播放全部
              </button>
            </div>
          </div>

          <div className="space-y-0.5">
            {selectedAlbum.songs.map((song, i) => (
              <SongItem
                key={song.id}
                song={song}
                index={i}
                showIndex
                onClick={(s) => playSong(s, selectedAlbum.songs)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 艺人详情视图
  if (selectedArtist) {
    // 该艺人的专辑分组
    const artistAlbums = new Map<string, Song[]>();
    for (const s of selectedArtist.songs) {
      const name = s.album && s.album !== "未知" ? s.album : "未知专辑";
      if (!artistAlbums.has(name)) artistAlbums.set(name, []);
      artistAlbums.get(name)!.push(s);
    }
    return (
      <div className="min-h-screen pb-28 bg-surface-subtle dark:bg-[#05060f] font-sans" style={{ WebkitFontSmoothing: "antialiased" }}>
        <div className="sticky top-0 z-30 px-4 pb-3 bg-[#0a0c1a]/95 backdrop-blur-lg" style={{ paddingTop: `${statusBarHeight}px` }}>
          <div className="flex items-center gap-2">
            <IconButton ariaLabel="返回" onClick={() => setSelectedArtist(null)}>
              <ArrowLeft className="h-5 w-5 text-ink dark:text-white" />
            </IconButton>
            <h1 className="flex-1 text-truncate text-lg font-bold text-ink dark:text-white">
              {selectedArtist.name}
            </h1>
          </div>
        </div>

        <div className="mx-auto max-w-[480px] px-4 pt-3">
          {/* 艺人头部 */}
          <div className="mb-4 flex flex-col items-center gap-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] p-5 text-center backdrop-blur-sm">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-accent/30 to-accent/10 text-2xl font-bold text-accent">
              {selectedArtist.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-ink dark:text-white">{selectedArtist.name}</h2>
              <p className="mt-1 text-xs text-ink-muted dark:text-white/70">
                {selectedArtist.songs.length} 首歌曲 · {selectedArtist.albumCount} 张专辑
              </p>
            </div>
            <button
              type="button"
              onClick={() => handlePlayList(selectedArtist.songs)}
              className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2 text-sm font-medium text-ink dark:text-white shadow-glow pressable"
            >
              <Play className="h-4 w-4 fill-white" />
              随机播放
            </button>
          </div>

          {/* 专辑列表 */}
          {artistAlbums.size > 1 && (
            <div className="mb-4">
              <h3 className="mb-2 px-1 text-sm font-bold text-ink dark:text-white">专辑</h3>
              <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
                {Array.from(artistAlbums.entries()).map(([name, list]) => (
                  <motion.button
                    key={name}
                    type="button"
                    onClick={() =>
                      setSelectedAlbum({
                        key: `${name}__${selectedArtist.name}`,
                        name,
                        artist: selectedArtist.name,
                        coverUrl: list[0]?.coverUrl,
                        songs: list,
                      })
                    }
                    whileTap={{ scale: 0.96 }}
                    className="w-[120px] shrink-0 text-left"
                  >
                    <CoverArt
                      src={list[0]?.coverUrl}
                      alt={name}
                      size={120}
                      rounded="lg"
                      className="!w-full !h-auto aspect-square shadow-cover"
                    />
                    <div className="mt-1.5 text-truncate text-xs font-semibold text-ink dark:text-white">
                      {name}
                    </div>
                    <div className="text-[11px] text-ink-muted dark:text-white/70">
                      {list.length} 首
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* 全部歌曲 */}
          <h3 className="mb-2 px-1 text-sm font-bold text-ink dark:text-white">全部歌曲</h3>
          <div className="space-y-0.5">
            {selectedArtist.songs.map((song, i) => (
              <SongItem
                key={song.id}
                song={song}
                index={i}
                onClick={(s) => playSong(s, selectedArtist.songs)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 bg-surface-subtle dark:bg-[#05060f] font-sans" style={{ WebkitFontSmoothing: "antialiased" }}>
      <AppBar title="音乐库" subtitle={`${songs.length} 首本地歌曲`} showSearch={false} />

      <div className="mx-auto max-w-[480px] px-4 pt-3">
        {/* Tab 切换 */}
        <div className="no-scrollbar mb-4 flex gap-1 overflow-x-auto rounded-full bg-black/[0.03] dark:bg-white/[0.06] p-1">
          {([
            { key: "all", label: "全部" },
            { key: "recent", label: "最近" },
            { key: "albums", label: "专辑" },
            { key: "artists", label: "艺人" },
            { key: "favorites", label: "收藏" },
            { key: "mine", label: "歌单" },
          ] as const).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "relative shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                tab === t.key
                  ? "text-ink dark:text-white"
                  : "text-ink-muted dark:text-white/60 hover:text-ink dark:hover:text-white"
              )}
            >
              {tab === t.key && (
                <motion.div
                  layoutId="tab-bg"
                  className="absolute inset-0 -z-10 rounded-full bg-accent"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "all" && (
            <motion.div
              key="all"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              {songs.length === 0 ? (
                <EmptyState
                  icon={<ListMusic className="h-9 w-9" />}
                  title="音乐库为空"
                  description="导入本地音乐后即可在此查看。"
                />
              ) : (
                <>
                  <div className="mb-2 flex items-center justify-between px-2">
                    <span className="text-xs text-ink-muted dark:text-white/60">
                      共 {songs.length} 首
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePlayList(songs)}
                      className="flex items-center gap-1 text-xs font-medium text-accent"
                    >
                      <Play className="h-3.5 w-3.5 fill-accent" />
                      播放全部
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {songs.map((song, i) => (
                      <SongItem key={song.id} song={song} index={i} />
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {tab === "recent" && (
            <motion.div
              key="recent"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              {recentSongs.length === 0 ? (
                <EmptyState
                  icon={<Clock className="h-9 w-9" />}
                  title="暂无播放记录"
                  description="播放过的歌曲会出现在这里。"
                />
              ) : (
                <>
                  <div className="mb-2 px-2 text-xs text-ink-muted dark:text-white/60">
                    最近播放 {recentSongs.length} 首
                  </div>
                  <div className="space-y-0.5">
                    {recentSongs.map((song, i) => (
                      <SongItem
                        key={`${song.id}-${i}`}
                        song={song}
                        index={i}
                        onClick={(s) => playSong(s, recentSongs)}
                      />
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {tab === "albums" && (
            <motion.div
              key="albums"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              {albums.length === 0 ? (
                <EmptyState
                  icon={<Disc3 className="h-9 w-9" />}
                  title="暂无专辑"
                  description="导入带专辑标签的音乐后将自动分组。"
                />
              ) : (
                <>
                  <div className="mb-2 px-2 text-xs text-ink-muted dark:text-white/60">
                    共 {albums.length} 张专辑
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {albums.map((album, i) => (
                      <motion.button
                        key={album.key}
                        type="button"
                        onClick={() => setSelectedAlbum(album)}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.3) }}
                        whileTap={{ scale: 0.97 }}
                        className="flex flex-col gap-2 text-left"
                      >
                        <CoverArt
                          src={album.coverUrl}
                          alt={album.name}
                          size={160}
                          rounded="lg"
                          className="!w-full !h-auto aspect-square shadow-cover"
                        />
                        <div className="min-w-0">
                          <div className="text-truncate text-sm font-semibold text-ink dark:text-white">
                            {album.name}
                          </div>
                          <div className="text-truncate text-xs text-ink-muted dark:text-white/70">
                            {album.artist}
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {tab === "artists" && (
            <motion.div
              key="artists"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              {artists.length === 0 ? (
                <EmptyState
                  icon={<User2 className="h-9 w-9" />}
                  title="暂无艺人"
                  description="导入带艺人标签的音乐后将自动分组。"
                />
              ) : (
                <>
                  <div className="mb-2 px-2 text-xs text-ink-muted dark:text-white/60">
                    共 {artists.length} 位艺人
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {artists.map((artist, i) => (
                      <motion.button
                        key={artist.key}
                        type="button"
                        onClick={() => setSelectedArtist(artist)}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.3) }}
                        whileTap={{ scale: 0.97 }}
                        className="flex flex-col items-center gap-2 rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] p-3 text-center backdrop-blur-sm"
                      >
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-accent/30 to-accent/10 text-2xl font-bold text-accent">
                          {artist.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 w-full">
                          <div className="text-truncate text-sm font-semibold text-ink dark:text-white">
                            {artist.name}
                          </div>
                          <div className="text-xs text-ink-muted dark:text-white/70">
                            {artist.songs.length} 首 · {artist.albumCount} 张专辑
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {tab === "favorites" && (
            <motion.div
              key="favorites"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              {favorites.length === 0 ? (
                <EmptyState
                  icon={<Heart className="h-9 w-9" />}
                  title="暂无收藏"
                  description="在播放页点击红心收藏歌曲。"
                />
              ) : (
                <>
                  <div className="mb-2 flex items-center justify-between px-2">
                    <span className="text-xs text-ink-muted dark:text-white/60">
                      {favorites.length} 首收藏
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePlayList(favorites)}
                      className="flex items-center gap-1 text-xs font-medium text-accent"
                    >
                      <Play className="h-3.5 w-3.5 fill-accent" />
                      播放全部
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {favorites.map((song, i) => (
                      <SongItem
                        key={song.id}
                        song={song}
                        index={i}
                        onClick={(s) => playSong(s, favorites)}
                      />
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {tab === "mine" && (
            <motion.div
              key="mine"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="mb-3 flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-white/20 p-4 text-ink dark:text-white transition-colors hover:border-accent hover:bg-accent/5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/12 text-accent">
                  <Plus className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold">新建歌单</div>
                  <div className="text-xs text-ink-muted dark:text-white/60">创建属于你的精选合集</div>
                </div>
              </button>

              {playlists.length === 0 ? (
                <EmptyState
                  icon={<Disc3 className="h-9 w-9" />}
                  title="还没有歌单"
                  description="点击上方按钮，创建第一个歌单吧。"
                />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {playlists.map((p, i) => {
                    const first = songs.find((s) => s.id === p.songIds[0]);
                    return (
                      <motion.button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPlaylist(p)}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        whileTap={{ scale: 0.97 }}
                        className="flex flex-col gap-2 rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] p-3 text-left backdrop-blur-sm"
                      >
                        <CoverArt
                          src={first?.coverUrl}
                          alt={p.name}
                          size={140}
                          rounded="lg"
                          className="w-full"
                        />
                        <div className="min-w-0">
                          <div className="text-truncate text-sm font-semibold text-ink dark:text-white">
                            {p.name}
                          </div>
                          <div className="text-xs text-ink-muted dark:text-white/70">
                            {p.songIds.length} 首
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
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
              className="relative z-10 w-full max-w-md rounded-t-3xl bg-[#0f1120] p-6 shadow-2xl sm:rounded-3xl"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-black/[0.04] dark:bg-white/10 sm:hidden" />

              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5">
                  <ListMusic className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink dark:text-white">新建歌单</h3>
                  <p className="text-xs text-ink-muted dark:text-white/60">创建你的精选合集</p>
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
                    if (e.key === "Enter") void handleCreate();
                  }}
                  className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/[0.05] px-4 py-3.5 text-base font-medium text-ink dark:text-white outline-none transition-colors focus:border-accent focus:bg-accent/10"
                />
                {newName.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setNewName("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/10 text-ink-subtle dark:text-white/50 hover:bg-white/20"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 rounded-2xl bg-white/[0.08] py-3 text-sm font-semibold text-ink-muted dark:text-white/60 transition-colors hover:bg-white/[0.12]"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreate()}
                  className="flex-1 rounded-2xl bg-accent py-3 text-sm font-semibold text-ink dark:text-white shadow-lg shadow-accent/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  创建歌单
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 添加歌曲到歌单弹窗 */}
      <AnimatePresence>
        {showAddSongs && selectedPlaylist && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
            onClick={() => setShowAddSongs(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 w-full max-w-md rounded-t-3xl bg-[#0f1120] p-4 shadow-2xl sm:rounded-3xl"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/[0.04] dark:bg-white/10 sm:hidden" />
              <h3 className="mb-3 text-base font-bold text-ink dark:text-white">添加歌曲到歌单</h3>
              <div className="max-h-[50vh] overflow-y-auto thin-scrollbar">
                {availableSongs.length === 0 ? (
                  <div className="py-8 text-center text-sm text-ink-muted dark:text-white/60">所有歌曲已添加</div>
                ) : (
                  availableSongs.map((song) => (
                    <button
                      key={song.id}
                      type="button"
                      onClick={() => {
                        void addToPlaylist(selectedPlaylist.id, [song.id]);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/8"
                    >
                      <CoverArt src={song.coverUrl} alt={song.title} size={40} rounded="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="text-truncate text-sm font-medium text-ink dark:text-white">{song.title}</div>
                        <div className="text-truncate text-xs text-ink-muted dark:text-white/60">{song.artist}</div>
                      </div>
                      <Plus className="h-4 w-4 text-accent" />
                    </button>
                  ))
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowAddSongs(false)}
                className="mt-3 w-full rounded-2xl bg-white/[0.08] py-3 text-sm font-semibold text-ink-muted dark:text-white/60"
              >
                完成
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
