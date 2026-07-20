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
      className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-black/[0.04] bg-white/85 backdrop-blur-2xl dark:border-white/[0.06] dark:bg-[#0a0c14]/85"
      style={{
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
      }}
    >
      <div className="mx-auto flex max-w-[480px] items-stretch justify-around px-2 py-1.5">
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
                "relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 transition-colors",
                active ? "text-accent" : "text-ink-muted hover:text-ink dark:text-white/55"
              )}
            >
              <Icon
                className={cn("h-[22px] w-[22px]", active && "fill-accent/15")}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className={cn("text-[10px] font-medium", active && "font-semibold")}>
                {tab.label}
              </span>
              {active && (
                <motion.span
                  layoutId="bottom-nav-dot"
                  className="absolute -top-0.5 h-1 w-1 rounded-full bg-accent"
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
