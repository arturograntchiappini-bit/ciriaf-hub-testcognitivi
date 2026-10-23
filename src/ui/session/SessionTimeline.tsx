/**
 * Linea temporale della sessione: fasi come segmenti proporzionali, pin "t" come
 * tacche. In modalità `editable` i pin si TRASCINANO lungo la barra (cambiano
 * anche fase, in modo naturale) e un clic su un punto vuoto crea un nuovo pin lì.
 * @see docs/superpowers/specs/2026-07-07-feature-sessione-design.md
 */
import { useRef } from 'react';
import { phaseSpans, sessionTotalMs, type SessionTemplate } from '../../engine/session/model';

interface SessionTimelineProps {
  template: SessionTemplate;
  /** Abilita trascinamento pin e clic-per-creare. */
  editable?: boolean;
  selectedPinId?: string | null;
  onSelectPin?: (phaseIdx: number, pinIdx: number) => void;
  /** Sposta il pin (identificato per id stabile) al nuovo offset assoluto. */
  onMovePin?: (pinId: string, newOffsetMs: number) => void;
  onAddPinAt?: (offsetMs: number) => void;
}

/** Passo di "aggancio magnetico" del trascinamento in funzione della durata. */
function snapStepMs(totalMs: number): number {
  if (totalMs >= 5 * 60_000) return 5 * 60_000; // 5 minuti
  if (totalMs >= 60_000) return 30_000; // 30 secondi per sessioni brevi
  return 5_000;
}

function fmt(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`;
}

const PHASE_TINTS = ['rgb(var(--c-accent) / 0.10)', 'rgb(var(--c-accent) / 0.20)', 'rgb(var(--c-accent) / 0.10)', 'rgb(var(--c-accent) / 0.20)'];

export function SessionTimeline({
  template,
  editable = false,
  selectedPinId = null,
  onSelectPin,
  onMovePin,
  onAddPinAt,
}: SessionTimelineProps): JSX.Element {
  const trackRef = useRef<HTMLDivElement>(null);
  // Ref (non state): il gating del drag dev'essere sincrono tra pointerdown e i
  // pointermove che seguono nello stesso tick.
  const dragIdRef = useRef<string | null>(null);
  const draggedRef = useRef(false);

  const total = sessionTotalMs(template);
  if (total <= 0) {
    return <p className="text-sm text-muted">Imposta una durata totale per vedere la linea temporale.</p>;
  }
  const spans = phaseSpans(template);
  const pct = (ms: number): number => Math.max(0, Math.min(100, (ms / total) * 100));

  const snap = snapStepMs(total);

  function offsetFromClientX(clientX: number): number {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const ratio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
    const raw = ratio * total;
    const snapped = Math.round(raw / snap) * snap; // aggancio magnetico
    return Math.max(0, Math.min(total, snapped));
  }

  // Tacche della griglia magnetica (mai troppe: al massimo ~24 linee).
  const gridTicks: number[] = [];
  if (total / snap <= 24) {
    for (let ms = snap; ms < total; ms += snap) gridTicks.push(ms);
  }

  function locate(pinId: string): [number, number] | null {
    for (let pi = 0; pi < template.phases.length; pi++) {
      const idx = (template.phases[pi] as SessionTemplate['phases'][number]).pins.findIndex((p) => p.id === pinId);
      if (idx >= 0) return [pi, idx];
    }
    return null;
  }

  function beginDrag(e: React.PointerEvent, pinId: string): void {
    if (!editable) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    dragIdRef.current = pinId;
    draggedRef.current = false;
    const loc = locate(pinId);
    if (loc) onSelectPin?.(loc[0], loc[1]);
  }
  function duringDrag(e: React.PointerEvent, pinId: string): void {
    if (!editable || dragIdRef.current !== pinId) return;
    draggedRef.current = true;
    onMovePin?.(pinId, offsetFromClientX(e.clientX));
  }
  function endDrag(e: React.PointerEvent): void {
    if (!editable) return;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    dragIdRef.current = null;
  }
  function onTrackClick(e: React.MouseEvent): void {
    if (!editable || !onAddPinAt) return;
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    if ((e.target as HTMLElement).dataset.role !== 'track') return; // solo sul fondo vuoto
    onAddPinAt(offsetFromClientX(e.clientX));
  }

  return (
    <div>
      <div
        ref={trackRef}
        data-role="track"
        onClick={onTrackClick}
        className={`relative h-20 w-full overflow-hidden rounded-card border border-line bg-surface ${
          editable ? 'cursor-copy' : ''
        }`}
      >
        {/* Segmenti delle fasi (non interattivi: i clic passano alla traccia) */}
        {spans.map((s, i) => (
          <div
            key={s.phase.id}
            className="pointer-events-none absolute top-0 flex h-full items-start justify-center overflow-hidden border-r border-line px-1 pt-1 text-center"
            style={{
              left: `${pct(s.startMs)}%`,
              width: `${pct(s.endMs) - pct(s.startMs)}%`,
              backgroundColor: PHASE_TINTS[i % PHASE_TINTS.length],
            }}
            title={`${s.phase.name} (${fmt(s.startMs)}–${fmt(s.endMs)})`}
          >
            <span className="truncate text-[11px] font-medium text-ink">{s.phase.name}</span>
          </div>
        ))}

        {/* Griglia magnetica (tacche non interattive) */}
        {gridTicks.map((ms) => (
          <div
            key={`grid-${ms}`}
            className="pointer-events-none absolute top-0 h-full w-px bg-line/70"
            style={{ left: `${pct(ms)}%` }}
          />
        ))}

        {/* Pin "t" */}
        {template.phases.flatMap((phase) =>
          phase.pins.map((pin) => {
            const left = pct(pin.offsetMs);
            const selected = pin.id === selectedPinId;
            return (
              <div key={pin.id} className="absolute top-0 h-full" style={{ left: `${left}%` }}>
                <div className={`mx-auto h-full w-0.5 ${selected ? 'bg-accent' : 'bg-accent/60'}`} />
                {/* Maniglia trascinabile */}
                <button
                  type="button"
                  onPointerDown={(e) => beginDrag(e, pin.id)}
                  onPointerMove={(e) => duringDrag(e, pin.id)}
                  onPointerUp={endDrag}
                  onClick={(e) => {
                    e.stopPropagation();
                    const loc = locate(pin.id);
                    if (loc) onSelectPin?.(loc[0], loc[1]);
                  }}
                  aria-label={`Pin a ${fmt(pin.offsetMs)}`}
                  className={`absolute -left-2 top-1 flex h-4 w-4 items-center justify-center rounded-full border bg-paper ${
                    selected ? 'border-accent ring-2 ring-accent/40' : 'border-accent/70'
                  } ${editable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                </button>
                <span
                  className={`absolute -left-4 bottom-1 w-12 text-center text-[10px] leading-none ${
                    selected ? 'font-semibold text-accent' : 'text-accent/80'
                  }`}
                >
                  {fmt(pin.offsetMs)}
                </span>
              </div>
            );
          }),
        )}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>0:00</span>
        {editable && (
          <span className="text-muted">
            clicca sul vuoto per aggiungere · trascina i pin (aggancio {snap >= 60_000 ? `${snap / 60_000} min` : `${snap / 1000} s`})
          </span>
        )}
        <span>{fmt(total)}</span>
      </div>
    </div>
  );
}
