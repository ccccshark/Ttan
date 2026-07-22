import { registerPlugin, Capacitor } from "@capacitor/core";

export interface ScannedAudioFile {
  id: number;
  name: string;
  path: string;
  uri: string;
  size: number;
  duration: number; // ms
  title: string;
  artist: string;
  album: string;
  mime: string;
  coverBase64?: string;
  coverMime?: string;
}

export interface ScanAudioResult {
  files: ScannedAudioFile[];
}

export interface TtanScannerPlugin {
  scanAudio(options?: { limit?: number }): Promise<ScanAudioResult>;
}

export const TtanScanner = registerPlugin<TtanScannerPlugin>("TtanScanner", {
  web: {
    // Web fallback: 提示用户使用文件选择器
    async scanAudio(): Promise<ScanAudioResult> {
      throw new Error("Web 平台不支持自动扫描，请使用文件选择器");
    },
  },
});

export const isNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};
