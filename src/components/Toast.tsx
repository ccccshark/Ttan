import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface ToastEvent {
  id: number;
  message: string;
}

let toastCounter = 0;
const listeners = new Set<(msg: string) => void>();

/**
 * 全局 Toast 事件总线
 * 任何位置都可以调用 toast("xxx") 弹出提示
 */
export function toast(message: string): void {
  for (const listener of listeners) {
    listener(message);
  }
}

export function useToast(): { showToast: (msg: string) => void } {
  return { showToast: toast };
}

/**
 * 全局 Toast 容器
 * 挂载在 App 根节点
 */
export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastEvent[]>([]);

  const add = useCallback((message: string) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2400);
  }, []);

  useEffect(() => {
    listeners.add(add);
    return () => {
      listeners.delete(add);
    };
  }, [add]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="pointer-events-auto max-w-[80vw] rounded-2xl bg-black/80 px-4 py-2.5 text-sm font-medium text-white shadow-lg backdrop-blur-md dark:bg-white/90 dark:text-[#0a0c1a]"
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
