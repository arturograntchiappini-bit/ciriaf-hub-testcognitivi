//! Viste di esecuzione dei test (porta `src/ui/tests/*View.tsx`) e runner condiviso.
//!
//! Ogni vista RT espone `plan(params, &RunContext) -> RtPlan<S>` (pura, testabile) e
//! `runner(&BTreeMap<String, f64>, RunContext) -> Result<Box<dyn TestRunner>, String>`.
use std::collections::BTreeMap;

use eframe::egui::{self, Align2, Color32, FontId, Pos2};
use serde::de::DeserializeOwned;
use serde::Serialize;
use serde_json::{Map, Value};
use sintropia_core::sequencer::TrialSpec;

use crate::runner::TestRunner;

pub mod chrome;
pub mod flanker;
pub mod gonogo;
pub mod mental_rotation;
pub mod nback;
pub mod pvt;
pub mod rt;
pub mod sart;
pub mod stroop;
pub mod visual_search;
// TODO(altro agente): `pub mod corsi;` e `pub mod wcst;` (CorsiRunner, WcstRunner) — vedi `runner::create_runner`.

pub use rt::RunContext;
use rt::{RtPlan, RtRunner};

/// Grassetto simulato (Inter è incorporato solo nel peso Regular): il testo disegnato due volte con 1 px di scarto.
pub fn bold_text(painter: &egui::Painter, pos: Pos2, text: &str, font: FontId, color: Color32) {
    let dx_px = (font.size * 0.006).max(0.5);
    for dx in [-dx_px, dx_px] {
        painter.text(
            pos + egui::vec2(dx, 0.0),
            Align2::CENTER_CENTER,
            text,
            font.clone(),
            color,
        );
    }
}

/// Costruisce i parametri tipizzati di un motore dalla mappa piatta delle impostazioni.
/// I valori interi diventano interi JSON (i campi `u32` rifiutano `3000.0`).
pub fn parse_params<T: DeserializeOwned>(params: &BTreeMap<String, f64>) -> Result<T, String> {
    let object: Map<String, Value> = params
        .iter()
        .map(|(key, &value)| {
            let number = if value.fract() == 0.0 && value.abs() < 9.0e15 {
                Value::from(value as i64)
            } else {
                Value::from(value)
            };
            (key.clone(), number)
        })
        .collect();
    serde_json::from_value(Value::Object(object)).map_err(|e| format!("parametri non validi: {e}"))
}

/// Parametri effettivamente usati, nell'ordine di dichiarazione dei campi (come `{...params}` del TS).
pub fn params_object<T: Serialize>(params: &T) -> Map<String, Value> {
    match serde_json::to_value(params) {
        Ok(Value::Object(map)) => map,
        _ => Map::new(),
    }
}

/// Spec di un trial; `correct_key` (se c'è) finisce nel `data` ed è letto da `evaluate_expected_key`.
pub fn trial_spec(
    condition: &str,
    label: String,
    isi_ms: Option<f64>,
    correct_key: Option<&str>,
) -> TrialSpec {
    TrialSpec {
        condition: condition.into(),
        stimulus_label: label,
        isi_ms,
        data: correct_key.map(|k| Value::String(k.into())),
    }
}

/// Incapsula un piano nel runner egui.
pub fn boxed_runner<S: 'static>(plan: RtPlan<S>, ctx: &RunContext) -> Box<dyn TestRunner> {
    Box::new(RtRunner::new(plan, ctx.practice, ctx.feedback_during_test))
}

/// Colori degli stimoli (da `src/ui/theme.ts`, `STIMULUS_COLORS`).
pub mod palette {
    use eframe::egui::Color32;

    pub const GO_GREEN: Color32 = Color32::from_rgb(0x2E, 0x7D, 0x32);
    pub const NOGO_RED: Color32 = Color32::from_rgb(0xD0, 0x02, 0x1B);
}

#[cfg(test)]
mod smoke_tests {
    //! Esegue ogni runner RT per alcuni frame headless: il disegno di tutti gli stimoli non deve andare in panic.
    use std::time::Duration;

    use eframe::egui;
    use sintropia_core::TestId;

    use crate::runner::{create_runner, RunnerStatus};
    use crate::settings::Settings;

    const ALL_TESTS: [TestId; 12] = [
        TestId::Stroop1,
        TestId::Stroop2,
        TestId::Gonogo,
        TestId::Flanker,
        TestId::Sart,
        TestId::Pvt,
        TestId::Nback,
        TestId::VisualSearch,
        TestId::MentalRotation,
        TestId::Corsi,
        TestId::Wcst,
        TestId::TrailMaking,
    ];
    const SIZES: [(f32, f32); 3] = [(900.0, 600.0), (1280.0, 800.0), (2560.0, 1440.0)];

    fn run_frames(test: TestId, frames: usize, size: (f32, f32)) {
        let ctx = egui::Context::default();
        crate::theme::install_fonts(&ctx);
        let mut params = Settings::default().effective(test.as_str());
        if params.contains_key("fixationMs") {
            params.insert("fixationMs".into(), 0.0); // lo stimolo compare subito
        }
        let mut runner = create_runner(
            test,
            params,
            "S-TEST".into(),
            "2026-01-01T00:00:00.000Z".into(),
            7,
            true,
            false,
        )
        .expect("runner creabile coi parametri di default");
        for frame in 0..frames {
            let input = egui::RawInput {
                screen_rect: Some(egui::Rect::from_min_size(
                    egui::Pos2::ZERO,
                    egui::vec2(size.0, size.1),
                )),
                ..Default::default()
            };
            let mut output = ctx.run_ui(input, |ui| {
                egui::CentralPanel::default().show(ui, |ui| {
                    assert!(
                        matches!(runner.ui(ui), RunnerStatus::Running),
                        "{test} frame {frame}"
                    );
                });
            });
            output.textures_delta.clear();
            std::thread::sleep(Duration::from_millis(12));
        }
    }

    #[test]
    fn should_draw_every_test_for_several_frames_at_any_window_size_without_panic() {
        for test in ALL_TESTS {
            for size in SIZES {
                run_frames(test, 8, size);
            }
        }
    }
}
