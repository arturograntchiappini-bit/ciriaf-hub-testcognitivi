interface HeaderProps {
  onOpenSettings?: () => void;
}

/** Barra superiore sobria col nome della piattaforma. */
export function Header({ onOpenSettings }: HeaderProps): JSX.Element {
  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-content items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="" aria-hidden className="h-7 w-7 shrink-0" />
          <span className="text-sm font-semibold tracking-tight text-ink">
            CIRIAF — COLAB/NEXTROOM COGNITIVE TESTING HUB
          </span>
        </div>
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            aria-label="Impostazioni"
            className="rounded-card border border-line px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-ink"
          >
            ⚙ Impostazioni
          </button>
        )}
      </div>
    </header>
  );
}
