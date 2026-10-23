/**
 * Router minimale a stato (nessuna libreria esterna).
 * @see docs/architettura.md — sezione "Navigazione"
 */
import type { TestId, TestResult } from '../engine/types';
import type { SessionTemplate, SessionRun } from '../engine/session/model';

export type Route =
  | { name: 'home' }
  | { name: 'run'; testId: TestId }
  | { name: 'results'; result: TestResult }
  | { name: 'settings' }
  | { name: 'science'; slug: string | null; from: 'home' | TestId }
  | { name: 'sessionMenu' }
  | { name: 'sessionBuilder'; template: SessionTemplate | null }
  | { name: 'sessionRun'; run: SessionRun };

/** Metadati di presentazione per ciascun test, mostrati nella Home. */
export interface TestMeta {
  id: TestId;
  title: string;
  domain: string;
}

export const TEST_CATALOG: readonly TestMeta[] = [
  { id: 'stroop1', title: 'Stroop 1 — Focus Parola', domain: 'Velocità di elaborazione' },
  { id: 'stroop2', title: 'Stroop 2 — Focus Colore', domain: 'Risoluzione del conflitto' },
  { id: 'gonogo', title: 'Go / No-Go', domain: 'Inibizione motoria rapida' },
  { id: 'corsi', title: 'Corsi Block Task', domain: 'Memoria visuo-spaziale' },
  { id: 'nback', title: 'N-Back (2-back)', domain: 'Memoria di lavoro' },
  { id: 'wcst', title: 'Wisconsin Card Sorting Test', domain: 'Flessibilità cognitiva' },
  { id: 'pvt', title: 'PVT — Vigilanza Psicomotoria', domain: 'Attenzione sostenuta' },
  { id: 'flanker', title: 'Flanker — Frecce di Eriksen', domain: 'Attenzione selettiva' },
  { id: 'sart', title: 'SART — Attenzione sostenuta alla risposta', domain: 'Controllo attentivo' },
];
