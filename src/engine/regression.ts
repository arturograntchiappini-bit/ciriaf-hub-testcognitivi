/**
 * Regressione lineare ai minimi quadrati, usata per le pendenze dei tempi di reazione
 * (ricerca visiva: ms per elemento; rotazione mentale: ms per grado).
 */
import { mean } from './validation';

/** Retta ai minimi quadrati sui punti (x, y). null con meno di due valori distinti di x. */
export function leastSquares(points: readonly (readonly [number, number])[]): { slope: number; intercept: number } | null {
  if (points.length < 2) return null;
  const mx = mean(points.map(([x]) => x));
  const my = mean(points.map(([, y]) => y));
  const sxx = points.reduce((sum, [x]) => sum + (x - mx) ** 2, 0);
  if (sxx === 0) return null;
  const slope = points.reduce((sum, [x, y]) => sum + (x - mx) * (y - my), 0) / sxx;
  return { slope, intercept: my - slope * mx };
}
