import { useEffect, useRef } from "react";
import { useSettingsStore } from "@/store/settingsStore";
import { usePlayerStore } from "@/store/playerStore";

// 摇一摇切歌：基于 DeviceMotion API
// 当检测到设备在 1.2 秒内出现一次明显加速度峰值时切下一首
// 阈值约 15 m/s²（约 1.5g），避免普通走动误触发
// 在 App 根节点挂载一次

const SHAKE_THRESHOLD = 15; // m/s²
const SHAKE_COOLDOWN = 1200; // ms，避免连击
const SHAKE_WINDOW = 1200; // ms，事件聚合窗口

interface AccelPeak {
  time: number;
  magnitude: number;
}

export function useShakeToSwitch() {
  const enabled = useSettingsStore((s) => s.settings.shakeToSwitch);
  const lastTriggerRef = useRef(0);
  const peaksRef = useRef<AccelPeak[]>([]);

  useEffect(() => {
    if (!enabled) {
      peaksRef.current = [];
      return;
    }
    if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) return;

    const handleMotion = (event: DeviceMotionEvent) => {
      const a = event.accelerationIncludingGravity ?? event.acceleration;
      if (!a) return;
      const x = a.x ?? 0;
      const y = a.y ?? 0;
      const z = a.z ?? 0;
      // 减去重力 baseline（约 9.8 沿 z 轴），仅考虑净加速度
      const magnitude = Math.sqrt(x * x + y * y + z * z) - 9.8;
      if (magnitude < SHAKE_THRESHOLD) return;

      const now = performance.now();
      const peaks = peaksRef.current;
      peaks.push({ time: now, magnitude });
      // 仅保留窗口内的峰值
      while (peaks.length > 0 && now - peaks[0].time > SHAKE_WINDOW) {
        peaks.shift();
      }
      // 单次峰值足够；如需多次峰值可改为 peaks.length >= 2
      if (peaks.length < 1) return;
      if (now - lastTriggerRef.current < SHAKE_COOLDOWN) return;

      lastTriggerRef.current = now;
      peaksRef.current = [];
      // 触发下一首（仅当正在播放时）
      const { isPlaying } = usePlayerStore.getState();
      if (isPlaying) {
        usePlayerStore.getState().next();
      }
    };

    // iOS 13+ 需要请求权限
    const DME = window.DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    let cleanup: (() => void) | null = null;

    const attach = () => {
      window.addEventListener("devicemotion", handleMotion);
      cleanup = () => window.removeEventListener("devicemotion", handleMotion);
    };

    if (typeof DME.requestPermission === "function") {
      // 延迟到首次用户交互后再请求
      const onClick = () => {
        DME.requestPermission?.()
          .then((state) => {
            if (state === "granted") attach();
          })
          .catch(() => {});
        window.removeEventListener("click", onClick, true);
      };
      window.addEventListener("click", onClick, true);
      cleanup = () => {
        window.removeEventListener("click", onClick, true);
        if (cleanup) cleanup();
      };
    } else {
      attach();
    }

    return () => {
      cleanup?.();
    };
  }, [enabled]);
}
