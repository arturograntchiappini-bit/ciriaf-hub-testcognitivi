/**
 * Editor della batteria di un pin: selezione dei test in ordine, con impostazioni
 * congelate per quella "t" e toggle pratica.
 * @see docs/superpowers/specs/2026-07-07-feature-sessione-design.md
 */
import { useState } from 'react';
import { DEFAULTS } from '../../config/defaults';
import { paramSectionFor } from '../params/paramFields';
import { TEST_CATALOG } from '../router';
import type { BatteryItem } from '../../engine/session/model';
import type { TestId } from '../../engine/types';

interface BatteryEditorProps {
  battery: BatteryItem[];
  onChange: (battery: BatteryItem[]) => void;
}

function defaultParamsFor(testId: TestId): Record<string, unknown> {
  return JSON.parse(JSON.stringify(DEFAULTS[testId])) as Record<string, unknown>;
}

function testTitle(testId: TestId): string {
  return TEST_CATALOG.find((t) => t.id === testId)?.title ?? testId;
}

export function BatteryEditor({ battery, onChange }: BatteryEditorProps): JSX.Element {
  const [expanded, setExpanded] = useState<number | null>(null);

  function addTest(testId: TestId): void {
    onChange([...battery, { testId, params: defaultParamsFor(testId), practice: false }]);
  }
  function removeAt(i: number): void {
    onChange(battery.filter((_, idx) => idx !== i));
  }
  function move(i: number, dir: -1 | 1): void {
    const j = i + dir;
    if (j < 0 || j >= battery.length) return;
    const next = battery.slice();
    const a = next[i] as BatteryItem;
    const b = next[j] as BatteryItem;
    next[i] = b;
    next[j] = a;
    onChange(next);
  }
  function setPractice(i: number, practice: boolean): void {
    onChange(battery.map((item, idx) => (idx === i ? { ...item, practice } : item)));
  }
  function setParam(i: number, key: string, value: number): void {
    onChange(
      battery.map((item, idx) =>
        idx === i ? { ...item, params: { ...item.params, [key]: value } } : item,
      ),
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] uppercase tracking-wide text-muted">Aggiungi:</span>
        {TEST_CATALOG.map((t) => (
          <button
            key={t.id}
            onClick={() => addTest(t.id)}
            className="rounded-full border border-line px-2 py-0.5 text-[11px] text-ink transition-colors hover:border-accent hover:bg-accent-soft"
          >
            + {t.title}
          </button>
        ))}
      </div>

      {battery.length === 0 && (
        <p className="text-xs text-muted">Nessun test in questa batteria: aggiungine almeno uno.</p>
      )}

      <ol className="space-y-1.5">
        {battery.map((item, i) => {
          const section = paramSectionFor(item.testId);
          const params = item.params as Record<string, number>;
          const isOpen = expanded === i;
          return (
            <li key={i} className="rounded-card border border-line p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-ink">
                  {i + 1}. {testTitle(item.testId)}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => move(i, -1)}
                    aria-label="Sposta su"
                    className="rounded border border-line px-2 py-0.5 text-xs text-muted hover:border-accent"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    aria-label="Sposta giù"
                    className="rounded border border-line px-2 py-0.5 text-xs text-muted hover:border-accent"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => setExpanded(isOpen ? null : i)}
                    className="rounded border border-line px-2 py-0.5 text-xs text-muted hover:border-accent"
                  >
                    {isOpen ? 'Chiudi' : 'Impostazioni'}
                  </button>
                  <button
                    onClick={() => removeAt(i)}
                    aria-label="Rimuovi test"
                    className="rounded border border-line px-2 py-0.5 text-xs text-[#D0021B] hover:border-[#D0021B]"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <label className="mt-2 flex items-center gap-2 text-xs text-ink">
                <input
                  type="checkbox"
                  checked={item.practice}
                  onChange={(e) => setPractice(i, e.target.checked)}
                />
                Includi pratica
              </label>

              {isOpen && section && (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {section.fields.map((f) => (
                    <label key={f.key} className="flex flex-col gap-0.5">
                      <span className="text-xs text-muted">
                        {f.label}
                        {f.unit ? ` (${f.unit})` : ''}
                      </span>
                      <input
                        type="number"
                        value={params[f.key]}
                        min={f.min}
                        max={f.max}
                        step={f.step ?? 1}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (Number.isFinite(v)) setParam(i, f.key, Math.min(f.max, Math.max(f.min, v)));
                        }}
                        className="rounded-card border border-line px-2 py-1 text-sm text-ink focus:border-accent focus:outline-none"
                      />
                    </label>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
