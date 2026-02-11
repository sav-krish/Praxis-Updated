/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F3F7FF",
        ink: "#0F2447",
        muted: "#516481",
        line: "#D6E1F2",
        accent: "#1D4ED8",
        accentSoft: "#E5EEFF",
        sun: "#60A5FA"
      },
      boxShadow: {
        soft: "0 12px 30px rgba(15, 36, 71, 0.12)",
        subtle: "0 6px 16px rgba(15, 36, 71, 0.1)"
      },
      borderRadius: {
        xl: "18px",
        '2xl': "24px"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"]
      }
    }
  },
  plugins: []
};
