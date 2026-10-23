import { useEffect, type RefObject } from 'react';

const REVEAL_SELECTOR = '.reveal';
const IN_VIEW_MARGIN = '0px 0px -8% 0px';

/** Porta a `data-in="true"` ogni `.reveal` quando entra nel viewport; senza IntersectionObserver li mostra subito. */
export function useReveal(rootRef: RefObject<HTMLElement>): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const targets = Array.from(root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));
    if (typeof IntersectionObserver === 'undefined') {
      targets.forEach((el) => el.setAttribute('data-in', 'true'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute('data-in', 'true');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: IN_VIEW_MARGIN },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [rootRef]);
}
