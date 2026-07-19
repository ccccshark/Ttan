import { useEffect, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Home from "@/pages/Home";
import NowPlaying from "@/pages/NowPlaying";
import Playlists from "@/pages/Playlists";
import Search from "@/pages/Search";
import Settings from "@/pages/Settings";
import About from "@/pages/About";
import MiniPlayer from "@/components/MiniPlayer";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useThemeStore } from "@/store/themeStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useLibraryStore } from "@/store/libraryStore";
import { setAudioElement } from "@/utils/audioElement";

function AnimatedRoutes() {
  const location = useLocation();

  // 播放页不显示底部 mini player（自身已是全屏播放视图）
  const isNowPlaying = location.pathname === "/playing";

  // 路由切换动画策略：进入播放页用上滑展开，离开用下滑收起，其他路由淡入淡出
  const isEnteringPlaying = location.pathname === "/playing";

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={
            isEnteringPlaying
              ? { opacity: 0, y: "100%" }
              : { opacity: 0 }
          }
          animate={{ opacity: 1, y: 0 }}
          exit={
            isEnteringPlaying
              ? { opacity: 0, y: "100%" }
              : { opacity: 0 }
          }
          transition={{
            duration: isEnteringPlaying ? 0.38 : 0.22,
            ease: [0.32, 0.72, 0, 1],
          }}
        >
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/playing" element={<NowPlaying />} />
            <Route path="/playlists" element={<Playlists />} />
            <Route path="/search" element={<Search />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </motion.div>
      </AnimatePresence>

      {!isNowPlaying && <MiniPlayer />}
    </>
  );
}

export default function App() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const initTheme = useThemeStore((s) => s.initTheme);
  const bindSystemListener = useThemeStore((s) => s.bindSystemListener);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const loadPlaylists = useLibraryStore((s) => s.loadPlaylists);
  const loadRecents = useLibraryStore((s) => s.loadRecents);

  useAudioPlayer(audioRef);

  useEffect(() => {
    setAudioElement(audioRef.current);
    initTheme();
    const unbind = bindSystemListener();
    void loadSettings();
    void loadPlaylists();
    void loadRecents();
    return unbind;
  }, [initTheme, bindSystemListener, loadSettings, loadPlaylists, loadRecents]);

  return (
    <Router>
      <div className="relative mx-auto min-h-screen max-w-[480px] bg-surface-subtle dark:bg-surface-dark">
        <AnimatedRoutes />
        {/* 全局唯一 audio 元素 */}
        <audio ref={audioRef} preload="metadata" />
      </div>
    </Router>
  );
}
