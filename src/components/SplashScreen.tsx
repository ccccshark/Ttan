import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Disc3, Music } from "lucide-react";

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const hasCalledFinish = useRef(false);

  useEffect(() => {
    if (hasCalledFinish.current) return;

    const timer = setTimeout(() => {
      if (!hasCalledFinish.current) {
        hasCalledFinish.current = true;
        onFinish();
      }
    }, 2200);

    return () => {
      clearTimeout(timer);
    };
  }, [onFinish]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#05060f] via-[#0a0e25] to-[#05060f]"
    >
      {/* 背景光晕效果 */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-radial from-accent/20 via-accent/5 to-transparent blur-3xl"
        />
      </div>

      {/* 主图标容器 */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 15,
          delay: 0.1,
        }}
        className="relative z-10"
      >
        {/* 外圈旋转动画 */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "linear",
          }}
          className="relative"
        >
          <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-accent/20 via-accent/10 to-transparent shadow-2xl shadow-accent/30">
            {/* 内圈 */}
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-[#1a1d2e] to-[#0a0e25]">
              <motion.div
                animate={{ rotate: -360 }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                <Disc3 className="h-14 w-14 text-accent" />
              </motion.div>
            </div>
            {/* 边框装饰 */}
            <div className="absolute inset-0 rounded-full border-2 border-accent/40" />
            <div className="absolute inset-2 rounded-full border border-accent/20" />
          </div>
        </motion.div>

        {/* 呼吸光晕 */}
        <motion.div
          animate={{
            opacity: [0.4, 0.8, 0.4],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -inset-6 -z-10 rounded-full bg-accent/15 blur-2xl"
        />
      </motion.div>

      {/* 品牌名称 - 渐变色 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="relative z-10 mt-8 text-center"
      >
        <h1 className="text-4xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-accent via-purple-400 to-accent bg-clip-text text-transparent">
            Ttan
          </span>
        </h1>

        {/* 副标题 - 延迟显示 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="mt-3 text-sm text-white/50"
        >
          本地音乐播放器
        </motion.p>
      </motion.div>

      {/* 加载进度指示器 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="relative z-10 mt-10"
      >
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.85, 1, 0.85],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
              className="h-2 w-2 rounded-full bg-accent"
            />
          ))}
        </div>
      </motion.div>

      {/* 底部标语 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="absolute bottom-12 z-10 flex items-center gap-2"
      >
        <Music className="h-4 w-4 text-white/50" />
        <span className="text-xs text-white/40">享受纯粹的音乐体验</span>
      </motion.div>
    </motion.div>
  );
}
