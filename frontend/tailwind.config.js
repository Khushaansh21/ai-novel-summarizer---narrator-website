/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#000000",
        accent: "#6366F1",
        accentSoft: "#EEF2FF"
      }
    }
  },
  plugins: []
};

