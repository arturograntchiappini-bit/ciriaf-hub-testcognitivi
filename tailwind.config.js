/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette scientifica dark — laboratorio CIRIAF.
        ink: '#E1E7EF', // testo principale su dark
        paper: '#0A0E1A', // sfondo principale
        surface: '#111827', // sfondo card
        elevated: '#1A2538', // hover/raised
        accent: '#4A90D9', // azzurrino primario
        'accent-soft': '#132238', // superficie tenue accent
        'accent-glow': '#6BB5FF', // glow hover
        line: '#1E2740', // bordi
        muted: '#8892A4', // testo secondario
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        card: '10px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px rgba(0, 0, 0, 0.4)',
      },
      maxWidth: {
        content: '960px',
      },
    },
  },
  plugins: [],
};
