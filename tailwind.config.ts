import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./services/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#020b18",
          900: "#051226",
          850: "#071a33",
          800: "#0a2242",
          700: "#0e2f59",
          600: "#143d73",
        },
        ocean: {
          200: "#b3e0ff",
          300: "#7cc4ff",
          400: "#4aa8ff",
          500: "#1e88e5",
          600: "#1565c0",
          700: "#0d47a1",
        },
        foam: "#eaf6ff",
      },
      fontFamily: {
        tajawal: ["var(--font-tajawal)", "Tahoma", "Arial", "sans-serif"],
        grotesk: ["var(--font-grotesk)", "var(--font-tajawal)", "sans-serif"],
      },
      boxShadow: {
        glass: "0 8px 32px rgba(2, 11, 24, 0.35)",
        glow: "0 0 40px rgba(34, 211, 238, 0.15)",
        card: "0 4px 24px rgba(2, 11, 24, 0.25)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
