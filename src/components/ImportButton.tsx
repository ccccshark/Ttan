import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { FolderOpen, Loader2 } from "lucide-react";
import { useLibraryStore } from "@/store/libraryStore";
import { cn } from "@/lib/utils";

interface ImportButtonProps {
  variant?: "full" | "compact";
  className?: string;
  label?: string;
}

export default function ImportButton({
  variant = "full",
  className,
  label = "导入本地音乐",
}: ImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const addFiles = useLibraryStore((s) => s.addFiles);
  const importState = useLibraryStore((s) => s.importState);
  const progress = useLibraryStore((s) => s.importProgress);
  const [dragOver, setDragOver] = useState(false);

  const isParsing = importState === "parsing";

  const handleChange = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const audioFiles = Array.from(files).filter((f) =>
      f.type.startsWith("audio/") ||
      /\.(mp3|flac|wav|ogg|m4a|aac|opus|webm)$/i.test(f.name)
    );
    if (audioFiles.length > 0) void addFiles(audioFiles);
  };

  if (variant === "compact") {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.mp3,.flac,.wav,.ogg,.m4a,.aac,.opus"
          multiple
          className="hidden"
          onChange={(e) => handleChange(e.target.files)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isParsing}
          className={cn(
            "flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white shadow-glow transition-all pressable disabled:opacity-60",
            className
          )}
        >
          {isParsing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FolderOpen className="h-4 w-4" />
          )}
          {isParsing ? `解析中 ${progress.done}/${progress.total}` : label}
        </button>
      </>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.mp3,.flac,.wav,.ogg,.m4a,.aac,.opus"
        multiple
        className="hidden"
        onChange={(e) => handleChange(e.target.files)}
      />
      <motion.button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleChange(e.dataTransfer.files);
        }}
        disabled={isParsing}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "relative flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 transition-colors",
          "border-black/15 bg-white/60 text-ink hover:border-accent hover:bg-accent/5",
          "dark:border-white/15 dark:bg-white/[0.03] dark:hover:border-accent dark:hover:bg-accent/10",
          dragOver && "border-accent bg-accent/10",
          isParsing && "opacity-70",
          className
        )}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent">
          {isParsing ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <FolderOpen className="h-6 w-6" />
          )}
        </div>
        <div className="text-center">
          <div className="text-base font-semibold">
            {isParsing
              ? `正在解析 ${progress.done} / ${progress.total}`
              : label}
          </div>
          <div className="mt-1 text-xs text-ink-muted">
            支持 MP3 / FLAC / WAV / OGG / M4A，可拖入文件
          </div>
        </div>
      </motion.button>
    </>
  );
}
