/**
 * Token dell'identità visiva Sintropia, riusabili fuori da Tailwind (canvas, stimoli).
 * I colori funzionali degli stimoli sono tenuti SEPARATI dai token di UI: non devono
 * mai comparire come colori dell'interfaccia, per non confondersi con gli stimoli.
 * @see docs/architettura.md — sezione "Identità visiva"
 */

export const UI_COLORS = {
  ink: '#111111',
  paper: '#FFFFFF',
  accent: '#4A90D9',
  accentSoft: '#EAF2FB',
  line: '#E4E7EC',
  muted: '#667085',
} as const;

/** Colori usati SOLO come stimoli (mai come UI). */
export const STIMULUS_COLORS = {
  // Stroop — colori "puri" ad alta saturazione per lo stimolo.
  stroop: {
    ROSSO: '#D0021B',
    VERDE: '#2E7D32',
    BLU: '#1565C0',
    GIALLO: '#F5A623',
  },
  // Go/No-Go
  go: '#2E7D32', // cerchio verde = Go
  nogo: '#D0021B', // cerchio rosso = No-Go
  // Feedback
  correct: '#2E7D32',
  wrong: '#D0021B',
} as const;
