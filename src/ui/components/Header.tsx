interface HeaderProps {
  onOpenSettings?: () => void;
  /** Se true, header trasparente si fonde con l'hero sottostante. */
  transparent?: boolean;
}

/** Barra superiore col nome della piattaforma. */
export function Header({ onOpenSettings, transparent }: HeaderProps): JSX.Element {
  return (
    <header className={`${transparent ? 'border-transparent bg-transparent' : 'border-b border-line bg-paper'}`}>
      <div className="mx-auto flex max-w-content items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="" aria-hidden className="h-6 w-6 shrink-0 opacity-80" />
          <span className="text-sm font-semibold tracking-tight text-ink/80">
            CIRIAF — COLAB/NEXTROOM
          </span>
        </div>
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            aria-label="Impostazioni"
            className="rounded-card border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
          >
            ⚙ Impostazioni
          </button>
        )}
      </div>
    </header>
  );
}
