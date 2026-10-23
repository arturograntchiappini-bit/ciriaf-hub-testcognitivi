/**
 * Costruttore di sessione (flusso Ibrido): durata totale → fasi (con durata e
 * distribuzione automatica) → pin "t" collocati per offset RELATIVO alla fase e
 * trascinabili sulla linea temporale. Salva come modello riutilizzabile.
 * @see docs/superpowers/specs/2026-07-07-feature-sessione-design.md
 */
import { useRef, useState } from 'react';
import { Header } from '../components/Header';
import { PageHeading } from '../components/PageHeading';
import { Button } from '../components/Button';
import { BatteryEditor } from './BatteryEditor';
import { SessionTimeline } from './SessionTimeline';
import { DurationInput } from './DurationInput';
import { exportTemplateJson, importTemplateJson } from './storage';
import { triggerDownload } from '../download';
import { TEST_CATALOG } from '../router';
import {
  makeLocalId,
  phaseSpans,
  phaseIndexAtOffset,
  movePinById,
  distributePhasesEvenly,
  type SessionTemplate,
  type SessionPhase,
  type BatteryItem,
  type TimePin,
} from '../../engine/session/model';
import type { TestId } from '../../engine/types';

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

function fmtMs(ms: number): string {
  const t = Math.round(ms / 1000);
  return `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, '0')}`;
}

function testTitle(testId: TestId): string {
  return TEST_CATALOG.find((t) => t.id === testId)?.title ?? testId;
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
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
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
  const overAllocated = allocated > draft.totalMs;

  // --- durata totale ---
  const setTotalMs = (ms: number): void => update((d) => void (d.totalMs = ms));

  // --- fasi ---
  const addPhase = (): void =>
    update((d) => {
      const remaining = Math.max(0, d.totalMs - d.phases.reduce((a, p) => a + p.durationMs, 0));
      d.phases.push({ id: makeLocalId('ph'), name: `Fase ${d.phases.length + 1}`, durationMs: remaining, pins: [] });
    });
  const removePhase = (pi: number): void => update((d) => d.phases.splice(pi, 1));
  const renamePhase = (pi: number, name: string): void =>
    update((d) => void ((d.phases[pi] as SessionPhase).name = name));
  const setPhaseDurationMs = (pi: number, ms: number): void =>
    update((d) => void ((d.phases[pi] as SessionPhase).durationMs = ms));
  const movePhase = (pi: number, dir: -1 | 1): void =>
    update((d) => {
      const j = pi + dir;
      if (j < 0 || j >= d.phases.length) return;
      const tmp = d.phases[pi] as SessionPhase;
      d.phases[pi] = d.phases[j] as SessionPhase;
      d.phases[j] = tmp;
    });
  const distributeEvenly = (): void => setDraft((prev) => distributePhasesEvenly(prev));

  // --- pin ---
  const addPin = (pi: number): void =>
    update((d) => {
      const s = phaseSpans(d)[pi];
      const pin: TimePin = { id: makeLocalId('pin'), offsetMs: s ? s.startMs : 0, battery: [] };
      (d.phases[pi] as SessionPhase).pins.push(pin);
      queueMicrotask(() => setSelectedPinId(pin.id));
    });
  /** Crea un pin all'offset assoluto indicato dalla timeline, nella fase che lo contiene. */
  const addPinAt = (offsetMs: number): void =>
    update((d) => {
      const pi = phaseIndexAtOffset(d, offsetMs);
      if (pi < 0) return;
      const pin: TimePin = { id: makeLocalId('pin'), offsetMs, battery: [] };
      (d.phases[pi] as SessionPhase).pins.push(pin);
      queueMicrotask(() => setSelectedPinId(pin.id));
    });
  const removePin = (pi: number, ti: number): void =>
    update((d) => (d.phases[pi] as SessionPhase).pins.splice(ti, 1));
  /** Offset del pin RELATIVO all'inizio della fase (niente aritmetica per l'operatore). */
  const setPinOffsetRelMs = (pi: number, ti: number, relMs: number): void =>
    update((d) => {
      const s = phaseSpans(d)[pi];
      if (!s) return;
      const clamped = Math.max(s.startMs, Math.min(s.endMs, s.startMs + relMs));
      (d.phases[pi] as SessionPhase).pins[ti]!.offsetMs = clamped;
    });
  const setPinBattery = (pi: number, ti: number, battery: BatteryItem[]): void =>
    update((d) => void ((d.phases[pi] as SessionPhase).pins[ti]!.battery = battery));
  /** Trascinamento dal componente timeline (per id stabile): può cambiare fase. */
  const onMovePinFromTimeline = (pinId: string, offsetMs: number): void =>
    setDraft((prev) => movePinById(prev, pinId, offsetMs));

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

  return (
    <div className="min-h-full bg-paper">
      <Header />
      <main className="mx-auto max-w-content px-6 py-12">
        <PageHeading
          eyebrow="Modalità Sessione"
          title="Costruttore sessione"
          actions={
            <>
              <Button variant="secondary" onClick={doExport}>Esporta JSON</Button>
              <Button variant="secondary" onClick={() => fileRef.current?.click()}>Importa JSON</Button>
              <input ref={fileRef} type="file" accept="application/json" onChange={onImportFile} className="hidden" />
            </>
          }
        />
        {importError && <p className="mt-3 text-sm text-danger">{importError}</p>}

        {/* 1. Nome + durata totale */}
        <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-3">
          <label className="flex flex-col gap-1">
            <span className="eyebrow">Nome della sessione</span>
            <input
              value={draft.name}
              onChange={(e) => update((d) => void (d.name = e.target.value))}
              placeholder="es. Protocollo affaticamento cognitivo"
              className="w-80 rounded-card border border-line px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            />
          </label>
          <div className="flex flex-col gap-1">
            <span className="eyebrow">Durata totale</span>
            <DurationInput valueMs={draft.totalMs} onChange={setTotalMs} ariaPrefix="Durata totale" />
          </div>
        </div>

        {/* 2. Timeline interattiva */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="eyebrow text-accent-glow">Linea temporale</p>
            <span className={`text-xs ${overAllocated ? 'text-danger' : 'text-muted'}`}>
              Fasi allocate: {fmtMs(allocated)} / {fmtMs(draft.totalMs)}
            </span>
          </div>
          <SessionTimeline
            template={draft}
            editable
            selectedPinId={selectedPinId}
            onSelectPin={(pi, ti) => setSelectedPinId(draft.phases[pi]?.pins[ti]?.id ?? null)}
            onMovePin={onMovePinFromTimeline}
            onAddPinAt={addPinAt}
          />
        </div>

        {/* 3. Fasi */}
        <div className="mt-8 flex items-center justify-between">
          <p className="eyebrow text-accent-glow">Fasi e pin</p>
          <button onClick={distributeEvenly} className="text-xs text-accent hover:underline">
            Riparti durate equamente
          </button>
        </div>

        <div className="mt-3 space-y-4">
          {draft.phases.map((phase, pi) => {
            const span = spans[pi];
            const sortedPins = phase.pins
              .map((pin, ti) => ({ pin, ti }))
              .sort((a, b) => a.pin.offsetMs - b.pin.offsetMs);
            return (
              <section key={phase.id} className="rounded-card border border-line">
                {/* Header fase compatto */}
                <div className="flex flex-wrap items-center gap-2 border-b border-line bg-accent-soft/50 px-4 py-2.5">
                  <span className="text-xs text-muted">{pi + 1}.</span>
                  <input
                    value={phase.name}
                    onChange={(e) => renamePhase(pi, e.target.value)}
                    className="min-w-32 flex-1 rounded border border-line px-2 py-1 text-sm font-semibold text-ink focus:border-accent focus:outline-none"
                  />
                  <DurationInput valueMs={phase.durationMs} onChange={(ms) => setPhaseDurationMs(pi, ms)} compact ariaPrefix={`Durata ${phase.name}`} />
                  {span && <span className="text-[11px] text-muted">{fmtMs(span.startMs)}–{fmtMs(span.endMs)}</span>}
                  <span className="ml-auto flex gap-1">
                    <button onClick={() => movePhase(pi, -1)} aria-label="Su" className="rounded border border-line px-1.5 py-0.5 text-xs text-muted hover:border-accent">↑</button>
                    <button onClick={() => movePhase(pi, 1)} aria-label="Giù" className="rounded border border-line px-1.5 py-0.5 text-xs text-muted hover:border-accent">↓</button>
                    <button onClick={() => removePhase(pi)} aria-label="Elimina fase" className="rounded border border-line px-1.5 py-0.5 text-xs text-danger hover:border-danger">✕</button>
                  </span>
                </div>

                {/* Pin della fase */}
                <div className="space-y-2 px-4 py-3">
                  {sortedPins.length === 0 && (
                    <p className="text-xs text-muted">Nessun pin: clicca sulla timeline o «+ pin».</p>
                  )}
                  {sortedPins.map(({ pin, ti }) => {
                    const relMs = pin.offsetMs - (span ? span.startMs : 0);
                    const open = selectedPinId === pin.id;
                    return (
                      <div
                        key={pin.id}
                        className={`rounded-card border ${open ? 'border-accent bg-accent-soft/40' : 'border-line'}`}
                      >
                        {/* Riga compatta del pin */}
                        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                          <button
                            onClick={() => setSelectedPinId(open ? null : pin.id)}
                            className="flex items-center gap-1.5 text-sm font-medium text-ink"
                            aria-expanded={open}
                          >
                            <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>▸</span>
                            pin t = {fmtMs(pin.offsetMs)}
                          </button>
                          <span className="flex items-center gap-1 text-xs text-muted">
                            a
                            <DurationInput valueMs={relMs} onChange={(ms) => setPinOffsetRelMs(pi, ti, ms)} compact ariaPrefix="Offset pin nella fase" />
                            nella fase
                          </span>
                          {/* Riepilogo batteria */}
                          <span className="flex flex-wrap items-center gap-1">
                            {pin.battery.length === 0 ? (
                              <span className="text-[11px] text-danger">batteria vuota</span>
                            ) : (
                              pin.battery.map((b, k) => (
                                <span key={k} className="rounded-sm bg-elevated px-2 py-0.5 text-[11px] text-ink">
                                  {testTitle(b.testId)}
                                </span>
                              ))
                            )}
                          </span>
                          <button onClick={() => removePin(pi, ti)} aria-label="Rimuovi pin" className="ml-auto rounded border border-line px-1.5 py-0.5 text-xs text-danger hover:border-danger">✕</button>
                        </div>
                        {/* Editor batteria (espanso) */}
                        {open && (
                          <div className="border-t border-line px-3 py-3">
                            <BatteryEditor battery={pin.battery} onChange={(b) => setPinBattery(pi, ti, b)} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <button onClick={() => addPin(pi)} className="text-xs text-accent hover:underline">
                    + pin "t" in questa fase
                  </button>
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
