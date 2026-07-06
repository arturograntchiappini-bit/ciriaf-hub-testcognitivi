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
  nback: {
    title: 'N-Back (2-back)',
    paragraphs: [
      'Vedrai una sequenza continua di lettere, una alla volta.',
      'Premi la BARRA SPAZIATRICE quando la lettera attuale è identica a quella comparsa DUE posizioni prima.',
      'Non premere nulla in tutti gli altri casi. Il test è lungo: mantieni la concentrazione.',
    ],
    keyHints: ['BARRA SPAZIATRICE = la lettera è uguale a 2 passi fa'],
  },
  wcst: {
    title: 'Wisconsin Card Sorting Test',
    paragraphs: [
      'In alto vedrai una carta. Devi abbinarla a una delle 4 carte in basso cliccandola.',
      'Puoi abbinare per colore, forma o numero dei simboli: NON ti verrà detto quale sia la regola giusta.',
      'Dopo ogni scelta vedrai solo “Corretto” o “Errato”. Usa il feedback per scoprire la regola. Attenzione: la regola può cambiare senza preavviso.',
    ],
    keyHints: ['Usa il mouse per cliccare la carta'],
  },
};
