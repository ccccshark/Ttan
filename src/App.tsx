import { useEffect, useRef, useState } from "react";
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
import SongDetail from "@/pages/SongDetail";
import About from "@/pages/About";
import MyPage from "@/pages/MyPage";
import MiniPlayer from "@/components/MiniPlayer";
import BottomNav from "@/components/BottomNav";
import SplashScreen from "@/components/SplashScreen";
import BlurredBackground from "@/components/BlurredBackground";
import DisclaimerModal from "@/components/DisclaimerModal";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useEqualizer } from "@/hooks/useEqualizer";
import { useMediaSession } from "@/hooks/useMediaSession";
import { useShakeToSwitch } from "@/hooks/useShakeToSwitch";
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
            <Route path="/song/:id" element={<SongDetail />} />
            <Route path="/my" element={<MyPage />} />
            <Route path="/search" element={<Search />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </motion.div>
      </AnimatePresence>

      {!isNowPlaying && <MiniPlayer />}
      {!isNowPlaying && <BottomNav />}
    </>
  );
}

export default function App() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const initTheme = useThemeStore((s) => s.initTheme);
  const bindSystemListener = useThemeStore((s) => s.bindSystemListener);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const loadLibrary = useLibraryStore((s) => s.loadLibrary);
  const loadPlaylists = useLibraryStore((s) => s.loadPlaylists);
  const loadRecents = useLibraryStore((s) => s.loadRecents);
  const loadPlayCounts = useLibraryStore((s) => s.loadPlayCounts);
  const outputDeviceId = useSettingsStore((s) => s.settings.outputDeviceId);
  const volumeLimit = useSettingsStore((s) => s.settings.volumeLimit);

  const [showSplash, setShowSplash] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useAudioPlayer(audioRef);
  useEqualizer();
  useMediaSession();
  useShakeToSwitch();

  useEffect(() => {
    setAudioElement(audioRef.current);
    initTheme();
    const unbind = bindSystemListener();
    void loadSettings();
    void loadLibrary().then(() => {
      void loadPlaylists();
      void loadRecents();
      void loadPlayCounts();
      setDataLoaded(true);
    });
    return unbind;
  }, [initTheme, bindSystemListener, loadSettings, loadLibrary, loadPlaylists, loadRecents, loadPlayCounts]);

  // 输出设备切换：通过 setSinkId 应用到 audio 元素
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const el = audio as HTMLAudioElement & {
      setSinkId?: (id: string) => Promise<void>;
    };
    if (!el.setSinkId) return;
    void el.setSinkId(outputDeviceId).catch(() => {});
  }, [outputDeviceId]);

  // 音量限制：将 audio 元素的最大音量限制在 0.85
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (volumeLimit && audio.volume > 0.85) {
      audio.volume = 0.85;
    }
  }, [volumeLimit]);

  const handleSplashFinish = () => {
    setShowSplash(false);
    // 检查是否已同意免责声明
    const accepted = localStorage.getItem("disclaimerAccepted");
    if (!accepted) {
      setShowDisclaimer(true);
    }
  };

  const handleAcceptDisclaimer = () => {
    localStorage.setItem("disclaimerAccepted", "true");
    setShowDisclaimer(false);
  };

  return (
    <Router>
      <div className="relative mx-auto min-h-screen max-w-[480px] bg-surface-subtle dark:bg-surface-dark">
        {/* 高斯模糊动态背景 - 所有页面共享 */}
        <BlurredBackground />
        {/* 主内容始终渲染，启动页叠加在最上层，避免双重渲染 */}
        <AnimatedRoutes />
        <audio ref={audioRef} preload="metadata" />
        <AnimatePresence>
          {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
          {showDisclaimer && <DisclaimerModal onAccept={handleAcceptDisclaimer} />}
        </AnimatePresence>
      </div>
    </Router>
  );
}
