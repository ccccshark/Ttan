import { useState } from "react";
import { Music2 } from "lucide-react";
import { getPlaceholderCover } from "@/utils/metadata";
import { cn } from "@/lib/utils";

interface CoverArtProps {
  src?: string;
  alt?: string;
  size?: number;
  className?: string;
  rounded?: "sm" | "md" | "lg" | "full";
  spinning?: boolean;
}

const roundedMap = {
  sm: "rounded-lg",
  md: "rounded-xl",
  lg: "rounded-2xl",
  full: "rounded-full",
};

export default function CoverArt({
  src,
  alt = "封面",
  size = 56,
  className,
  rounded = "md",
  spinning = false,
}: CoverArtProps) {
  const [errored, setErrored] = useState(false);
  const url = src && !errored ? src : getPlaceholderCover();

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-surface-muted shadow-sm",
        roundedMap[rounded],
        spinning && "animate-spin-slow",
        className
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={url}
        alt={alt}
        className="h-full w-full object-cover"
        onError={() => setErrored(true)}
        loading="lazy"
      />
      {!src && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Music2 className="h-1/3 w-1/3 text-white/80" />
        </div>
      )}
    </div>
  );
}
