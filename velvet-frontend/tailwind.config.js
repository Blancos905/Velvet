/** @type {import('tailwindcss').Config} */
export default {
  important: ".salon-premium-tw-scope",
  corePlugins: {
    preflight: false,
  },
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        inter: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
