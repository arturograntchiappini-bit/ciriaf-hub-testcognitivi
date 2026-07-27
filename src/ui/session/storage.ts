/**
 * Persistenza dei modelli di sessione e del run in corso (localStorage), più
 * import/export del protocollo come JSON.
 * @see docs/superpowers/specs/2026-07-07-feature-sessione-design.md
 */
import type { SessionTemplate, SessionRun } from '../../engine/session/model';

const TEMPLATES_KEY = 'ciriaf-cth-session-templates-v1';
const RUN_KEY = 'ciriaf-cth-session-run-v1';

// ---- Modelli (template) ----

/** Carica tutti i modelli salvati (array vuoto se assenti o corrotti). */
export function loadTemplates(): SessionTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SessionTemplate[]) : [];
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

/** Valida e deserializza un modello importato; lancia se la struttura non è valida. */
export function importTemplateJson(text: string): SessionTemplate {
  const parsed = JSON.parse(text) as Partial<SessionTemplate>;
  if (
    !parsed ||
    typeof parsed.name !== 'string' ||
    !Array.isArray(parsed.phases)
  ) {
    throw new Error('File di protocollo non valido: mancano "name" o "phases".');
  }
  return {
    id: typeof parsed.id === 'string' ? parsed.id : `imp_${Math.floor(Math.random() * 1e9).toString(36)}`,
    name: parsed.name,
    createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
    phases: parsed.phases,
  };
}

// ---- Run in corso ----

/** Carica il run in corso, oppure null. */
export function loadRun(): SessionRun | null {
  try {
    const raw = localStorage.getItem(RUN_KEY);
    return raw ? (JSON.parse(raw) as SessionRun) : null;
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
