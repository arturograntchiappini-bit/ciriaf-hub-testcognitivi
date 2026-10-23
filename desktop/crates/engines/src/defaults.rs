//! Parametri di default dei test (porta `src/config/defaults.ts`). Ogni valore è ancorato a una
//! fonte scientifica (vedi `docs/scientific/*.md`); sono tutti regolabili dalle impostazioni.
use crate::flanker::FlankerParams;
use crate::gonogo::GoNoGoParams;
use crate::sart::SartParams;
use crate::stroop::StroopParams;
use crate::visual_search::VisualSearchParams;
use crate::{corsi, mental_rotation, nback, pvt, trail_making, wcst};
use serde::{Deserialize, Serialize};

/// Parametri di tutti i test; i nomi dei campi coincidono con le chiavi di `AllParams` del TS.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AllParams {
    pub stroop1: StroopParams,
    pub stroop2: StroopParams,
    pub gonogo: GoNoGoParams,
    pub corsi: corsi::Params,
    pub nback: nback::Params,
    pub wcst: wcst::Params,
    pub pvt: pvt::Params,
    pub flanker: FlankerParams,
    pub sart: SartParams,
    pub visual_search: VisualSearchParams,
    pub mental_rotation: mental_rotation::Params,
    pub trail_making: trail_making::Params,
}

/// Stroop 1/2: 48 trial, fissazione 500 ms, timeout 3000 ms, ISI 500 ms, 8 di pratica.
fn stroop_base() -> StroopParams {
    StroopParams {
        n_trials: 48,
        fixation_ms: 500,
        timeout_ms: 3000,
        isi_ms: 500,
        practice_trials: 8,
    }
}

/// Valori di default di tutti i test, identici a `DEFAULTS` del TS.
pub fn all_params() -> AllParams {
    AllParams {
        stroop1: stroop_base(),
        stroop2: stroop_base(),
        gonogo: GoNoGoParams {
            n_trials: 80,
            go_ratio: 0.75,
            stimulus_ms: 800,
            isi_min_ms: 500,
            isi_max_ms: 1000,
            practice_trials: 10,
        },
        corsi: corsi::Params {
            start_length: 3,
            max_length: 9,
            trials_per_level: 2,
            present_ms_per_block: 1000.0,
            complexity_tolerance: 8.0,
        },
        nback: nback::Params {
            n: 2,
            letter_ms: 500.0,
            blank_ms: 1500.0,
            n_trials: 360,
            target_rate: 0.3,
            lure_rate: Some(0.2),
            practice_trials: 20,
        },
        wcst: wcst::Params {
            deck_size: 64,
            run_to_shift: 10,
            max_categories: 6,
        },
        pvt: pvt::Params {
            n_trials: 100,
            stimulus_max_ms: 10000.0,
            isi_min_ms: 2000,
            isi_max_ms: 10000,
            practice_trials: 5,
        },
        flanker: FlankerParams {
            n_trials: 96,
            incongruent_ratio: 0.4,
            neutral_ratio: 0.2,
            fixation_ms: 500,
            response_window_ms: 1500,
            isi_min_ms: 700,
            isi_max_ms: 1100,
            practice_trials: 12,
        },
        sart: SartParams {
            n_trials: 225,
            target_digit: 3,
            digit_ms: 250,
            mask_ms: 900,
            practice_trials: 18,
        },
        visual_search: VisualSearchParams {
            n_trials: 96,
            fixation_ms: 500,
            response_window_ms: 4000,
            isi_min_ms: 700,
            isi_max_ms: 1100,
            practice_trials: 8,
        },
        mental_rotation: mental_rotation::Params {
            n_trials: 84,
            fixation_ms: 500.0,
            response_window_ms: 8000.0,
            isi_min_ms: 700,
            isi_max_ms: 1100,
            practice_trials: 6,
        },
        trail_making: trail_making::Params {
            n_targets: 25,
            practice_targets: 8,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_match_ts_defaults_for_key_values() {
        let p = all_params();
        assert_eq!(p.stroop1, p.stroop2);
        assert_eq!(
            (
                p.stroop1.n_trials,
                p.stroop1.timeout_ms,
                p.stroop1.practice_trials
            ),
            (48, 3000, 8)
        );
        assert_eq!(
            (p.gonogo.n_trials, p.gonogo.go_ratio, p.gonogo.stimulus_ms),
            (80, 0.75, 800)
        );
        assert_eq!(
            (
                p.corsi.start_length,
                p.corsi.max_length,
                p.corsi.complexity_tolerance
            ),
            (3, 9, 8.0)
        );
        assert_eq!(
            (p.nback.n, p.nback.n_trials, p.nback.lure_rate),
            (2, 360, Some(0.2))
        );
        assert_eq!(
            (p.wcst.deck_size, p.wcst.run_to_shift, p.wcst.max_categories),
            (64, 10, 6)
        );
        assert_eq!(
            (p.pvt.n_trials, p.pvt.isi_min_ms, p.pvt.isi_max_ms),
            (100, 2000, 10000)
        );
        assert_eq!(
            (
                p.flanker.n_trials,
                p.flanker.incongruent_ratio,
                p.flanker.neutral_ratio
            ),
            (96, 0.4, 0.2)
        );
        assert_eq!(
            (
                p.sart.n_trials,
                p.sart.target_digit,
                p.sart.digit_ms,
                p.sart.mask_ms
            ),
            (225, 3, 250, 900)
        );
        assert_eq!(
            (p.visual_search.n_trials, p.visual_search.response_window_ms),
            (96, 4000)
        );
        assert_eq!(
            (
                p.mental_rotation.n_trials,
                p.mental_rotation.response_window_ms
            ),
            (84, 8000.0)
        );
        assert_eq!(
            (p.trail_making.n_targets, p.trail_making.practice_targets),
            (25, 8)
        );
    }

    #[test]
    fn should_serialize_with_camel_case_keys_like_ts() {
        let json = serde_json::to_value(all_params()).unwrap();
        assert_eq!(json["visualSearch"]["nTrials"], 96);
        assert_eq!(json["mentalRotation"]["practiceTrials"], 6);
        assert_eq!(json["sart"]["targetDigit"], 3);
        assert_eq!(json["trailMaking"]["nTargets"], 25);
        assert_eq!(json["trailMaking"]["practiceTargets"], 8);
    }
}
