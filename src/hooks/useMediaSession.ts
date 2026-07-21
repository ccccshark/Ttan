import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/store/playerStore";
import type { Song } from "@/types";

function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as Record<string, unknown>).Capacitor;
  if (!cap || typeof cap !== "object") return false;
  const isNative = (cap as Record<string, unknown>).isNativePlatform;
  return typeof isNative === "function" ? !!isNative() : !!isNative;
}

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
    { src, sizes: "512x512", type: "image/*" },
    { src, sizes: "256x256", type: "image/*" },
  ];
}

function updateWebMediaSession(song: Song | null, isPlaying: boolean, currentTime: number, duration: number) {
  if (!("mediaSession" in navigator)) return;

  if (!song) {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = "none";
    return;
  }

  navigator.mediaSession.metadata = new MediaMetadata({
    title: song.title || "未知歌曲",
    artist: song.artist || "未知艺术家",
    album: song.album || "",
  });
  navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

  void buildArtwork(song.coverUrl).then((artwork) => {
    if (navigator.mediaSession.metadata && artwork.length > 0) {
      navigator.mediaSession.metadata.artwork = artwork;
    }
  });

  try {
    navigator.mediaSession.setPositionState({
      duration: duration || 0,
      position: currentTime || 0,
      playbackRate: 1.0,
    });
  } catch { /* ignore */ }
}

async function updateCapacitorMediaSession(song: Song | null, isPlaying: boolean, currentTime: number, duration: number) {
  const MediaSession = await getCapacitorMediaSession();
  if (!MediaSession) return;

  if (!song) {
    try {
      await MediaSession.setPlaybackState({ state: "none" });
      await MediaSession.stopForegroundService();
    } catch { /* ignore */ }
    return;
  }

  try {
    await MediaSession.startForegroundService();
  } catch { /* ignore */ }

  try {
    const artwork = song.coverUrl 
      ? [
          { src: song.coverUrl, sizes: "512x512", type: "image/*" },
          { src: song.coverUrl, sizes: "256x256", type: "image/*" },
        ] 
      : [];
    
    await MediaSession.setMetadata({
      metadata: {
        title: song.title || "未知歌曲",
        artist: song.artist || "未知艺术家",
        album: song.album ?? "",
        artwork,
      },
    });
  } catch (err) {
    console.warn("设置媒体元数据失败:", err);
  }

  try {
    await MediaSession.setPlaybackState({ state: isPlaying ? "playing" : "paused" });
  } catch { /* ignore */ }

  try {
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
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const updateIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    updateWebMediaSession(currentSong, isPlaying, currentTime, duration);
    if (isCapacitorNative()) {
      void updateCapacitorMediaSession(currentSong, isPlaying, currentTime, duration);
    }
  }, [currentSong, isPlaying]);

  useEffect(() => {
    if (!currentSong || !isPlaying) {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      return;
    }

    updateWebMediaSession(currentSong, isPlaying, currentTime, duration);
    if (isCapacitorNative()) {
      void updateCapacitorMediaSession(currentSong, isPlaying, currentTime, duration);
    }

    updateIntervalRef.current = window.setInterval(() => {
      const state = usePlayerStore.getState();
      updateWebMediaSession(state.currentSong, state.isPlaying, state.currentTime, state.duration);
      if (isCapacitorNative()) {
        void updateCapacitorMediaSession(state.currentSong, state.isPlaying, state.currentTime, state.duration);
      }
    }, 1000);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, [currentTime, currentSong, duration, isPlaying]);

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
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);
}
