/**
 * Pannello Impostazioni: una sezione per test, ogni parametro editabile con
 * valore corrente, default e unità. Persistenza in localStorage.
 * @see docs/architettura.md — sezione "Impostazioni"
 */
import { useState } from 'react';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { DEFAULTS, type AllParams } from '../../config/defaults';

interface FieldDesc {
  key: string;
  label: string;
  unit?: string;
  min: number;
  max: number;
  step?: number;
}

interface SectionDesc {
  testKey: keyof AllParams;
  title: string;
  fields: FieldDesc[];
}

const SECTIONS: SectionDesc[] = [
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
];

interface SettingsProps {
  settings: AllParams;
  onSave: (next: AllParams) => void;
  onBack: () => void;
}

export function Settings({ settings, onSave, onBack }: SettingsProps): JSX.Element {
  const [draft, setDraft] = useState<AllParams>(() => JSON.parse(JSON.stringify(settings)) as AllParams);

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
      <main className="mx-auto max-w-content px-6 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Impostazioni</h1>
          <Button variant="ghost" onClick={resetAll}>
            Ripristina tutti i default
          </Button>
        </div>
        <p className="mt-2 text-muted">
          I valori qui impostati vengono usati nelle sessioni e salvati anche dentro ogni file
          esportato, così i risultati restano interpretabili nel tempo.
        </p>

        <div className="mt-8 space-y-6">
          {SECTIONS.map((section) => {
            const testParams = draft[section.testKey] as unknown as Record<string, number>;
            const defaults = DEFAULTS[section.testKey] as unknown as Record<string, number>;
            return (
              <section key={section.testKey} className="rounded-card border border-line p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-ink">{section.title}</h2>
                  <Button variant="ghost" onClick={() => resetTest(section.testKey)}>
                    Default
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {section.fields.map((f) => (
                    <label key={f.key} className="flex flex-col gap-1">
                      <span className="text-sm text-ink">
                        {f.label}
                        {f.unit ? ` (${f.unit})` : ''}
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
                        className="rounded-card border border-line px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                      />
                      <span className="text-xs text-muted">default: {defaults[f.key]}</span>
                    </label>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-8 flex items-center gap-3">
          <Button onClick={() => onSave(draft)}>Salva</Button>
          <Button variant="ghost" onClick={onBack}>
            Annulla
          </Button>
        </div>
      </main>
    </div>
  );
}
