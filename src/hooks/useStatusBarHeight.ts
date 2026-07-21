import { useEffect, useState } from "react";

// 检测是否在 Capacitor 原生环境中
function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as Record<string, unknown>).Capacitor;
  if (!cap || typeof cap !== "object") return false;
  const isNative = (cap as Record<string, unknown>).isNativePlatform;
  return typeof isNative === "function" ? !!isNative() : !!isNative;
}

/**
 * 获取系统状态栏高度（自适应各平台）
 *
 * - Capacitor 原生环境：使用 @capacitor/status-bar 插件获取实际高度
 * - Web 环境：使用 CSS env(safe-area-inset-top) 或根据 UA 估算
 *
 * 返回值单位为 px
 */
export function useStatusBarHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    let mounted = true;

    const getHeight = async () => {
      let computedHeight = 0;

      // 1. Capacitor 原生环境：使用 StatusBar 插件获取实际高度
      if (isCapacitorNative()) {
        try {
          const { StatusBar } = await import("@capacitor/status-bar");
          const info = await StatusBar.getInfo();
          // StatusBar 插件返回的 height 单位是 pt（iOS）或 px（Android）
          // 在 Android 上通常是 24-25dp，iOS 上是 44-47pt
          if (info && typeof info.height === "number") {
            // Android 的 height 已经是 px，iOS 的也是逻辑像素
            // 需要乘以 devicePixelRatio 转换为 CSS px（如果需要）
            // 但 Capacitor 通常已经处理了单位转换
            computedHeight = info.height;
          }
        } catch {
          // 插件加载失败，降级到估算
        }
      }

      // 2. 降级：CSS env(safe-area-inset-top)
      if (computedHeight === 0 && typeof window !== "undefined") {
        const safeAreaTop = parseInt(
          window.getComputedStyle(document.body).getPropertyValue("--safe-area-inset-top") || "0",
          10
        );
        computedHeight = safeAreaTop;
      }

      // 3. 降级：CSS env() 直接获取
      if (computedHeight === 0 && typeof window !== "undefined") {
        const envValue = parseInt(
          window.getComputedStyle(document.documentElement).getPropertyValue("env(safe-area-inset-top)") || "0",
          10
        );
        if (!isNaN(envValue) && envValue > 0) computedHeight = envValue;
      }

      // 4. 降级：根据 UA 估算
      if (computedHeight === 0 && typeof navigator !== "undefined") {
        const ua = navigator.userAgent;
        if (ua.includes("iPhone") || ua.includes("iPad")) {
          // iPhone 刘海屏 47pt，非刘海 20pt
          computedHeight = /iPhone/.test(ua) ? 47 : 24;
        } else if (ua.includes("Android")) {
          computedHeight = 24;
        }
      }

      if (mounted && computedHeight > 0) {
        setHeight(computedHeight);
        document.documentElement.style.setProperty("--status-bar-height", `${computedHeight}px`);
      }
    };

    void getHeight();

    const onResize = () => void getHeight();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      mounted = false;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  return height;
}
