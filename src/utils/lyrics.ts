import type { LyricLine } from "@/types";

// 解析 LRC 歌词为时间-文本对
// 支持 [mm:ss.xx] 与 [mm:ss] 格式，支持多时间标签
export function parseLrc(lrc: string): LyricLine[] {
  if (!lrc) return [];
  const lines = lrc.split(/\r?\n/);
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{1,3}):(\d{1,2})(?:\.(\d{1,3}))?\]/g;

  for (const line of lines) {
    const text = line.replace(timeRegex, "").trim();
    const matches = [...line.matchAll(timeRegex)];
    if (matches.length === 0) continue;
    for (const m of matches) {
      const min = parseInt(m[1], 10);
      const sec = parseInt(m[2], 10);
      const ms = m[3] ? parseInt(m[3].padEnd(3, "0"), 10) : 0;
      const time = min * 60 + sec + ms / 1000;
      result.push({ time, text });
    }
  }

  result.sort((a, b) => a.time - b.time);
  return result;
}

// 根据当前播放时间，返回当前歌词行索引
export function findCurrentLyricIndex(
  lyrics: LyricLine[],
  currentTime: number
): number {
  if (lyrics.length === 0) return -1;
  let idx = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].time <= currentTime) idx = i;
    else break;
  }
  return idx;
}
