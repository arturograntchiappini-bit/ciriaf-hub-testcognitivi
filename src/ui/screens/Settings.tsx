/**
 * Pannello Impostazioni: una sezione per test, ogni parametro editabile con
 * valore corrente, default e unità. Persistenza in localStorage.
 * @see docs/architettura.md — sezione "Impostazioni"
 */
import { useState } from 'react';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { PageHeading } from '../components/PageHeading';
import { DEFAULTS, type AllParams } from '../../config/defaults';
import { PARAM_SECTIONS } from '../params/paramFields';
import type { Preferences } from '../preferences';

interface SettingsProps {
  settings: AllParams;
  prefs: Preferences;
  onSave: (next: AllParams, nextPrefs: Preferences) => void;
  onBack: () => void;
}

const FIELD_CLASS =
  'w-full border border-line px-3 py-2.5 text-sm tabular-nums focus:border-accent focus:outline-none';

export function Settings({ settings, prefs, onSave, onBack }: SettingsProps): JSX.Element {
  const [draft, setDraft] = useState<AllParams>(() => JSON.parse(JSON.stringify(settings)) as AllParams);
  const [draftPrefs, setDraftPrefs] = useState<Preferences>(() => ({ ...prefs }));

  function setField(testKey: keyof AllParams, field: string, value: number): void {
    setDraft((prev) => ({
      ...prev,
      [testKey]: { ...(prev[testKey] as object), [field]: value },
    }));
  }

  function resetTest(testKey: keyof AllParams): void {
    setDraft((prev) => ({ ...prev, [testKey]: JSON.parse(JSON.stringify(DEFAULTS[testKey])) }));
  }

  function resetAll(): void {
    setDraft(JSON.parse(JSON.stringify(DEFAULTS)) as AllParams);
  }

  return (
    <div className="min-h-full bg-paper">
      <Header />
      <main className="mx-auto max-w-content px-6 py-12">
        <PageHeading
          eyebrow="Parametri"
          title="Impostazioni"
          actions={
            <Button variant="secondary" onClick={resetAll}>
              Ripristina tutti i default
            </Button>
          }
        >
          I valori qui impostati vengono usati nelle sessioni e salvati anche dentro ogni file esportato, così i
          risultati restano interpretabili nel tempo.
        </PageHeading>

        {/* Preferenze di presentazione (non scientifiche) */}
        <section className="panel mt-10 p-6">
          <h2 className="eyebrow text-accent-glow">Presentazione</h2>
          <label className="mt-4 flex items-start gap-3">
            <input
              type="checkbox"
              checked={draftPrefs.feedbackDuringTest}
              onChange={(e) => setDraftPrefs((p) => ({ ...p, feedbackDuringTest: e.target.checked }))}
              className="mt-1 h-4 w-4"
            />
            <span>
              <span className="block text-sm text-ink">Mostra «Corretto / Errato» durante i test a tempo di reazione</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted">
                Stroop, Go/No-Go e N-Back mostrano un breve feedback dopo ogni risposta (come in pratica). Corsi e WCST lo
                mostrano sempre. Disattivato di default: il feedback può influenzare i tempi di risposta.
              </span>
            </span>
          </label>
        </section>

        <div className="mt-6 space-y-6">
          {PARAM_SECTIONS.map((section) => {
            const testParams = draft[section.testKey] as unknown as Record<string, number>;
            const defaults = DEFAULTS[section.testKey] as unknown as Record<string, number>;
            return (
              <section key={section.testKey} className="panel p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-ink">{section.title}</h2>
                  <Button variant="ghost" onClick={() => resetTest(section.testKey)}>
                    Default
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                  {section.fields.map((f) => (
                    <label key={f.key} className="flex flex-col gap-1.5">
                      <span className="text-sm text-ink">
                        {f.label}
                        {f.unit ? <span className="text-muted"> ({f.unit})</span> : ''}
                      </span>
                      <input
                        type="number"
                        value={testParams[f.key]}
                        min={f.min}
                        max={f.max}
                        step={f.step ?? 1}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (Number.isFinite(v)) {
                            setField(section.testKey, f.key, Math.min(f.max, Math.max(f.min, v)));
                          }
                        }}
                        className={FIELD_CLASS}
                      />
                      <span className="font-mono text-[11px] text-muted">default {defaults[f.key]}</span>
                    </label>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-10 flex items-center gap-3">
          <Button onClick={() => onSave(draft, draftPrefs)}>Salva</Button>
          <Button variant="ghost" onClick={onBack}>
            Annulla
          </Button>
        </div>
      </main>
    </div>
  );
}
