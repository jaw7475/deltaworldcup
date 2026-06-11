import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0a0a14",
          raised: "#11111c",
          row: "#141425",
        },
        neon: {
          cyan: "#00f5d4",
          magenta: "#ff006e",
          yellow: "#fee440",
          green: "#9bff66",
          violet: "#b16cff",
          live: "#7dd3fc",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-monospace", "monospace"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "neon-cyan": "0 0 12px rgba(0,245,212,0.55), 0 0 32px rgba(0,245,212,0.25)",
        "neon-magenta": "0 0 12px rgba(255,0,110,0.55), 0 0 32px rgba(255,0,110,0.25)",
        "neon-yellow": "0 0 12px rgba(254,228,64,0.55), 0 0 32px rgba(254,228,64,0.25)",
        "neon-live": "0 0 8px rgba(125,211,252,0.9), 0 0 18px rgba(125,211,252,0.5)",
      },
      animation: {
        "live-pulse": "live-pulse 1.6s ease-in-out infinite",
        "scanline": "scanline 8s linear infinite",
      },
      keyframes: {
        "live-pulse": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.55", transform: "scale(0.85)" },
        },
        "scanline": {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "0 100vh" },
        },
      },
    },
  },
  plugins: [],
}
export default config
