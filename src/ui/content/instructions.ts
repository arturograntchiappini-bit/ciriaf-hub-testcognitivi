/**
 * Testi delle istruzioni (in italiano) e schemi dei tasti per ciascun test.
 * @see docs/scientific/ per il razionale dei compiti
 */
import type { TestId } from '../../engine/types';

export interface Instruction {
  title: string;
  paragraphs: string[];
  /** Righe che descrivono la mappatura dei tasti (mostrate in evidenza). */
  keyHints: string[];
}

const POSITION_WORDS = ['', 'UNA posizione', 'DUE posizioni', 'TRE posizioni'] as const;

/** Istruzioni dell'N-Back per il livello `n`: il testo segue il parametro, non è fisso a 2. */
export function nBackInstruction(n: number): Instruction {
  const level = Number.isInteger(n) && n >= 1 && n <= 3 ? n : 2;
  const steps = level === 1 ? '1 passo fa' : `${level} passi fa`;
  return {
    title: `N-Back (${level}-back)`,
    paragraphs: [
      'Vedrai una sequenza continua di lettere, una alla volta.',
      `Premi la BARRA SPAZIATRICE quando la lettera attuale è identica a quella comparsa ${POSITION_WORDS[level]} prima.`,
      'Non premere nulla in tutti gli altri casi. Il test è lungo: mantieni la concentrazione.',
    ],
    keyHints: [`BARRA SPAZIATRICE = la lettera è uguale a ${steps}`],
  };
}

/** Istruzioni del SART per la cifra bersaglio `digit`: il testo segue il parametro, non è fisso a 3. */
export function sartInstruction(digit: number): Instruction {
  const target = Number.isInteger(digit) && digit >= 1 && digit <= 9 ? digit : 3;
  return {
    title: 'SART — Attenzione sostenuta alla risposta',
    paragraphs: [
      'Sullo schermo compariranno cifre da 1 a 9, una alla volta, ciascuna seguita da un cerchio barrato.',
      `Premi la BARRA SPAZIATRICE a ogni cifra TRANNE al ${target}: quando compare il ${target}, non premere nulla.`,
      'Rispondi in fretta ma con attenzione: gli errori sul bersaglio sono la misura principale. Il test dura circa 4–5 minuti.',
    ],
    keyHints: ['BARRA SPAZIATRICE = qualsiasi cifra tranne il ' + target, `Nessun tasto = ${target}`],
  };
}

export const INSTRUCTIONS: Record<TestId, Instruction> = {
  stroop1: {
    title: 'Stroop 1 — Focus sulla Parola',
    paragraphs: [
      'Apparirà una parola che indica un colore, scritta in un colore che può coincidere o no col suo significato.',
      'Devi rispondere in base alla PAROLA che leggi, ignorando il colore con cui è scritta.',
      'Premi il tasto corrispondente all’iniziale della parola, il più rapidamente e accuratamente possibile.',
    ],
    keyHints: ['R = ROSSO', 'V = VERDE', 'B = BLU', 'G = GIALLO'],
  },
  stroop2: {
    title: 'Stroop 2 — Focus sul Colore',
    paragraphs: [
      'Apparirà una parola che indica un colore, scritta in un colore che può coincidere o no col suo significato.',
      'Devi rispondere in base al COLORE con cui è scritta la parola, ignorando ciò che la parola dice.',
      'Premi il tasto corrispondente all’iniziale del colore, il più rapidamente e accuratamente possibile.',
    ],
    keyHints: ['R = ROSSO', 'V = VERDE', 'B = BLU', 'G = GIALLO'],
  },
  gonogo: {
    title: 'Go / No-Go',
    paragraphs: [
      'Appariranno rapidamente dei cerchi colorati.',
      'Premi la BARRA SPAZIATRICE il più velocemente possibile quando vedi un cerchio VERDE (Go).',
      'NON premere nulla quando vedi un cerchio ROSSO (No-Go): devi trattenere la risposta.',
    ],
    keyHints: ['BARRA SPAZIATRICE = cerchio verde', 'Nessun tasto = cerchio rosso'],
  },
  corsi: {
    title: 'Corsi Block Task',
    paragraphs: [
      'Vedrai una configurazione fissa di 9 blocchi. Alcuni blocchi si illumineranno in sequenza, uno dopo l’altro.',
      'Quando la sequenza termina, riproducila cliccando i blocchi nello STESSO ordine in cui si sono illuminati.',
      'Le sequenze si allungano progressivamente. Concentrati e memorizza l’ordine.',
    ],
    keyHints: ['Usa il mouse per cliccare i blocchi'],
  },
  nback: nBackInstruction(2),
  wcst: {
    title: 'Wisconsin Card Sorting Test',
    paragraphs: [
      'In alto vedrai una carta. Devi abbinarla a una delle 4 carte in basso cliccandola.',
      'Puoi abbinare per colore, forma o numero dei simboli: NON ti verrà detto quale sia la regola giusta.',
      'Dopo ogni scelta vedrai solo “Corretto” o “Errato”. Usa il feedback per scoprire la regola. Attenzione: la regola può cambiare senza preavviso.',
    ],
    keyHints: ['Usa il mouse per cliccare la carta'],
  },
  pvt: {
    title: 'PVT — Vigilanza Psicomotoria',
    paragraphs: [
      'Fissa lo schermo. A intervalli imprevedibili, comparirà un contatore che parte da 0 e conta i millisecondi.',
      'Premi la BARRA SPAZIATRICE il più velocemente possibile NON APPENA il numero appare.',
      'Cerca di mantenere la concentrazione: il test dura circa 10 minuti. Il numero di lapse (risposte lente) è la misura principale.',
    ],
    keyHints: ['BARRA SPAZIATRICE = ferma il contatore il più velocemente possibile'],
  },
  flanker: {
    title: 'Flanker — Frecce di Eriksen',
    paragraphs: [
      'Al centro dello schermo comparirà una fila di cinque simboli.',
      'Rispondi alla direzione della freccia CENTRALE, ignorando i simboli ai lati.',
      'A volte i simboli ai lati indicano la direzione opposta: ignorali. Rispondi il più rapidamente e accuratamente possibile.',
    ],
    keyHints: ['← = freccia centrale a sinistra', '→ = freccia centrale a destra'],
  },
  sart: sartInstruction(3),
  mentalRotation: {
    title: 'Mental Rotation — Rotazione mentale',
    paragraphs: [
      'Compariranno due figure fatte di cubetti, affiancate.',
      'A volte la figura di destra è la stessa di quella di sinistra, solo ruotata. Altre volte è la sua immagine speculare e non potrai mai sovrapporla.',
      'Immagina di ruotare una figura per capire se sono uguali o diverse; rispondi il più rapidamente possibile, senza sbagliare.',
    ],
    keyHints: ['← = figure UGUALI (solo ruotate)', '→ = figure DIVERSE (speculari)'],
  },
  trailMaking: {
    title: 'Trail Making A/B',
    paragraphs: [
      'Sullo schermo ci sono dei cerchi sparsi. Nella parte A sono numerati: collegali in ordine, 1, 2, 3…',
      'Nella parte B ci sono numeri e lettere: collegali alternando, 1, A, 2, B, 3, C…',
      'Fai clic sui cerchi con il mouse o con il dito, il più velocemente possibile senza sbagliare. Se sbagli il tempo continua a scorrere.',
    ],
    keyHints: ['Mouse o tocco = clic sul cerchio successivo'],
  },
  visualSearch: {
    title: 'Visual Search — Ricerca visiva',
    paragraphs: [
      'Comparirà un campo con molte figure colorate. Il bersaglio è un CERCHIO ARANCIONE.',
      'A volte il bersaglio c’è, a volte no. Cercalo e rispondi il più rapidamente possibile, senza sbagliare.',
      'I distrattori cambiano: possono essere tutti diversi per colore, oppure assomigliare al bersaglio per forma o per colore.',
    ],
    keyHints: ['← = cerchio arancione PRESENTE', '→ = cerchio arancione ASSENTE'],
  },
};

/** Istruzioni di un test, adattate ai parametri scelti (livello n dell'N-Back, cifra bersaglio del SART). */
export function instructionsFor(testId: TestId, params?: Record<string, unknown>): Instruction {
  if (testId === 'nback') return nBackInstruction(Number(params?.n));
  if (testId === 'sart') return sartInstruction(Number(params?.targetDigit));
  return INSTRUCTIONS[testId];
}
