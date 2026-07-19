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
        // 椒盐音乐风格：暖橘红强调色
        accent: {
          DEFAULT: "#FF6B35",
          50: "#FFF3EE",
          100: "#FFE2D5",
          200: "#FFC5AB",
          300: "#FF9F7A",
          400: "#FF8355",
          500: "#FF6B35",
          600: "#ED4F18",
          700: "#C43D10",
          800: "#9B3210",
          900: "#7D2C12",
        },
        // 中性背景色
        surface: {
          light: "#FFFFFF",
          subtle: "#F5F5F7",
          muted: "#EBEBEF",
          dark: "#0A0A0A",
          card: "#161617",
          elevated: "#1F1F22",
        },
        ink: {
          DEFAULT: "#1C1C1E",
          muted: "#6E6E73",
          subtle: "#A1A1A6",
          inverse: "#FFFFFF",
        },
      },
      fontFamily: {
        sans: [
          "Manrope",
          "Noto Sans SC",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        display: ["Manrope", "Noto Sans SC", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
      borderRadius: {
        xl: "14px",
        "2xl": "20px",
        "3xl": "28px",
      },
      boxShadow: {
        card: "0 4px 24px -8px rgba(0, 0, 0, 0.08), 0 2px 6px -2px rgba(0, 0, 0, 0.04)",
        glow: "0 8px 32px -4px rgba(255, 107, 53, 0.35)",
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
