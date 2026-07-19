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
// 主题模式（支持跟随系统）
export type ThemeMode = "light" | "dark" | "system";

// 预设强调色
export type AccentPreset =
  | "salt" // 椒盐橙 #FF6B35
  | "retro-red" // 复古红 #E8332F
  | "spotify-green" // 薄荷绿 #1DB954
  | "ocean-blue" // 海洋蓝 #2E8BFF
  | "apple-pink" // 苹果粉 #FF375F
  | "mint-cyan" // 薄荷青 #00C2A8
  | "violet-purple" // 紫罗兰 #8B5CF6
  | "custom"; // 自定义

// 播放页背景风格
export type PlaybackBackground =
  | "flowLight" // 动态流光（默认）
  | "particle" // 星河粒子
  | "blurCover" // 模糊封面
  | "solid" // 纯色
  | "none"; // 无（仅暗色）

// 粒子背景密度
export type ParticleDensity = "off" | "low" | "medium" | "high";

// 播放完成行为
export type OnCompleteAction = "next" | "repeat-one" | "repeat-all" | "stop";

// 歌词对齐方式
export type LyricAlign = "left" | "center";

// 应用设置（持久化到 IndexedDB settings store）
export interface Settings {
  // === 外观与主题 ===
  themeMode: ThemeMode;
  accentPreset: AccentPreset;
  accentCustom: string; // hex，仅当 accentPreset === 'custom' 时使用
  dynamicColor: boolean; // 从封面提取主色作为强调色
  fontScale: number; // 0.85 / 0.9 / 1.0 / 1.1 / 1.25
  amoledBlack: boolean; // 深色模式下使用纯黑 #000000

  // === 播放页背景 ===
  playbackBackground: PlaybackBackground;
  flowLightIntensity: number; // 0 / 0.3 / 0.6 / 1.0
  particleDensity: ParticleDensity;

  // === 歌词 ===
  lyricsFontSize: number; // 14-48 px
  lyricsLineHeight: number; // 1.2 / 1.5 / 1.8 / 2.0
  lyricsAlign: LyricAlign;
  lyricsShowTranslation: boolean;
  lyricsOffsetMs: number; // -10000 ~ +10000
  lyricsKaraokeMode: boolean; // 逐字高亮

  // === 播放行为 ===
  crossfadeEnabled: boolean;
  crossfadeDuration: number; // 0-12 秒
  playbackSpeed: number; // 0.5-2.0
  pauseOnUnplug: boolean; // 耳机拔出暂停
  resumePosition: boolean; // 恢复播放位置
  pauseOnInterruption: boolean; // 音频焦点打断暂停
  gaplessPlayback: boolean; // 无缝播放
  replayGainMode: "off" | "track" | "album";

  // === 库与扫描 ===
  minDurationSec: number; // 过滤短音频
  hideShortClips: boolean;

  // === 手势 ===
  swipeToSwitch: boolean; // 滑动切歌
  longPressSeek: boolean; // 长按快进

  // === 其他 ===
  sleepTimerMin: number; // 0 = 关闭
  sleepFinishCurrent: boolean; // 睡眠定时器播完当前曲再停
  playCountEnabled: boolean; // 记录播放次数
  language: "system" | "zh-CN" | "en";
}

// 设置默认值
export const DEFAULT_SETTINGS: Settings = {
  // 外观
  themeMode: "system",
  accentPreset: "salt",
  accentCustom: "#FF6B35",
  dynamicColor: false,
  fontScale: 1.0,
  amoledBlack: false,
  // 背景
  playbackBackground: "flowLight",
  flowLightIntensity: 0.6,
  particleDensity: "medium",
  // 歌词
  lyricsFontSize: 20,
  lyricsLineHeight: 1.5,
  lyricsAlign: "center",
  lyricsShowTranslation: true,
  lyricsOffsetMs: 0,
  lyricsKaraokeMode: false,
  // 播放
  crossfadeEnabled: false,
  crossfadeDuration: 4,
  playbackSpeed: 1.0,
  pauseOnUnplug: true,
  resumePosition: true,
  pauseOnInterruption: true,
  gaplessPlayback: false,
  replayGainMode: "off",
  // 库
  minDurationSec: 30,
  hideShortClips: true,
  // 手势
  swipeToSwitch: true,
  longPressSeek: true,
  // 其他
  sleepTimerMin: 0,
  sleepFinishCurrent: true,
  playCountEnabled: true,
  language: "system",
};

// 预设强调色色板
export const ACCENT_PRESETS: Record<Exclude<AccentPreset, "custom">, { name: string; color: string }> = {
  salt: { name: "椒盐橙", color: "#FF6B35" },
  "retro-red": { name: "复古红", color: "#E8332F" },
  "spotify-green": { name: "薄荷绿", color: "#1DB954" },
  "ocean-blue": { name: "海洋蓝", color: "#2E8BFF" },
  "apple-pink": { name: "苹果粉", color: "#FF375F" },
  "mint-cyan": { name: "薄荷青", color: "#00C2A8" },
  "violet-purple": { name: "紫罗兰", color: "#8B5CF6" },
};

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
