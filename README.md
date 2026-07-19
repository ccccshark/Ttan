# Ttan

基于 React + Capacitor 的本地音乐播放器，移动端优先设计。Web 端采用深空暗色主题 + 粒子背景，Android 端通过 Capacitor 打包为可安装的 APK。

## 特性

- 本地音乐导入（支持解析 ID3/FLAC/OGG/MP4 等多种元数据）
- 沉浸式播放界面（深空暗色主题、220 颗星粒子背景、节拍响应封面辉光）
- 电影字幕式歌词展示
- 播放列表 / 搜索 / 随机播放 / 单曲循环
- Web Audio API 实时频谱分析与节拍检测
- IndexedDB 持久化歌曲库
- Android 沉浸式全屏 + 媒体自动播放

## 技术栈

| 层 | 技术 |
|---|---|
| Web 框架 | React 18 + TypeScript + Vite 6 |
| 样式 | Tailwind CSS（暖橘红 #FF6B35 强调色） |
| 状态 | Zustand |
| 动画 | framer-motion |
| 图标 | lucide-react |
| 元数据 | music-metadata |
| 存储 | idb (IndexedDB) |
| 音频 | Web Audio API (AnalyserNode) |
| Android 打包 | Capacitor 8 |

## 本地开发

```bash
# 安装依赖
pnpm install

# 启动 Web 开发服务器
pnpm dev

# 构建 Web 产物
pnpm build

# 运行单元测试
pnpm test
```

## 构建 Android APK

需要 JDK 21、Android SDK 36、Gradle 8.14。

```bash
# 1. 构建 Web 产物
pnpm build

# 2. 同步到 Android 工程
pnpm exec cap sync android

# 3. 构建 Debug APK
cd android
gradle assembleDebug --no-daemon

# 产物位置
# android/app/build/outputs/apk/debug/app-debug.apk
```

## 项目结构

```
.
├── src/                    # React 源码
│   ├── components/         # UI 组件（AppBar、ParticleField、LyricsStage 等）
│   ├── pages/              # 页面（Home、NowPlaying、Playlists、Search）
│   ├── store/              # Zustand 状态（player、theme、library）
│   ├── hooks/              # 自定义 hook（useAudioPlayer、useAudioAnalyser）
│   └── utils/              # 工具（metadata、lyrics、db、format）
├── android/                # Capacitor Android 工程
├── capacitor.config.ts     # Capacitor 配置
├── tailwind.config.js      # Tailwind 主题
└── vite.config.ts
```

## License

MIT
