/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        apple: "0 24px 80px rgba(15, 23, 42, 0.12)"
      },
      keyframes: {
        "success-bounce": {
          "0%": { transform: "scale(0.5)", opacity: "0" },
          "50%": { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)", opacity: "1" }
        }
      },
      animation: {
        "success-bounce": "success-bounce 0.4s ease-out"
      }
    }
  },
  plugins: []
};
