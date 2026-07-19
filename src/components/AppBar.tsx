import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Moon, Search, Sun } from "lucide-react";
import { useThemeStore } from "@/store/themeStore";
import IconButton from "./IconButton";

interface AppBarProps {
  title: string;
  subtitle?: string;
  showSearch?: boolean;
  rightSlot?: React.ReactNode;
}

export default function AppBar({
  title,
  subtitle,
  showSearch = true,
  rightSlot,
}: AppBarProps) {
  const navigate = useNavigate();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass glass-light safe-top sticky top-0 z-30 px-4 pb-2 pt-2"
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-truncate text-2xl font-extrabold tracking-tight text-ink">
            {title}
          </h1>
          {subtitle && (
            <p className="text-truncate text-xs text-ink-muted">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {rightSlot}
          {showSearch && (
            <IconButton
              ariaLabel="搜索"
              onClick={() => navigate("/search")}
              size="md"
            >
              <Search className="h-5 w-5" />
            </IconButton>
          )}
          <IconButton
            ariaLabel="切换主题"
            onClick={toggleTheme}
            size="md"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </IconButton>
        </div>
      </div>
    </motion.header>
  );
}
