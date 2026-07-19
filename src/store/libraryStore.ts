import { create } from "zustand";
import type { Playlist, Song } from "@/types";
import { filesToSongs } from "@/utils/metadata";
import {
  deletePlaylist as dbDeletePlaylist,
  getAllPlaylists,
  getRecents,
  savePlaylist,
} from "@/utils/db";
import { generateId } from "@/utils/format";

type ImportState = "idle" | "parsing" | "done" | "error";

interface LibraryState {
  songs: Song[];
  playlists: Playlist[];
  recentIds: string[];
  importState: ImportState;
  importProgress: { done: number; total: number };

  addFiles: (files: File[]) => Promise<void>;
  removeSong: (id: string) => void;
  clearLibrary: () => void;

  loadPlaylists: () => Promise<void>;
  createPlaylist: (name: string, songIds?: string[]) => Promise<Playlist>;
  renamePlaylist: (id: string, name: string) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addToPlaylist: (id: string, songIds: string[]) => Promise<void>;
  removeFromPlaylist: (id: string, songId: string) => Promise<void>;

  loadRecents: () => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  songs: [],
  playlists: [],
  recentIds: [],
  importState: "idle",
  importProgress: { done: 0, total: 0 },

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
      set({
        songs: [...get().songs, ...filtered],
        importState: "done",
      });
    } catch (err) {
      console.error("导入失败:", err);
      set({ importState: "error" });
    }
  },

  removeSong: (id) =>
    set({ songs: get().songs.filter((s) => s.id !== id) }),

  clearLibrary: () => set({ songs: [] }),

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
}));
