import { create } from "zustand";
import type { Settings } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";
import { getSettings, saveSettings } from "@/utils/db";

interface SettingsState {
  settings: Settings;
  loaded: boolean;
  /** 计算后的当前强调色（hex） */
  accentColor: string;
  /** 加载设置（启动时调用一次） */
  loadSettings: () => Promise<void>;
  /** 更新单个/多个设置项，自动持久化并派生 accentColor */
  update: (patch: Partial<Settings>) => void;
  /** 重置为默认值 */
  reset: () => void;
}

// 派生当前 accent 颜色
function deriveAccent(s: Settings): string {
  // 优先级：dynamicColor 由外部在切歌时实时注入 CSS 变量，这里仅返回静态色
  if (s.accentPreset === "custom") return s.accentCustom;
  const presets: Record<string, string> = {
    salt: "#FF6B35",
    "retro-red": "#E8332F",
    "spotify-green": "#1DB954",
    "ocean-blue": "#2E8BFF",
    "apple-pink": "#FF375F",
    "mint-cyan": "#00C2A8",
    "violet-purple": "#8B5CF6",
  };
  return presets[s.accentPreset] ?? "#FF6B35";
}

// 把 accent 颜色与字体缩放注入到 :root CSS 变量
function applyCssVars(s: Settings) {
  const root = document.documentElement;
  const accent = deriveAccent(s);
  root.style.setProperty("--accent-color", accent);
  root.style.setProperty("--font-scale", String(s.fontScale));
  // AMOLED 黑模式
  if (s.amoledBlack) {
    root.classList.add("amoled");
  } else {
    root.classList.remove("amoled");
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  accentColor: deriveAccent(DEFAULT_SETTINGS),

  loadSettings: async () => {
    try {
      const stored = await getSettings();
      const next = stored ?? DEFAULT_SETTINGS;
      applyCssVars(next);
      set({ settings: next, loaded: true, accentColor: deriveAccent(next) });
    } catch {
      applyCssVars(DEFAULT_SETTINGS);
      set({ loaded: true });
    }
  },

  update: (patch) => {
    const next = { ...get().settings, ...patch };
    applyCssVars(next);
    set({ settings: next, accentColor: deriveAccent(next) });
    // 异步持久化，不阻塞 UI
    void saveSettings(next).catch(() => {});
  },

  reset: () => {
    applyCssVars(DEFAULT_SETTINGS);
    set({
      settings: DEFAULT_SETTINGS,
      accentColor: deriveAccent(DEFAULT_SETTINGS),
    });
    void saveSettings(DEFAULT_SETTINGS).catch(() => {});
  },
}));
