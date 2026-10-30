/**
 * Persistenza dei modelli di sessione e del run in corso (localStorage), più
 * import/export del protocollo come JSON.
 * @see docs/superpowers/specs/2026-07-07-feature-sessione-design.md
 */
import type { SessionTemplate, SessionRun, SessionPhase, TimePin, BatteryItem, SessionTestResult } from '../../engine/session/model';
import { isTestKey, sanitizeParams } from '../params/sanitize';

const TEMPLATES_KEY = 'ciriaf-cth-session-templates-v1';
const RUN_KEY = 'ciriaf-cth-session-run-v1';


// ---- Validazione di dati non fidati (localStorage manomesso, file importati) ----

/** Limiti strutturali: un protocollo reale sta ampiamente sotto, un file ostile no. */
export const MAX_IMPORT_BYTES = 1_000_000;
const MAX_PHASES = 50;
const MAX_PINS_PER_PHASE = 100;
const MAX_BATTERY = 50;
const MAX_TEXT = 200;
const MAX_MS = 7 * 24 * 3600 * 1000;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown, fallback: string): string => (typeof v === 'string' ? v.slice(0, MAX_TEXT) : fallback);
const boundedMs = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(MAX_MS, Math.max(0, v)) : 0);

function parseBatteryItem(raw: unknown): BatteryItem | null {
  if (!isRecord(raw) || !isTestKey(raw.testId)) return null;
  return { testId: raw.testId, params: sanitizeParams(raw.testId, raw.params) as unknown as Record<string, unknown>, practice: raw.practice === true };
}

function parsePin(raw: unknown, index: number): TimePin | null {
  if (!isRecord(raw)) return null;
  const battery = (Array.isArray(raw.battery) ? raw.battery : []).slice(0, MAX_BATTERY).map(parseBatteryItem);
  const pin: TimePin = { id: text(raw.id, `pin_${index}`), offsetMs: boundedMs(raw.offsetMs), battery: battery.filter((b): b is BatteryItem => b !== null) };
  if (typeof raw.label === 'string') pin.label = raw.label.slice(0, MAX_TEXT);
  return pin;
}

function parsePhase(raw: unknown, index: number): SessionPhase | null {
  if (!isRecord(raw)) return null;
  const pins = (Array.isArray(raw.pins) ? raw.pins : []).slice(0, MAX_PINS_PER_PHASE).map(parsePin);
  return { id: text(raw.id, `fase_${index}`), name: text(raw.name, ''), durationMs: boundedMs(raw.durationMs), pins: pins.filter((p): p is TimePin => p !== null) };
}

/** Ricostruisce un modello da dati non fidati scartando tutto ciò che non è nello schema; null se non è un modello. */
function parseTemplate(raw: unknown): SessionTemplate | null {
  if (!isRecord(raw) || typeof raw.name !== 'string' || !Array.isArray(raw.phases)) return null;
  const phases = raw.phases.slice(0, MAX_PHASES).map(parsePhase).filter((p): p is SessionPhase => p !== null);
  const sumPhases = phases.reduce((acc, p) => acc + p.durationMs, 0);
  const totalMs = boundedMs(raw.totalMs);
  return {
    id: text(raw.id, `imp_${Math.floor(Math.random() * 1e9).toString(36)}`),
    name: raw.name.slice(0, MAX_TEXT),
    createdAt: typeof raw.createdAt === 'string' && !Number.isNaN(Date.parse(raw.createdAt)) ? raw.createdAt : new Date().toISOString(),
    totalMs: totalMs > 0 ? totalMs : sumPhases,
    phases,
  };
}

function parseTestResult(raw: unknown): SessionTestResult | null {
  if (!isRecord(raw) || !isRecord(raw.result)) return null;
  const r = raw.result;
  if (!isTestKey(r.testId) || typeof r.sessionId !== 'string' || typeof r.startedAt !== 'string') return null;
  if (!Array.isArray(r.trials) || !Array.isArray(r.summary) || !isRecord(r.params)) return null;
  return raw as unknown as SessionTestResult;
}

function parseRun(raw: unknown): SessionRun | null {
  if (!isRecord(raw)) return null;
  const template = parseTemplate(raw.template);
  const epoch = raw.startedAtEpoch;
  if (!template || typeof raw.runId !== 'string' || typeof epoch !== 'number' || !Number.isFinite(epoch)) return null;
  if (typeof raw.startedAtIso !== 'string' || Number.isNaN(Date.parse(raw.startedAtIso))) return null;
  const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  const results = (Array.isArray(raw.results) ? raw.results : []).map(parseTestResult).filter((r): r is SessionTestResult => r !== null);
  return { runId: raw.runId, template, startedAtEpoch: epoch, startedAtIso: raw.startedAtIso, completedPinIds: strings(raw.completedPinIds), results, finished: raw.finished === true };
}

// ---- Modelli (template) ----

/** Carica tutti i modelli salvati (array vuoto se assenti o corrotti). */
export function loadTemplates(): SessionTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseTemplate).filter((t): t is SessionTemplate => t !== null);
  } catch {
    return [];
  }
}

/** Inserisce o aggiorna un modello (per id). */
export function saveTemplate(template: SessionTemplate): void {
  const all = loadTemplates();
  const idx = all.findIndex((t) => t.id === template.id);
  if (idx >= 0) all[idx] = template;
  else all.push(template);
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(all));
}

/** Elimina un modello per id. */
export function deleteTemplate(id: string): void {
  const all = loadTemplates().filter((t) => t.id !== id);
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(all));
}

/** Serializza un modello per l'export su file. */
export function exportTemplateJson(template: SessionTemplate): string {
  return JSON.stringify(template, null, 2);
}

/** Valida e deserializza un modello importato (file non fidato); lancia se la struttura non è valida. */
export function importTemplateJson(textInput: string): SessionTemplate {
  if (textInput.length > MAX_IMPORT_BYTES) throw new Error('File di protocollo troppo grande.');
  const template = parseTemplate(JSON.parse(textInput));
  if (!template) throw new Error('File di protocollo non valido: mancano "name" o "phases".');
  return template;
}

// ---- Run in corso ----

/** Carica il run in corso, oppure null. */
export function loadRun(): SessionRun | null {
  try {
    const raw = localStorage.getItem(RUN_KEY);
    return raw ? parseRun(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** Salva/aggiorna il run in corso. */
export function saveRun(run: SessionRun): void {
  localStorage.setItem(RUN_KEY, JSON.stringify(run));
}

/** Rimuove il run in corso. */
export function clearRun(): void {
  localStorage.removeItem(RUN_KEY);
}
