/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        electric: '#0ff', // cyan/electric blue
        violet: '#8a2be2',
        cyan: '#00ffff'
      }
    },
  },
  plugins: [],
}
