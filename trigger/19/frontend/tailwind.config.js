/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          900: "#0b1220",
          800: "#111b2e",
          700: "#1a2740",
          600: "#243352",
        },
        accent: {
          DEFAULT: "#22c55e",
          muted: "#16a34a",
          glow: "#4ade80",
        },
        gold: "#fbbf24",
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      boxShadow: {
        card: "0 4px 24px rgba(0,0,0,0.35)",
        glow: "0 0 40px rgba(34,197,94,0.12)",
      },
    },
  },
  plugins: [],
};
