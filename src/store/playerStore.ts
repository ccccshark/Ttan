import { create } from "zustand";
import type { PlayMode, Song } from "@/types";
import { addRecent, incrementPlayCount } from "@/utils/db";

interface PlayerState {
  // 当前播放
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  playMode: PlayMode;

  // 播放队列
  queue: Song[];
  currentIndex: number;

  // 设置器
  setQueue: (queue: Song[], index?: number) => void;
  playSong: (song: Song, queue?: Song[]) => void;
  playAt: (index: number) => void;
  togglePlay: () => void;
  setIsPlaying: (p: boolean) => void;
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setPlayMode: (m: PlayMode) => void;
  cyclePlayMode: () => void;
  /** 下一首播放：插入到当前曲目之后 */
  insertNext: (song: Song) => void;
  /** 添加到队列末尾 */
  appendToQueue: (song: Song) => void;
  /** 从队列移除某项 */
  removeFromQueue: (index: number) => void;
  /** 队列重排（拖动） */
  reorderQueue: (from: number, to: number) => void;

  // 导航
  next: () => Song | null;
  prev: () => Song | null;

  // 内部回调（由 useAudioPlayer 注册）
  _onRequestPlay: (() => void) | null;
  _onRequestPause: (() => void) | null;
  _onRequestSeek: ((t: number) => void) | null;
  _onRequestNext: (() => void) | null;
  _onRequestPrev: (() => void) | null;
  _onRequestVolume: ((v: number) => void) | null;
  registerCallbacks: (c: Partial<{
    onPlay: () => void;
    onPause: () => void;
    onSeek: (t: number) => void;
    onNext: () => void;
    onPrev: () => void;
    onVolume: (v: number) => void;
  }>) => void;
}

// 记录播放次数（异步、防错）
function trackPlayCount(song: Song) {
  void addRecent(song.id).catch(() => {});
  void incrementPlayCount(song.id)
    .then((pc) => {
      // 同步更新 library store 中的 playCount
      const lib = (window as unknown as { __ttanLibSync?: (id: string, pc: { count: number; lastPlayedAt: number }) => void }).__ttanLibSync;
      lib?.(song.id, pc);
    })
    .catch(() => {});
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSong: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  muted: false,
  playMode: "order",
  queue: [],
  currentIndex: -1,

  setQueue: (queue, index = 0) => set({ queue, currentIndex: index }),

  playSong: (song, queue) => {
    const q = queue && queue.length > 0 ? queue : [song];
    const idx = q.findIndex((s) => s.id === song.id);
    const index = idx >= 0 ? idx : 0;
    set({
      currentSong: song,
      queue: q,
      currentIndex: index,
      isPlaying: true,
      currentTime: 0,
      duration: song.duration || 0,
    });
    trackPlayCount(song);
    // 触发音频播放
    setTimeout(() => get()._onRequestPlay?.(), 0);
  },

  playAt: (index) => {
    const { queue } = get();
    if (index < 0 || index >= queue.length) return;
    const song = queue[index];
    set({
      currentSong: song,
      currentIndex: index,
      isPlaying: true,
      currentTime: 0,
      duration: song.duration || 0,
    });
    trackPlayCount(song);
    setTimeout(() => get()._onRequestPlay?.(), 0);
  },

  insertNext: (song) => {
    const { queue, currentIndex } = get();
    // 去重：若已存在则移到当前位置后
    const filtered = queue.filter((s) => s.id !== song.id);
    const insertIdx = filtered.findIndex((s) => s === queue[currentIndex]);
    const at = insertIdx >= 0 ? insertIdx + 1 : filtered.length;
    const next = [...filtered.slice(0, at), song, ...filtered.slice(at)];
    set({ queue: next, currentIndex: Math.min(currentIndex, next.length - 1) });
  },

  appendToQueue: (song) => {
    const { queue } = get();
    if (queue.some((s) => s.id === song.id)) return;
    set({ queue: [...queue, song] });
  },

  removeFromQueue: (index) => {
    const { queue, currentIndex } = get();
    if (index < 0 || index >= queue.length) return;
    const next = queue.filter((_, i) => i !== index);
    const nextIdx = index < currentIndex ? currentIndex - 1 : index === currentIndex ? Math.min(currentIndex, next.length - 1) : currentIndex;
    set({ queue: next, currentIndex: Math.max(0, nextIdx) });
  },

  reorderQueue: (from, to) => {
    const { queue, currentIndex } = get();
    if (from === to || from < 0 || to < 0 || from >= queue.length || to >= queue.length) return;
    const next = [...queue];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    // 跟踪当前歌曲的新位置
    const cur = queue[currentIndex];
    const newIdx = next.findIndex((s) => s.id === cur?.id);
    set({ queue: next, currentIndex: newIdx >= 0 ? newIdx : currentIndex });
  },

  togglePlay: () => {
    const { isPlaying } = get();
    if (isPlaying) {
      set({ isPlaying: false });
      get()._onRequestPause?.();
    } else {
      set({ isPlaying: true });
      get()._onRequestPlay?.();
    }
  },

  setIsPlaying: (p) => set({ isPlaying: p }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setDuration: (d) => set({ duration: d }),

  setVolume: (v) => {
    set({ volume: v, muted: v === 0 });
    get()._onRequestVolume?.(v);
  },

  toggleMute: () => {
    const { muted } = get();
    set({ muted: !muted });
    get()._onRequestVolume?.(muted ? get().volume : 0);
  },

  setPlayMode: (m) => set({ playMode: m }),

  cyclePlayMode: () => {
    const { playMode } = get();
    const next: PlayMode =
      playMode === "order"
        ? "repeat-one"
        : playMode === "repeat-one"
          ? "shuffle"
          : "order";
    set({ playMode: next });
  },

  next: () => {
    const { queue, currentIndex, playMode } = get();
    if (queue.length === 0) return null;
    let nextIndex: number;
    if (playMode === "shuffle") {
      // 随机但不重复当前
      nextIndex = Math.floor(Math.random() * queue.length);
      if (nextIndex === currentIndex && queue.length > 1) {
        nextIndex = (nextIndex + 1) % queue.length;
      }
    } else {
      nextIndex = (currentIndex + 1) % queue.length;
    }
    const song = queue[nextIndex];
    set({
      currentSong: song,
      currentIndex: nextIndex,
      isPlaying: true,
      currentTime: 0,
      duration: song.duration || 0,
    });
    trackPlayCount(song);
    setTimeout(() => get()._onRequestPlay?.(), 0);
    return song;
  },

  prev: () => {
    const { queue, currentIndex } = get();
    if (queue.length === 0) return null;
    const prevIndex =
      currentIndex <= 0 ? queue.length - 1 : currentIndex - 1;
    const song = queue[prevIndex];
    set({
      currentSong: song,
      currentIndex: prevIndex,
      isPlaying: true,
      currentTime: 0,
      duration: song.duration || 0,
    });
    trackPlayCount(song);
    setTimeout(() => get()._onRequestPlay?.(), 0);
    return song;
  },

  _onRequestPlay: null,
  _onRequestPause: null,
  _onRequestSeek: null,
  _onRequestNext: null,
  _onRequestPrev: null,
  _onRequestVolume: null,

  registerCallbacks: (c) =>
    set((state) => ({
      _onRequestPlay: c.onPlay ?? state._onRequestPlay,
      _onRequestPause: c.onPause ?? state._onRequestPause,
      _onRequestSeek: c.onSeek ?? state._onRequestSeek,
      _onRequestNext: c.onNext ?? state._onRequestNext,
      _onRequestPrev: c.onPrev ?? state._onRequestPrev,
      _onRequestVolume: c.onVolume ?? state._onRequestVolume,
    })),
}));
