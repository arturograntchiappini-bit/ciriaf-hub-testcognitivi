import type { ReactNode } from 'react';

interface StimulusStageProps {
  children: ReactNode;
  /** Barra di stato in basso (prompt/istruzione breve). */
  statusBar?: ReactNode;
}

/**
 * Area a tutto schermo, sfondo bianco, stimolo centrato. Durante i trial lo
 * schermo è quasi vuoto (requisito sperimentale).
 */
export function StimulusStage({ children, statusBar }: StimulusStageProps): JSX.Element {
  return (
    <div className="theme-stimulus fixed inset-0 flex flex-col bg-paper text-ink">
      <div className="flex flex-1 items-center justify-center select-none">{children}</div>
      {statusBar && (
        <div className="border-t border-line px-6 py-3 text-center text-sm text-muted">{statusBar}</div>
      )}
    </div>
  );
}
