/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        inset: "#0f172a",
        raised: "#1e293b",
        primary: "#f8fafc",
        secondary: "#94a3b8",
        border: "#334155",
        "border-weak": "#1e293b",
        accent: "#a855f7",
        success: "#22c55e",
        "success-weak": "#052e16",
        warning: "#eab308",
        error: "#ef4444",
        "error-weak": "#450a0a",
      },
    },
  },
  plugins: [],
};
