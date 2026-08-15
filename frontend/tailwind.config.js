/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sports: {
          green: '#10b981',
          greenDark: '#059669',
          lime: '#84cc16',
          cyan: '#06b6d4',
          yellow: '#f59e0b',
          blue: '#2563eb',
          slate: '#0f172a',
          lightBg: '#f8fafc',
          card: '#ffffff'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
