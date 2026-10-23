import type { TestId } from '../../engine/types';

/** Cosa si accende nel cervello e cosa si chiede al partecipante, per ciascun test del catalogo. */
export interface TestFocus {
  /** Indici di RegionId: 0 frontale, 1 parietale, 2 temporale, 3 occipitale, 4 cervelletto. */
  regions: readonly number[];
  regionLabel: string;
  task: string;
}

const FRONTAL: readonly number[] = [0];
const PARIETAL: readonly number[] = [1];
const FRONTO_PARIETAL: readonly number[] = [0, 1];

const FOCUS_BY_TEST: Partial<Record<TestId, TestFocus>> = {
  stroop1: { regions: FRONTAL, regionLabel: 'Frontale', task: 'Leggi la parola e ignora il colore dell’inchiostro.' },
  stroop2: { regions: FRONTAL, regionLabel: 'Frontale', task: 'Nomina il colore dell’inchiostro e sopprimi la lettura.' },
  gonogo: { regions: FRONTAL, regionLabel: 'Frontale', task: 'Rispondi ai Go, trattieniti sui No-Go.' },
  corsi: { regions: PARIETAL, regionLabel: 'Parietale', task: 'Riproduci la sequenza dei blocchi illuminati.' },
  nback: { regions: FRONTO_PARIETAL, regionLabel: 'Fronto-parietale', task: 'Di’ se lo stimolo coincide con quello di due posizioni prima.' },
  wcst: { regions: FRONTAL, regionLabel: 'Frontale', task: 'Deduci la regola di smistamento e cambiala quando cambia.' },
  flanker: { regions: FRONTAL, regionLabel: 'Frontale', task: 'Rispondi alla freccia centrale e ignora quelle ai lati.' },
  visualSearch: { regions: [1, 3], regionLabel: 'Parieto-occipitale', task: 'Trova il cerchio arancione tra i distrattori, o dì che non c’è.' },
  mentalRotation: { regions: PARIETAL, regionLabel: 'Parietale', task: 'Stabilisci se due figure a blocchi sono la stessa, solo ruotata, o speculari.' },
  trailMaking: { regions: FRONTO_PARIETAL, regionLabel: 'Fronto-parietale', task: 'Collega i cerchi in ordine, prima solo numeri, poi alternando numeri e lettere.' },
  sart: { regions: FRONTO_PARIETAL, regionLabel: 'Fronto-parietale', task: 'Premi a ogni cifra, tranne a una: trattieniti quando compare.' },
  pvt: { regions: FRONTO_PARIETAL, regionLabel: 'Fronto-parietale', task: 'Rispondi appena compare lo stimolo, a intervalli imprevedibili.' },
};

const DEFAULT_FOCUS: TestFocus = { regions: FRONTO_PARIETAL, regionLabel: 'Fronto-parietale', task: '' };

export function focusFor(id: TestId): TestFocus {
  return FOCUS_BY_TEST[id] ?? DEFAULT_FOCUS;
}
