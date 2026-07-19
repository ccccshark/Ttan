import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/store/playerStore";
import { getPreferences } from "@/utils/db";

// 全局唯一的 audio 元素控制器
// 在 App 根节点挂载一次，将 audio 事件与 store 同步
export function useAudioPlayer(audioRef: React.RefObject<HTMLAudioElement>) {
  const audio = audioRef.current;
  const registerCallbacks = usePlayerStore((s) => s.registerCallbacks);
  const setPlayMode = usePlayerStore((s) => s.setPlayMode);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const initRef = useRef(false);

  // 监听 audio 事件
  useEffect(() => {
    if (!audio || initRef.current) return;
    initRef.current = true;

    const setIsPlaying = usePlayerStore.getState().setIsPlaying;
    const setCurrentTime = usePlayerStore.getState().setCurrentTime;
    const setDuration = usePlayerStore.getState().setDuration;
    const next = usePlayerStore.getState().next;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      setDuration(audio.duration);
      // 同步音量
      const { volume, muted } = usePlayerStore.getState();
      audio.volume = muted ? 0 : volume;
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      const { playMode } = usePlayerStore.getState();
      if (playMode === "repeat-one") {
        audio.currentTime = 0;
        void audio.play();
      } else {
        next();
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("durationchange", onLoadedMetadata);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    // 注册控制回调
    registerCallbacks({
      onPlay: () => {
        const { currentSong } = usePlayerStore.getState();
        if (currentSong && audio.src !== currentSong.fileUrl) {
          audio.src = currentSong.fileUrl;
        }
        void audio.play().catch((err) => console.warn("播放失败:", err));
      },
      onPause: () => audio.pause(),
      onSeek: (t) => {
        audio.currentTime = t;
        setCurrentTime(t);
      },
      onVolume: (v) => {
        audio.volume = v;
      },
    });

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("durationchange", onLoadedMetadata);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [audio, registerCallbacks]);

  // 当 currentSong 变化时，加载新源并播放
  const currentSong = usePlayerStore((s) => s.currentSong);
  useEffect(() => {
    if (!audio || !currentSong) return;
    if (audio.src !== currentSong.fileUrl) {
      audio.src = currentSong.fileUrl;
      audio.load();
      const { isPlaying } = usePlayerStore.getState();
      if (isPlaying) {
        void audio.play().catch((err) => console.warn("播放失败:", err));
      }
    }
  }, [currentSong, audio]);

  // 初始化：从 IndexedDB 读取偏好
  useEffect(() => {
    void (async () => {
      try {
        const prefs = await getPreferences();
        if (prefs) {
          if (prefs.playMode) setPlayMode(prefs.playMode);
          if (typeof prefs.volume === "number") setVolume(prefs.volume);
          if (audio) audio.volume = prefs.volume ?? 0.8;
        }
      } catch {
        // 忽略
      }
    })();
  }, [setPlayMode, setVolume, audio]);
}
