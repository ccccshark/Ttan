import { useEffect } from "react";
import { usePlayerStore } from "@/store/playerStore";
import type { Song } from "@/types";

// MediaSession API + Capacitor 原生媒体会话插件集成
// 让系统级媒体控件（锁屏 / 蓝牙 / 车机 / 状态栏 / 通知栏）能显示元数据并控制播放
// 在 Android 上使用 @juan.maldonado.dev/capacitor-media-session 提供前台服务和通知
// 在 Web/iOS 上使用标准 Media Session Web API

// 检测是否在 Capacitor 原生环境中
function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as Record<string, unknown>).Capacitor;
  if (!cap || typeof cap !== "object") return false;
  const isNative = (cap as Record<string, unknown>).isNativePlatform;
  return typeof isNative === "function" ? !!isNative() : !!isNative;
}

// 动态加载 Capacitor 媒体会话插件（仅在原生环境）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getCapacitorMediaSession(): Promise<any> {
  if (!isCapacitorNative()) return null;
  try {
    const mod = await import("@juan.maldonado.dev/capacitor-media-session");
    return mod.MediaSession;
  } catch {
    console.warn("Capacitor Media Session 插件未安装或加载失败");
    return null;
  }
}

function loadImage(src: string | undefined): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function buildArtwork(src: string | undefined) {
  if (!src) return [];
  const img = await loadImage(src);
  if (!img) return [];
  return [
    { src, sizes: `${img.naturalWidth}x${img.naturalHeight}`, type: "image/*" },
  ];
}

// Web 标准 MediaSession API
function updateWebMediaSession(song: Song | null, isPlaying: boolean) {
  if (!("mediaSession" in navigator)) return;

  if (!song) {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = "none";
    return;
  }

  navigator.mediaSession.metadata = new MediaMetadata({
    title: song.title,
    artist: song.artist,
    album: song.album,
  });
  navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

  // 异步加载封面
  void buildArtwork(song.coverUrl).then((artwork) => {
    if (navigator.mediaSession.metadata && artwork.length > 0) {
      navigator.mediaSession.metadata.artwork = artwork;
    }
  });
}

// Capacitor 原生媒体会话
async function updateCapacitorMediaSession(song: Song | null, isPlaying: boolean) {
  const MediaSession = await getCapacitorMediaSession();
  if (!MediaSession) return;

  if (!song) {
    try {
      await MediaSession.setPlaybackState({ state: "none" });
    } catch { /* ignore */ }
    return;
  }

  // 设置元数据
  try {
    const artwork = song.coverUrl ? [{ src: song.coverUrl, sizes: "512x512", type: "image/*" }] : [];
    await MediaSession.setMetadata({
      metadata: {
        title: song.title,
        artist: song.artist,
        album: song.album ?? "",
        artwork,
      },
    });
  } catch { /* ignore */ }

  // 设置播放状态（必须设置为 "playing" 才会启动前台服务/显示通知）
  try {
    await MediaSession.setPlaybackState({ state: isPlaying ? "playing" : "paused" });
  } catch { /* ignore */ }

  // 设置位置状态
  try {
    const { currentTime, duration } = usePlayerStore.getState();
    await MediaSession.setPositionState({
      duration: duration || 0,
      position: currentTime || 0,
      playbackRate: 1.0,
    });
  } catch { /* ignore */ }
}

export function useMediaSession() {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  // 更新元数据和播放状态
  useEffect(() => {
    // 始终更新 Web MediaSession
    updateWebMediaSession(currentSong, isPlaying);

    // 在 Capacitor 原生环境中额外更新原生媒体会话
    if (isCapacitorNative()) {
      void updateCapacitorMediaSession(currentSong, isPlaying);
    }
  }, [currentSong, isPlaying]);

  // 注册动作处理器（Web + Capacitor）
  useEffect(() => {
    const registerWebHandlers = () => {
      if (!("mediaSession" in navigator)) return;
      const ms = navigator.mediaSession;

      try { ms.setActionHandler("play", () => usePlayerStore.getState().togglePlay()); } catch { /* ignore */ }
      try { ms.setActionHandler("pause", () => usePlayerStore.getState().togglePlay()); } catch { /* ignore */ }
      try { ms.setActionHandler("nexttrack", () => usePlayerStore.getState().next()); } catch { /* ignore */ }
      try { ms.setActionHandler("previoustrack", () => usePlayerStore.getState().prev()); } catch { /* ignore */ }
      try { ms.setActionHandler("stop", () => {
        const st = usePlayerStore.getState();
        if (st.isPlaying) st.togglePlay();
      }); } catch { /* ignore */ }
      try { ms.setActionHandler("seekto", (details: MediaSessionActionDetails) => {
        if (typeof details.seekTime === "number") {
          usePlayerStore.getState()._onRequestSeek?.(details.seekTime);
        }
      }); } catch { /* ignore */ }
      try { ms.setActionHandler("seekbackward", (details: MediaSessionActionDetails) => {
        const st = usePlayerStore.getState();
        st._onRequestSeek?.(Math.max(0, st.currentTime - (details.seekOffset ?? 10)));
      }); } catch { /* ignore */ }
      try { ms.setActionHandler("seekforward", (details: MediaSessionActionDetails) => {
        const st = usePlayerStore.getState();
        st._onRequestSeek?.(Math.min(st.duration, st.currentTime + (details.seekOffset ?? 10)));
      }); } catch { /* ignore */ }
    };

    const registerCapacitorHandlers = async () => {
      if (!isCapacitorNative()) return;
      const MediaSession = await getCapacitorMediaSession();
      if (!MediaSession) return;

      try {
        await MediaSession.setActionHandler({ action: "play" });
        await MediaSession.setActionHandler({ action: "pause" });
        await MediaSession.setActionHandler({ action: "nexttrack" });
        await MediaSession.setActionHandler({ action: "previoustrack" });
        await MediaSession.setActionHandler({ action: "seekto" });
      } catch { /* ignore */ }

      // 监听 Capacitor 媒体控制事件
      MediaSession.addListener("action", (event: { action: string; seekTime?: number }) => {
        const st = usePlayerStore.getState();
        switch (event.action) {
          case "play":
            if (!st.isPlaying) st.togglePlay();
            break;
          case "pause":
            if (st.isPlaying) st.togglePlay();
            break;
          case "nexttrack":
            st.next();
            break;
          case "previoustrack":
            st.prev();
            break;
          case "seekto":
            if (typeof event.seekTime === "number") {
              st._onRequestSeek?.(event.seekTime);
            }
            break;
        }
      });
    };

    registerWebHandlers();
    void registerCapacitorHandlers();

    return () => {
      // 清理 Web handlers
      if ("mediaSession" in navigator) {
        const ms = navigator.mediaSession;
        try { ms.setActionHandler("play", null); } catch { /* ignore */ }
        try { ms.setActionHandler("pause", null); } catch { /* ignore */ }
        try { ms.setActionHandler("nexttrack", null); } catch { /* ignore */ }
        try { ms.setActionHandler("previoustrack", null); } catch { /* ignore */ }
        try { ms.setActionHandler("stop", null); } catch { /* ignore */ }
        try { ms.setActionHandler("seekto", null); } catch { /* ignore */ }
        try { ms.setActionHandler("seekbackward", null); } catch { /* ignore */ }
        try { ms.setActionHandler("seekforward", null); } catch { /* ignore */ }
      }
    };
  }, []);
}
