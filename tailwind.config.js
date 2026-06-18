/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "bg-primary": "#0a0e17",
        "bg-secondary": "#111827",
        "neon-cyan": "#00f0ff",
        "neon-green": "#39ff14",
        "neon-red": "#ff073a",
        "neon-yellow": "#ffd600",
        "neon-blue": "#4d7cff",
        "text-primary": "#e0e6ed",
        "text-muted": "#6b7b8d",
        "border-glow": "#1e293b",
      },
      fontFamily: {
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          "ui-monospace",
          "Consolas",
          "monospace",
        ],
        sans: ['"Inter"', "system-ui", '"Segoe UI"', "Roboto", "sans-serif"],
      },
      boxShadow: {
        "neon-cyan":
          "0 0 8px rgba(0, 240, 255, 0.4), 0 0 20px rgba(0, 240, 255, 0.15)",
        "neon-green":
          "0 0 8px rgba(57, 255, 20, 0.4), 0 0 20px rgba(57, 255, 20, 0.15)",
        "neon-red":
          "0 0 8px rgba(255, 7, 58, 0.4), 0 0 20px rgba(255, 7, 58, 0.15)",
        "neon-yellow":
          "0 0 8px rgba(255, 214, 0, 0.4), 0 0 20px rgba(255, 214, 0, 0.15)",
        "neon-blue":
          "0 0 8px rgba(77, 124, 255, 0.4), 0 0 20px rgba(77, 124, 255, 0.15)",
      },
    },
  },
  plugins: [],
};
