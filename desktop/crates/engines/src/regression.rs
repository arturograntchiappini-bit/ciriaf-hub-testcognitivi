//! Regressione lineare ai minimi quadrati (porta `src/engine/regression.ts`), usata per le pendenze
//! dei tempi di reazione (ricerca visiva: ms per elemento; rotazione mentale: ms per grado).
use sintropia_core::validation::mean;

/// Retta ai minimi quadrati sui punti (x, y): `(pendenza, intercetta)`.
/// `None` con meno di due punti o senza varianza in x.
pub fn least_squares(points: &[(f64, f64)]) -> Option<(f64, f64)> {
    if points.len() < 2 {
        return None;
    }
    let xs: Vec<f64> = points.iter().map(|p| p.0).collect();
    let ys: Vec<f64> = points.iter().map(|p| p.1).collect();
    let (mx, my) = (mean(&xs), mean(&ys));
    let sxx: f64 = xs.iter().map(|x| (x - mx).powi(2)).sum();
    if sxx == 0.0 {
        return None;
    }
    let sxy: f64 = points.iter().map(|(x, y)| (x - mx) * (y - my)).sum();
    let slope = sxy / sxx;
    Some((slope, my - slope * mx))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_fit_exact_line() {
        let (s, i) = least_squares(&[(0.0, 1.0), (1.0, 3.0), (2.0, 5.0)]).unwrap();
        assert!((s - 2.0).abs() < 1e-12 && (i - 1.0).abs() < 1e-12);
    }

    #[test]
    fn should_return_none_with_fewer_than_two_points() {
        assert!(least_squares(&[]).is_none());
        assert!(least_squares(&[(1.0, 2.0)]).is_none());
    }

    #[test]
    fn should_return_none_when_x_has_no_variance() {
        assert!(least_squares(&[(2.0, 1.0), (2.0, 5.0)]).is_none());
    }

    #[test]
    fn should_average_noisy_points() {
        let (s, i) = least_squares(&[(0.0, 0.0), (1.0, 1.0), (2.0, 1.0), (3.0, 3.0)]).unwrap();
        assert!((s - 0.9).abs() < 1e-12 && (i + 0.1).abs() < 1e-12);
    }
}
