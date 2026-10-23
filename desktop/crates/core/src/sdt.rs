//! Teoria della detezione del segnale: probit, d' e criterio c con correzione loglinear
//! (Hautus, 1995). Porta `src/engine/sdt.ts`.

/// Inversa della CDF normale standard (probit) — algoritmo di Acklam.
pub fn probit(p: f64) -> f64 {
    const A: [f64; 6] = [
        -3.969683028665376e1,
        2.209460984245205e2,
        -2.759285104469687e2,
        1.38357751867269e2,
        -3.066479806614716e1,
        2.506628277459239,
    ];
    const B: [f64; 5] = [
        -5.447609879822406e1,
        1.615858368580409e2,
        -1.556989798598866e2,
        6.680131188771972e1,
        -1.328068155288572e1,
    ];
    const C: [f64; 6] = [
        -7.784894002430293e-3,
        -3.223964580411365e-1,
        -2.400758277161838,
        -2.549732539343734,
        4.374664141464968,
        2.938163982698783,
    ];
    const D: [f64; 4] = [
        7.784695709041462e-3,
        3.224671290700398e-1,
        2.445134137142996,
        3.754408661907416,
    ];
    const P_LOW: f64 = 0.02425;
    const P_HIGH: f64 = 1.0 - P_LOW;
    if p <= 0.0 {
        return f64::NEG_INFINITY;
    }
    if p >= 1.0 {
        return f64::INFINITY;
    }
    let tail = |q: f64| {
        (((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5])
            / ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1.0)
    };
    if p < P_LOW {
        return tail((-2.0 * p.ln()).sqrt());
    }
    if p <= P_HIGH {
        let q = p - 0.5;
        let r = q * q;
        return (((((A[0] * r + A[1]) * r + A[2]) * r + A[3]) * r + A[4]) * r + A[5]) * q
            / (((((B[0] * r + B[1]) * r + B[2]) * r + B[3]) * r + B[4]) * r + 1.0);
    }
    -tail((-2.0 * (1.0 - p).ln()).sqrt())
}

/// Tassi corretti loglinear (H, F).
fn corrected_rates(hits: f64, targets: f64, false_alarms: f64, non_targets: f64) -> (f64, f64) {
    (
        (hits + 0.5) / (targets + 1.0),
        (false_alarms + 0.5) / (non_targets + 1.0),
    )
}

/// d' con correzione loglinear di Hautus: H=(hits+0.5)/(targets+1), F=(fa+0.5)/(nonTargets+1), d'=z(H)-z(F).
pub fn d_prime(hits: f64, targets: f64, false_alarms: f64, non_targets: f64) -> f64 {
    let (h, f) = corrected_rates(hits, targets, false_alarms, non_targets);
    probit(h) - probit(f)
}

/// Criterio decisionale c = -0.5·(z(H)+z(F)). c>0 conservativo, c<0 liberale.
pub fn criterion_c(hits: f64, targets: f64, false_alarms: f64, non_targets: f64) -> f64 {
    let (h, f) = corrected_rates(hits, targets, false_alarms, non_targets);
    -0.5 * (probit(h) + probit(f))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn close(a: f64, b: f64) -> bool {
        (a - b).abs() < 1e-9
    }

    #[test]
    fn should_match_typescript_probit_values() {
        assert!(close(probit(0.5), 0.0));
        assert!(close(probit(0.975), 1.959963986120195));
        assert!(close(probit(0.01), -2.326347874388028));
        assert!(close(probit(0.99), 2.326347874388028));
    }

    #[test]
    fn should_return_infinities_at_the_extremes() {
        assert_eq!(probit(0.0), f64::NEG_INFINITY);
        assert_eq!(probit(1.0), f64::INFINITY);
    }

    #[test]
    fn should_match_typescript_d_prime_and_criterion() {
        assert!(close(d_prime(18.0, 20.0, 2.0, 30.0), 2.5805061791416497));
        assert!(close(
            criterion_c(18.0, 20.0, 2.0, 30.0),
            0.11049197236814479
        ));
    }
}
