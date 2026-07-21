import { useNavigate } from "react-router-dom";
import { ArrowLeft, Github, Heart, Music } from "lucide-react";
import { motion } from "framer-motion";
import { useStatusBarHeight } from "@/hooks/useStatusBarHeight";

export default function About() {
  const navigate = useNavigate();
  const statusBarHeight = useStatusBarHeight();

  const features = [
    { title: "本地导入", desc: "支持 MP3 / FLAC / OGG / M4A 等多种格式" },
    { title: "沉浸式播放", desc: "动态流光 + 星河粒子 + 节拍响应" },
    { title: "歌词舞台", desc: "电影字幕式逐句滚动，仿 Apple Music 交错动画" },
    { title: "ID3 元数据", desc: "自动解析内嵌封面、艺人、专辑信息" },
    { title: "全平台主题", desc: "浅色 / 深色 / 跟随系统，AMOLED 省电模式" },
    { title: "8 套预设强调色", desc: "椒盐橙、复古红、薄荷绿、海洋蓝…" },
  ];

  return (
    <div className="min-h-screen bg-surface-subtle pb-20 dark:bg-surface-dark">
      <header className="sticky top-0 z-10 border-b border-black/[0.04] bg-white/70 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#05060f]/70" style={{ paddingTop: `${statusBarHeight}px` }}>
        <div className="mx-auto flex max-w-[480px] items-center gap-2 px-3 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="返回"
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-ink">关于</h1>
        </div>
      </header>

      <div className="mx-auto max-w-[480px] px-5 py-6">
        {/* Logo 区 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-accent to-accent-300 shadow-glow">
            <Music className="h-11 w-11 text-white" />
            <div className="absolute -inset-3 -z-10 rounded-3xl bg-accent/30 blur-2xl" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-ink">Ttan</h1>
            <p className="mt-1 text-sm text-ink-muted">
              版本 1.0.0 · 本地音乐播放器
            </p>
          </div>
        </motion.div>

        {/* 特性列表 */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-8 overflow-hidden rounded-3xl border border-black/[0.04] bg-white/80 shadow-card backdrop-blur-xl dark:border-white/[0.06] dark:bg-white/[0.04]"
        >
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-3 px-4 py-3">
                <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <div>
                  <div className="text-sm font-semibold text-ink">{f.title}</div>
                  <div className="mt-0.5 text-xs text-ink-muted">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* 致谢 */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-4 overflow-hidden rounded-3xl border border-black/[0.04] bg-white/80 p-5 shadow-card backdrop-blur-xl dark:border-white/[0.06] dark:bg-white/[0.04]"
        >
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
            <Heart className="h-4 w-4 text-accent" />
            设计致敬
          </h3>
          <p className="text-xs leading-relaxed text-ink-muted">
            Ttan 的 UI 设计参考了 GitHub 上众多优秀的开源音乐播放器：
            <a
              href="https://github.com/Moriafly/SaltPlayerSource"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              {" "}
              椒盐音乐 SaltPlayer
            </a>
            、
            <a
              href="https://github.com/XxHuberrr/Mineradio"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              Mineradio
            </a>
            、
            <a
              href="https://github.com/qier222/YesPlayMusic"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              YesPlayMusic
            </a>
            、Retro Music Player、VLC for Android、Poweramp、Musicolet 等。
            感谢这些项目对开源社区的贡献。
          </p>
        </motion.section>

        {/* 免责声明 */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-4 overflow-hidden rounded-3xl border border-rose-500/20 bg-rose-500/5 p-5"
        >
          <h3 className="mb-2 text-sm font-bold text-rose-600 dark:text-rose-400">
            ⚠️ 免责声明
          </h3>
          <div className="text-xs leading-relaxed text-ink-muted dark:text-white/60">
            <p className="mb-2">
              Ttan 是一款本地音乐播放器，仅供个人学习和研究使用。
            </p>
            <p className="mb-2">
              本应用不提供任何在线音乐服务，不存储、传输或分发任何音乐文件。所有音乐文件均来自用户本地设备。
            </p>
            <p className="mb-2">
              用户应确保所播放的音乐文件来源合法，并拥有相应的使用权。如因使用本应用播放未经授权的音乐文件而产生任何法律责任，由用户自行承担。
            </p>
            <p>
              本应用代码开源于 GitHub，遵循 MIT 许可证，欢迎学习交流。
            </p>
          </div>
        </motion.section>

        {/* 开源链接 */}
        <motion.a
          href="https://github.com/ccccshark/Ttan"
          target="_blank"
          rel="noreferrer"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-black/[0.04] bg-white/80 py-3 text-sm font-medium text-ink shadow-card backdrop-blur-xl transition-colors hover:bg-white dark:border-white/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
        >
          <Github className="h-4 w-4" />
          在 GitHub 上查看源码
        </motion.a>

        <p className="mt-6 text-center text-[11px] text-ink-subtle">
          MIT License · 所有数据本地存储
        </p>
      </div>
    </div>
  );
}
