import { create } from "zustand";
import type { Theme } from "@/types";
import { getPreferences, savePreferences } from "@/utils/db";

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  initTheme: () => Promise<void>;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#0A0A0A" : "#FF6B35");
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
