/**
 * Costruttore di sessione: prima la durata totale, poi le fasi (con durata) e i
 * pin "t" al loro interno, con anteprima su linea temporale. Salva come modello.
 * @see docs/superpowers/specs/2026-07-07-feature-sessione-design.md
 */
import { useRef, useState } from 'react';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { BatteryEditor } from './BatteryEditor';
import { SessionTimeline } from './SessionTimeline';
import { exportTemplateJson, importTemplateJson } from './storage';
import { triggerDownload } from '../download';
import {
  makeLocalId,
  phaseSpans,
  type SessionTemplate,
  type SessionPhase,
  type BatteryItem,
} from '../../engine/session/model';

interface SessionBuilderProps {
  initial: SessionTemplate | null;
  onSave: (template: SessionTemplate) => void;
  onBack: () => void;
}

const DEFAULT_TOTAL_MS = 30 * 60_000;

function emptyTemplate(): SessionTemplate {
  return {
    id: makeLocalId('tpl'),
    name: '',
    createdAt: new Date().toISOString(),
    totalMs: DEFAULT_TOTAL_MS,
    phases: [{ id: makeLocalId('ph'), name: 'Fase 1', durationMs: DEFAULT_TOTAL_MS, pins: [] }],
  };
}

function msToMinSec(ms: number): { min: number; sec: number } {
  const total = Math.max(0, Math.round(ms / 1000));
  return { min: Math.floor(total / 60), sec: total % 60 };
}

/** Errore di validazione, o null se il protocollo è valido. */
export function validateTemplate(t: SessionTemplate): string | null {
  if (!t.name.trim()) return 'Assegna un nome alla sessione.';
  if (t.totalMs <= 0) return 'Imposta una durata totale maggiore di zero.';
  if (t.phases.length === 0) return 'Aggiungi almeno una fase.';
  for (const p of t.phases) {
    if (p.durationMs <= 0) return `La fase "${p.name}" deve avere una durata maggiore di zero.`;
  }
  const allocated = t.phases.reduce((acc, p) => acc + p.durationMs, 0);
  if (allocated > t.totalMs) return 'La somma delle durate delle fasi supera la durata totale.';
  const pins = t.phases.flatMap((p) => p.pins);
  if (pins.length === 0) return 'Aggiungi almeno un pin "t".';
  const spans = phaseSpans(t);
  for (const s of spans) {
    for (const pin of s.phase.pins) {
      if (pin.offsetMs < s.startMs || pin.offsetMs > s.endMs) {
        return `Un pin della fase "${s.phase.name}" cade fuori dal suo intervallo temporale.`;
      }
      if (pin.battery.length === 0) return 'Ogni pin deve avere almeno un test nella batteria.';
    }
  }
  return null;
}

export function SessionBuilder({ initial, onSave, onBack }: SessionBuilderProps): JSX.Element {
  const [draft, setDraft] = useState<SessionTemplate>(() =>
    initial ? (JSON.parse(JSON.stringify(initial)) as SessionTemplate) : emptyTemplate(),
  );
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function update(mut: (d: SessionTemplate) => void): void {
    setDraft((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as SessionTemplate;
      mut(next);
      return next;
    });
  }

  const spans = phaseSpans(draft);
  const allocated = draft.phases.reduce((acc, p) => acc + p.durationMs, 0);
  const totalMinSec = msToMinSec(draft.totalMs);

  // --- durata totale ---
  const setTotal = (min: number, sec: number): void =>
    update((d) => void (d.totalMs = (min * 60 + sec) * 1000));

  // --- fasi ---
  const addPhase = (): void =>
    update((d) => {
      const remaining = Math.max(0, d.totalMs - d.phases.reduce((a, p) => a + p.durationMs, 0));
      d.phases.push({ id: makeLocalId('ph'), name: `Fase ${d.phases.length + 1}`, durationMs: remaining, pins: [] });
    });
  const removePhase = (pi: number): void => update((d) => d.phases.splice(pi, 1));
  const renamePhase = (pi: number, name: string): void =>
    update((d) => void ((d.phases[pi] as SessionPhase).name = name));
  const setPhaseDuration = (pi: number, min: number, sec: number): void =>
    update((d) => void ((d.phases[pi] as SessionPhase).durationMs = (min * 60 + sec) * 1000));
  const movePhase = (pi: number, dir: -1 | 1): void =>
    update((d) => {
      const j = pi + dir;
      if (j < 0 || j >= d.phases.length) return;
      const tmp = d.phases[pi] as SessionPhase;
      d.phases[pi] = d.phases[j] as SessionPhase;
      d.phases[j] = tmp;
    });

  // --- pin ---
  const addPin = (pi: number): void =>
    update((d) => {
      const s = phaseSpans(d)[pi];
      (d.phases[pi] as SessionPhase).pins.push({
        id: makeLocalId('pin'),
        offsetMs: s ? s.startMs : 0,
        battery: [],
      });
    });
  const removePin = (pi: number, ti: number): void =>
    update((d) => (d.phases[pi] as SessionPhase).pins.splice(ti, 1));
  const setPinOffset = (pi: number, ti: number, min: number, sec: number): void =>
    update((d) => {
      const s = phaseSpans(d)[pi];
      const raw = (min * 60 + sec) * 1000;
      const clamped = s ? Math.max(s.startMs, Math.min(s.endMs, raw)) : raw;
      (d.phases[pi] as SessionPhase).pins[ti]!.offsetMs = clamped;
    });
  const setPinBattery = (pi: number, ti: number, battery: BatteryItem[]): void =>
    update((d) => void ((d.phases[pi] as SessionPhase).pins[ti]!.battery = battery));

  function doExport(): void {
    triggerDownload(`protocollo_${draft.name || 'senza-nome'}.json`, exportTemplateJson(draft), 'application/json');
  }
  function onImportFile(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        setDraft(importTemplateJson(String(reader.result)));
        setImportError(null);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Import non riuscito.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const error = validateTemplate(draft);
  const fmtMs = (ms: number): string => {
    const t = Math.round(ms / 1000);
    return `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-full bg-paper">
      <Header />
      <main className="mx-auto max-w-content px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Costruttore sessione</h1>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={doExport}>Esporta JSON</Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>Importa JSON</Button>
            <input ref={fileRef} type="file" accept="application/json" onChange={onImportFile} className="hidden" />
          </div>
        </div>
        {importError && <p className="mt-3 text-sm text-[#D0021B]">{importError}</p>}

        {/* 1. Nome + durata totale */}
        <div className="mt-6 flex flex-wrap items-end gap-6">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-ink">Nome della sessione</span>
            <input
              value={draft.name}
              onChange={(e) => update((d) => void (d.name = e.target.value))}
              placeholder="es. Protocollo affaticamento cognitivo"
              className="w-80 rounded-card border border-line px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            />
          </label>
          <label className="flex items-end gap-1 text-sm text-ink">
            <span className="mb-2">Durata totale</span>
            <input type="number" min={0} value={totalMinSec.min} onChange={(e) => setTotal(Number(e.target.value) || 0, totalMinSec.sec)} className="w-16 rounded-card border border-line px-2 py-1 focus:border-accent focus:outline-none" />
            <span className="mb-2">min</span>
            <input type="number" min={0} max={59} value={totalMinSec.sec} onChange={(e) => setTotal(totalMinSec.min, Number(e.target.value) || 0)} className="w-16 rounded-card border border-line px-2 py-1 focus:border-accent focus:outline-none" />
            <span className="mb-2">sec</span>
          </label>
          <span className={`mb-2 text-xs ${allocated > draft.totalMs ? 'text-[#D0021B]' : 'text-muted'}`}>
            Allocato nelle fasi: {fmtMs(allocated)} / {fmtMs(draft.totalMs)}
          </span>
        </div>

        {/* 2. Timeline */}
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Linea temporale</p>
          <SessionTimeline template={draft} />
        </div>

        {/* 3. Fasi e pin */}
        <div className="mt-8 space-y-5">
          {draft.phases.map((phase, pi) => {
            const span = spans[pi];
            const dur = msToMinSec(phase.durationMs);
            return (
              <section key={phase.id} className="rounded-card border border-line p-5">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <input
                    value={phase.name}
                    onChange={(e) => renamePhase(pi, e.target.value)}
                    className="min-w-40 flex-1 rounded-card border border-line px-3 py-2 text-sm font-semibold text-ink focus:border-accent focus:outline-none"
                  />
                  <span className="flex items-center gap-1 text-sm text-ink">
                    durata
                    <input type="number" min={0} value={dur.min} onChange={(e) => setPhaseDuration(pi, Number(e.target.value) || 0, dur.sec)} className="w-14 rounded-card border border-line px-2 py-1 focus:border-accent focus:outline-none" />
                    m
                    <input type="number" min={0} max={59} value={dur.sec} onChange={(e) => setPhaseDuration(pi, dur.min, Number(e.target.value) || 0)} className="w-14 rounded-card border border-line px-2 py-1 focus:border-accent focus:outline-none" />
                    s
                  </span>
                  {span && <span className="text-xs text-muted">({fmtMs(span.startMs)}–{fmtMs(span.endMs)})</span>}
                  <span className="ml-auto flex gap-1">
                    <button onClick={() => movePhase(pi, -1)} aria-label="Su" className="rounded border border-line px-2 py-1 text-xs text-muted hover:border-accent">↑</button>
                    <button onClick={() => movePhase(pi, 1)} aria-label="Giù" className="rounded border border-line px-2 py-1 text-xs text-muted hover:border-accent">↓</button>
                    <button onClick={() => removePhase(pi)} className="rounded border border-line px-2 py-1 text-xs text-[#D0021B] hover:border-[#D0021B]">Elimina</button>
                  </span>
                </div>

                <div className="space-y-4">
                  {phase.pins.map((pin, ti) => {
                    const { min, sec } = msToMinSec(pin.offsetMs);
                    return (
                      <div key={pin.id} className="rounded-card border border-line bg-accent-soft/40 p-4">
                        <div className="mb-3 flex flex-wrap items-center gap-3">
                          <span className="text-sm font-medium text-ink">Pin "t"</span>
                          <label className="flex items-center gap-1 text-sm text-ink">
                            a
                            <input type="number" min={0} value={min} onChange={(e) => setPinOffset(pi, ti, Number(e.target.value) || 0, sec)} className="w-16 rounded-card border border-line px-2 py-1 focus:border-accent focus:outline-none" />
                            min
                            <input type="number" min={0} max={59} value={sec} onChange={(e) => setPinOffset(pi, ti, min, Number(e.target.value) || 0)} className="w-16 rounded-card border border-line px-2 py-1 focus:border-accent focus:outline-none" />
                            sec dall'inizio
                          </label>
                          <button onClick={() => removePin(pi, ti)} className="ml-auto rounded border border-line px-2 py-1 text-xs text-[#D0021B] hover:border-[#D0021B]">Rimuovi pin</button>
                        </div>
                        <BatteryEditor battery={pin.battery} onChange={(b) => setPinBattery(pi, ti, b)} />
                      </div>
                    );
                  })}
                  <Button variant="secondary" onClick={() => addPin(pi)}>+ Aggiungi pin "t"</Button>
                </div>
              </section>
            );
          })}
          <Button variant="secondary" onClick={addPhase}>+ Aggiungi fase</Button>
        </div>

        <div className="mt-8 flex items-center gap-3">
          <Button onClick={() => onSave(draft)} disabled={error !== null}>Salva modello</Button>
          <Button variant="ghost" onClick={onBack}>Annulla</Button>
          {error && <span className="text-sm text-muted">{error}</span>}
        </div>
      </main>
    </div>
  );
}
