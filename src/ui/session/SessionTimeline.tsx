/**
 * Rappresentazione grafica della sessione su una linea temporale: le fasi come
 * segmenti proporzionali alla durata, i pin "t" come tacche alla loro posizione.
 * @see docs/superpowers/specs/2026-07-07-feature-sessione-design.md
 */
import { phaseSpans, type SessionTemplate } from '../../engine/session/model';

interface SessionTimelineProps {
  template: SessionTemplate;
}

function fmt(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`;
}

const PHASE_TINTS = ['#EAF2FB', '#DCEAF9', '#EAF2FB', '#DCEAF9'];

export function SessionTimeline({ template }: SessionTimelineProps): JSX.Element {
  const total = template.totalMs;
  if (total <= 0) {
    return <p className="text-sm text-muted">Imposta una durata totale per vedere la linea temporale.</p>;
  }
  const spans = phaseSpans(template);
  const pct = (ms: number): number => Math.max(0, Math.min(100, (ms / total) * 100));

  return (
    <div>
      <div className="relative h-16 w-full overflow-hidden rounded-card border border-line bg-white">
        {/* Segmenti delle fasi */}
        {spans.map((s, i) => (
          <div
            key={s.phase.id}
            className="absolute top-0 flex h-full items-center justify-center overflow-hidden border-r border-line px-1 text-center"
            style={{
              left: `${pct(s.startMs)}%`,
              width: `${pct(s.endMs) - pct(s.startMs)}%`,
              backgroundColor: PHASE_TINTS[i % PHASE_TINTS.length],
            }}
            title={`${s.phase.name} (${fmt(s.startMs)}–${fmt(s.endMs)})`}
          >
            <span className="truncate text-xs font-medium text-ink">{s.phase.name}</span>
          </div>
        ))}

        {/* Pin "t" */}
        {spans.flatMap((s) =>
          s.phase.pins.map((pin) => {
            const left = pct(pin.offsetMs);
            return (
              <div key={pin.id} className="absolute top-0 h-full" style={{ left: `${left}%` }}>
                <div className="h-full w-0.5 bg-accent" />
                <div className="absolute -left-1 top-0 h-2 w-2 rounded-full bg-accent" />
                <div className="absolute -left-3 bottom-0.5 w-8 text-center text-[10px] leading-none text-accent">
                  {fmt(pin.offsetMs)}
                </div>
              </div>
            );
          }),
        )}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>0:00</span>
        <span>{fmt(total)}</span>
      </div>
    </div>
  );
}
