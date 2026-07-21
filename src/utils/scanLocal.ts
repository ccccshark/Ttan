import { Filesystem, Directory } from '@capacitor/filesystem';

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma', '.ape'];

export interface ScanProgress {
  scanned: number;
  total: number;
}

export async function scanLocalMusic(
  onProgress?: (progress: ScanProgress) => void
): Promise<File[]> {
  const audioFiles: File[] = [];
  let totalFiles = 0;
  let scannedFiles = 0;

  async function scanDirectory(path: string) {
    try {
      const result = await Filesystem.readdir({
        path,
        directory: Directory.External,
      });

      for (const entry of result.files) {
        scannedFiles++;
        const fullPath = path ? `${path}/${entry.name}` : entry.name;

        if (onProgress) {
          onProgress({ scanned: scannedFiles, total: totalFiles });
        }

        if (entry.type === 'directory') {
          await scanDirectory(fullPath);
        } else if (entry.type === 'file') {
          totalFiles++;
          const ext = entry.name.toLowerCase().substring(entry.name.lastIndexOf('.'));
          if (AUDIO_EXTENSIONS.includes(ext)) {
            try {
              const readResult = await Filesystem.readFile({
                path: fullPath,
                directory: Directory.External,
              });

              const data = readResult.data;
              if (typeof data === 'string') {
                const byteString = atob(data);
                const mimeType = getMimeType(ext);
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) {
                  ia[i] = byteString.charCodeAt(i);
                }
                const blob = new Blob([ab], { type: mimeType });
                const file = new globalThis.File([blob], entry.name, { type: mimeType });
                audioFiles.push(file);
              }
            } catch (readErr) {
              console.warn(`无法读取文件: ${entry.name}`, readErr);
            }
          }
        }
      }
    } catch (err) {
      console.warn(`无法访问目录: ${path}`, err);
    }
  }

  await scanDirectory('');
  return audioFiles;
}

function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.aac': 'audio/aac',
    '.m4a': 'audio/mp4',
    '.wma': 'audio/x-ms-wma',
    '.ape': 'audio/ape',
  };
  return mimeTypes[ext] || 'audio/mpeg';
}