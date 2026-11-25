import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#1b1311", surface: "#2a1c18", raised: "#35241f", line: "#3d2b26",
        ink: "#f5ede9", muted: "#a8948e", faint: "#6e5b55",
        brand: "#e8735a", "brand-2": "#f08a72", "brand-dim": "#7c3a2c",
        mint: "#4ade80", "mint-dim": "#1f4a32", loss: "#ff7a6b", gold: "#f5c451",
      },
      fontFamily: {
        sans: ['"Inter Variable"', "system-ui", "sans-serif"],
        display: ['"Poppins"', '"Inter Variable"', "sans-serif"],
        pixel: ['"Silkscreen"', "monospace"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
    },
  },
} satisfies Config;
