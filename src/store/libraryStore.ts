import { create } from "zustand";
import type { Playlist, PlayCount, Song } from "@/types";
import { filesToSongs, getPlaceholderCover } from "@/utils/metadata";
import {
  clearLibrary as dbClearLibrary,
  deletePlaylist as dbDeletePlaylist,
  deleteSong as dbDeleteSong,
  getAllPlaylists,
  getAllPlayCounts,
  getAllSongs,
  getRecents,
  savePlaylist,
  saveSong,
  saveSongs,
} from "@/utils/db";
import { generateId } from "@/utils/format";

type ImportState = "idle" | "parsing" | "done" | "error";

interface LibraryState {
  songs: Song[];
  playlists: Playlist[];
  recentIds: string[];
  playCounts: Record<string, PlayCount>;
  importState: ImportState;
  importProgress: { done: number; total: number };
  /** 已加载标记：避免重复加载 */
  loaded: boolean;

  /** 启动时加载：从 IndexedDB 读取所有歌曲，并重建 blob URL */
  loadLibrary: () => Promise<void>;
  addFiles: (files: File[]) => Promise<void>;
  removeSong: (id: string) => Promise<void>;
  clearLibrary: () => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  toggleHidden: (id: string) => Promise<void>;
  updateSong: (id: string, patch: Partial<Song>) => Promise<void>;
  /** 同步播放次数到内存（由 playerStore 调用） */
  syncPlayCount: (songId: string, pc: PlayCount) => void;

  loadPlaylists: () => Promise<void>;
  createPlaylist: (name: string, songIds?: string[]) => Promise<Playlist>;
  renamePlaylist: (id: string, name: string) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addToPlaylist: (id: string, songIds: string[]) => Promise<void>;
  removeFromPlaylist: (id: string, songId: string) => Promise<void>;

  loadRecents: () => Promise<void>;
  loadPlayCounts: () => Promise<void>;
}

// 从 IndexedDB 加载 Song 时，根据 fileBlob/coverBlob 重建 blob URL
function rebuildSongUrls(song: Song): Song {
  const next: Song = { ...song };
  if (song.fileBlob) {
    next.fileUrl = URL.createObjectURL(song.fileBlob);
  }
  if (song.coverBlob) {
    next.coverUrl = URL.createObjectURL(song.coverBlob);
  } else {
    next.coverUrl = getPlaceholderCover();
  }
  return next;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  songs: [],
  playlists: [],
  recentIds: [],
  playCounts: {},
  importState: "idle",
  importProgress: { done: 0, total: 0 },
  loaded: false,

  loadLibrary: async () => {
    if (get().loaded) return;
    try {
      const all = await getAllSongs();
      const songs = all.map(rebuildSongUrls);
      set({ songs, loaded: true });
    } catch (err) {
      console.error("加载音乐库失败:", err);
      set({ loaded: true });
    }
  },

  addFiles: async (files) => {
    if (files.length === 0) return;
    set({ importState: "parsing", importProgress: { done: 0, total: files.length } });
    try {
      const newSongs = await filesToSongs(files, (done, total) =>
        set({ importProgress: { done, total } })
      );
      // 去重：基于文件名 + 大小
      const existing = new Set(get().songs.map((s) => `${s.fileName}-${s.fileSize}`));
      const filtered = newSongs.filter(
        (s) => !existing.has(`${s.fileName}-${s.fileSize}`)
      );
      // 持久化到 IndexedDB（含 fileBlob/coverBlob）
      await saveSongs(filtered);
      set({
        songs: [...get().songs, ...filtered],
        importState: "done",
      });
    } catch (err) {
      console.error("导入失败:", err);
      set({ importState: "error" });
    }
  },

  removeSong: async (id) => {
    await dbDeleteSong(id).catch(() => {});
    set({ songs: get().songs.filter((s) => s.id !== id) });
  },

  clearLibrary: async () => {
    await dbClearLibrary().catch(() => {});
    set({ songs: [] });
  },

  toggleFavorite: async (id) => {
    let patched: Song | undefined;
    const songs = get().songs.map((s) => {
      if (s.id !== id) return s;
      patched = { ...s, favorite: !s.favorite };
      return patched;
    });
    set({ songs });
    if (patched) await saveSong(patched).catch(() => {});
  },

  toggleHidden: async (id) => {
    let patched: Song | undefined;
    const songs = get().songs.map((s) => {
      if (s.id !== id) return s;
      patched = { ...s, hidden: !s.hidden };
      return patched;
    });
    set({ songs });
    if (patched) await saveSong(patched).catch(() => {});
  },

  updateSong: async (id, patch) => {
    let patched: Song | undefined;
    const songs = get().songs.map((s) => {
      if (s.id !== id) return s;
      patched = { ...s, ...patch };
      return patched;
    });
    set({ songs });
    if (patched) await saveSong(patched).catch(() => {});
  },

  syncPlayCount: (songId, pc) =>
    set({
      playCounts: { ...get().playCounts, [songId]: pc },
      songs: get().songs.map((s) =>
        s.id === songId
          ? { ...s, playCount: pc.count, lastPlayedAt: pc.lastPlayedAt }
          : s
      ),
    }),

  loadPlaylists: async () => {
    try {
      const playlists = await getAllPlaylists();
      set({ playlists });
    } catch (err) {
      console.error("加载歌单失败:", err);
    }
  },

  createPlaylist: async (name, songIds = []) => {
    const now = Date.now();
    const playlist: Playlist = {
      id: generateId(),
      name,
      songIds,
      createdAt: now,
      updatedAt: now,
    };
    await savePlaylist(playlist);
    set({ playlists: [...get().playlists, playlist] });
    return playlist;
  },

  renamePlaylist: async (id, name) => {
    const playlists = get().playlists.map((p) =>
      p.id === id ? { ...p, name, updatedAt: Date.now() } : p
    );
    const target = playlists.find((p) => p.id === id);
    if (target) await savePlaylist(target);
    set({ playlists });
  },

  deletePlaylist: async (id) => {
    await dbDeletePlaylist(id);
    set({ playlists: get().playlists.filter((p) => p.id !== id) });
  },

  addToPlaylist: async (id, songIds) => {
    const playlists = get().playlists.map((p) =>
      p.id === id
        ? {
            ...p,
            songIds: [...new Set([...p.songIds, ...songIds])],
            updatedAt: Date.now(),
          }
        : p
    );
    const target = playlists.find((p) => p.id === id);
    if (target) await savePlaylist(target);
    set({ playlists });
  },

  removeFromPlaylist: async (id, songId) => {
    const playlists = get().playlists.map((p) =>
      p.id === id
        ? {
            ...p,
            songIds: p.songIds.filter((sid) => sid !== songId),
            updatedAt: Date.now(),
          }
        : p
    );
    const target = playlists.find((p) => p.id === id);
    if (target) await savePlaylist(target);
    set({ playlists });
  },

  loadRecents: async () => {
    try {
      const recents = await getRecents();
      set({ recentIds: recents.map((r) => r.songId) });
    } catch {
      // 忽略
    }
  },

  loadPlayCounts: async () => {
    try {
      const list = await getAllPlayCounts();
      const map: Record<string, PlayCount> = {};
      for (const pc of list) map[pc.songId] = pc;
      // 同步到 songs 内存
      const songs = get().songs.map((s) =>
        map[s.id]
          ? { ...s, playCount: map[s.id].count, lastPlayedAt: map[s.id].lastPlayedAt }
          : s
      );
      set({ playCounts: map, songs });
    } catch {
      // 忽略
    }
  },
}));

// 注册全局同步钩子：playerStore 切歌时调用
(window as unknown as { __ttanLibSync?: (id: string, pc: PlayCount) => void }).__ttanLibSync = (id, pc) => {
  useLibraryStore.getState().syncPlayCount(id, pc);
};
