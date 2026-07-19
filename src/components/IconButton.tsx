import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface IconButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
  active?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-14 w-14",
};

export default function IconButton({
  children,
  onClick,
  className,
  ariaLabel,
  active = false,
  size = "md",
}: IconButtonProps) {
  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      whileTap={{ scale: 0.88 }}
      whileHover={{ scale: 1.06 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "flex items-center justify-center rounded-full text-ink transition-colors",
        "hover:bg-black/5 dark:hover:bg-white/10",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        sizeMap[size],
        active && "text-accent",
        className
      )}
    >
      {children}
    </motion.button>
  );
}
