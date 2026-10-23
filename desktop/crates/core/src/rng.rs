//! Generatore pseudo-casuale deterministico mulberry32 (porta `src/engine/rng.ts`).

/// Ritorna un generatore di numeri in [0, 1) identico, a parità di seme, a quello TS.
pub fn mulberry32(seed: u32) -> impl FnMut() -> f64 {
    let mut state = seed;
    move || {
        state = state.wrapping_add(0x6d2b_79f5);
        let mut t = (state ^ (state >> 15)).wrapping_mul(1 | state);
        t = t.wrapping_add((t ^ (t >> 7)).wrapping_mul(61 | t)) ^ t;
        f64::from(t ^ (t >> 14)) / 4_294_967_296.0
    }
}

/// Fisher-Yates: ritorna una NUOVA lista permutata, senza mutare l'originale.
pub fn shuffle<T: Clone>(items: &[T], rand: &mut dyn FnMut() -> f64) -> Vec<T> {
    let mut copy = items.to_vec();
    for i in (1..copy.len()).rev() {
        let j = (rand() * (i + 1) as f64).floor() as usize;
        copy.swap(i, j);
    }
    copy
}

/// Intero uniforme in [min, max] inclusi.
pub fn rand_int(min: i64, max: i64, rand: &mut dyn FnMut() -> f64) -> i64 {
    min + (rand() * (max - min + 1) as f64).floor() as i64
}

/// Sceglie un elemento a caso (`None` se la lista è vuota).
pub fn pick<'a, T>(items: &'a [T], rand: &mut dyn FnMut() -> f64) -> Option<&'a T> {
    if items.is_empty() {
        return None;
    }
    items.get((rand() * items.len() as f64).floor() as usize)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn take(seed: u32, n: usize) -> Vec<f64> {
        let mut r = mulberry32(seed);
        (0..n).map(|_| r()).collect()
    }

    #[test]
    fn should_match_typescript_mulberry32_sequence() {
        // Valori calcolati eseguendo la funzione TS con node.
        assert_eq!(
            take(42, 5),
            [
                0.6011037519201636,
                0.44829055899754167,
                0.8524657934904099,
                0.6697340414393693,
                0.17481389874592423
            ]
        );
        assert_eq!(
            take(0, 3),
            [
                0.26642920868471265,
                0.0003297457005828619,
                0.2232720274478197
            ]
        );
        assert_eq!(
            take(123_456_789, 3),
            [0.2577907438389957, 0.9707721115555614, 0.7853280142880976]
        );
    }

    #[test]
    fn should_shuffle_like_typescript_without_mutating_input() {
        let items = [1, 2, 3, 4, 5, 6, 7, 8];
        let out = shuffle(&items, &mut mulberry32(42));
        assert_eq!(out, [3, 8, 2, 1, 7, 6, 4, 5]);
        assert_eq!(items, [1, 2, 3, 4, 5, 6, 7, 8]);
    }

    #[test]
    fn should_rand_int_and_pick_stay_in_range() {
        let mut r = mulberry32(7);
        for _ in 0..200 {
            assert!((3..=6).contains(&rand_int(3, 6, &mut r)));
        }
        assert_eq!(pick::<i32>(&[], &mut r), None);
        assert!(pick(&[10, 20], &mut r).is_some());
    }
}
