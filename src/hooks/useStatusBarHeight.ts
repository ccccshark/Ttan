import { useEffect, useState } from "react";

export function useStatusBarHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const getHeight = () => {
      if (typeof window !== "undefined") {
        const safeAreaTop = parseInt(
          window.getComputedStyle(document.body).getPropertyValue("--safe-area-inset-top") || "0",
          10
        );
        let computedHeight = safeAreaTop;

        if (computedHeight === 0) {
          const envValue = parseInt(
            window.getComputedStyle(document.documentElement).getPropertyValue("safe-area-inset-top") || "0",
            10
          );
          computedHeight = envValue;
        }

        if (computedHeight === 0) {
          const ua = navigator.userAgent;
          if (ua.includes("iPhone") || ua.includes("iPad")) {
            computedHeight = 47;
          } else if (ua.includes("Android")) {
            computedHeight = 24;
          } else {
            computedHeight = 0;
          }
        }

        setHeight(computedHeight);
        document.documentElement.style.setProperty("--status-bar-height", `${computedHeight}px`);
      }
    };

    getHeight();
    window.addEventListener("resize", getHeight);
    window.addEventListener("orientationchange", getHeight);
    return () => {
      window.removeEventListener("resize", getHeight);
      window.removeEventListener("orientationchange", getHeight);
    };
  }, []);

  return height;
}
