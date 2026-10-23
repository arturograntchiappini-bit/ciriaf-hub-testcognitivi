import { useEffect, useRef, useState } from 'react';
import { TEST_CATALOG, type TestMeta } from '../router';
import type { TestId } from '../../engine/types';
import { focusFor } from './testFocus';

interface TestIndexProps {
  onSelectTest: (id: TestId) => void;
  onFocusChange: (meta: TestMeta | null) => void;
}

const CENTER_BAND = '-45% 0px -45% 0px';

/** Indice numerato dei test. Il riquadro sotto il cursore (o al centro dello schermo) accende la sua regione cerebrale. */
export function TestIndex({ onSelectTest, onFocusChange }: TestIndexProps): JSX.Element {
  const [pointed, setPointed] = useState<TestId | null>(null);
  const [centered, setCentered] = useState<TestId | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const activeId = pointed ?? centered;

  useEffect(() => {
    onFocusChange(TEST_CATALOG.find((meta) => meta.id === activeId) ?? null);
  }, [activeId, onFocusChange]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.testId as TestId;
          if (entry.isIntersecting) setCentered(id);
          else setCentered((current) => (current === id ? null : current));
        }
      },
      { rootMargin: CENTER_BAND },
    );
    list.querySelectorAll('li').forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return (
    <ul ref={listRef} className="border-b border-line">
      {TEST_CATALOG.map((meta, index) => (
        <li key={meta.id} data-test-id={meta.id} className="reveal" style={{ '--delay': `${index * 60}ms` } as React.CSSProperties}>
          <button
            onClick={() => onSelectTest(meta.id)}
            onPointerEnter={() => setPointed(meta.id)}
            onPointerLeave={() => setPointed(null)}
            onFocus={() => setPointed(meta.id)}
            onBlur={() => setPointed(null)}
            data-active={activeId === meta.id}
            className="test-row group grid w-full grid-cols-[2.75rem_minmax(0,1fr)_auto] items-start gap-3 border-t border-line bg-paper/70 py-6 pr-2 text-left backdrop-blur-[2px] sm:grid-cols-[3.5rem_minmax(0,1fr)_auto]"
          >
            <span className="pt-2 font-mono text-[11px] tracking-[0.18em] text-muted">{String(index + 1).padStart(2, '0')}</span>
            <span>
              <span className="block font-display text-[clamp(1.9rem,5vw,3rem)] font-bold uppercase leading-[0.95] tracking-wide text-ink">
                {meta.title}
              </span>
              <span className="mt-2 block font-mono text-[11px] uppercase tracking-[0.16em] text-accent-glow">
                {meta.domain} <span className="text-muted">· {focusFor(meta.id).regionLabel}</span>
              </span>
              <span className="mt-2 block max-w-md text-sm leading-relaxed text-muted">{focusFor(meta.id).task}</span>
            </span>
            <span aria-hidden className="test-row-arrow pt-1 font-mono text-xl text-accent">→</span>
            <span className="sr-only">Avvia test</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
