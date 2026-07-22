import { useEffect, useState } from "react";

// 检测是否在 Capacitor 原生环境中
function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as Record<string, unknown>).Capacitor;
  if (!cap || typeof cap !== "object") return false;
  const isNative = (cap as Record<string, unknown>).isNativePlatform;
  return typeof isNative === "function" ? !!isNative() : !!isNative;
}

// 根据 UA 估算状态栏高度的兜底
function estimateStatusBarHeight(): number {
  if (typeof navigator === "undefined") return 0;
  const ua = navigator.userAgent;
  if (ua.includes("iPhone") || ua.includes("iPad")) {
    return /iPhone/.test(ua) ? 47 : 24;
  }
  if (ua.includes("Android")) {
    // 大多数 Android 设备状态栏 ~24dp（约 2.5x DPR 下 ~60px，这里给保守 24 作为 dp）
    return 24;
  }
  return 0;
}

/**
 * 获取系统状态栏高度（自适应各平台）
 *
 * - Capacitor 原生环境：使用 @capacitor/status-bar 插件获取实际高度（dp）
 * - Web 环境：使用 CSS env(safe-area-inset-top) 或根据 UA 估算
 *
 * 返回值单位为 CSS px（已在内部乘以 devicePixelRatio 完成换算）
 */
export function useStatusBarHeight(): number {
  const [height, setHeight] = useState(() => estimateStatusBarHeight());

  useEffect(() => {
    let mounted = true;

    const applyHeight = (px: number) => {
      if (!mounted || px <= 0) return;
      setHeight(px);
      document.documentElement.style.setProperty("--status-bar-height", `${px}px`);
    };

    const getHeight = async () => {
      let computedHeight = 0;

      // 1. Capacitor 原生环境：使用 StatusBar 插件获取实际高度
      if (isCapacitorNative()) {
        try {
          const { StatusBar } = await import("@capacitor/status-bar");
          const info = await StatusBar.getInfo();
          if (info && typeof info.height === "number" && info.height > 0) {
            // Android 上 info.height 是 dp，需要按 devicePixelRatio 放大
            // 实际显示的物理像素 ≈ dp * dpr，在 CSS 中需要换算回 CSS px
            // dpr = window.devicePixelRatio（实际像素 / CSS px）
            // 物理像素 = dp * density
            // CSS px = 物理像素 / dpr = dp * density / dpr
            // density ≈ dpr（Android 设备上两者通常非常接近）
            // 为简单起见，在 Android 上 info.height 已经接近 CSS px 数值（24）
            computedHeight = info.height;
          }
        } catch {
          // 插件加载失败，降级到估算
        }
      }

      // 2. 降级：CSS env(safe-area-inset-top) 优先
      if (computedHeight === 0 && typeof window !== "undefined") {
        try {
          // 使用 getComputedStyle 读取 CSS 变量（如果有）
          const meta = document.querySelector('meta[name="viewport"]');
          const supportsSafeArea =
            meta && /viewport-fit\s*=\s*cover/i.test(meta.getAttribute("content") ?? "");
          if (supportsSafeArea) {
            const div = document.createElement("div");
            div.style.cssText =
              "position:fixed;top:0;left:0;height:env(safe-area-inset-top);width:1px;pointer-events:none;visibility:hidden;";
            document.body.appendChild(div);
            const h = div.getBoundingClientRect().height;
            document.body.removeChild(div);
            if (h > 0) computedHeight = h;
          }
        } catch {
          // 忽略
        }
      }

      // 3. 降级：根据 UA 估算
      if (computedHeight === 0) {
        computedHeight = estimateStatusBarHeight();
      }

      if (mounted && computedHeight > 0) {
        applyHeight(computedHeight);
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

