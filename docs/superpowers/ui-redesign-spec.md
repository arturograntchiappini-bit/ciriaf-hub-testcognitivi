# SPEC — CIRIAF Cognitive Testing Hub

## 0. Brief
- **Prodotto**: Piattaforma di test cognitivi per ricerca in fisica tecnica ambientale (COLAB/NEXTROOM)
- **Audience**: Ricercatori, assegnisti, tesisti — uso su PC/lab, anonimo, dati esportabili
- **Archetipo**: Tool/Configurator (con elementi dashboard)
- **Dials**: Expression 4 · Interactivity 4 · Density 3
- **Signature moment**: Hero 3D interattivo — rete di nodi pulsanti che reagisce al mouse, tema cognitive-network
- **Non farò**: Three.js (canvas 2D basta), side-menu mobile, login/accounts, onboarding tutorial
- **Stack**: React 18 + TypeScript strict + Tailwind 3 + canvas 2D API

## 1. Sezioni
- **Hero**: canvas neural-net + titolo "Batteria di test cognitivi" + sottotitolo + CTA "Modalità Sessione"
- **Griglia test**: 6 carte (Stroop, Go/No-Go, Corsi, N-Back, WCST), 3 colonne desktop, 1 mobile
- **Footer**: CIRIAF — COLAB/NEXTROOM · piattaforma di ricerca sperimentale

## 2. Token
**Colori** (da tailwind.config.js esistenti): ink #111111, paper #FFFFFF, accent #4A90D9, accent-soft #EAF2FB, line #E4E7EC, muted #667085
**Accent secondario canvas**: #4A90D9 con alpha 0.15-0.6 per nodi/archi
**Tipo**: Inter 400/500/600/700 (già presente via fontsource)
**Spacing**: max-w-content 960px, px-6, py-8/12
**Motion**: transition 200ms ease-out, canvas 60fps rAF, stagger 80ms cards

## 3. Componenti

### InteractiveHero (nuovo)
- `<canvas>` full-width (max-w-content), altezza 320px
- 30-50 nodi disposti in layout random ma bilanciato
- Archi tra nodi vicini (distanza < threshold)
- Animazione: nodi pulsano (opacità sinusoide), archi sbiadiscono con distanza
- Mouse: nodi più vicini al cursore si illuminano, archi si riorientano
- Overlay testo: titolo + sottotitolo + CTA sessione
- `prefers-reduced-motion`: canvas statico con una cornice sola

### TestCard (modificato)
- Colore di bordo per dominio cognitivo: attenzione (azzurro), memoria (viola), inibizione (arancione), flessibilità (verde)
- Icona test
- Hover: scale(1.02) + shadow-lg + bordo accent
- Stesso layout card

### Header (modificato)
- Sfondo trasparente su hero (si fonde), solido dopo scroll
- Stessa struttura ma più pulito

## 4. Interazioni
- Card entrance: fade-in + translate-up con stagger 80ms
- Hover card: scale 1.02, box-shadow transition
- Ridotti: nessuna animazione, canvas statico
- Canvas: 60fps, pausa quando tab non visibile (visibilitychange)

## 5. Performance
- Bundle: canvas 2D senza dipendenze (~2KB gzippato)
- Canvas: dipinto su richiestaAnimationFrame, non su resize
- LCP: hero visibile in < 1s (testo renderizzato subito, canvas si popola dopo)
- `will-change: transform` solo sulle card in hover

## 6. Responsive
| Breakpoint | Griglia | Hero |
|---|---|---|
| >= 1024px | 3 colonne | 320px altezza |
| 640-1023px | 2 colonne | 240px altezza |
| < 640px | 1 colonna | 200px altezza |

## 7. Accessibilità
- Canvas ha `role="img"` e `aria-label` descrittivo
- `prefers-reduced-motion` stoppato
- Card sono `<button>` con focus-visible ring
- Landmark: header, main, footer
