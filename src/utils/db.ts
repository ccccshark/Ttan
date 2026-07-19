import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Playlist, RecentPlay, UserPreferences, Song, Settings } from "@/types";

interface MusicDB extends DBSchema {
  playlists: {
    key: string;
    value: Playlist;
  };
  recents: {
    key: string;
    value: RecentPlay;
  };
  preferences: {
    key: string;
    value: UserPreferences;
  };
  library: {
    key: string;
    value: Song;
  };
  settings: {
    key: string;
    value: Settings;
  };
}

let dbPromise: Promise<IDBPDatabase<MusicDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<MusicDB>("salt-music-db", 2, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        if (!db.objectStoreNames.contains("playlists")) {
          db.createObjectStore("playlists", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("recents")) {
          db.createObjectStore("recents", { keyPath: "songId" });
        }
        if (!db.objectStoreNames.contains("preferences")) {
          db.createObjectStore("preferences");
        }
        if (!db.objectStoreNames.contains("library")) {
          db.createObjectStore("library", { keyPath: "id" });
        }
        // v2: 新增 settings 对象仓库（key-value，存单文档）
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings");
        }
        // 兼容旧版本无返回值的 transaction，不强制 await
        void transaction;
      },
    });
  }
  return dbPromise;
}

// ---- 歌单 ----
export async function getAllPlaylists(): Promise<Playlist[]> {
  const db = await getDB();
  return db.getAll("playlists");
}

export async function savePlaylist(playlist: Playlist): Promise<void> {
  const db = await getDB();
  await db.put("playlists", playlist);
}

export async function deletePlaylist(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("playlists", id);
}

// ---- 最近播放 ----
export async function getRecents(): Promise<RecentPlay[]> {
  const db = await getDB();
  const all = await db.getAll("recents");
  return all.sort((a, b) => b.playedAt - a.playedAt).slice(0, 100);
}

export async function addRecent(songId: string): Promise<void> {
  const db = await getDB();
  await db.put("recents", { songId, playedAt: Date.now() });
}

export async function clearRecents(): Promise<void> {
  const db = await getDB();
  await db.clear("recents");
}

// ---- 偏好 ----
export async function getPreferences(): Promise<UserPreferences | null> {
  const db = await getDB();
  const v = await db.get("preferences", "current");
  return v ?? null;
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  const db = await getDB();
  await db.put("preferences", prefs, "current");
}

// ---- 应用设置（独立于 UserPreferences，存所有可配置项）----
export async function getSettings(): Promise<Settings | null> {
  const db = await getDB();
  const v = await db.get("settings", "current");
  return v ?? null;
}

export async function saveSettings(settings: Settings): Promise<void> {
  const db = await getDB();
  await db.put("settings", settings, "current");
}

// ---- 播放位置（恢复进度）----
export interface PlaybackPosition {
  songId: string;
  currentTime: number;
  savedAt: number;
}
export async function getPosition(): Promise<PlaybackPosition | null> {
  const db = await getDB();
  const v = await db.get("preferences", "playback-position");
  return (v as unknown as PlaybackPosition | undefined) ?? null;
}
export async function savePosition(pos: PlaybackPosition): Promise<void> {
  const db = await getDB();
  await db.put("preferences", pos as unknown as UserPreferences, "playback-position");
}
