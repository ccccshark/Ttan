// 歌曲数据模型
export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  coverUrl: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  lyrics?: string;
  addedAt: number;
}

// 歌单
export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  songIds: string[];
  createdAt: number;
  updatedAt: number;
}

// 播放模式
export type PlayMode = "order" | "repeat-one" | "shuffle";

// 主题
export type Theme = "light" | "dark";

// 歌词行
export interface LyricLine {
  time: number; // 秒
  text: string;
}

// 用户偏好
export interface UserPreferences {
  theme: Theme;
  volume: number;
  playMode: PlayMode;
  lastPlayedId?: string;
}

// 最近播放记录
export interface RecentPlay {
  songId: string;
  playedAt: number;
}
