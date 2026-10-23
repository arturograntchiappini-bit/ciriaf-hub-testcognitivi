/**
 * Campo di durata/orario in ore : minuti : secondi. Tre caselle chiare con
 * etichetta, valori normalizzati (minuti/secondi 0–59), pensato per essere
 * facile da compilare. Emette il totale in millisecondi.
 */
interface DurationInputProps {
  valueMs: number;
  onChange: (ms: number) => void;
  /** Mostra la casella delle ore (default true). */
  showHours?: boolean;
  /** Variante più compatta (righe pin). */
  compact?: boolean;
  ariaPrefix?: string;
}

function split(ms: number): { h: number; m: number; s: number } {
  const total = Math.max(0, Math.round(ms / 1000));
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

export function DurationInput({
  valueMs,
  onChange,
  showHours = true,
  compact = false,
  ariaPrefix = 'Durata',
}: DurationInputProps): JSX.Element {
  const { h, m, s } = split(valueMs);
  const emit = (nh: number, nm: number, ns: number): void =>
    onChange(((Math.max(0, nh) * 3600 + Math.max(0, nm) * 60 + Math.max(0, ns)) * 1000));

  const box = compact
    ? 'w-14 rounded border border-line px-1.5 py-0.5 text-center text-sm text-ink tabular-nums focus:border-accent focus:outline-none'
    : 'w-16 rounded border border-line px-2 py-1 text-center text-sm text-ink tabular-nums focus:border-accent focus:outline-none';
  const unit = 'text-xs text-muted';

  return (
    <span className="inline-flex items-center gap-1">
      {showHours && (
        <>
          <input
            type="number"
            min={0}
            value={h}
            aria-label={`${ariaPrefix}: ore`}
            onChange={(e) => emit(Number(e.target.value) || 0, m, s)}
            className={box}
          />
          <span className={unit}>h</span>
        </>
      )}
      <input
        type="number"
        min={0}
        max={59}
        value={m}
        aria-label={`${ariaPrefix}: minuti`}
        onChange={(e) => emit(h, Math.min(59, Number(e.target.value) || 0), s)}
        className={box}
      />
      <span className={unit}>min</span>
      <input
        type="number"
        min={0}
        max={59}
        value={s}
        aria-label={`${ariaPrefix}: secondi`}
        onChange={(e) => emit(h, m, Math.min(59, Number(e.target.value) || 0))}
        className={box}
      />
      <span className={unit}>sec</span>
    </span>
  );
}
