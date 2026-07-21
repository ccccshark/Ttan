import { parseLrc } from "./lyrics";

interface LyricSearchResult {
  title: string;
  artist: string;
  lyrics: string;
  source: string;
}

/**
 * 在线搜索歌词
 * 使用网易云歌词 API（免费公开接口）
 */
export async function searchOnlineLyrics(title: string, artist: string): Promise<string | null> {
  try {
    // 构建搜索关键词
    const keyword = artist && artist !== "未知艺术家"
      ? `${title} ${artist}`
      : title;

    // 网易云音乐搜索 API
    const searchUrl = `https://music.163.com/api/search/get/web?s=${encodeURIComponent(keyword)}&type=1&offset=0&limit=5`;
    const searchResp = await fetch(searchUrl);
    if (!searchResp.ok) return null;

    const searchData = await searchResp.json();
    if (!searchData?.result?.songs?.length) return null;

    // 取第一个匹配结果
    const songId = searchData.result.songs[0].id;

    // 获取歌词
    const lyricUrl = `https://music.163.com/api/song/lyric?id=${songId}&lv=1&kv=1&tv=-1`;
    const lyricResp = await fetch(lyricUrl);
    if (!lyricResp.ok) return null;

    const lyricData = await lyricResp.json();
    if (lyricData?.lrc?.lyric) {
      return lyricData.lrc.lyric;
    }

    return null;
  } catch (err) {
    console.warn("在线歌词搜索失败:", err);
    return null;
  }
}

/**
 * 为歌曲获取歌词（内嵌优先，在线兜底）
 */
export async function fetchLyricsForSong(song: {
  title: string;
  artist: string;
  lyrics?: string;
}): Promise<string | null> {
  // 1. 已有内嵌歌词
  if (song.lyrics) return song.lyrics;

  // 2. 在线搜索
  const onlineLyrics = await searchOnlineLyrics(song.title, song.artist);
  return onlineLyrics;
}
