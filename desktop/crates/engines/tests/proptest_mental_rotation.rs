//! Invarianti property-based della rotazione mentale: figure chirali di 10 cubetti connessi, bilanciamento
//! angolo x (uguali/diverse), figura di destra uguale o speculare, ISI nell'intervallo, determinismo.
mod common;

use common::run_prop;
use proptest::prelude::*;
use sintropia_core::rng::mulberry32;
use sintropia_engines::mental_rotation::*;
use std::collections::{BTreeMap, HashSet};

const TEST: &str = "mental_rotation";

fn params(n_trials: usize, isi_min_ms: i64, span: i64) -> Params {
    Params {
        n_trials,
        fixation_ms: 500.0,
        response_window_ms: 8000.0,
        isi_min_ms,
        isi_max_ms: isi_min_ms + span,
        practice_trials: 0,
    }
}

fn is_chain(cubes: &[Cube]) -> bool {
    cubes.windows(2).all(|w| {
        w[0].iter()
            .zip(&w[1])
            .map(|(a, b)| (a - b).abs())
            .sum::<i32>()
            == 1
    })
}

#[test]
fn should_hold_mental_rotation_invariants() {
    run_prop(
        TEST,
        "figura_di_10_cubetti_distinti_e_connessi",
        64,
        any::<u32>(),
        |seed| {
            let cubes = generate_shape(&mut mulberry32(seed));
            prop_assert_eq!(cubes.len(), 10);
            prop_assert_eq!(cubes.iter().collect::<HashSet<_>>().len(), 10);
            prop_assert!(is_chain(&cubes));
            Ok(())
        },
    );
    run_prop(
        TEST,
        "figura_chirale_e_speculare_non_sovrapponibile",
        64,
        any::<u32>(),
        |seed| {
            let cubes = generate_shape(&mut mulberry32(seed));
            prop_assert!(is_chiral(&cubes));
            prop_assert!(is_chiral(&mirror(&cubes)));
            prop_assert_eq!(mirror(&mirror(&cubes)), cubes);
            Ok(())
        },
    );
    run_prop(
        TEST,
        "bilanciamento_angolo_per_uguali_diverse",
        48,
        (any::<u32>(), 0usize..=200),
        |(seed, n)| {
            let stimuli = generate_mental_rotation(&params(n, 700, 400), &mut mulberry32(seed));
            prop_assert_eq!(stimuli.len(), n);
            let mut cells: BTreeMap<(i32, bool), usize> = BTreeMap::new();
            for s in &stimuli {
                *cells.entry((s.angle.abs(), s.same)).or_insert(0) += 1;
            }
            let base = n / 14;
            for angle in ROTATION_ANGLES {
                for same in [true, false] {
                    let count = cells.get(&(angle, same)).copied().unwrap_or(0);
                    prop_assert!(
                        count == base || count == base + 1,
                        "cella ({angle},{same}) = {count}, base {base}"
                    );
                }
            }
            Ok(())
        },
    );
    run_prop(
        TEST,
        "multiplo_di_14_pareggia_tutte_le_celle",
        48,
        (any::<u32>(), 1usize..=8),
        |(seed, k)| {
            let stimuli =
                generate_mental_rotation(&params(14 * k, 700, 400), &mut mulberry32(seed));
            let same = stimuli.iter().filter(|s| s.same).count();
            prop_assert_eq!(same, 7 * k);
            Ok(())
        },
    );
    run_prop(
        TEST,
        "destra_uguale_o_speculare_e_angolo_ammesso",
        48,
        (any::<u32>(), 1usize..=60),
        |(seed, n)| {
            for s in generate_mental_rotation(&params(n, 700, 400), &mut mulberry32(seed)) {
                prop_assert!(ROTATION_ANGLES.contains(&s.angle.abs()));
                if s.same {
                    prop_assert_eq!(&s.right, &s.left);
                } else {
                    prop_assert_eq!(&s.right, &mirror(&s.left));
                }
                prop_assert!(is_chiral(&s.left));
            }
            Ok(())
        },
    );
    run_prop(
        TEST,
        "isi_nell_intervallo",
        128,
        (any::<u32>(), 1usize..=120, 0i64..3000, 0i64..3000),
        |(seed, n, min, span)| {
            let stimuli = generate_mental_rotation(&params(n, min, span), &mut mulberry32(seed));
            prop_assert!(stimuli
                .iter()
                .all(|s| s.isi_ms >= min && s.isi_ms <= min + span));
            Ok(())
        },
    );
    run_prop(
        TEST,
        "determinismo_a_parita_di_seme",
        48,
        (any::<u32>(), 0usize..=60),
        |(seed, n)| {
            let p = params(n, 700, 400);
            prop_assert_eq!(
                generate_mental_rotation(&p, &mut mulberry32(seed)),
                generate_mental_rotation(&p, &mut mulberry32(seed))
            );
            Ok(())
        },
    );
}
