/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        // PixelPlayer 风格：紫色主色调，粉色/橙色渐变强调
        accent: {
          DEFAULT: "var(--accent-color, #6C4FF5)",
          50: "#F0ECFE",
          100: "#DCD5FC",
          200: "#B8AAF9",
          300: "#957FF6",
          400: "#7A5DF3",
          500: "var(--accent-color, #6C4FF5)",
          600: "#5A3ED4",
          700: "#4A32B0",
          800: "#3B288D",
          900: "#2E1F6E",
        },
        // PixelPlayer 紫色调色板
        pixel: {
          purple: {
            DEFAULT: "#6C4FF5",
            50: "#F5F0FF",
            100: "#EDE5FF",
            200: "#D9CCFF",
            300: "#C2A8FF",
            400: "#A67DFF",
            500: "#8B5CF6",
            600: "#7C3AED",
            700: "#6D28D9",
            800: "#5B21B6",
            900: "#4C1D95",
          },
          pink: {
            DEFAULT: "#F06292",
            light: "#F48FB1",
            dark: "#E91E63",
          },
          orange: {
            DEFAULT: "#FF8A65",
            light: "#FFAB91",
            dark: "#F4511E",
          },
        },
        // Material 3 surface containers
        "surface-container": {
          DEFAULT: "rgba(0,0,0,0.03)",
          high: "rgba(0,0,0,0.06)",
          highest: "rgba(0,0,0,0.08)",
        },
        // 深色背景系（PixelPlayer 风格）
        surface: {
          light: "#F7F2FF",
          subtle: "#FBF8FF",
          muted: "#EDE5FF",
          dark: "#1E1234",
          card: "#2A1F40",
          elevated: "#362A52",
        },
        // 文字颜色
        ink: {
          DEFAULT: "#1C1C1E",
          muted: "#8B7FB0",
          subtle: "#B8AFD9",
          inverse: "#FFFFFF",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "Noto Sans SC",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        display: ["Inter", "Noto Sans SC", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
      borderRadius: {
        xl: "16px",
        "2xl": "24px",
        "3xl": "32px",
      },
      boxShadow: {
        card: "0 4px 24px -8px rgba(108, 79, 245, 0.12), 0 2px 8px -2px rgba(0, 0, 0, 0.08)",
        glow: "0 8px 32px -4px rgba(108, 79, 245, 0.35)",
        cover: "0 24px 48px -12px rgba(0, 0, 0, 0.45)",
        mini: "0 -4px 24px -8px rgba(0, 0, 0, 0.12)",
      },
      backdropBlur: {
        xs: "2px",
        glass: "20px",
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "slide-up": "slide-up 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        "spin-slow": "spin 24s linear infinite",
        "pulse-soft": "pulse-soft 3s ease-in-out infinite",
        shimmer: "shimmer 1.6s linear infinite",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
