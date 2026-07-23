import { create } from "zustand";
import type { Theme, ThemeMode } from "@/types";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

interface ThemeState {
  /** 当前实际生效的主题（light/dark，已解析） */
  theme: Theme;
  /** 用户选择的主题模式（支持 system） */
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  toggleTheme: () => void;
  /** 监听系统主题变化（仅 mode === 'system' 时生效） */
  bindSystemListener: () => () => void;
  initTheme: () => void;
}

const DARK_BG = "#1E1234";
const LIGHT_BG = "#F7F2FF";

async function syncStatusBar(theme: Theme) {
  if (!Capacitor.isNativePlatform()) return;
  try {
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
  if (meta) meta.setAttribute("content", theme === "dark" ? DARK_BG : LIGHT_BG);
  void syncStatusBar(theme);
}

// 根据 mode 解析实际生效主题
function resolveTheme(mode: ThemeMode): Theme {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return mode;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "light",
  mode: "system",

  setMode: (m) => {
    const next = resolveTheme(m);
    applyTheme(next);
    set({ mode: m, theme: next });
    // localStorage 缓存 mode，供启动时立即读取
    localStorage.setItem("theme-mode", m);
  },

  toggleTheme: () => {
    // 快捷切换：在 light/dark 之间翻转，并切到非 system 模式
    const current = get().theme;
    const next: Theme = current === "light" ? "dark" : "light";
    applyTheme(next);
    set({ theme: next, mode: next });
    localStorage.setItem("theme-mode", next);
  },

  bindSystemListener: () => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (get().mode === "system") {
        const next = resolveTheme("system");
        applyTheme(next);
        set({ theme: next });
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  },

  initTheme: () => {
    // 从 localStorage 读取 mode（启动时同步，避免闪烁）
    const storedMode = (localStorage.getItem("theme-mode") as ThemeMode | null) ?? "system";
    const initial = resolveTheme(storedMode);
    applyTheme(initial);
    set({ mode: storedMode, theme: initial });
  },
}));

export { applyTheme };
