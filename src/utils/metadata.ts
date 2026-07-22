import { parseBlob } from "music-metadata";
import type { Song } from "@/types";
import { generateId, orUnknown, stripExtension } from "./format";
import { parseLrc } from "./lyrics";
import type { ScannedAudioFile } from "@/plugins/ttanScanner";
import { PLACEHOLDER_COVER } from "./placeholders";

export { PLACEHOLDER_COVER };

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

  // 读取 MediaStore 提供的元数据（来自自动扫描）
  const mediaStoreInfo: ScannedAudioFile | undefined = (
    file as File & { __mediaStoreInfo?: ScannedAudioFile }
  ).__mediaStoreInfo;

  try {
    const metadata = await parseBlob(file, {
      duration: true,
      skipCovers: false, // 明确启用封面提取
    });
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
      // picture.data 是 Uint8Array 或 Buffer
      const data =
        picture.data instanceof Uint8Array
          ? picture.data
          : new Uint8Array(picture.data as ArrayBuffer);
      coverBlob = new Blob([data.buffer as ArrayBuffer], { type: picture.format || "image/jpeg" });
      coverUrl = URL.createObjectURL(coverBlob);
    }

    // 提取内嵌歌词（USLT / Vorbis LYRICS）
    const uslt = (
      metadata.common as unknown as {
        lyrics?: Array<{ language?: string; text?: string }>;
      }
    ).lyrics?.[0];
    if (uslt?.text) lyrics = uslt.text;

    // 某些格式（FLAC/OGG）歌词存放在 native tag 中
    if (!lyrics) {
      const native = (metadata as unknown as {
        native?: Record<string, Array<{ id?: string; value?: string }>>;
      }).native;
      if (native) {
        // Vorbis comment: LYRICS
        const vorbisLyrics = native["vorbis"]?.[0]?.["LYRICS" as keyof typeof native];
        if (typeof vorbisLyrics === "string") lyrics = vorbisLyrics;
        // ID3v2: USLT（可能位于 native.id3v23）
        const id3Lyrics = native["ID3v2.3"]?.[0]?.value;
        if (typeof id3Lyrics === "string" && id3Lyrics.startsWith("[")) lyrics = id3Lyrics;
      }
    }
  } catch (err) {
    console.warn("解析元数据失败:", file.name, err);
  }

  // 回退：使用 MediaStore 提供的元数据
  if (mediaStoreInfo) {
    if (!title || title === stripExtension(file.name)) {
      if (mediaStoreInfo.title) title = mediaStoreInfo.title;
      else if (mediaStoreInfo.name) title = stripExtension(mediaStoreInfo.name);
    }
    if ((!artist || artist === "未知艺术家") && mediaStoreInfo.artist) {
      artist = mediaStoreInfo.artist;
    }
    if ((!album || album === "未知专辑") && mediaStoreInfo.album) {
      album = mediaStoreInfo.album;
    }
    if (!duration && mediaStoreInfo.duration) {
      duration = Math.round(mediaStoreInfo.duration / 1000);
    }

    // MediaStore 提供的专辑封面（base64 形式）
    if (!coverBlob && mediaStoreInfo.coverBase64) {
      try {
        const byteString = atob(mediaStoreInfo.coverBase64);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        coverBlob = new Blob([ab], { type: mediaStoreInfo.coverMime || "image/jpeg" });
        coverUrl = URL.createObjectURL(coverBlob);
      } catch (err) {
        console.warn("解码 MediaStore 封面失败", err);
      }
    }
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
