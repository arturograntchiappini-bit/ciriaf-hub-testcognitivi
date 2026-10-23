//! Contratto di esecuzione dei test. Il runtime e le viste dei singoli test lo implementeranno;
//! `create_runner` instrada ai runner dei test (vedi `views`); per ora gli altri restano segnaposto.
use std::collections::BTreeMap;

use eframe::egui;
use sintropia_core::{TestId, TestResult};

use crate::theme;

#[allow(dead_code)] // Finished lo userà il runtime dei test
pub enum RunnerStatus {
    Running,
    Finished(Box<TestResult>),
    Aborted,
}

pub trait TestRunner {
    fn test_id(&self) -> TestId;
    /// Disegna il test nell'area stimoli e dice se è ancora in corso.
    fn ui(&mut self, ui: &mut egui::Ui) -> RunnerStatus;
}

/// Segnaposto «Esecuzione in arrivo».
struct PlaceholderRunner {
    test: TestId,
    params: BTreeMap<String, f64>,
}

impl TestRunner for PlaceholderRunner {
    fn test_id(&self) -> TestId {
        self.test
    }

    fn ui(&mut self, ui: &mut egui::Ui) -> RunnerStatus {
        let mut status = RunnerStatus::Running;
        ui.vertical_centered(|ui| {
            ui.add_space(60.0);
            ui.label(
                egui::RichText::new("ESECUZIONE IN ARRIVO")
                    .font(egui::FontId::new(34.0, theme::display_family()))
                    .color(theme::stimulus::INK),
            );
            ui.label(
                egui::RichText::new(format!(
                    "{} · {} parametri pronti",
                    self.test,
                    self.params.len()
                ))
                .monospace()
                .color(theme::stimulus::MUTED),
            );
            ui.add_space(24.0);
            if ui.button("Torna alla dashboard").clicked() {
                status = RunnerStatus::Aborted;
            }
            ui.add_space(60.0);
        });
        status
    }
}

/// Costruisce il runner di un test. I test a tempo di reazione (Stroop, Go/No-Go, Flanker, SART, PVT,
/// N-Back, Visual Search, Mental Rotation) usano il runner condiviso di `views`; gli altri restano
/// segnaposto finché non hanno la propria vista.
pub fn create_runner(
    test: TestId,
    params: BTreeMap<String, f64>,
    session_id: String,
    started_at: String,
    seed: u32,
    practice: bool,
    feedback_during_test: bool,
) -> Result<Box<dyn TestRunner>, String> {
    use crate::views::{self, RunContext};
    let run = RunContext {
        session_id,
        started_at,
        seed,
        practice,
        feedback_during_test,
    };
    match test {
        TestId::Stroop1 | TestId::Stroop2 => views::stroop::runner(test, &params, run),
        TestId::Gonogo => views::gonogo::runner(&params, run),
        TestId::Flanker => views::flanker::runner(&params, run),
        TestId::Sart => views::sart::runner(&params, run),
        TestId::Pvt => views::pvt::runner(&params, run),
        TestId::Nback => views::nback::runner(&params, run),
        TestId::VisualSearch => views::visual_search::runner(&params, run),
        TestId::MentalRotation => views::mental_rotation::runner(&params, run),
        // TODO(altro agente): `TestId::Corsi => crate::views::corsi::CorsiRunner::new(..)` e
        // `TestId::Wcst => crate::views::wcst::WcstRunner::new(..)`; Trail Making ha il motore ma non ancora la vista.
        TestId::Corsi | TestId::Wcst | TestId::TrailMaking => {
            Ok(Box::new(PlaceholderRunner { test, params }))
        }
    }
}
