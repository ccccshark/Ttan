import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home as HomeIcon, Library, User2 } from "lucide-react";
import { cn } from "@/lib/utils";

type TabKey = "home" | "library" | "my";

const TABS: { key: TabKey; label: string; icon: typeof HomeIcon; path: string; match: string[] }[] = [
  { key: "home", label: "首页", icon: HomeIcon, path: "/", match: ["/"] },
  { key: "library", label: "音乐库", icon: Library, path: "/playlists", match: ["/playlists", "/search", "/song"] },
  { key: "my", label: "我的", icon: User2, path: "/my", match: ["/my", "/settings", "/about"] },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [current, setCurrent] = useState<TabKey>("home");

  useEffect(() => {
    const path = location.pathname;
    let activeTab: TabKey = "home";

    if (path === "/" || path.startsWith("/#")) {
      activeTab = "home";
    } else if (path.startsWith("/playlists") || path.startsWith("/search") || path.startsWith("/song/")) {
      activeTab = "library";
    } else if (path.startsWith("/my") || path.startsWith("/settings") || path.startsWith("/about")) {
      activeTab = "my";
    }

    setCurrent(activeTab);
  }, [location.pathname]);

  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-20"
      style={{
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
      }}
    >
      {/* 顶部渐变遮罩 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-full h-8 bg-gradient-to-t from-black/5 to-transparent dark:from-black/20" />

      <div className="mx-auto flex max-w-[480px] items-stretch justify-around px-3 py-2 bg-white/80 dark:bg-[#1E1234]/85 border-t border-black/[0.03] dark:border-white/[0.05]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = current === tab.key;
          return (
            <motion.button
              key={tab.key}
              type="button"
              onClick={() => navigate(tab.path)}
              whileTap={{ scale: 0.92 }}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 transition-colors",
                active ? "text-pixel-purple" : "text-ink-muted hover:text-ink dark:text-white/50 dark:hover:text-white/80"
              )}
            >
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
                active && "bg-pixel-purple/12"
              )}>
                <Icon
                  className={cn("h-[22px] w-[22px]", active && "fill-pixel-purple/15")}
                  strokeWidth={active ? 2.5 : 2}
                />
              </div>
              <span className={cn("text-[10px] font-medium", active && "font-semibold")}>
                {tab.label}
              </span>
              {active && (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  className="absolute -bottom-0.5 h-1 w-6 rounded-full bg-pixel-purple"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
