import { parseBlob } from "music-metadata";
import type { Song } from "@/types";
import { generateId, orUnknown, stripExtension } from "./format";

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

// 从 File 解析为 Song 对象
export async function fileToSong(file: File): Promise<Song> {
  const fileUrl = URL.createObjectURL(file);
  let title = stripExtension(file.name);
  let artist = "未知艺术家";
  let album = "未知专辑";
  let duration = 0;
  let coverUrl = PLACEHOLDER_COVER;
  let lyrics: string | undefined;

  try {
    const metadata = await parseBlob(file);
    if (metadata.common.title) title = metadata.common.title;
    if (metadata.common.artist) artist = metadata.common.artist;
    if (metadata.common.album) album = metadata.common.album;
    if (metadata.format.duration) duration = metadata.format.duration;

    // 提取封面
    const picture = metadata.common.picture?.[0];
    if (picture) {
      const blob = new Blob([picture.data], { type: picture.format });
      coverUrl = URL.createObjectURL(blob);
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
    // 元数据解析失败时，仍使用文件名作为标题
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
  };
}

// 批量解析
export async function filesToSongs(
  files: File[],
  onProgress?: (done: number, total: number) => void
): Promise<Song[]> {
  const songs: Song[] = [];
  for (let i = 0; i < files.length; i++) {
    try {
      const song = await fileToSong(files[i]);
      songs.push(song);
    } catch (err) {
      console.error("解析失败:", files[i].name, err);
    }
    onProgress?.(i + 1, files.length);
  }
  return songs;
}
