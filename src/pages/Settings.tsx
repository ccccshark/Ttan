import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Database,
  Disc3,
  Download,
  Equal,
  Hand,
  Headphones,
  Library,
  Mic2,
  Music,
  Palette,
  Play,
  RotateCcw,
  Sliders,
  Trash2,
  Upload,
} from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";
import { useThemeStore } from "@/store/themeStore";
import { useLibraryStore } from "@/store/libraryStore";
import { useStatusBarHeight } from "@/hooks/useStatusBarHeight";
import {
  ACCENT_PRESETS,
  EQ_PRESETS,
  type AccentPreset,
  type CoverStyle,
  type EqPreset,
  type ParticleDensity,
  type PlaybackBackground,
  type SpectrumStyle,
} from "@/types";
import {
  Row,
  Segmented,
  SettingsCard,
  Slider,
  Switch,
} from "@/components/SettingsControls";
import EqBands from "@/components/EqBands";
import { useOutputDevices } from "@/hooks/useOutputDevices";
import {
  exportBackup,
  importBackup,
  clearRecents,
  clearPlayCounts,
  type BackupData,
} from "@/utils/db";
import { cn } from "@/lib/utils";

export default function Settings() {
  const navigate = useNavigate();
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const reset = useSettingsStore((s) => s.reset);
  const themeMode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  const { songs, clearLibrary, loadRecents, loadPlayCounts } = useLibraryStore();
  const statusBarHeight = useStatusBarHeight();

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  };

  // 主题模式变更
  const handleThemeMode = (m: "light" | "dark" | "system") => {
    setMode(m);
    update({ themeMode: m });
  };

  const handleAccent = (preset: AccentPreset) => {
    update({ accentPreset: preset });
  };

  // EQ 预设应用
  const handleEqPreset = (preset: EqPreset) => {
    if (preset === "off") {
      update({ eqEnabled: false, eqPreset: "off" });
      return;
    }
    if (preset === "custom") {
      update({ eqEnabled: true, eqPreset: "custom" });
      return;
    }
    const def = EQ_PRESETS[preset];
    update({
      eqEnabled: true,
      eqPreset: preset,
      eqBands: [...def.bands],
    });
  };

  const handleEqBandChange = (i: number, v: number) => {
    const next = [...settings.eqBands];
    next[i] = v;
    // 用户手动调整后切换为 custom
    update({ eqBands: next, eqPreset: "custom" });
  };

  const handleEqToggle = (enabled: boolean) => {
    update({ eqEnabled: enabled });
  };

  // 输出设备
  const outputDevices = useOutputDevices();

  // 备份与恢复
  const handleExport = async () => {
    setBusy(true);
    try {
      const data = await exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ts = new Date(data.exportedAt).toISOString().slice(0, 19).replace(/[:T]/g, "-");
      a.download = `ttan-backup-${ts}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast(`已导出 ${data.songs.length} 首歌曲`);
    } catch (err) {
      console.error(err);
      showToast("导出失败");
    } finally {
      setBusy(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as BackupData;
      if (!data || typeof data !== "object" || !Array.isArray(data.songs)) {
        showToast("备份文件格式不正确");
        return;
      }
      await importBackup(data);
      await loadRecents();
      await loadPlayCounts();
      showToast(`已导入 ${data.songs.length} 首歌曲，重启后生效`);
    } catch (err) {
      console.error(err);
      showToast("导入失败");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClearRecents = async () => {
    if (!confirm("确定清除最近播放记录吗？")) return;
    await clearRecents();
    await loadRecents();
    showToast("已清除最近播放");
  };

  const handleClearPlayCounts = async () => {
    if (!confirm("确定清除所有播放次数统计吗？此操作不可撤销。")) return;
    await clearPlayCounts();
    await loadPlayCounts();
    showToast("已清除播放统计");
  };

  const handleClearLibrary = async () => {
    if (!confirm("确定清空整个音乐库吗？此操作不可撤销，请先备份！")) return;
    if (!confirm("再次确认：清空后所有歌曲、封面、歌词缓存都会被删除。")) return;
    await clearLibrary();
    showToast("已清空音乐库");
  };

  return (
    <div className="min-h-screen bg-surface-subtle pb-28 dark:bg-surface-dark">
      {/* 顶部导航 */}
      <header
        className="sticky top-0 z-10 border-b border-black/[0.04] bg-white/70 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#05060f]/70"
        style={{ paddingTop: `${statusBarHeight}px` }}
      >
        <div className="mx-auto flex max-w-[480px] items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="返回"
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-ink">设置</h1>
        </div>
      </header>

      <div className="mx-auto max-w-[480px] space-y-4 px-4 py-4">
        {/* ========== 外观与主题 ========== */}
        <SettingsCard title="外观与主题" icon={<Palette className="h-3.5 w-3.5" />}>
          <Row title="主题模式" subtitle="浅色 / 深色 / 跟随系统">
            <Segmented
              value={themeMode}
              onChange={handleThemeMode}
              options={[
                { label: "浅色", value: "light" },
                { label: "深色", value: "dark" },
                { label: "系统", value: "system" },
              ]}
            />
          </Row>

          <Row
            title="AMOLED 纯黑"
            subtitle="深色模式下使用纯黑背景，省电"
            trailing={
              <Switch
                checked={settings.amoledBlack}
                onChange={(v) => update({ amoledBlack: v })}
              />
            }
          />

          <Row title="强调色" subtitle="点击选择主题色">
            <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
              {(Object.keys(ACCENT_PRESETS) as Array<Exclude<AccentPreset, "custom">>).map(
                (key) => {
                  const preset = ACCENT_PRESETS[key];
                  const active = settings.accentPreset === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleAccent(key)}
                      aria-label={preset.name}
                      className={cn(
                        "relative h-8 w-8 rounded-full transition-transform",
                        active && "scale-110"
                      )}
                      style={{ backgroundColor: preset.color }}
                    >
                      {active && (
                        <motion.span
                          layoutId="accent-active"
                          className="absolute -inset-1 rounded-full ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#05060f]"
                          style={{ boxShadow: `0 0 0 2px ${preset.color}` }}
                        />
                      )}
                    </button>
                  );
                }
              )}
              <label
                className={cn(
                  "relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-pink-500 via-yellow-500 to-cyan-500 text-xs font-bold text-white",
                  settings.accentPreset === "custom" && "scale-110 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#05060f]"
                )}
                style={
                  settings.accentPreset === "custom"
                    ? { boxShadow: `0 0 0 2px ${settings.accentCustom}` }
                    : undefined
                }
              >
                +
                <input
                  type="color"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  value={settings.accentCustom}
                  onChange={(e) =>
                    update({ accentPreset: "custom", accentCustom: e.target.value })
                  }
                />
              </label>
            </div>
          </Row>

          <Row
            title="动态取色"
            subtitle="从当前播放封面提取主色作为强调色"
            trailing={
              <Switch
                checked={settings.dynamicColor}
                onChange={(v) => update({ dynamicColor: v })}
              />
            }
          />

          <Row title="字体大小" subtitle="影响全局 UI 字号">
            <Slider
              value={settings.fontScale}
              min={0.85}
              max={1.25}
              step={0.05}
              onChange={(v) => update({ fontScale: v })}
              format={(v) => `${Math.round(v * 100)}%`}
            />
          </Row>
        </SettingsCard>

        {/* ========== 播放页背景 ========== */}
        <SettingsCard title="播放页背景" icon={<Disc3 className="h-3.5 w-3.5" />}>
          <Row title="背景风格" subtitle="选择正在播放页的视觉风格">
            <Segmented
              value={settings.playbackBackground}
              onChange={(v) => update({ playbackBackground: v as PlaybackBackground })}
              options={[
                { label: "流光", value: "flowLight" },
                { label: "粒子", value: "particle" },
                { label: "封面", value: "blurCover" },
                { label: "纯色", value: "solid" },
                { label: "自定义图片", value: "customImage" },
              ]}
            />
          </Row>

          {settings.playbackBackground === "customImage" && (
            <Row title="自定义图片" subtitle="上传背景图片">
              <div className="flex items-center gap-2">
                {settings.customBackgroundImage ? (
                  <>
                    <img
                      src={settings.customBackgroundImage}
                      alt="预览"
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => update({ customBackgroundImage: "" })}
                      className="rounded-full bg-black/10 px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20"
                    >
                      清除
                    </button>
                  </>
                ) : (
                  <label
                    className="flex cursor-pointer items-center gap-2 rounded-full bg-accent/10 px-4 py-2 text-xs font-medium text-accent hover:bg-accent/20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Upload className="h-4 w-4" />
                    选择图片
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const result = event.target?.result as string;
                          update({ customBackgroundImage: result });
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                )}
              </div>
            </Row>
          )}

          <Row title="流光强度" subtitle="动态光球亮度">
            <Slider
              value={settings.flowLightIntensity}
              min={0}
              max={1}
              step={0.1}
              onChange={(v) => update({ flowLightIntensity: v })}
              format={(v) => `${Math.round(v * 100)}%`}
            />
          </Row>

          <Row title="粒子密度" subtitle="背景星河粒子数量">
            <Segmented
              value={settings.particleDensity}
              onChange={(v) => update({ particleDensity: v as ParticleDensity })}
              options={[
                { label: "关", value: "off" },
                { label: "低", value: "low" },
                { label: "中", value: "medium" },
                { label: "高", value: "high" },
              ]}
            />
          </Row>

          <Row title="封面样式" subtitle="正在播放页的封面展示形式">
            <Segmented
              value={settings.coverStyle}
              onChange={(v) => update({ coverStyle: v as CoverStyle })}
              options={[
                { label: "方形", value: "square" },
                { label: "黑胶", value: "vinyl" },
              ]}
            />
          </Row>

          <Row title="频谱可视化" subtitle="播放页底部频谱条带">
            <Segmented
              value={settings.spectrumStyle}
              onChange={(v) => update({ spectrumStyle: v as SpectrumStyle })}
              options={[
                { label: "关", value: "off" },
                { label: "柱状", value: "bars" },
                { label: "波形", value: "wave" },
                { label: "镜像", value: "mirror" },
              ]}
            />
          </Row>
        </SettingsCard>

        {/* ========== 音效与均衡器 ========== */}
        <SettingsCard title="音效与均衡器" icon={<Equal className="h-3.5 w-3.5" />}>
          <Row
            title="启用均衡器"
            subtitle="十段图形 EQ，可调节频段增益"
            trailing={
              <Switch
                checked={settings.eqEnabled}
                onChange={handleEqToggle}
              />
            }
          />

          {settings.eqEnabled && (
            <>
              <div className="px-4 pb-2 pt-3">
                <div className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  预设
                </div>
                <div className="no-scrollbar -mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
                  {(["off", "flat", "bass-boost", "treble-boost", "vocal", "pop", "rock", "jazz", "classical", "electronic", "custom"] as EqPreset[]).map(
                    (p) => {
                      const label =
                        p === "off" ? "关闭" :
                        p === "custom" ? "自定义" :
                        EQ_PRESETS[p as Exclude<EqPreset, "off" | "custom">].name;
                      const active = settings.eqPreset === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleEqPreset(p)}
                          className={cn(
                            "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                            active
                              ? "bg-accent text-white shadow-sm"
                              : "bg-black/[0.05] text-ink-muted hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
                          )}
                        >
                          {label}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              <EqBands bands={settings.eqBands} onChange={handleEqBandChange} />

              <Row title="低音增强" subtitle="独立 lowshelf，120 Hz 以下增强">
                <Slider
                  value={settings.bassBoost}
                  min={0}
                  max={12}
                  step={1}
                  onChange={(v) => update({ bassBoost: v })}
                  format={(v) => (v === 0 ? "关" : `+${v} dB`)}
                />
              </Row>

              <Row title="立体声扩展" subtitle="虚拟拓宽声场（实验性）">
                <Slider
                  value={settings.virtualizer}
                  min={0}
                  max={100}
                  step={5}
                  onChange={(v) => update({ virtualizer: v })}
                  format={(v) => `${v}%`}
                />
              </Row>
            </>
          )}

          <Row
            title="音量限制保护"
            subtitle="限制最大音量 85%，避免听力损伤"
            trailing={
              <Switch
                checked={settings.volumeLimit}
                onChange={(v) => update({ volumeLimit: v })}
              />
            }
          />
        </SettingsCard>

        {/* ========== 输出设备 ========== */}
        <SettingsCard title="输出设备" icon={<Headphones className="h-3.5 w-3.5" />}>
          <Row
            title="输出设备"
            subtitle={
              outputDevices.devices.length === 0
                ? "未检测到可用音频输出设备"
                : settings.outputDeviceId === ""
                  ? `默认（${outputDevices.devices[0]?.label ?? "扬声器"}）`
                  : outputDevices.devices.find((d) => d.deviceId === settings.outputDeviceId)?.label ?? "默认"
            }
          >
            <select
              value={settings.outputDeviceId}
              onChange={(e) => update({ outputDeviceId: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className="max-w-[180px] truncate rounded-lg bg-black/[0.05] px-2.5 py-1.5 text-xs font-medium text-ink dark:bg-white/[0.08] dark:text-white"
            >
              <option value="">默认设备</option>
              {outputDevices.devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
          </Row>

          {!outputDevices.permissionGranted && (
            <Row
              title="授权读取设备列表"
              subtitle="显示完整设备名称需要麦克风权限"
              onClick={() => void outputDevices.requestPermission()}
              chevron
            />
          )}
        </SettingsCard>

        {/* ========== 歌词 ========== */}
        <SettingsCard title="歌词" icon={<Mic2 className="h-3.5 w-3.5" />}>
          <Row title="歌词字号">
            <Slider
              value={settings.lyricsFontSize}
              min={14}
              max={48}
              step={1}
              onChange={(v) => update({ lyricsFontSize: v })}
              format={(v) => `${v}px`}
            />
          </Row>

          <Row title="行间距">
            <Segmented
              value={String(settings.lyricsLineHeight)}
              onChange={(v) => update({ lyricsLineHeight: Number(v) })}
              options={[
                { label: "紧凑", value: "1.2" },
                { label: "标准", value: "1.5" },
                { label: "宽松", value: "1.8" },
                { label: "极大", value: "2.0" },
              ]}
            />
          </Row>

          <Row title="对齐方式">
            <Segmented
              value={settings.lyricsAlign}
              onChange={(v) => update({ lyricsAlign: v as "left" | "center" })}
              options={[
                { label: "居中", value: "center" },
                { label: "左对齐", value: "left" },
              ]}
            />
          </Row>

          <Row
            title="翻译"
            subtitle="显示双语歌词（如 LRC 内嵌）"
            trailing={
              <Switch
                checked={settings.lyricsShowTranslation}
                onChange={(v) => update({ lyricsShowTranslation: v })}
              />
            }
          />

          <Row
            title="卡拉 OK 逐字高亮"
            subtitle="按字粒度高亮（需增强 LRC）"
            trailing={
              <Switch
                checked={settings.lyricsKaraokeMode}
                onChange={(v) => update({ lyricsKaraokeMode: v })}
              />
            }
          />

          <Row title="歌词偏移" subtitle="整体提前或延后（毫秒）">
            <Slider
              value={settings.lyricsOffsetMs}
              min={-10000}
              max={10000}
              step={100}
              onChange={(v) => update({ lyricsOffsetMs: v })}
              format={(v) => (v === 0 ? "0ms" : v > 0 ? `+${v}ms` : `${v}ms`)}
            />
          </Row>
        </SettingsCard>

        {/* ========== 播放行为 ========== */}
        <SettingsCard title="播放行为" icon={<Play className="h-3.5 w-3.5" />}>
          <Row
            title="淡入淡出切歌"
            subtitle="切歌时音量平滑过渡，避免爆音"
            trailing={
              <Switch
                checked={settings.crossfadeEnabled}
                onChange={(v) => update({ crossfadeEnabled: v })}
              />
            }
          />

          {settings.crossfadeEnabled && (
            <Row title="淡入淡出时长">
              <Slider
                value={settings.crossfadeDuration}
                min={1}
                max={12}
                step={1}
                onChange={(v) => update({ crossfadeDuration: v })}
                format={(v) => `${v}s`}
              />
            </Row>
          )}

          <Row title="播放速度">
            <Slider
              value={settings.playbackSpeed}
              min={0.5}
              max={2}
              step={0.05}
              onChange={(v) => update({ playbackSpeed: v })}
              format={(v) => `${v.toFixed(2)}x`}
            />
          </Row>

          <Row
            title="耳机拔出自动暂停"
            subtitle="检测到耳机断开时暂停播放"
            trailing={
              <Switch
                checked={settings.pauseOnUnplug}
                onChange={(v) => update({ pauseOnUnplug: v })}
              />
            }
          />

          <Row
            title="恢复播放位置"
            subtitle="下次启动时回到上次进度"
            trailing={
              <Switch
                checked={settings.resumePosition}
                onChange={(v) => update({ resumePosition: v })}
              />
            }
          />

          <Row
            title="音频焦点打断暂停"
            subtitle="来电或其他 App 抢占时暂停"
            trailing={
              <Switch
                checked={settings.pauseOnInterruption}
                onChange={(v) => update({ pauseOnInterruption: v })}
              />
            }
          />

          <Row
            title="无缝播放"
            subtitle="预加载下一首，避免间隙"
            trailing={
              <Switch
                checked={settings.gaplessPlayback}
                onChange={(v) => update({ gaplessPlayback: v })}
              />
            }
          />

          <Row title="音量标准化 (ReplayGain)">
            <Segmented
              value={settings.replayGainMode}
              onChange={(v) =>
                update({ replayGainMode: v as "off" | "track" | "album" })
              }
              options={[
                { label: "关闭", value: "off" },
                { label: "单曲", value: "track" },
                { label: "专辑", value: "album" },
              ]}
            />
          </Row>
        </SettingsCard>

        {/* ========== 音乐库 ========== */}
        <SettingsCard title="音乐库" icon={<Library className="h-3.5 w-3.5" />}>
          <Row title="最小时长过滤" subtitle="短于此值的音频不显示">
            <Slider
              value={settings.minDurationSec}
              min={0}
              max={120}
              step={5}
              onChange={(v) => update({ minDurationSec: v })}
              format={(v) => (v === 0 ? "不过滤" : `${v}s`)}
            />
          </Row>

          <Row
            title="隐藏短音频"
            subtitle="隐藏小于 60 秒的录音片段"
            trailing={
              <Switch
                checked={settings.hideShortClips}
                onChange={(v) => update({ hideShortClips: v })}
              />
            }
          />

          <Row
            title="音乐库容量"
            subtitle={`共 ${songs.length} 首歌曲`}
            onClick={() => navigate("/playlists")}
            chevron
          />
        </SettingsCard>

        {/* ========== 手势与交互 ========== */}
        <SettingsCard title="手势与交互" icon={<Hand className="h-3.5 w-3.5" />}>
          <Row
            title="滑动切歌"
            subtitle="在播放页左右滑动切换歌曲"
            trailing={
              <Switch
                checked={settings.swipeToSwitch}
                onChange={(v) => update({ swipeToSwitch: v })}
              />
            }
          />
          <Row
            title="双击暂停"
            subtitle="在播放页双击封面切换播放暂停"
            trailing={
              <Switch
                checked={settings.doubleTapToPause}
                onChange={(v) => update({ doubleTapToPause: v })}
              />
            }
          />
          <Row
            title="长按快进"
            subtitle="长按上一首/下一首按钮快进"
            trailing={
              <Switch
                checked={settings.longPressSeek}
                onChange={(v) => update({ longPressSeek: v })}
              />
            }
          />
          <Row
            title="摇一摇切歌"
            subtitle="用力摇晃设备切到下一首"
            trailing={
              <Switch
                checked={settings.shakeToSwitch}
                onChange={(v) => update({ shakeToSwitch: v })}
              />
            }
          />
          <Row
            title="歌词分享卡片"
            subtitle="在歌词页生成可分享的歌词卡片"
            trailing={
              <Switch
                checked={settings.shareLyricCard}
                onChange={(v) => update({ shareLyricCard: v })}
              />
            }
          />
        </SettingsCard>

        {/* ========== 数据与备份 ========== */}
        <SettingsCard title="数据与备份" icon={<Database className="h-3.5 w-3.5" />}>
          <Row
            title="导出备份"
            subtitle="将歌曲元数据、歌单、设置导出为 JSON"
            onClick={busy ? undefined : handleExport}
            chevron
            trailing={busy ? <RotateCcw className="h-4 w-4 animate-spin text-ink-muted" /> : <Download className="h-4 w-4 text-ink-subtle" />}
          />
          <Row
            title="导入备份"
            subtitle="从 JSON 备份文件恢复数据"
            onClick={busy ? undefined : handleImportClick}
            chevron
            trailing={<Upload className="h-4 w-4 text-ink-subtle" />}
          />
          <Row
            title="清除最近播放"
            subtitle="清空最近播放记录"
            onClick={handleClearRecents}
            chevron
            trailing={<Trash2 className="h-4 w-4 text-ink-subtle" />}
          />
          <Row
            title="清除播放统计"
            subtitle="重置所有歌曲的播放次数"
            onClick={handleClearPlayCounts}
            chevron
            trailing={<Trash2 className="h-4 w-4 text-ink-subtle" />}
          />
          <Row
            title="清空音乐库"
            subtitle="删除所有歌曲与缓存（不可撤销）"
            onClick={handleClearLibrary}
            chevron
            trailing={<Trash2 className="h-4 w-4 text-rose-500" />}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="hidden"
          />
        </SettingsCard>

        {/* ========== 其他 ========== */}
        <SettingsCard title="其他" icon={<Sliders className="h-3.5 w-3.5" />}>
          <Row title="睡眠定时器" subtitle="定时停止播放">
            <Segmented
              value={String(settings.sleepTimerMin)}
              onChange={(v) => update({ sleepTimerMin: Number(v) })}
              options={[
                { label: "关闭", value: "0" },
                { label: "15分", value: "15" },
                { label: "30分", value: "30" },
                { label: "60分", value: "60" },
              ]}
            />
          </Row>
          {settings.sleepTimerMin > 0 && (
            <Row
              title="播完当前曲再停"
              subtitle="等待当前歌曲播放完毕再触发"
              trailing={
                <Switch
                  checked={settings.sleepFinishCurrent}
                  onChange={(v) => update({ sleepFinishCurrent: v })}
                />
              }
            />
          )}

          <Row
            title="播放统计"
            subtitle="记录播放次数与历史"
            trailing={
              <Switch
                checked={settings.playCountEnabled}
                onChange={(v) => update({ playCountEnabled: v })}
              />
            }
          />

          <Row
            title="系统媒体控件"
            subtitle="锁屏 / 蓝牙 / 车机控制（始终开启）"
            trailing={
              <Switch checked onChange={() => {}} />
            }
          />

          <Row
            title="重置设置"
            subtitle="恢复所有设置到默认值"
            onClick={() => {
              if (confirm("确定要重置所有设置到默认值吗？")) {
                reset();
                showToast("已重置为默认设置");
              }
            }}
            chevron
          />

          <Row
            title="关于 Ttan"
            subtitle="版本 1.0.0 · 本地音乐播放器"
            onClick={() => navigate("/about")}
            chevron
          />
        </SettingsCard>

        {/* 底部说明 */}
        <p className="px-4 pb-4 pt-2 text-center text-[11px] leading-relaxed text-ink-subtle">
          <Music className="mr-1 inline h-3 w-3" />
          Ttan · 基于 React + Capacitor 构建
          <br />
          所有数据存储于本地，不上传任何信息
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="safe-bottom pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center"
        >
          <div className="pointer-events-auto rounded-full bg-ink/90 px-4 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-md dark:bg-white/90 dark:text-ink">
            {toast}
          </div>
        </motion.div>
      )}
    </div>
  );
}
