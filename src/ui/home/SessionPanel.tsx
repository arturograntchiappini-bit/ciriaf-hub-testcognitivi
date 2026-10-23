import { SessionDemo } from './SessionDemo';

interface SessionPanelProps {
  onOpenSession: () => void;
}

const STEPS: ReadonlyArray<{ title: string; text: string }> = [
  {
    title: 'Fissa durata e fasi',
    text: 'Scegli quanto dura la sessione e dividila in fasi con un nome: per esempio Baseline, Esposizione, Recupero.',
  },
  {
    title: 'Colloca i pin t',
    text: 'Un pin è un istante preciso in cui il partecipante svolge una batteria: uno o più test, con i parametri che scegli.',
  },
  {
    title: 'Il partecipante aspetta, poi parte',
    text: 'Fuori dai pin vede solo la fase e un conto alla rovescia. Allo scadere suona un avviso, compare «Inizia» e parte la batteria.',
  },
  {
    title: 'Esporti tutto',
    text: 'A fine protocollo scarichi un JSON di sessione e un CSV combinato con fase, pin e test per ogni risposta. Se il browser si chiude, la sessione riprende.',
  },
];

/** Pannello "carta" (sfondo chiaro) che copre la scena 3D: cos'è una sessione e come funziona, con una simulazione. */
export function SessionPanel({ onOpenSession }: SessionPanelProps): JSX.Element {
  return (
    <section
      id="sessione"
      aria-labelledby="session-title"
      data-brain-cover
      className="relative z-10 bg-sheet px-6 py-24 text-sheet-ink sm:px-10 sm:py-32"
    >
      <div className="mx-auto max-w-[1200px]">
        <p className="reveal font-mono text-[11px] uppercase tracking-[0.28em] text-sheet-muted">03 / 05 — Modalità Sessione</p>
        <h2 id="session-title" className="reveal mt-5 max-w-4xl font-display text-[clamp(2.8rem,6.4vw,5.6rem)] font-extrabold uppercase leading-[0.9]">
          Decidi quando far svolgere i test<span className="text-accent-ink">.</span>
        </h2>
        <p className="reveal mt-6 max-w-2xl text-lg leading-relaxed text-sheet-muted">
          La modalità Sessione trasforma un esperimento in un protocollo a tempo: tu stabilisci durata, fasi e istanti precisi,
          il partecipante deve solo seguire il conto alla rovescia.
        </p>

        <div className="mt-16 grid gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start">
          <div>
            <ol className="space-y-7">
              {STEPS.map((step, index) => (
                <li key={step.title} className="reveal grid grid-cols-[2.5rem_1fr] gap-4" style={{ '--delay': `${index * 80}ms` } as React.CSSProperties}>
                  <span className="font-display text-4xl font-extrabold leading-none text-accent-ink">{index + 1}</span>
                  <div>
                    <h3 className="font-display text-2xl font-bold uppercase leading-none tracking-wide">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-sheet-muted">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <button
              onClick={onOpenSession}
              className="reveal mt-10 inline-flex min-h-[48px] items-center gap-3 bg-sheet-ink px-6 font-mono text-[12px] font-medium uppercase tracking-[0.16em] text-sheet transition-transform duration-300 ease-out hover:-translate-y-0.5"
            >
              Apri la modalità sessione <span aria-hidden>→</span>
            </button>
          </div>

          <div className="reveal">
            <SessionDemo />
          </div>
        </div>
      </div>
    </section>
  );
}
