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
import MiniPlayer from "@/components/MiniPlayer";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useThemeStore } from "@/store/themeStore";
import { useLibraryStore } from "@/store/libraryStore";
import { setAudioElement } from "@/utils/audioElement";

function AnimatedRoutes() {
  const location = useLocation();

  // 播放页不显示底部 mini player（自身已是全屏播放视图）
  const isNowPlaying = location.pathname === "/playing";

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/playing" element={<NowPlaying />} />
            <Route path="/playlists" element={<Playlists />} />
            <Route path="/search" element={<Search />} />
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
  const loadPlaylists = useLibraryStore((s) => s.loadPlaylists);
  const loadRecents = useLibraryStore((s) => s.loadRecents);

  useAudioPlayer(audioRef);

  useEffect(() => {
    setAudioElement(audioRef.current);
    void initTheme();
    void loadPlaylists();
    void loadRecents();
  }, [initTheme, loadPlaylists, loadRecents]);

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
