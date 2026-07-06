import type { TestMeta } from '../router';

interface TestCardProps {
  meta: TestMeta;
  onSelect: () => void;
}

/** Card cliccabile per avviare un test dalla Home. */
export function TestCard({ meta, onSelect }: TestCardProps): JSX.Element {
  return (
    <button
      onClick={onSelect}
      className="group flex flex-col items-start rounded-card border border-line bg-white p-5 text-left shadow-card transition-colors hover:border-accent"
    >
      <span className="text-base font-semibold text-ink group-hover:text-accent">{meta.title}</span>
      <span className="mt-1 text-sm text-muted">{meta.domain}</span>
      <span className="mt-4 text-sm font-medium text-accent">Avvia →</span>
    </button>
  );
}
