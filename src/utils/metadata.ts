import { parseBlob } from "music-metadata";
import type { Song } from "@/types";
import { generateId, orUnknown, stripExtension } from "./format";
import { parseLrc } from "./lyrics";

// 默认占位封面（SVG data URL）
const PLACEHOLDER_COVER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#FFC5AB"/>
          <stop offset="1" stop-color="#FF6B35"/>
        </linearGradient>
      </defs>
      <rect width="240" height="240" rx="20" fill="url(#g)"/>
      <path d="M96 84v66a18 18 0 1 1-9-15.6V96l66-16v54a18 18 0 1 1-9-15.6V74a6 6 0 0 0-7.3-5.9l-36 8.7a6 6 0 0 0-4.7 5.9z" fill="#fff" opacity="0.95"/>
    </svg>`
  );

export function getPlaceholderCover(): string {
  return PLACEHOLDER_COVER;
}

export interface ParsedFile {
  type: "song" | "lyrics";
  song?: Song;
  lyrics?: {
    text: string;
    fileName: string;
    baseName: string;
  };
}

// 从 File 解析为 Song 对象
// fileBlob / coverBlob 保留原始 Blob 引用，便于持久化到 IndexedDB
export async function fileToSong(file: File): Promise<Song> {
  const fileUrl = URL.createObjectURL(file);
  let title = stripExtension(file.name);
  let artist = "未知艺术家";
  let album = "未知专辑";
  let duration = 0;
  let coverUrl = PLACEHOLDER_COVER;
  let lyrics: string | undefined;
  let coverBlob: Blob | undefined;
  let codec: string | undefined;
  let bitrate: number | undefined;
  let sampleRate: number | undefined;
  let bitsPerSample: number | undefined;
  let channels: number | undefined;
  let genre: string | undefined;
  let year: number | undefined;

  try {
    const metadata = await parseBlob(file);
    if (metadata.common.title) title = metadata.common.title;
    if (metadata.common.artist) artist = metadata.common.artist;
    if (metadata.common.album) album = metadata.common.album;
    if (metadata.format.duration) duration = metadata.format.duration;
    if (metadata.format.codec) codec = metadata.format.codec;
    if (metadata.format.bitrate) bitrate = Math.round(metadata.format.bitrate / 1000);
    if (metadata.format.sampleRate) sampleRate = metadata.format.sampleRate;
    if (metadata.format.bitsPerSample) bitsPerSample = metadata.format.bitsPerSample;
    if (metadata.format.numberOfChannels) channels = metadata.format.numberOfChannels;
    if (metadata.common.genre?.[0]) genre = metadata.common.genre[0];
    if (metadata.common.year) year = metadata.common.year;

    // 提取封面（保留 Blob 引用）
    const picture = metadata.common.picture?.[0];
    if (picture) {
      coverBlob = new Blob([picture.data], { type: picture.format });
      coverUrl = URL.createObjectURL(coverBlob);
    }

    // 提取内嵌歌词（USLT）
    const uslt = (
      metadata.common as unknown as {
        lyrics?: Array<{ language?: string; text?: string }>;
      }
    ).lyrics?.[0];
    if (uslt?.text) lyrics = uslt.text;
  } catch (err) {
    console.warn("解析元数据失败:", file.name, err);
  }

  return {
    id: generateId(),
    title,
    artist: orUnknown(artist),
    album: orUnknown(album),
    duration,
    coverUrl,
    fileUrl,
    fileName: file.name,
    fileSize: file.size,
    lyrics,
    addedAt: Date.now(),
    codec,
    bitrate,
    sampleRate,
    bitsPerSample,
    channels,
    genre,
    year,
    fileBlob: file,
    coverBlob,
  };
}

// 解析LRC歌词文件
export async function parseLrcFile(file: File): Promise<{ text: string; fileName: string; baseName: string }> {
  const text = await file.text();
  // 验证是否是有效的LRC格式
  if (!text.includes("[00:") && !text.includes("[01:")) {
    throw new Error("无效的LRC文件");
  }
  const baseName = stripExtension(file.name);
  return { text, fileName: file.name, baseName };
}

// 判断文件是否是音乐文件
export function isAudioFile(file: File): boolean {
  const audioExtensions = [
    ".mp3", ".m4a", ".aac", ".flac", ".wav", ".ogg", ".oga", ".opus",
    ".wma", ".ape", ".wv", ".mpc", ".alac", ".dsf", ".dff", ".tta"
  ];
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  return audioExtensions.includes(ext);
}

// 判断文件是否是LRC歌词文件
export function isLrcFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".lrc");
}

// 批量解析（支持混合导入音乐和LRC文件）
export async function filesToSongs(
  files: File[],
  onProgress?: (done: number, total: number) => void
): Promise<Song[]> {
  const songs: Song[] = [];
  const lyricsMap = new Map<string, string>();

  // 先分离LRC文件和音乐文件
  const audioFiles = files.filter(isAudioFile);
  const lrcFiles = files.filter(isLrcFile);

  // 解析所有LRC文件，按basename索引
  for (const lrcFile of lrcFiles) {
    try {
      const parsed = await parseLrcFile(lrcFile);
      lyricsMap.set(parsed.baseName.toLowerCase(), parsed.text);
    } catch (err) {
      console.warn("解析LRC文件失败:", lrcFile.name, err);
    }
  }

  // 解析音乐文件，匹配LRC歌词
  for (let i = 0; i < audioFiles.length; i++) {
    try {
      const song = await fileToSong(audioFiles[i]);
      // 尝试匹配同名LRC歌词（优先使用内嵌歌词，没有则使用外部LRC）
      if (!song.lyrics) {
        const baseName = stripExtension(audioFiles[i].name).toLowerCase();
        const lrcText = lyricsMap.get(baseName);
        if (lrcText) {
          song.lyrics = lrcText;
        }
      }
      songs.push(song);
    } catch (err) {
      console.error("解析失败:", audioFiles[i].name, err);
    }
    onProgress?.(i + 1, audioFiles.length);
  }

  return songs;
}
