import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#08080a",
        surface: "#0f0f13",
        surface2: "#16161c",
        line: "#242430",
        neon: "#ff2ea6",
        neonSoft: "#ff8fd1",
        gold: "#f4c95d",
        silver: "#cfd6e0",
        bronze: "#d98a5a",
        muted: "#8a8a99",
        comicYellow: "#FFE347",
        comicCyan: "#35E7FF",
        comicLime: "#A6FF00",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
        comic: ["var(--font-comic)"],
      },
      boxShadow: {
        neon: "0 0 24px rgba(255,46,166,0.45), 0 0 2px rgba(255,46,166,0.9)",
      },
    },
  },
  plugins: [],
};
export default config;
