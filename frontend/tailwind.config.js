/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      colors: {
        background: '#12100E', // Deep rich espresso
        surface: '#1C1816',    // Warm dark coffee
        primary: '#F5EFEB',    // Cream soft white
        secondary: '#B8AFAB',  // Warm taupe gray
        accent: '#C5A880',     // Timeless satin gold
        danger: '#E11D48',     // Soft rose red
        border: '#2E2724'      // Warm dark border
      }
    },
  },
  plugins: [],
}
