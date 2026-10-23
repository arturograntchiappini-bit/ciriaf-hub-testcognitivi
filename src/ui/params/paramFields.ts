/**
 * Descrittori dei parametri dei test (label, unità, range), condivisi tra il
 * pannello Impostazioni e il costruttore di Sessione (DRY).
 * @see docs/architettura.md
 */
import type { AllParams } from '../../config/defaults';

export interface FieldDesc {
  key: string;
  label: string;
  unit?: string;
  min: number;
  max: number;
  step?: number;
}

export interface SectionDesc {
  testKey: keyof AllParams;
  title: string;
  fields: FieldDesc[];
}

export const PARAM_SECTIONS: SectionDesc[] = [
  {
    testKey: 'stroop1',
    title: 'Stroop 1 — Focus Parola',
    fields: [
      { key: 'nTrials', label: 'Numero di trial', unit: 'trial', min: 4, max: 400, step: 2 },
      { key: 'fixationMs', label: 'Durata fissazione', unit: 'ms', min: 0, max: 2000, step: 50 },
      { key: 'timeoutMs', label: 'Timeout risposta', unit: 'ms', min: 500, max: 8000, step: 100 },
      { key: 'isiMs', label: 'Intervallo tra stimoli (ISI)', unit: 'ms', min: 0, max: 3000, step: 50 },
      { key: 'practiceTrials', label: 'Trial di pratica', unit: 'trial', min: 0, max: 40, step: 1 },
    ],
  },
  {
    testKey: 'stroop2',
    title: 'Stroop 2 — Focus Colore',
    fields: [
      { key: 'nTrials', label: 'Numero di trial', unit: 'trial', min: 4, max: 400, step: 2 },
      { key: 'fixationMs', label: 'Durata fissazione', unit: 'ms', min: 0, max: 2000, step: 50 },
      { key: 'timeoutMs', label: 'Timeout risposta', unit: 'ms', min: 500, max: 8000, step: 100 },
      { key: 'isiMs', label: 'Intervallo tra stimoli (ISI)', unit: 'ms', min: 0, max: 3000, step: 50 },
      { key: 'practiceTrials', label: 'Trial di pratica', unit: 'trial', min: 0, max: 40, step: 1 },
    ],
  },
  {
    testKey: 'gonogo',
    title: 'Go / No-Go',
    fields: [
      { key: 'nTrials', label: 'Numero di trial', unit: 'trial', min: 8, max: 400, step: 4 },
      { key: 'goRatio', label: 'Proporzione Go', min: 0.5, max: 0.9, step: 0.05 },
      { key: 'stimulusMs', label: 'Durata stimolo (finestra)', unit: 'ms', min: 300, max: 2000, step: 50 },
      { key: 'isiMinMs', label: 'ISI minimo', unit: 'ms', min: 200, max: 2000, step: 50 },
      { key: 'isiMaxMs', label: 'ISI massimo', unit: 'ms', min: 300, max: 3000, step: 50 },
      { key: 'practiceTrials', label: 'Trial di pratica', unit: 'trial', min: 0, max: 40, step: 1 },
    ],
  },
  {
    testKey: 'corsi',
    title: 'Corsi Block Task',
    fields: [
      { key: 'startLength', label: 'Lunghezza iniziale', unit: 'blocchi', min: 2, max: 6, step: 1 },
      { key: 'maxLength', label: 'Lunghezza massima', unit: 'blocchi', min: 4, max: 9, step: 1 },
      { key: 'trialsPerLevel', label: 'Trial per livello', unit: 'trial', min: 1, max: 4, step: 1 },
      { key: 'presentMsPerBlock', label: 'Durata per blocco', unit: 'ms', min: 400, max: 2000, step: 50 },
      { key: 'complexityTolerance', label: 'Tolleranza complessità', min: 2, max: 30, step: 1 },
    ],
  },
  {
    testKey: 'nback',
    title: 'N-Back (2-back)',
    fields: [
      { key: 'n', label: 'Livello n', min: 1, max: 3, step: 1 },
      { key: 'letterMs', label: 'Durata lettera', unit: 'ms', min: 200, max: 1500, step: 50 },
      { key: 'blankMs', label: 'Durata schermo vuoto', unit: 'ms', min: 500, max: 3000, step: 50 },
      { key: 'nTrials', label: 'Numero di trial', unit: 'trial', min: 20, max: 600, step: 10 },
      { key: 'targetRate', label: 'Proporzione target', min: 0.1, max: 0.5, step: 0.05 },
      { key: 'lureRate', label: 'Proporzione lure (tra i non-target)', min: 0, max: 0.4, step: 0.05 },
      { key: 'practiceTrials', label: 'Trial di pratica', unit: 'trial', min: 0, max: 60, step: 5 },
    ],
  },
  {
    testKey: 'wcst',
    title: 'Wisconsin Card Sorting Test',
    fields: [
      { key: 'deckSize', label: 'Dimensione mazzo', unit: 'carte', min: 32, max: 256, step: 32 },
      { key: 'runToShift', label: 'Corrette per il cambio', unit: 'risposte', min: 4, max: 20, step: 1 },
      { key: 'maxCategories', label: 'Categorie da completare', min: 1, max: 12, step: 1 },
    ],
  },
  {
    testKey: 'pvt',
    title: 'PVT — Vigilanza Psicomotoria',
    fields: [
      { key: 'nTrials', label: 'Numero di trial', unit: 'trial', min: 10, max: 400, step: 10 },
      { key: 'stimulusMaxMs', label: 'Timeout stimolo', unit: 'ms', min: 1000, max: 30000, step: 500 },
      { key: 'isiMinMs', label: 'ISI minimo', unit: 'ms', min: 500, max: 20000, step: 500 },
      { key: 'isiMaxMs', label: 'ISI massimo', unit: 'ms', min: 1000, max: 30000, step: 500 },
      { key: 'practiceTrials', label: 'Trial di pratica', unit: 'trial', min: 0, max: 40, step: 1 },
    ],
  },
  {
    testKey: 'flanker',
    title: 'Flanker — Frecce di Eriksen',
    fields: [
      { key: 'nTrials', label: 'Numero di trial', unit: 'trial', min: 12, max: 400, step: 4 },
      { key: 'incongruentRatio', label: 'Proporzione incongruenti', min: 0.2, max: 0.6, step: 0.05 },
      { key: 'neutralRatio', label: 'Proporzione neutri', min: 0, max: 0.4, step: 0.05 },
      { key: 'fixationMs', label: 'Durata fissazione', unit: 'ms', min: 200, max: 2000, step: 100 },
      { key: 'responseWindowMs', label: 'Finestra di risposta', unit: 'ms', min: 500, max: 3000, step: 100 },
      { key: 'isiMinMs', label: 'ISI minimo', unit: 'ms', min: 300, max: 3000, step: 100 },
      { key: 'isiMaxMs', label: 'ISI massimo', unit: 'ms', min: 400, max: 4000, step: 100 },
      { key: 'practiceTrials', label: 'Trial di pratica', unit: 'trial', min: 0, max: 40, step: 1 },
    ],
  },
  {
    testKey: 'sart',
    title: 'SART — Attenzione sostenuta alla risposta',
    fields: [
      { key: 'nTrials', label: 'Numero di trial', unit: 'trial', min: 18, max: 450, step: 9 },
      { key: 'targetDigit', label: 'Cifra da non rispondere', min: 1, max: 9, step: 1 },
      { key: 'digitMs', label: 'Durata della cifra', unit: 'ms', min: 100, max: 1000, step: 50 },
      { key: 'maskMs', label: 'Durata della maschera', unit: 'ms', min: 300, max: 2000, step: 100 },
      { key: 'practiceTrials', label: 'Trial di pratica', unit: 'trial', min: 0, max: 40, step: 1 },
    ],
  },
  {
    testKey: 'visualSearch',
    title: 'Visual Search — Ricerca visiva',
    fields: [
      { key: 'nTrials', label: 'Numero di trial', unit: 'trial', min: 12, max: 480, step: 12 },
      { key: 'fixationMs', label: 'Durata fissazione', unit: 'ms', min: 200, max: 2000, step: 100 },
      { key: 'responseWindowMs', label: 'Tempo massimo', unit: 'ms', min: 1000, max: 10000, step: 500 },
      { key: 'isiMinMs', label: 'ISI minimo', unit: 'ms', min: 300, max: 3000, step: 100 },
      { key: 'isiMaxMs', label: 'ISI massimo', unit: 'ms', min: 400, max: 4000, step: 100 },
      { key: 'practiceTrials', label: 'Trial di pratica', unit: 'trial', min: 0, max: 40, step: 1 },
    ],
  },
  {
    testKey: 'mentalRotation',
    title: 'Mental Rotation — Rotazione mentale',
    fields: [
      { key: 'nTrials', label: 'Numero di trial', unit: 'trial', min: 14, max: 420, step: 14 },
      { key: 'fixationMs', label: 'Durata fissazione', unit: 'ms', min: 200, max: 2000, step: 100 },
      { key: 'responseWindowMs', label: 'Tempo massimo', unit: 'ms', min: 2000, max: 20000, step: 1000 },
      { key: 'isiMinMs', label: 'ISI minimo', unit: 'ms', min: 300, max: 3000, step: 100 },
      { key: 'isiMaxMs', label: 'ISI massimo', unit: 'ms', min: 400, max: 4000, step: 100 },
      { key: 'practiceTrials', label: 'Trial di pratica', unit: 'trial', min: 0, max: 40, step: 1 },
    ],
  },
  {
    testKey: 'trailMaking',
    title: 'Trail Making A/B',
    fields: [
      { key: 'nTargets', label: 'Cerchi per parte', unit: 'cerchi', min: 8, max: 51, step: 1 },
      { key: 'practiceTargets', label: 'Cerchi di pratica', unit: 'cerchi', min: 0, max: 15, step: 1 },
    ],
  },
];

/** Sezione dei parametri per un dato test. */
export function paramSectionFor(testKey: keyof AllParams): SectionDesc | undefined {
  return PARAM_SECTIONS.find((s) => s.testKey === testKey);
}
