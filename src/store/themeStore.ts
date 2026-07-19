import { create } from "zustand";
import type { Theme } from "@/types";
import { getPreferences, savePreferences } from "@/utils/db";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  initTheme: () => Promise<void>;
}

// 深色背景统一使用 #05060f（与 Capacitor / Android 启动色一致）
const DARK_BG = "#05060f";
const LIGHT_BG = "#f5f5f7";

async function syncStatusBar(theme: Theme) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    // Capacitor 命名反直觉：
    //   Style.Dark  = 深色图标（用于浅色背景）
    //   Style.Light = 浅色图标（用于深色背景）
    await StatusBar.setStyle({
      style: theme === "dark" ? Style.Light : Style.Dark,
    });
    await StatusBar.setBackgroundColor({
      color: theme === "dark" ? DARK_BG : LIGHT_BG,
    });
  } catch {
    // 非原生平台或权限不足，忽略
  }
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta)
    meta.setAttribute("content", theme === "dark" ? DARK_BG : LIGHT_BG);
  // 同步状态栏（异步，不阻塞 UI）
  void syncStatusBar(theme);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "light",
  setTheme: (t) => {
    applyTheme(t);
    set({ theme: t });
    // 持久化到 IndexedDB（异步，不阻塞）
    void savePreferences({
      theme: t,
      volume: 0.8,
      playMode: "order",
    }).catch(() => {});
  },
  toggleTheme: () => {
    const next = get().theme === "light" ? "dark" : "light";
    get().setTheme(next);
  },
  initTheme: async () => {
    // 先用 localStorage 立即响应，避免闪烁
    const local = localStorage.getItem("theme") as Theme | null;
    const initial: Theme =
      local ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");
    applyTheme(initial);
    set({ theme: initial });

    // 再尝试从 IndexedDB 读取完整偏好
    try {
      const prefs = await getPreferences();
      if (prefs?.theme && prefs.theme !== initial) {
        applyTheme(prefs.theme);
        set({ theme: prefs.theme });
      }
    } catch {
      // 忽略
    }
  },
}));

// 同步 localStorage，方便下次启动快速读取
useThemeStore.subscribe((state) => {
  localStorage.setItem("theme", state.theme);
});
