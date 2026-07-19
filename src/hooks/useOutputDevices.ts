import { useEffect, useState } from "react";

// 输出设备枚举 Hook
// 返回当前可用的音频输出设备列表
// 注意：在 Android WebView 中可能受限；浏览器需要先获取麦克风权限才能看到完整设备标签

export interface AudioOutputDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export function useOutputDevices() {
  const [devices, setDevices] = useState<AudioOutputDevice[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const refresh = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const outputs = list
        .filter((d) => d.kind === "audiooutput")
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || (d.deviceId === "default" ? "默认设备" : "未知设备"),
          kind: d.kind,
        }));
      setDevices(outputs);
      // 若 label 不为空，说明已获授权
      if (outputs.some((o) => o.label && !o.label.startsWith("未知"))) {
        setPermissionGranted(true);
      }
    } catch {
      // 忽略
    }
  };

  // 初次拉取 + 监听设备变化
  useEffect(() => {
    void refresh();
    const handler = () => void refresh();
    navigator.mediaDevices?.addEventListener?.("devicechange", handler);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", handler);
    };
  }, []);

  // 主动请求权限（用户点击"授权"按钮触发）
  const requestPermission = async () => {
    try {
      // 借助 getUserMedia 短暂触发权限弹窗
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      await refresh();
      return true;
    } catch {
      return false;
    }
  };

  // 应用输出设备到 audio 元素（实验性 API，可能不被所有浏览器支持）
  const applyToDevice = async (audio: HTMLAudioElement, deviceId: string) => {
    const el = audio as HTMLAudioElement & {
      setSinkId?: (id: string) => Promise<void>;
    };
    if (!el.setSinkId) return false;
    try {
      await el.setSinkId(deviceId);
      return true;
    } catch {
      return false;
    }
  };

  return { devices, permissionGranted, refresh, requestPermission, applyToDevice };
}
