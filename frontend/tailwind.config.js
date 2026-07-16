/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
        slate: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1f2937",
          900: "#0f172a",
        },
      },
      boxShadow: {
        subtle: "0 10px 30px -20px rgba(15, 23, 42, 0.35)",
      },
      keyframes: {
        "highlight-pulse": {
          "0%, 100%": { backgroundColor: "transparent" },
          "50%": { backgroundColor: "rgb(219 234 254)" },
        },
        "highlight-in": {
          "0%": { backgroundColor: "transparent" },
          "100%": { backgroundColor: "rgb(219 234 254)" },
        },
        "scan-horizontal": {
          "0%": { left: "-10%", opacity: "0" },
          "5%": { opacity: "1" },
          "95%": { opacity: "1" },
          "100%": { left: "110%", opacity: "0" },
        },
      },
      animation: {
        "highlight-pulse": "highlight-pulse 1.5s ease-in-out 2",
        "highlight-in": "highlight-in 0.4s ease-out forwards",
        scan: "scan-horizontal 3s linear infinite",
      },
    },
  },
  plugins: [],
};
