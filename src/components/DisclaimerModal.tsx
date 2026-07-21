import { motion } from "framer-motion";
import { X } from "lucide-react";

interface DisclaimerModalProps {
  onAccept: () => void;
}

export default function DisclaimerModal({ onAccept }: DisclaimerModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative w-full max-w-[360px] overflow-hidden rounded-3xl bg-white dark:bg-[#1a1d2e] shadow-2xl"
      >
        {/* 顶部装饰 */}
        <div className="h-24 bg-gradient-to-br from-accent via-purple-500 to-blue-500" />
        
        {/* 内容 */}
        <div className="relative -mt-8 px-6 pb-6">
          {/* 图标 */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white dark:bg-[#05060f] shadow-lg">
            <span className="text-2xl">🎵</span>
          </div>
          
          <h2 className="mt-4 text-center text-xl font-bold text-ink dark:text-white">
            用户协议与免责声明
          </h2>
          
          <div className="mt-4 max-h-[45vh] overflow-y-auto space-y-3 text-sm leading-relaxed text-ink-muted dark:text-white/70">
            <p>
              <strong className="text-ink dark:text-white">1. 音乐来源</strong>
            </p>
            <p>
              Ttan 是一款本地音乐播放器，仅供个人学习和研究使用。本应用不提供任何在线音乐服务，不存储、传输或分发任何音乐文件。所有音乐文件均来自用户本地设备。
            </p>
            
            <p>
              <strong className="text-ink dark:text-white">2. 使用规范</strong>
            </p>
            <p>
              用户应确保所播放的音乐文件来源合法，并拥有相应的使用权。如因使用本应用播放未经授权的音乐文件而产生任何法律责任，由用户自行承担。
            </p>
            
            <p>
              <strong className="text-ink dark:text-white">3. 数据隐私</strong>
            </p>
            <p>
              本应用所有数据（包括歌曲元数据、播放列表、设置等）均存储于用户设备本地，不会上传至任何服务器。您的隐私完全由您掌控。
            </p>
            
            <p>
              <strong className="text-ink dark:text-white">4. 免责声明</strong>
            </p>
            <p>
              本应用代码开源于 GitHub，遵循 MIT 许可证。开发者不对因使用本应用而产生的任何直接或间接损失负责。
            </p>
          </div>
          
          {/* 同意按钮 */}
          <motion.button
            type="button"
            onClick={onAccept}
            whileTap={{ scale: 0.95 }}
            className="mt-6 w-full rounded-2xl bg-accent py-3.5 text-sm font-bold text-white shadow-lg shadow-accent/30 hover:bg-accent/90"
          >
            我已阅读并同意
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
