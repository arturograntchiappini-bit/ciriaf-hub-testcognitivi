/** @type {import('tailwindcss').Config} */

// I colori sono variabili CSS (canali RGB) così un contenitore può cambiare tema:
// l'interfaccia è scura, l'area degli stimoli (.theme-stimulus) è chiara come da specifica.
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: token('ink'), // testo principale
        paper: token('paper'), // sfondo principale
        surface: token('surface'), // sfondo pannelli
        elevated: token('elevated'), // hover/raised
        accent: token('accent'), // azzurrino primario
        'accent-soft': token('accent-soft'), // superficie tenue accent
        'accent-glow': token('accent-glow'), // glow/hover
        line: token('line'), // bordi
        muted: token('muted'), // testo secondario
        danger: token('danger'), // errori
        sheet: '#E8EBF0', // pannello chiaro ("carta") della Home
        'sheet-ink': '#0A0E1A',
        'sheet-muted': '#4B5565',
        'accent-ink': '#1F5FA8', // accent leggibile su pannello chiaro
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Big Shoulders Display"', 'Impact', 'Arial Narrow', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        card: '2px',
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
