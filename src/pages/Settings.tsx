import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  Disc3,
  Hand,
  Info,
  Library,
  Mic2,
  Moon,
  Music,
  Palette,
  Play,
  RefreshCw,
  Sliders,
  Type,
} from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";
import { useThemeStore } from "@/store/themeStore";
import {
  ACCENT_PRESETS,
  type AccentPreset,
  type ParticleDensity,
  type PlaybackBackground,
} from "@/types";
import { Row, Segmented, SettingsCard, Slider, Switch } from "@/components/SettingsControls";
import { cn } from "@/lib/utils";

export default function Settings() {
  const navigate = useNavigate();
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const reset = useSettingsStore((s) => s.reset);
  const themeMode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  // 主题模式变更：同步 themeStore 与 settingsStore
  const handleThemeMode = (m: "light" | "dark" | "system") => {
    setMode(m);
    update({ themeMode: m });
  };

  const handleAccent = (preset: AccentPreset) => {
    update({ accentPreset: preset });
  };

  return (
    <div className="min-h-screen bg-surface-subtle pb-28 dark:bg-surface-dark">
      {/* 顶部导航 */}
      <header className="safe-top sticky top-0 z-10 border-b border-black/[0.04] bg-white/70 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#05060f]/70">
        <div className="mx-auto flex max-w-[480px] items-center gap-2 px-3 py-3">
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
          {/* 主题模式 */}
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

          {/* AMOLED 纯黑 */}
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

          {/* 强调色 */}
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
              {/* 自定义颜色选择器 */}
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

          {/* 动态取色 */}
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

          {/* 字体大小 */}
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
              ]}
            />
          </Row>

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
              format={(v) =>
                v === 0 ? "0ms" : v > 0 ? `+${v}ms` : `${v}ms`
              }
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
        </SettingsCard>

        {/* ========== 手势 ========== */}
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
            title="长按快进"
            subtitle="长按上一首/下一首按钮快进"
            trailing={
              <Switch
                checked={settings.longPressSeek}
                onChange={(v) => update({ longPressSeek: v })}
              />
            }
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
            title="重置设置"
            subtitle="恢复所有设置到默认值"
            onClick={() => {
              if (confirm("确定要重置所有设置到默认值吗？")) {
                reset();
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
    </div>
  );
}
