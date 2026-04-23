/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#070a0e",
        panel: "#10161f",
        "panel-strong": "#151f2b",
        line: "#243244",
        accent: "#8bd5ff",
        success: "#3dd9a4",
        warning: "#f7c35f",
        danger: "#ff7c8a",
        ink: "#edf3fb",
        muted: "#8d9aac",
      },
      boxShadow: {
        glow: "0 28px 90px rgba(4, 10, 18, 0.55)",
      },
      fontFamily: {
        sans: ["Aptos", "Segoe UI Variable", "Segoe UI", "sans-serif"],
        display: ["Bahnschrift", "Aptos Display", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};
