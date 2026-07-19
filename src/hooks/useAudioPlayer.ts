import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/store/playerStore";
import { useSettingsStore } from "@/store/settingsStore";
import { getPosition, getPreferences, savePosition } from "@/utils/db";

// 全局唯一的 audio 元素控制器
// 在 App 根节点挂载一次，将 audio 事件与 store 同步
// 同时负责应用播放行为设置：播放速度、耳机拔出暂停、位置恢复、音频焦点、睡眠定时器、淡入淡出

// 平滑音量过渡（毫秒）
function fadeVolume(audio: HTMLAudioElement, target: number, durationMs = 400): Promise<void> {
  const start = audio.volume;
  const startTime = performance.now();
  return new Promise((resolve) => {
    function tick(now: number) {
      const t = Math.min(1, (now - startTime) / durationMs);
      audio.volume = start + (target - start) * t;
      if (t < 1) requestAnimationFrame(tick);
      else {
        audio.volume = target;
        resolve();
      }
    }
    requestAnimationFrame(tick);
  });
}

export function useAudioPlayer(audioRef: React.RefObject<HTMLAudioElement>) {
  const audio = audioRef.current;
  const registerCallbacks = usePlayerStore((s) => s.registerCallbacks);
  const setPlayMode = usePlayerStore((s) => s.setPlayMode);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const initRef = useRef(false);

  // 当前用户暂停标志：用于区分用户主动暂停 vs 系统打断
  const userPausedRef = useRef(false);
  // 睡眠定时器触发后置位：播完当前曲后停止
  const sleepArmedRef = useRef(false);

  // 应用播放速度
  const playbackSpeed = useSettingsStore((s) => s.settings.playbackSpeed);
  useEffect(() => {
    if (audio) audio.playbackRate = playbackSpeed;
  }, [audio, playbackSpeed]);

  // 监听 audio 事件 & 注册控制回调
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
      // 应用当前播放速度
      audio.playbackRate = useSettingsStore.getState().settings.playbackSpeed;
      // 同步音量
      const { volume, muted } = usePlayerStore.getState();
      audio.volume = muted ? 0 : volume;
    };
    const onPlay = () => {
      userPausedRef.current = false;
      setIsPlaying(true);
    };
    const onPause = () => {
      // 仅当非用户主动暂停时，可能是系统打断
      if (!userPausedRef.current) {
        // 系统暂停（耳机拔出 / 来电 / 焦点被打断）
        setIsPlaying(false);
      } else {
        setIsPlaying(false);
      }
    };
    const onEnded = () => {
      // 睡眠定时器：播完当前曲后停止
      if (sleepArmedRef.current) {
        sleepArmedRef.current = false;
        // 清除 store 中 sleepTimerMin 以反映已停止
        useSettingsStore.getState().update({ sleepTimerMin: 0 });
        setIsPlaying(false);
        return;
      }
      const { playMode } = usePlayerStore.getState();
      if (playMode === "repeat-one") {
        audio.currentTime = 0;
        void audio.play().catch(() => {});
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
        userPausedRef.current = false;
        // 淡入
        const targetVol = usePlayerStore.getState().muted
          ? 0
          : usePlayerStore.getState().volume;
        const { crossfadeEnabled } = useSettingsStore.getState().settings;
        if (crossfadeEnabled) {
          audio.volume = 0;
          void audio.play().catch((err) => console.warn("播放失败:", err));
          void fadeVolume(audio, targetVol, 600);
        } else {
          audio.volume = targetVol;
          void audio.play().catch((err) => console.warn("播放失败:", err));
        }
      },
      onPause: () => {
        userPausedRef.current = true;
        const { crossfadeEnabled } = useSettingsStore.getState().settings;
        if (crossfadeEnabled) {
          // 淡出后暂停
          void fadeVolume(audio, 0, 300).then(() => {
            audio.pause();
            // 恢复目标音量，便于下次播放
            const { volume, muted } = usePlayerStore.getState();
            audio.volume = muted ? 0 : volume;
          });
        } else {
          audio.pause();
        }
      },
      onSeek: (t) => {
        audio.currentTime = t;
        setCurrentTime(t);
      },
      onVolume: (v) => {
        audio.volume = v;
      },
    });

    // === 耳机拔出暂停 ===
    let prevOutputCount = -1;
    const detectOutputs = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter((d) => d.kind === "audiooutput").length;
      } catch {
        return -1;
      }
    };
    const onDeviceChange = async () => {
      const { pauseOnUnplug } = useSettingsStore.getState().settings;
      if (!pauseOnUnplug) return;
      const cur = await detectOutputs();
      // 从有输出设备变为无（耳机拔出，且没有扬声器回退）
      if (prevOutputCount > 0 && cur === 0) {
        if (!audio.paused) {
          userPausedRef.current = true;
          audio.pause();
        }
      }
      prevOutputCount = cur;
    };
    void detectOutputs().then((c) => (prevOutputCount = c));
    navigator.mediaDevices?.addEventListener?.("devicechange", onDeviceChange);

    // === 音频焦点打断暂停（页面隐藏 / 来电等）===
    const onVisibility = () => {
      const { pauseOnInterruption } = useSettingsStore.getState().settings;
      if (!pauseOnInterruption) return;
      if (document.hidden && !audio.paused) {
        // 仅暂停，不置 userPaused：让恢复时仍可继续
        audio.pause();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // === 位置保存：每 5s + 暂停时 + 页面卸载时 ===
    const saveCurrentPosition = () => {
      const { currentSong, currentTime } = usePlayerStore.getState();
      if (!currentSong) return;
      const { resumePosition } = useSettingsStore.getState().settings;
      if (!resumePosition) return;
      void savePosition({
        songId: currentSong.id,
        currentTime,
        savedAt: Date.now(),
      }).catch(() => {});
    };
    const positionTimer = window.setInterval(saveCurrentPosition, 5000);
    window.addEventListener("beforeunload", saveCurrentPosition);
    audio.addEventListener("pause", saveCurrentPosition);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("durationchange", onLoadedMetadata);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", saveCurrentPosition);
      navigator.mediaDevices?.removeEventListener?.("devicechange", onDeviceChange);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", saveCurrentPosition);
      window.clearInterval(positionTimer);
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

  // === 启动时恢复上次播放位置 ===
  useEffect(() => {
    if (!audio) return;
    void (async () => {
      try {
        const prefs = await getPreferences();
        if (prefs) {
          if (prefs.playMode) setPlayMode(prefs.playMode);
          if (typeof prefs.volume === "number") {
            setVolume(prefs.volume);
            audio.volume = prefs.volume;
          }
        }
        const { resumePosition } = useSettingsStore.getState().settings;
        if (!resumePosition) return;
        const pos = await getPosition();
        // 仅恢复位置；不自动播放
        if (pos && pos.songId) {
          // 把进度写入 store，等待对应歌曲被选中后应用
          (window as unknown as { __resumePos?: { songId: string; currentTime: number } }).__resumePos = {
            songId: pos.songId,
            currentTime: pos.currentTime,
          };
        }
      } catch {
        // 忽略
      }
    })();
  }, [setPlayMode, setVolume, audio]);

  // 当切到的歌曲匹配之前保存的位置时，应用进度
  useEffect(() => {
    if (!audio || !currentSong) return;
    const w = window as unknown as { __resumePos?: { songId: string; currentTime: number } };
    if (w.__resumePos && w.__resumePos.songId === currentSong.id && audio.src === currentSong.fileUrl) {
      // 等待 metadata 加载完成再 seek
      const applyOnce = () => {
        if (audio.duration && w.__resumePos!) {
          audio.currentTime = Math.min(w.__resumePos.currentTime, audio.duration - 0.5);
          usePlayerStore.getState().setCurrentTime(audio.currentTime);
          delete w.__resumePos;
          audio.removeEventListener("loadedmetadata", applyOnce);
        }
      };
      audio.addEventListener("loadedmetadata", applyOnce);
      // 兜底：若已加载，立即尝试
      if (audio.duration) applyOnce();
    }
  }, [currentSong, audio]);

  // === 睡眠定时器 ===
  const sleepTimerMin = useSettingsStore((s) => s.settings.sleepTimerMin);
  const sleepFinishCurrent = useSettingsStore((s) => s.settings.sleepFinishCurrent);
  useEffect(() => {
    if (sleepTimerMin <= 0) {
      sleepArmedRef.current = false;
      return;
    }
    const ms = sleepTimerMin * 60 * 1000;
    const timer = window.setTimeout(() => {
      if (sleepFinishCurrent) {
        // 等当前曲播放完毕（在 onEnded 中处理）
        sleepArmedRef.current = true;
      } else {
        // 立即暂停
        if (audio && !audio.paused) {
          userPausedRef.current = true;
          audio.pause();
        }
        useSettingsStore.getState().update({ sleepTimerMin: 0 });
      }
    }, ms);
    return () => window.clearTimeout(timer);
  }, [sleepTimerMin, sleepFinishCurrent, audio]);
}
