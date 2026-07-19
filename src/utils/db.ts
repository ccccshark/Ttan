import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Playlist, RecentPlay, UserPreferences, Song } from "@/types";

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
}

let dbPromise: Promise<IDBPDatabase<MusicDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<MusicDB>("salt-music-db", 1, {
      upgrade(db) {
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
