import { Filesystem, Directory } from "@capacitor/filesystem";
import { parseBlob } from "music-metadata";
import { TtanScanner, type ScannedAudioFile } from "@/plugins/ttanScanner";

const AUDIO_EXTENSIONS = [".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a", ".wma", ".ape"];

export interface ScanProgress {
  scanned: number;
  total: number;
}

/**
 * 通过内容 URI 读取音频文件并返回 Blob
 */
async function readAudioBlob(uri: string, mime: string): Promise<Blob | null> {
  try {
    // 先尝试通过 fetch content:// URI（WebView 通常允许此操作）
    const response = await fetch(uri);
    if (response.ok) {
      const blob = await response.blob();
      return blob.size > 0 ? blob : null;
    }
  } catch {
    // 忽略，回退到 Capacitor Filesystem
  }

  // 回退：若 uri 包含 path，则通过 Filesystem 读取
  try {
    const url = new URL(uri);
    const path = url.pathname.replace(/^\/+/, "");
    if (path) {
      const result = await Filesystem.readFile({
        path,
        directory: Directory.Cache,
      });
      if (typeof result.data === "string") {
        const byteString = atob(result.data);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], { type: mime });
      }
    }
  } catch {
    // 忽略
  }
  return null;
}

/**
 * 使用 music-metadata 解析 ID3 标签、封面、歌词
 * 即使已经拿到 MediaStore 元数据，也用此函数补充内嵌封面/歌词
 */
async function parseEmbeddedMetadata(blob: Blob): Promise<{
  picture?: { data: Uint8Array; format: string };
  lyrics?: string;
  format?: string;
  bitrate?: number;
  sampleRate?: number;
  bitsPerSample?: number;
  channels?: number;
  genre?: string;
  year?: number;
}> {
  try {
    const meta = await parseBlob(blob);
    const picture = meta.common.picture?.[0];
    const uslt = (
      meta.common as unknown as {
        lyrics?: Array<{ language?: string; text?: string }>;
      }
    ).lyrics?.[0];
    return {
      picture: picture
        ? { data: new Uint8Array(picture.data), format: picture.format }
        : undefined,
      lyrics: uslt?.text,
      format: meta.format.codec,
      bitrate: meta.format.bitrate ? Math.round(meta.format.bitrate / 1000) : undefined,
      sampleRate: meta.format.sampleRate,
      bitsPerSample: meta.format.bitsPerSample,
      channels: meta.format.numberOfChannels,
      genre: meta.common.genre?.[0],
      year: meta.common.year,
    };
  } catch {
    return {};
  }
}

function base64ToBlob(base64: string, mime: string): Blob {
  const byteString = atob(base64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mime });
}

async function scannedFileToFile(scan: ScannedAudioFile): Promise<File | null> {
  // 1) 优先用 fetch 直接读取 content URI（最快的路径）
  let blob: Blob | null = null;
  try {
    const response = await fetch(scan.uri);
    if (response.ok) {
      const b = await response.blob();
      if (b.size > 0) blob = b;
    }
  } catch {
    // 忽略
  }

  // 2) 备用：通过 fetch + bytes 拼接
  if (!blob) {
    blob = await readAudioBlob(scan.uri, scan.mime);
  }

  if (!blob) return null;

  // 转换 Blob 为 File
  return new File([blob], scan.name, { type: scan.mime || "audio/mpeg" });
}

/**
 * 扫描本地音乐（使用 MediaStore 在原生平台，Filesystem 在 Web）
 *
 * 完整流程：
 * 1. 通过原生 MediaStore 插件枚举设备所有音频文件
 * 2. 逐个 fetch content URI 拿到音频 Blob
 * 3. 同步解析 ID3 元数据，提取内嵌封面/歌词
 * 4. 返回 File[]，交由 addFiles 进一步处理入库
 */
export async function scanLocalMusic(
  onProgress?: (progress: ScanProgress) => void
): Promise<File[]> {
  // 检测是否为原生 Capacitor 平台
  let useNative = false;
  try {
    const { Capacitor } = await import("@capacitor/core");
    useNative = Capacitor.isNativePlatform();
  } catch {
    useNative = false;
  }

  if (useNative) {
    return scanViaMediaStore(onProgress);
  }
  return [];
}

async function scanViaMediaStore(
  onProgress?: (progress: ScanProgress) => void
): Promise<File[]> {
  const audioFiles: File[] = [];
  let result;
  try {
    result = await TtanScanner.scanAudio({ limit: 5000 });
  } catch (err) {
    console.warn("MediaStore 扫描失败", err);
    return audioFiles;
  }
  const list = result?.files ?? [];
  const total = list.length;
  let done = 0;
  for (const scan of list) {
    done++;
    onProgress?.({ scanned: done, total });
    try {
      const file = await scannedFileToFile(scan);
      if (!file) continue;
      // 将 MediaStore 元数据 + 内嵌元数据合并到 file 自定义属性
      // （真正的 ID3 解析在 fileToSong 中进行）
      // 我们给 file 添加临时属性以便 fileToSong 复用
      (file as File & { __mediaStoreInfo?: ScannedAudioFile }).__mediaStoreInfo = scan;
      audioFiles.push(file);
    } catch (err) {
      console.warn(`读取文件失败: ${scan.name}`, err);
    }
  }
  return audioFiles;
}

export const __scanFileToFile = scannedFileToFile;
export const __base64ToBlob = base64ToBlob;
export { parseEmbeddedMetadata };
