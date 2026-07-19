// 全局 audio 元素引用单例
// App 根节点挂载时注册，其他组件（如 useAudioAnalyser）通过 getAudioElement() 获取
let audioEl: HTMLAudioElement | null = null;

export function setAudioElement(el: HTMLAudioElement | null) {
  audioEl = el;
}

export function getAudioElement(): HTMLAudioElement | null {
  return audioEl;
}
