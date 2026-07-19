import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Playlist, PlayCount, RecentPlay, UserPreferences, Song, Settings } from "@/types";

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
  playCounts: {
    key: string;
    value: PlayCount;
  };
}

let dbPromise: Promise<IDBPDatabase<MusicDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<MusicDB>("salt-music-db", 4, {
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
        // v3: 新增 playCounts 对象仓库
        if (!db.objectStoreNames.contains("playCounts")) {
          db.createObjectStore("playCounts", { keyPath: "songId" });
        }
        // v4: library 仓库结构不变，但语义升级——现在实际写入 Song（含 fileBlob/coverBlob）
        // 这里无需结构变更，仅版本号升级触发 upgrade 钩子，便于后续扩展
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

// ---- 播放次数 ----
export async function incrementPlayCount(songId: string): Promise<PlayCount> {
  const db = await getDB();
  const existing = await db.get("playCounts", songId);
  const next: PlayCount = {
    songId,
    count: (existing?.count ?? 0) + 1,
    lastPlayedAt: Date.now(),
  };
  await db.put("playCounts", next);
  return next;
}

export async function getAllPlayCounts(): Promise<PlayCount[]> {
  const db = await getDB();
  return db.getAll("playCounts");
}

export async function getPlayCount(songId: string): Promise<PlayCount | null> {
  const db = await getDB();
  const v = await db.get("playCounts", songId);
  return v ?? null;
}

export async function clearPlayCounts(): Promise<void> {
  const db = await getDB();
  await db.clear("playCounts");
}

// ---- 数据备份与恢复 ----
export interface BackupData {
  version: number;
  exportedAt: number;
  // 注意：fileUrl 是 blob URL，重启后失效，备份保留 fileBlob/coverBlob 以便恢复后重建
  songs: Song[];
  playlists: Playlist[];
  recents: RecentPlay[];
  settings: Settings | null;
  preferences: UserPreferences | null;
  playCounts: PlayCount[];
}

export async function exportBackup(): Promise<BackupData> {
  const db = await getDB();
  const [songs, playlists, recents, settings, preferences, playCounts] = await Promise.all([
    db.getAll("library"),
    db.getAll("playlists"),
    db.getAll("recents"),
    db.get("settings", "current"),
    db.get("preferences", "current"),
    db.getAll("playCounts"),
  ]);
  // 备份时清除 blob: URL（重启失效），但保留 fileBlob/coverBlob
  const sanitizedSongs = songs.map((s) => ({
    ...s,
    fileUrl: "",
    coverUrl: "",
  }));
  return {
    version: 4,
    exportedAt: Date.now(),
    songs: sanitizedSongs,
    playlists,
    recents,
    settings: settings ?? null,
    preferences: preferences ?? null,
    playCounts,
  };
}

export async function importBackup(data: BackupData): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ["library", "playlists", "recents", "settings", "preferences", "playCounts"],
    "readwrite"
  );
  await Promise.all([
    ...data.songs.map((s) => tx.objectStore("library").put(s)),
    ...data.playlists.map((p) => tx.objectStore("playlists").put(p)),
    ...data.recents.map((r) => tx.objectStore("recents").put(r)),
    ...data.playCounts.map((p) => tx.objectStore("playCounts").put(p)),
    data.settings ? tx.objectStore("settings").put(data.settings, "current") : Promise.resolve(),
    data.preferences ? tx.objectStore("preferences").put(data.preferences, "current") : Promise.resolve(),
  ]);
  await tx.done;
}

// ---- 音乐库（library 仓库：Song 含 Blob）----
export async function getAllSongs(): Promise<Song[]> {
  const db = await getDB();
  return db.getAll("library");
}

export async function saveSong(song: Song): Promise<void> {
  const db = await getDB();
  await db.put("library", song);
}

export async function saveSongs(songs: Song[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("library", "readwrite");
  await Promise.all(songs.map((s) => tx.objectStore("library").put(s)));
  await tx.done;
}

export async function deleteSong(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("library", id);
}

export async function clearLibrary(): Promise<void> {
  const db = await getDB();
  await db.clear("library");
}
