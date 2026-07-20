import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Search as SearchIcon, X } from "lucide-react";
import { useLibraryStore } from "@/store/libraryStore";
import { usePlayerStore } from "@/store/playerStore";
import { useStatusBarHeight } from "@/hooks/useStatusBarHeight";
import SongItem from "@/components/SongItem";
import EmptyState from "@/components/EmptyState";
import IconButton from "@/components/IconButton";
import { cn } from "@/lib/utils";

type MatchType = "title" | "artist" | "album";

export default function Search() {
  const navigate = useNavigate();
  const songs = useLibraryStore((s) => s.songs);
  const playSong = usePlayerStore((s) => s.playSong);
  const statusBarHeight = useStatusBarHeight();
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("search-history");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return songs.filter((s) => {
      return (
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.album.toLowerCase().includes(q)
      );
    });
  }, [query, songs]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const groups: Record<MatchType, typeof songs> = {
      title: [],
      artist: [],
      album: [],
    };
    for (const s of songs) {
      if (s.title.toLowerCase().includes(q)) groups.title.push(s);
      else if (s.artist.toLowerCase().includes(q)) groups.artist.push(s);
      else if (s.album.toLowerCase().includes(q)) groups.album.push(s);
    }
    return groups;
  }, [query, songs]);

  const handleSearch = (q: string) => {
    setQuery(q);
    if (q.trim()) {
      const next = [q, ...history.filter((h) => h !== q)].slice(0, 8);
      setHistory(next);
      localStorage.setItem("search-history", JSON.stringify(next));
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem("search-history");
  };

  return (
    <div className="min-h-screen pb-28">
      {/* 搜索栏 */}
      <div className="glass glass-light sticky top-0 z-30 px-4 pb-3" style={{ paddingTop: `${statusBarHeight}px` }}>
        <div className="flex items-center gap-2">
          <IconButton ariaLabel="返回" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </IconButton>
          <div className="flex flex-1 items-center gap-2 rounded-full bg-black/5 px-3 py-2 dark:bg-white/10">
            <SearchIcon className="h-4 w-4 text-ink-subtle" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch(query);
              }}
              placeholder="搜索歌曲、艺术家、专辑"
              className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-subtle"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="清除"
                className="text-ink-subtle hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[480px] px-4 pt-3">
        {!query.trim() ? (
          // 历史
          <div>
            {history.length > 0 && (
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-ink">搜索历史</h3>
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="text-xs text-ink-muted hover:text-ink"
                  >
                    清空
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {history.map((h) => (
                    <motion.button
                      key={h}
                      type="button"
                      onClick={() => handleSearch(h)}
                      whileTap={{ scale: 0.94 }}
                      className="rounded-full bg-black/5 px-3 py-1.5 text-sm text-ink transition-colors hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
                    >
                      {h}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* 热门标签 - 字母索引快捷 */}
            <div>
              <h3 className="mb-2 px-1 text-sm font-semibold text-ink">快捷筛选</h3>
              <div className="flex flex-wrap gap-2">
                {["流行", "摇滚", "民谣", "电子", "古典", "爵士", "华语", "欧美"].map(
                  (tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleSearch(tag)}
                      className={cn(
                        "rounded-full border border-black/10 px-3 py-1.5 text-sm",
                        "text-ink-muted transition-colors hover:border-accent hover:text-accent",
                        "dark:border-white/10"
                      )}
                    >
                      {tag}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        ) : results.length === 0 ? (
          <EmptyState
            icon={<SearchIcon className="h-9 w-9" />}
            title="未找到相关结果"
            description={`没有匹配「${query}」的音乐，换个关键词试试`}
          />
        ) : (
          // 结果分组展示
          <div className="space-y-5">
            <div className="px-1 text-xs text-ink-muted">
              找到 {results.length} 个结果
            </div>

            {grouped && grouped.title.length > 0 && (
              <section>
                <h3 className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                  歌曲 · {grouped.title.length}
                </h3>
                <div className="space-y-0.5">
                  {grouped.title.slice(0, 30).map((s, i) => (
                    <SongItem
                      key={s.id}
                      song={s}
                      index={i}
                      onClick={(song) => playSong(song, grouped.title)}
                    />
                  ))}
                </div>
              </section>
            )}

            {grouped && grouped.artist.length > 0 && (
              <section>
                <h3 className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                  艺术家 · {grouped.artist.length}
                </h3>
                <div className="space-y-0.5">
                  {grouped.artist.slice(0, 20).map((s, i) => (
                    <SongItem
                      key={s.id}
                      song={s}
                      index={i}
                      onClick={(song) => playSong(song, grouped.artist)}
                    />
                  ))}
                </div>
              </section>
            )}

            {grouped && grouped.album.length > 0 && (
              <section>
                <h3 className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                  专辑 · {grouped.album.length}
                </h3>
                <div className="space-y-0.5">
                  {grouped.album.slice(0, 20).map((s, i) => (
                    <SongItem
                      key={s.id}
                      song={s}
                      index={i}
                      onClick={(song) => playSong(song, grouped.album)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
