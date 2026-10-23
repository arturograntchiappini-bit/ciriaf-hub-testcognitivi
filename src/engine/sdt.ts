/**
 * Teoria della detezione del segnale: probit, d' e criterio c con correzione loglinear.
 * @see docs/scientific/nback.md — Hautus (1995)
 */

/** Inversa della CDF normale standard (probit) — algoritmo di Acklam. */
export function probit(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number;
  let r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
  if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q /
      (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
    ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
}

/**
 * d' con correzione loglinear di Hautus (1995), applicata sempre:
 * H = (hits+0.5)/(targets+1), F = (fa+0.5)/(nonTargets+1), d' = z(H) − z(F).
 */
export function dPrime(hits: number, targets: number, falseAlarms: number, nonTargets: number): number {
  const h = (hits + 0.5) / (targets + 1);
  const f = (falseAlarms + 0.5) / (nonTargets + 1);
  return probit(h) - probit(f);
}

/**
 * Criterio decisionale c (bias di risposta), con la stessa correzione loglinear
 * di Hautus: c = −0.5·(z(H) + z(F)). c > 0 = criterio conservativo (tende a NON
 * rispondere, favorisce i miss); c < 0 = criterio liberale (tende a rispondere,
 * favorisce i falsi allarmi); c ≈ 0 = nessun bias. Complementa d' separando la
 * sensibilità dalla tendenza di risposta.
 */
export function criterionC(hits: number, targets: number, falseAlarms: number, nonTargets: number): number {
  const h = (hits + 0.5) / (targets + 1);
  const f = (falseAlarms + 0.5) / (nonTargets + 1);
  return -0.5 * (probit(h) + probit(f));
}
