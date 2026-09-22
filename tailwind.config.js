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
        launcher: {
          darkest: '#08090c',
          dark: '#0f1117',
          surface: '#171923',
          card: '#1e2130',
          border: '#2a2f42',
          accent: '#6366f1',
          accentHover: '#4f46e5',
          accentGlow: 'rgba(99, 102, 241, 0.35)',
          muted: '#8b949e',
          highlight: '#38bdf8',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
