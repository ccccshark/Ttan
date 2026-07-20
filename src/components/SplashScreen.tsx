import { motion } from "framer-motion";
import { Disc3, Music } from "lucide-react";

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      onAnimationComplete={() => {
        setTimeout(onFinish, 1800);
      }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#05060f] via-[#0a0e25] to-[#05060f]"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 15,
          delay: 0.2,
        }}
        className="relative mb-6"
      >
        <motion.div
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="relative"
        >
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-accent/20 via-accent/10 to-transparent shadow-2xl shadow-accent/20">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#1a1d2e] to-[#0a0e25]">
              <Disc3 className="h-12 w-12 text-accent" />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-accent/30" />
            <div className="absolute inset-2 rounded-full border border-accent/20" />
          </div>
        </motion.div>
        
        <motion.div
          animate={{
            opacity: [0.5, 1, 0.5],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -inset-4 -z-10 rounded-full bg-accent/10 blur-xl"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Ttan
        </h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-2 text-sm text-white/50"
        >
          本地音乐播放器
        </motion.p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-16 flex items-center gap-2 text-white/30"
      >
        <Music className="h-4 w-4" />
        <span className="text-xs">享受纯粹的音乐体验</span>
      </motion.div>
    </motion.div>
  );
}
