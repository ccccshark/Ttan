import { create } from "zustand";
import type { PlayMode, Song } from "@/types";
import { addRecent } from "@/utils/db";

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
    void addRecent(song.id).catch(() => {});
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
    void addRecent(song.id).catch(() => {});
    setTimeout(() => get()._onRequestPlay?.(), 0);
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
    void addRecent(song.id).catch(() => {});
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
    void addRecent(song.id).catch(() => {});
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
