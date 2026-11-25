import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#07080a", surface: "#0e1013", raised: "#14171b", line: "#1d2126",
        ink: "#e8ebef", muted: "#7c848f", faint: "#4a5059",
        brand: "#010AFC", "brand-2": "#3b4bff", mint: "#5ef0c0", "mint-dim": "#1d4d3f", loss: "#ff6b6b", gold: "#f5c451",
      },
      fontFamily: {
        sans: ['"Inter Variable"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
    },
  },
} satisfies Config;
