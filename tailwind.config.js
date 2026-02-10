/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F6F4F1",
        ink: "#1E2A2F",
        muted: "#6B767B",
        line: "#E2DEDA",
        accent: "#1E5B63",
        accentSoft: "#E2F0F0",
        sun: "#D5B98A"
      },
      boxShadow: {
        soft: "0 12px 30px rgba(30, 42, 47, 0.08)",
        subtle: "0 6px 16px rgba(30, 42, 47, 0.08)"
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
