import type { ReactNode } from 'react';

interface PageHeadingProps {
  /** Etichetta mono sopra il titolo (sezione o contesto). */
  eyebrow: string;
  title: string;
  /** Azioni a destra del titolo (es. «← Home»). */
  actions?: ReactNode;
  children?: ReactNode;
}

/** Testata comune delle schermate interne: eyebrow, titolo display e testo introduttivo. */
export function PageHeading({ eyebrow, title, actions, children }: PageHeadingProps): JSX.Element {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="page-title mt-3">{title}</h1>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-5 max-w-2xl text-base leading-relaxed text-muted">{children}</div>}
    </div>
  );
}
