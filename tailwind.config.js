/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette istituzionale — identità visiva CIRIAF (vedi docs/architettura.md).
        // L'accento è usato solo per rifiniture, mai come sfondo di ampie aree.
        ink: '#111111', // testo principale
        paper: '#FFFFFF', // sfondo
        accent: '#4A90D9', // azzurrino primario (bordi attivi, focus, pulsante primario)
        'accent-soft': '#EAF2FB', // superficie tenue
        line: '#E4E7EC', // bordi sottili
        muted: '#667085', // testo secondario
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        card: '10px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
      },
      maxWidth: {
        content: '960px',
      },
    },
  },
  plugins: [],
};
