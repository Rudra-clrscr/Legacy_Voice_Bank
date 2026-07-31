/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', 'sans-serif'],
        serif: ['Fraunces', 'serif'],
      },
      colors: {
        background: '#F4E5A8', // Butter yellow
        surface: '#FDF5D7',     // Soft cream
        primary: '#2A160D',     // Chocolate brown
        secondary: '#6C4A31',   // Warm cocoa
        accent: '#5A301E',      // Deep cocoa
        danger: '#B42318',      // Burnt red
        border: '#2A160D'       // Hard brutalist outline
      }
    },
  },
  plugins: [],
}
