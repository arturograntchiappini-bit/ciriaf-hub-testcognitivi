/**
 * Menu della modalità Sessione: modelli salvati (avvia/modifica/elimina), nuovo
 * protocollo, e ripresa di un run in corso.
 * @see docs/superpowers/specs/2026-07-07-feature-sessione-design.md
 */
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { PageHeading } from '../components/PageHeading';
import { flattenPins, type SessionTemplate, type SessionRun } from '../../engine/session/model';

interface SessionMenuProps {
  templates: SessionTemplate[];
  runInProgress: SessionRun | null;
  onNew: () => void;
  onEdit: (t: SessionTemplate) => void;
  onDelete: (id: string) => void;
  onStart: (t: SessionTemplate) => void;
  onResume: () => void;
  onHome: () => void;
}

export function SessionMenu(props: SessionMenuProps): JSX.Element {
  const { templates, runInProgress } = props;
  return (
    <div className="min-h-full bg-paper">
      <Header />
      <main className="mx-auto max-w-content px-6 py-12">
        <PageHeading
          eyebrow="Modalità Sessione"
          title="Sessione"
          actions={
            <Button variant="secondary" onClick={props.onHome}>
              ← Home
            </Button>
          }
        >
          Un protocollo a tempo: fasi con pin <span className="font-mono text-ink">t</span> in cui somministrare una
          batteria di test. Fuori dai <span className="font-mono text-ink">t</span> il partecipante vede solo la fase e il
          conto alla rovescia.
        </PageHeading>

        {runInProgress && !runInProgress.finished && (
          <div className="mt-8 border border-accent bg-accent-soft px-6 py-5">
            <p className="eyebrow text-accent-glow">Sessione in corso</p>
            <p className="mt-2 text-sm text-ink">
              {runInProgress.template.name} <span className="font-mono text-xs text-muted">({runInProgress.runId})</span>
            </p>
            <div className="mt-4">
              <Button onClick={props.onResume}>Riprendi sessione</Button>
            </div>
          </div>
        )}

        <div className="mt-12 flex items-center justify-between gap-3 border-b border-line pb-4">
          <h2 className="eyebrow text-accent-glow">Modelli salvati</h2>
          <Button onClick={props.onNew}>+ Nuova sessione</Button>
        </div>

        {templates.length === 0 ? (
          <div className="mt-6 border border-dashed border-line p-8 text-center">
            <p className="font-display text-2xl font-bold uppercase tracking-wide text-ink">Nessun modello salvato</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              Crea il tuo primo protocollo: scegli la durata, aggiungi le fasi e colloca i pin t con le batterie di test.
            </p>
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {templates.map((t) => {
              const pins = flattenPins(t);
              return (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-4 py-5">
                  <div>
                    <p className="font-display text-3xl font-bold uppercase leading-none tracking-wide text-ink">{t.name}</p>
                    <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                      {t.phases.length} fasi · {pins.length} pin t
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => props.onStart(t)}>Avvia</Button>
                    <Button variant="secondary" onClick={() => props.onEdit(t)}>
                      Modifica
                    </Button>
                    <Button variant="ghost" onClick={() => props.onDelete(t.id)}>
                      Elimina
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
