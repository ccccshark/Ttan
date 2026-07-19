import { useEffect } from "react";
import { usePlayerStore } from "@/store/playerStore";
import type { Song } from "@/types";

// MediaSession API 集成：让系统级媒体控件（锁屏 / 蓝牙 / 车机 / 状态栏）能显示元数据并控制播放
// 在 App 根节点挂载一次

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
  if (!src || !("MediaImage" in window)) return [];
  const img = await loadImage(src);
  if (!img) return [];
  // MediaImage 需要尺寸与 src
  return [
    { src, sizes: `${img.naturalWidth}x${img.naturalHeight}`, type: "image/*" },
  ] as MediaImage[];
}

export function useMediaSession() {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  // 更新元数据
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    if (!currentSong) {
      navigator.mediaSession.metadata = null;
      return;
    }
    const song: Song = currentSong;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.artist,
      album: song.album,
    });
    // 异步加载封面
    void buildArtwork(song.coverUrl).then((artwork) => {
      if (navigator.mediaSession.metadata && artwork.length > 0) {
        navigator.mediaSession.metadata.artwork = artwork;
      }
    });
  }, [currentSong]);

  // 更新播放状态
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // 注册动作处理器（仅需一次）
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const { togglePlay, next, prev } = usePlayerStore.getState();
    const noop = () => {};

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

    void togglePlay; void next; void prev; void noop;
    return () => {
      try { ms.setActionHandler("play", null); } catch { /* ignore */ }
      try { ms.setActionHandler("pause", null); } catch { /* ignore */ }
      try { ms.setActionHandler("nexttrack", null); } catch { /* ignore */ }
      try { ms.setActionHandler("previoustrack", null); } catch { /* ignore */ }
      try { ms.setActionHandler("stop", null); } catch { /* ignore */ }
      try { ms.setActionHandler("seekto", null); } catch { /* ignore */ }
      try { ms.setActionHandler("seekbackward", null); } catch { /* ignore */ }
      try { ms.setActionHandler("seekforward", null); } catch { /* ignore */ }
    };
  }, []);
}
