import { useEffect, useRef } from "react";
import { getAudioElement } from "@/utils/audioElement";
import { useSettingsStore } from "@/store/settingsStore";
import { EQ_BAND_FREQUENCIES } from "@/types";

// 均衡器 Hook：在 audio 元素与 destination 之间插入 BiquadFilter 链
// 注意：useAudioAnalyser 已通过 createMediaElementSource 接管 audio 信号，
// 因此 EQ 需在 analyser 之前介入。为简化架构，EQ 直接修改 analyser 后的输出链。
// 这里采用「旁路」策略：当 EQ 启用时，重建音频图为 source → eqChain → analyser → destination
//
// 鉴于 createMediaElementSource 不可重复调用，本 Hook 假设 analyser 已建好，
// 通过插入 BiquadFilterNode 在 source 与 analyser 之间。
// 若 analyser 已直接连接到 destination，则先断开，再插入 EQ。

let eqNodes: BiquadFilterNode[] | null = null;
let bassBoostNode: BiquadFilterNode | null = null;
let eqInstalled = false;

function ensureEQ(audio: HTMLAudioElement, analyser: AnalyserNode, ctx: AudioContext, source: MediaElementAudioSourceNode) {
  if (eqInstalled) return;
  // 创建 10 段 peaking filter
  eqNodes = EQ_BAND_FREQUENCIES.map((freq, i) => {
    const node = ctx.createBiquadFilter();
    node.type = i === 0 ? "lowshelf" : i === EQ_BAND_FREQUENCIES.length - 1 ? "highshelf" : "peaking";
    node.frequency.value = freq;
    node.Q.value = 1.0;
    node.gain.value = 0;
    return node;
  });
  // 低音增强（独立 lowshelf）
  bassBoostNode = ctx.createBiquadFilter();
  bassBoostNode.type = "lowshelf";
  bassBoostNode.frequency.value = 120;
  bassBoostNode.gain.value = 0;
  eqInstalled = true;
  // 不立即连接，等 applyEQ 调用时根据 enabled 状态连接
  void source;
  void analyser;
  void audio;
}

function connectChain(ctx: AudioContext, source: MediaElementAudioSourceNode, analyser: AnalyserNode, destination: AudioDestinationNode) {
  if (!eqNodes || !bassBoostNode) return;
  // 断开 source 默认连接
  try { source.disconnect(); } catch {}
  try { analyser.disconnect(); } catch {}
  // source → eqChain → bassBoost → analyser → destination
  let prev: AudioNode = source;
  for (const node of eqNodes) {
    prev.connect(node);
    prev = node;
  }
  prev.connect(bassBoostNode);
  bassBoostNode.connect(analyser);
  analyser.connect(destination);
}

function bypassChain(source: MediaElementAudioSourceNode, analyser: AnalyserNode, destination: AudioDestinationNode) {
  if (!eqNodes || !bassBoostNode) return;
  try { source.disconnect(); } catch {}
  for (const node of eqNodes) {
    try { node.disconnect(); } catch {}
  }
  try { bassBoostNode.disconnect(); } catch {}
  try { analyser.disconnect(); } catch {}
  // 直接 source → analyser → destination
  source.connect(analyser);
  analyser.connect(destination);
}

// 取得 audioContext 与节点（与 useAudioAnalyser 共享）
function getAudioGraph(): { ctx: AudioContext; source: MediaElementAudioSourceNode; analyser: AnalyserNode; destination: AudioDestinationNode } | null {
  const audio = getAudioElement();
  if (!audio) return null;
  // 复用 useAudioAnalyser 的 shared 引用：通过触发 analyser 获取
  const ctxSym = (window as unknown as { __ttanAudioCtx?: AudioContext }).__ttanAudioCtx;
  const sourceSym = (window as unknown as { __ttanAudioSource?: MediaElementAudioSourceNode }).__ttanAudioSource;
  const analyserSym = (window as unknown as { __ttanAudioAnalyser?: AnalyserNode }).__ttanAudioAnalyser;
  if (!ctxSym || !sourceSym || !analyserSym) return null;
  return { ctx: ctxSym, source: sourceSym, analyser: analyserSym, destination: ctxSym.destination };
}

export function useEqualizer() {
  const settings = useSettingsStore((s) => s.settings);
  const { eqEnabled, eqBands, bassBoost, virtualizer } = settings;
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    // 把 sharedCtx/Source/Analyser 暴露到 window（由 useAudioAnalyser 写入）
    // 等待 analyser 创建完成
  }, []);

  // 当 EQ 设置变化时，应用
  useEffect(() => {
    const graph = getAudioGraph();
    if (!graph) return;
    const audio = getAudioElement();
    if (!audio) return;
    ensureEQ(audio, graph.analyser, graph.ctx, graph.source);

    if (eqEnabled) {
      connectChain(graph.ctx, graph.source, graph.analyser, graph.destination);
      // 应用频段
      if (eqNodes) {
        eqNodes.forEach((node, i) => {
          node.gain.value = eqBands[i] ?? 0;
        });
      }
      if (bassBoostNode) bassBoostNode.gain.value = bassBoost;
    } else {
      bypassChain(graph.source, graph.analyser, graph.destination);
    }
    // virtualizer 暂未实现（需 StereoPannerNode 或 PannerNode）
    void virtualizer;
  }, [eqEnabled, eqBands, bassBoost, virtualizer]);
}
