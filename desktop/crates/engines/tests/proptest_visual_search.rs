//! Invarianti del generatore Visual Search su semi e parametri arbitrari.
mod common;

use common::run_prop;
use proptest::prelude::*;
use sintropia_core::rng::mulberry32;
use sintropia_engines::defaults::all_params;
use sintropia_engines::visual_search::{
    generate_visual_search, SearchColor, SearchShape, SearchType, VisualSearchParams,
    VisualSearchStimulus, SEARCH_SET_SIZES,
};

const CASES: u32 = 256;
const TYPES: [SearchType; 2] = [SearchType::Feature, SearchType::Conjunction];

fn generate(n_trials: u32, isi: (u32, u32), seed: u32) -> Vec<VisualSearchStimulus> {
    let params = VisualSearchParams {
        n_trials,
        isi_min_ms: isi.0,
        isi_max_ms: isi.1,
        ..all_params().visual_search
    };
    generate_visual_search(&params, &mut mulberry32(seed))
}

fn cell_count(sequence: &[VisualSearchStimulus], t: SearchType, size: u32, present: bool) -> usize {
    sequence
        .iter()
        .filter(|s| s.search_type == t && s.set_size == size && s.present == present)
        .count()
}

#[test]
fn should_balance_type_set_size_and_presence_cells() {
    run_prop(
        "visual_search",
        "celle_tipo_numerosita_presenza_bilanciate",
        CASES,
        (0u32..300, any::<u32>()),
        |(n, seed)| {
            let sequence = generate(n, (700, 1100), seed);
            let base = (n / 12) as usize;
            prop_assert_eq!(sequence.len(), n as usize);
            for t in TYPES {
                for size in SEARCH_SET_SIZES {
                    for present in [true, false] {
                        let c = cell_count(&sequence, t, size, present);
                        prop_assert!(
                            c == base || c == base + 1,
                            "{t:?}/{size}/{present}: {c} contro base {base}"
                        );
                    }
                }
            }
            Ok(())
        },
    );
}

#[test]
fn should_give_every_cell_exactly_n_over_twelve_trials_when_n_is_a_multiple_of_twelve() {
    run_prop(
        "visual_search",
        "celle_esattamente_n_su_12",
        CASES,
        (1u32..40, any::<u32>()),
        |(k, seed)| {
            let sequence = generate(k * 12, (700, 1100), seed);
            for t in TYPES {
                for size in SEARCH_SET_SIZES {
                    for present in [true, false] {
                        prop_assert_eq!(cell_count(&sequence, t, size, present), k as usize);
                    }
                }
            }
            Ok(())
        },
    );
}

#[test]
fn should_place_exactly_one_target_when_present_and_none_when_absent() {
    run_prop(
        "visual_search",
        "bersagli_nel_numero_atteso",
        CASES,
        (0u32..150, any::<u32>()),
        |(n, seed)| {
            for s in generate(n, (700, 1100), seed) {
                let targets: Vec<_> = s.items.iter().filter(|i| i.is_target).collect();
                prop_assert_eq!(s.items.len(), s.set_size as usize);
                prop_assert_eq!(targets.len(), usize::from(s.present));
                prop_assert!(targets
                    .iter()
                    .all(|i| i.color == SearchColor::Orange && i.shape == SearchShape::Circle));
            }
            Ok(())
        },
    );
}

#[test]
fn should_compose_distractors_by_search_type_and_keep_items_in_the_unit_field() {
    run_prop(
        "visual_search",
        "distrattori_e_posizioni",
        CASES,
        (0u32..150, any::<u32>()),
        |(n, seed)| {
            for s in generate(n, (700, 1100), seed) {
                let distractors: Vec<_> = s.items.iter().filter(|i| !i.is_target).collect();
                let orange_squares = distractors
                    .iter()
                    .filter(|i| i.color == SearchColor::Orange && i.shape == SearchShape::Square)
                    .count();
                let blue_circles = distractors
                    .iter()
                    .filter(|i| i.color == SearchColor::Blue && i.shape == SearchShape::Circle)
                    .count();
                prop_assert_eq!(orange_squares + blue_circles, distractors.len());
                if s.search_type == SearchType::Feature {
                    prop_assert_eq!(orange_squares, 0);
                } else {
                    prop_assert_eq!(orange_squares, distractors.len() / 2);
                }
                prop_assert!(s
                    .items
                    .iter()
                    .all(|i| (0.0..=1.0).contains(&i.x) && (0.0..=1.0).contains(&i.y)));
            }
            Ok(())
        },
    );
}

#[test]
fn should_draw_isi_within_the_configured_interval() {
    let interval = (0u32..2000, 0u32..2000).prop_map(|(a, b)| (a.min(b), a.max(b)));
    run_prop(
        "visual_search",
        "isi_nell_intervallo",
        CASES,
        (0u32..120, interval, any::<u32>()),
        |(n, isi, seed)| {
            prop_assert!(generate(n, isi, seed)
                .iter()
                .all(|s| (isi.0..=isi.1).contains(&s.isi_ms)));
            Ok(())
        },
    );
}

#[test]
fn should_be_deterministic_for_equal_seed_and_params() {
    run_prop(
        "visual_search",
        "determinismo_a_parita_di_seme",
        CASES,
        (0u32..120, any::<u32>()),
        |(n, seed)| {
            prop_assert_eq!(
                generate(n, (700, 1100), seed),
                generate(n, (700, 1100), seed)
            );
            Ok(())
        },
    );
}
