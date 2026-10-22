import type { TestMeta } from '../router';

interface TestCardProps {
  meta: TestMeta;
  onSelect: () => void;
  style?: 'delay-' | '' ;
}

const DOMAIN_STYLES: Record<string, { icon: string; border: string; bg: string; dot: string }> = {
  'Velocità di elaborazione': { icon: '⚡', border: 'border-l-[3px] border-l-blue-400', bg: 'bg-blue-50/40', dot: 'bg-blue-400' },
  'Risoluzione del conflitto': { icon: '⚖️', border: 'border-l-[3px] border-l-amber-400', bg: 'bg-amber-50/40', dot: 'bg-amber-400' },
  'Inibizione motoria rapida': { icon: '🛑', border: 'border-l-[3px] border-l-orange-400', bg: 'bg-orange-50/40', dot: 'bg-orange-400' },
  'Memoria visuo-spaziale': { icon: '🧩', border: 'border-l-[3px] border-l-violet-400', bg: 'bg-violet-50/40', dot: 'bg-violet-400' },
  'Memoria di lavoro': { icon: '🧠', border: 'border-l-[3px] border-l-purple-400', bg: 'bg-purple-50/40', dot: 'bg-purple-400' },
  'Flessibilità cognitiva': { icon: '🔄', border: 'border-l-[3px] border-l-emerald-400', bg: 'bg-emerald-50/40', dot: 'bg-emerald-400' },
};

const entryDelay: Record<string, number> = {
  'stroop1': 0, 'stroop2': 1, 'gonogo': 2, 'corsi': 3, 'nback': 4, 'wcst': 5,
};

/** Card cliccabile per avviare un test dalla Home. */
export function TestCard({ meta, onSelect }: TestCardProps): JSX.Element {
  const style = DOMAIN_STYLES[meta.domain] ?? { icon: '📋', border: 'border-l-[3px] border-l-line', bg: '', dot: 'bg-line' };
  const delay = entryDelay[meta.id] ?? 0;

  return (
    <button
      onClick={onSelect}
      className={`group animate-[fadeInUp_0.5s_ease-out_both] rounded-card border border-line bg-white p-5 text-left shadow-card transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-lg focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${style.border} ${style.bg}`}
      style={{ animationDelay: `${80 * delay}ms` }}
    >
      <span className="flex items-center gap-2.5">
        <span aria-hidden className="text-lg">{style.icon}</span>
        <span className="text-sm font-semibold text-ink group-hover:text-accent">{meta.title}</span>
      </span>
      <span className="ml-8 mt-1 flex items-center gap-1.5 text-xs text-muted">
        <span aria-hidden className={`inline-block h-1.5 w-1.5 rounded-full ${style.dot}`} />
        {meta.domain}
      </span>
      <span className="ml-8 mt-3 block text-xs font-medium text-accent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        Avvia test →
      </span>
    </button>
  );
}
