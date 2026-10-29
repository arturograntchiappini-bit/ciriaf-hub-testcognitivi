//! Contratto di esecuzione dei test e costruzione dei runner.
use std::collections::BTreeMap;

use eframe::egui;
use sintropia_core::{TestId, TestResult};

use crate::views_custom::{self, numbers_to_params, RunnerSpec};

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

/// Costruisce il runner di un test. I test a tempo di reazione usano il runner condiviso di `views`;
/// Corsi, WCST e Trail Making le viste di `views_custom`.
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
        TestId::Corsi | TestId::Wcst | TestId::TrailMaking => {
            let json = numbers_to_params(&params);
            views_custom::create_custom_runner(&RunnerSpec {
                test_id: test,
                params: &json,
                session_id: &run.session_id,
                started_at: &run.started_at,
                seed: run.seed,
                practice: run.practice,
                feedback: run.feedback_during_test,
            })
            .ok_or_else(|| format!("nessuna vista per {test}"))
        }
    }
}

/// Fabbrica per la modalità Sessione: stessi runner dell'esecuzione singola; `None` se i parametri sono invalidi.
pub fn session_factory(spec: &RunnerSpec) -> Option<Box<dyn TestRunner>> {
    let numbers: BTreeMap<String, f64> = spec
        .params
        .iter()
        .filter_map(|(k, v)| v.as_f64().map(|n| (k.clone(), n)))
        .collect();
    create_runner(
        spec.test_id,
        numbers,
        spec.session_id.to_string(),
        spec.started_at.to_string(),
        spec.seed,
        spec.practice,
        spec.feedback,
    )
    .ok()
}
