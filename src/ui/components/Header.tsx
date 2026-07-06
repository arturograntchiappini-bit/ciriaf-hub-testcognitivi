interface HeaderProps {
  onOpenSettings?: () => void;
}

/** Barra superiore sobria col nome della piattaforma. */
export function Header({ onOpenSettings }: HeaderProps): JSX.Element {
  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-content items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="inline-block h-6 w-6 rounded-md border border-accent bg-accent-soft"
          />
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
