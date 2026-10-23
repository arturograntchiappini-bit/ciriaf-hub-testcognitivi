interface BrandProps {
  /** Mostra anche «Cognitive tests Hub» (da nascondere dove lo spazio è poco). */
  showSubtitle?: boolean;
}

/** Marchio della piattaforma: logo e wordmark nel font display squadrato dei titoli. */
export function Brand({ showSubtitle = true }: BrandProps): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <img src="favicon.svg" alt="" aria-hidden className="h-8 w-8 shrink-0" />
      <span className="flex items-baseline gap-3">
        <span className="font-display text-[1.65rem] font-extrabold uppercase leading-none tracking-[0.08em] text-ink">Sintropia</span>
        {showSubtitle && (
          <span className="hidden font-mono text-[11px] uppercase tracking-[0.22em] text-muted sm:inline">Cognitive tests Hub</span>
        )}
      </span>
    </div>
  );
}
