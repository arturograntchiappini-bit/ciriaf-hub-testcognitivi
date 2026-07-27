/**
 * Menu della modalità Sessione: modelli salvati (avvia/modifica/elimina), nuovo
 * protocollo, e ripresa di un run in corso.
 * @see docs/superpowers/specs/2026-07-07-feature-sessione-design.md
 */
import { Header } from '../components/Header';
import { Button } from '../components/Button';
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
      <main className="mx-auto max-w-content px-6 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Sessione</h1>
          <Button variant="ghost" onClick={props.onHome}>
            ← Home
          </Button>
        </div>
        <p className="mt-2 max-w-2xl text-muted">
          Un protocollo cronometrico: fasi con pin temporali "t" in cui somministrare una batteria di
          test selezionati. Fuori dai "t" il soggetto vede solo il conto alla rovescia.
        </p>

        {runInProgress && !runInProgress.finished && (
          <div className="mt-6 rounded-card border border-accent bg-accent-soft px-5 py-4">
            <p className="text-sm font-medium text-ink">
              Sessione in corso: {runInProgress.template.name} ({runInProgress.runId})
            </p>
            <div className="mt-3">
              <Button onClick={props.onResume}>Riprendi sessione</Button>
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Modelli salvati</h2>
          <Button onClick={props.onNew}>+ Nuova sessione</Button>
        </div>

        {templates.length === 0 ? (
          <p className="mt-4 text-muted">Nessun modello salvato. Creane uno con "Nuova sessione".</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {templates.map((t) => {
              const pins = flattenPins(t);
              return (
                <li key={t.id} className="flex items-center justify-between rounded-card border border-line p-4">
                  <div>
                    <p className="text-sm font-semibold text-ink">{t.name}</p>
                    <p className="text-xs text-muted">
                      {t.phases.length} fasi · {pins.length} pin "t"
                    </p>
                  </div>
                  <div className="flex gap-2">
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
