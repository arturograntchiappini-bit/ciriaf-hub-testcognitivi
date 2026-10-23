//! Macchina a stati per i test a tempo di reazione (porta `src/ui/runtime/sequencer.ts`).
//!
//! Separata dalla GUI e con clock/scheduler iniettabili: testabile con [`FakeEnv`].
//! L'onset è preso al paint dello stimolo (`Scheduler::after_paint`); le risposte
//! confrontano il timestamp del tasto con l'onset.
use crate::types::{Phase, TestId, TrialResult, ValidationFlag};
use crate::validation::ANTICIPATION_CUTOFF_MS;
use std::cell::{Cell, RefCell};
use std::rc::{Rc, Weak};

/// Annulla un timer schedulato.
pub type Cancel = Box<dyn FnOnce()>;

/// Cronometro ad alta risoluzione (ms).
pub trait Clock {
    fn now(&self) -> f64;
}

/// Scheduler astratto: la GUI fornisce l'implementazione reale, i test usano [`FakeEnv`].
pub trait Scheduler {
    /// Esegue `cb` dopo il prossimo paint, passando il timestamp del frame.
    fn after_paint(&self, cb: Box<dyn FnOnce(f64)>) -> Cancel;
    /// Esegue `cb` dopo `ms` millisecondi.
    fn timeout(&self, ms: f64, cb: Box<dyn FnOnce()>) -> Cancel;
}

/// Clock reale basato su `std::time::Instant` (ms dall'istanza di creazione).
/// Su wasm32 `Instant::now` va in panic: lì il [`Clock`] lo implementa l'host.
#[cfg(not(target_arch = "wasm32"))]
pub struct SystemClock(std::time::Instant);

#[cfg(not(target_arch = "wasm32"))]
impl SystemClock {
    pub fn new() -> Self {
        Self(std::time::Instant::now())
    }
}

#[cfg(not(target_arch = "wasm32"))]
impl Default for SystemClock {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(not(target_arch = "wasm32"))]
impl Clock for SystemClock {
    fn now(&self) -> f64 {
        self.0.elapsed().as_secs_f64() * 1000.0
    }
}

/// Specifica di un singolo trial a tempo di reazione.
#[derive(Debug, Clone, PartialEq)]
pub struct TrialSpec {
    pub condition: String,
    /// Etichetta serializzabile dello stimolo (per l'export).
    pub stimulus_label: String,
    /// ISI (ms) che segue questo trial; se `None` si usa il default di config.
    pub isi_ms: Option<f64>,
    /// Payload dello stimolo, usato da render/evaluate della vista.
    pub data: Option<serde_json::Value>,
}

impl TrialSpec {
    pub fn new(condition: impl Into<String>, stimulus_label: impl Into<String>) -> Self {
        Self {
            condition: condition.into(),
            stimulus_label: stimulus_label.into(),
            isi_ms: None,
            data: None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SequencerPhase {
    Idle,
    Fixation,
    Stimulus,
    /// Stimolo nascosto ma finestra di risposta ancora aperta.
    Blank,
    Feedback,
    Isi,
    Done,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Feedback {
    Correct,
    Wrong,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SequencerState {
    pub index: usize,
    pub phase: SequencerPhase,
    pub show_stimulus: bool,
    /// Presente solo in fase di feedback (pratica).
    pub feedback: Option<Feedback>,
}

impl SequencerState {
    fn new(index: usize, phase: SequencerPhase, show_stimulus: bool) -> Self {
        Self {
            index,
            phase,
            show_stimulus,
            feedback: None,
        }
    }
}

pub struct SequencerConfig {
    pub test_id: TestId,
    pub session_id: String,
    pub phase: Phase,
    pub trials: Vec<TrialSpec>,
    pub fixation_ms: f64,
    /// Quanto resta visibile lo stimolo.
    pub stimulus_visible_ms: f64,
    /// Per quanto (dall'onset) si accettano risposte.
    pub response_window_ms: f64,
    /// ISI di default tra i trial.
    pub isi_ms: f64,
    /// Se true, una risposta chiude subito il trial (Stroop).
    pub end_on_response: bool,
    /// Durata del feedback in pratica; 0 = nessun feedback.
    pub feedback_ms: f64,
    /// Tasti accettati (minuscoli).
    pub response_keys: Vec<String>,
    /// True se il trial richiede una risposta; false per withhold (No-Go/non-target).
    pub expects_response: Box<dyn Fn(&TrialSpec) -> bool>,
    /// Correttezza dato lo stimolo e il tasto premuto (`None` se nessuna risposta).
    pub evaluate: Box<dyn Fn(&TrialSpec, Option<&str>) -> bool>,
    pub clock: Rc<dyn Clock>,
    pub scheduler: Rc<dyn Scheduler>,
    pub on_state: Box<dyn Fn(&SequencerState)>,
    pub on_trial_result: Box<dyn Fn(&TrialResult)>,
    pub on_done: Box<dyn Fn()>,
}

#[derive(Default)]
struct Runtime {
    index: usize,
    onset: f64,
    responded: bool,
    response_key: Option<String>,
    rt: Option<f64>,
    interrupted: bool,
    trial_closed: bool,
    /// I tasti prima dell'onset (fissazione) non sono risposte: non hanno un RT.
    stimulus_painted: bool,
    cancels: Vec<Cancel>,
}

struct Inner {
    config: SequencerConfig,
    rt: RefCell<Runtime>,
}

/// Controllo della sequenza. Chiamare [`Sequencer::start`] per avviare.
pub struct Sequencer(Rc<Inner>);

/// Crea il sequencer (non parte finché non si chiama `start`).
pub fn create_sequencer(config: SequencerConfig) -> Sequencer {
    Sequencer(Rc::new(Inner {
        config,
        rt: RefCell::new(Runtime {
            trial_closed: true,
            ..Runtime::default()
        }),
    }))
}

impl Sequencer {
    pub fn start(&self) {
        self.0.rt.borrow_mut().index = 0;
        next_trial(&self.0);
    }

    /// Registra un tasto premuto al `timestamp` (stessa scala del clock).
    pub fn handle_key(&self, key: &str, timestamp: f64) {
        let inner = &self.0;
        let k = key.to_lowercase();
        let end_now = {
            let mut r = inner.rt.borrow_mut();
            if r.trial_closed
                || !r.stimulus_painted
                || !inner.config.response_keys.contains(&k)
                || r.responded
            {
                return; // una sola risposta per trial
            }
            r.responded = true;
            r.response_key = Some(k);
            r.rt = Some(timestamp - r.onset);
            inner.config.end_on_response
        };
        if end_now {
            close_trial(inner);
        }
    }

    /// Perdita di focus/visibilità: chiude il trial corrente come INTERRUPTED.
    pub fn handle_interrupt(&self) {
        {
            let mut r = self.0.rt.borrow_mut();
            if r.trial_closed {
                return;
            }
            r.interrupted = true;
        }
        close_trial(&self.0);
    }

    pub fn cancel(&self) {
        self.0.rt.borrow_mut().trial_closed = true;
        clear_timers(&self.0);
    }
}

fn clear_timers(inner: &Inner) {
    let cancels = std::mem::take(&mut inner.rt.borrow_mut().cancels);
    for c in cancels {
        c();
    }
}

fn push_cancel(inner: &Inner, cancel: Cancel) {
    inner.rt.borrow_mut().cancels.push(cancel);
}

fn emit(inner: &Inner, state: SequencerState) {
    (inner.config.on_state)(&state);
}

/// Schedula `step` dopo `ms`, tenendo solo un riferimento debole (nessun ciclo di Rc).
fn after(inner: &Rc<Inner>, ms: f64, step: fn(&Rc<Inner>)) {
    let weak: Weak<Inner> = Rc::downgrade(inner);
    let cancel = inner.config.scheduler.timeout(
        ms,
        Box::new(move || {
            if let Some(strong) = weak.upgrade() {
                step(&strong);
            }
        }),
    );
    push_cancel(inner, cancel);
}

fn next_trial(inner: &Rc<Inner>) {
    clear_timers(inner);
    let index = inner.rt.borrow().index;
    if index >= inner.config.trials.len() {
        emit(
            inner,
            SequencerState::new(index, SequencerPhase::Done, false),
        );
        (inner.config.on_done)();
        return;
    }
    {
        let mut r = inner.rt.borrow_mut();
        r.responded = false;
        r.response_key = None;
        r.rt = None;
        r.interrupted = false;
        r.trial_closed = false;
        r.stimulus_painted = false;
    }
    if inner.config.fixation_ms > 0.0 {
        emit(
            inner,
            SequencerState::new(index, SequencerPhase::Fixation, false),
        );
        after(inner, inner.config.fixation_ms, start_stimulus);
    } else {
        start_stimulus(inner);
    }
}

fn start_stimulus(inner: &Rc<Inner>) {
    let index = inner.rt.borrow().index;
    emit(
        inner,
        SequencerState::new(index, SequencerPhase::Stimulus, true),
    );
    let weak = Rc::downgrade(inner);
    let cancel = inner.config.scheduler.after_paint(Box::new(move |t| {
        if let Some(strong) = weak.upgrade() {
            on_painted(&strong, t);
        }
    }));
    push_cancel(inner, cancel);
}

fn on_painted(inner: &Rc<Inner>, t: f64) {
    {
        let mut r = inner.rt.borrow_mut();
        r.onset = t;
        r.stimulus_painted = true;
    }
    let cfg = &inner.config;
    if cfg.stimulus_visible_ms < cfg.response_window_ms {
        after(inner, cfg.stimulus_visible_ms, hide_stimulus);
    }
    after(inner, cfg.response_window_ms, close_trial);
}

fn hide_stimulus(inner: &Rc<Inner>) {
    let (closed, index) = {
        let r = inner.rt.borrow();
        (r.trial_closed, r.index)
    };
    if !closed {
        emit(
            inner,
            SequencerState::new(index, SequencerPhase::Blank, false),
        );
    }
}

fn compute_flag(inner: &Inner, trial: &TrialSpec) -> ValidationFlag {
    let r = inner.rt.borrow();
    if r.interrupted {
        return ValidationFlag::Interrupted;
    }
    if r.responded {
        return match r.rt {
            Some(rt) if rt < ANTICIPATION_CUTOFF_MS => ValidationFlag::Anticipation,
            _ => ValidationFlag::Valid,
        };
    }
    // Nessuna risposta: omissione solo se era attesa; altrimenti corretto rifiuto (valido).
    if (inner.config.expects_response)(trial) {
        ValidationFlag::Omission
    } else {
        ValidationFlag::Valid
    }
}

fn close_trial(inner: &Rc<Inner>) {
    {
        let mut r = inner.rt.borrow_mut();
        if r.trial_closed {
            return;
        }
        r.trial_closed = true;
    }
    clear_timers(inner);

    let (index, key, rt, onset, responded) = {
        let r = inner.rt.borrow();
        (r.index, r.response_key.clone(), r.rt, r.onset, r.responded)
    };
    let Some(trial) = inner.config.trials.get(index) else {
        return;
    };
    let correct = (inner.config.evaluate)(trial, if responded { key.as_deref() } else { None });
    let result = TrialResult {
        test_id: inner.config.test_id,
        session_id: inner.config.session_id.clone(),
        trial_index: index as u32,
        phase: inner.config.phase,
        condition: trial.condition.clone(),
        stimulus: trial.stimulus_label.clone(),
        response: key,
        correct,
        rt_ms: if responded { rt } else { None },
        flag: compute_flag(inner, trial),
        onset_timestamp: onset,
    };
    (inner.config.on_trial_result)(&result);

    if inner.config.feedback_ms > 0.0 {
        let fb = if correct {
            Feedback::Correct
        } else {
            Feedback::Wrong
        };
        emit(
            inner,
            SequencerState {
                index,
                phase: SequencerPhase::Feedback,
                show_stimulus: false,
                feedback: Some(fb),
            },
        );
        after(inner, inner.config.feedback_ms, start_isi);
    } else {
        start_isi(inner);
    }
}

fn start_isi(inner: &Rc<Inner>) {
    let (index, gap) = {
        let mut r = inner.rt.borrow_mut();
        let current = r.index;
        let gap = inner
            .config
            .trials
            .get(current)
            .and_then(|t| t.isi_ms)
            .unwrap_or(inner.config.isi_ms);
        r.index += 1;
        (current, gap)
    };
    if gap > 0.0 {
        emit(
            inner,
            SequencerState::new(index, SequencerPhase::Isi, false),
        );
        after(inner, gap, next_trial);
    } else {
        next_trial(inner);
    }
}

struct Timer {
    at: f64,
    cb: Option<Box<dyn FnOnce()>>,
    cancelled: Rc<Cell<bool>>,
}

/// Ambiente di simulazione deterministico: paint sincrono, timer avanzati a mano.
/// Porta `src/ui/runtime/fakeEnv.ts`; utile anche ai test dei crate che usano il sequencer.
#[derive(Default)]
pub struct FakeEnv {
    time: Cell<f64>,
    timers: RefCell<Vec<Timer>>,
}

impl FakeEnv {
    pub fn new() -> Rc<Self> {
        Rc::new(Self::default())
    }

    /// Tempo simulato corrente.
    pub fn time(&self) -> f64 {
        self.time.get()
    }

    /// Avanza il tempo eseguendo in ordine i timer scaduti (a parità, in ordine d'inserimento).
    pub fn advance(&self, ms: f64) {
        let target = self.time.get() + ms;
        loop {
            let next = {
                let mut timers = self.timers.borrow_mut();
                timers.retain(|t| !t.cancelled.get());
                let mut best: Option<usize> = None;
                for (i, t) in timers.iter().enumerate() {
                    if t.at <= target && best.map_or(true, |b| t.at < timers[b].at) {
                        best = Some(i);
                    }
                }
                best.map(|i| timers.remove(i))
            };
            let Some(mut timer) = next else { break };
            self.time.set(timer.at);
            timer.cancelled.set(true);
            if let Some(cb) = timer.cb.take() {
                cb();
            }
        }
        self.time.set(target);
    }
}

impl Clock for FakeEnv {
    fn now(&self) -> f64 {
        self.time.get()
    }
}

impl Scheduler for FakeEnv {
    fn after_paint(&self, cb: Box<dyn FnOnce(f64)>) -> Cancel {
        cb(self.time.get()); // il paint avviene subito nel modello di test
        Box::new(|| {})
    }

    fn timeout(&self, ms: f64, cb: Box<dyn FnOnce()>) -> Cancel {
        let cancelled = Rc::new(Cell::new(false));
        self.timers.borrow_mut().push(Timer {
            at: self.time.get() + ms,
            cb: Some(cb),
            cancelled: Rc::clone(&cancelled),
        });
        Box::new(move || cancelled.set(true))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    type Results = Rc<RefCell<Vec<TrialResult>>>;

    fn base_config(env: &Rc<FakeEnv>, results: &Results) -> SequencerConfig {
        let sink = Rc::clone(results);
        SequencerConfig {
            test_id: TestId::Stroop1,
            session_id: "TEST-0000".into(),
            phase: Phase::Test,
            trials: vec![TrialSpec::new("x", "X")],
            fixation_ms: 500.0,
            stimulus_visible_ms: 3000.0,
            response_window_ms: 3000.0,
            isi_ms: 500.0,
            end_on_response: true,
            feedback_ms: 0.0,
            response_keys: vec!["r".into()],
            expects_response: Box::new(|_| true),
            evaluate: Box::new(|_, k| k == Some("r")),
            clock: env.clone(),
            scheduler: env.clone(),
            on_state: Box::new(|_| {}),
            on_trial_result: Box::new(move |r| sink.borrow_mut().push(r.clone())),
            on_done: Box::new(|| {}),
        }
    }

    fn setup() -> (Rc<FakeEnv>, Results) {
        (FakeEnv::new(), Rc::new(RefCell::new(Vec::new())))
    }

    #[test]
    fn should_mark_valid_and_correct_when_response_at_200_ms() {
        let (env, results) = setup();
        let seq = create_sequencer(base_config(&env, &results));
        seq.start();
        env.advance(500.0);
        env.advance(200.0);
        seq.handle_key("r", env.time());
        let r = results.borrow();
        assert_eq!(r.len(), 1);
        assert_eq!(r[0].flag, ValidationFlag::Valid);
        assert!(r[0].correct);
        assert_eq!(r[0].rt_ms, Some(200.0));
    }

    #[test]
    fn should_ignore_key_pressed_during_fixation() {
        let (env, results) = setup();
        let mut cfg = base_config(&env, &results);
        cfg.trials = vec![TrialSpec::new("x", "X"), TrialSpec::new("x", "Y")];
        let seq = create_sequencer(cfg);
        seq.start();
        env.advance(500.0);
        env.advance(300.0);
        seq.handle_key("r", env.time());
        env.advance(500.0);
        env.advance(200.0);
        seq.handle_key("r", env.time()); // durante la fissazione del 2° trial
        assert_eq!(results.borrow().len(), 1);
        env.advance(300.0);
        env.advance(250.0);
        seq.handle_key("r", env.time());
        assert_eq!(results.borrow().len(), 2);
        assert_eq!(results.borrow()[1].rt_ms, Some(250.0));
    }

    #[test]
    fn should_flag_omission_when_no_response_in_window() {
        let (env, results) = setup();
        let seq = create_sequencer(base_config(&env, &results));
        seq.start();
        env.advance(500.0);
        env.advance(3000.0);
        let r = results.borrow();
        assert_eq!(r[0].flag, ValidationFlag::Omission);
        assert!(!r[0].correct);
        assert_eq!(r[0].rt_ms, None);
    }

    #[test]
    fn should_flag_anticipation_when_response_at_100_ms() {
        let (env, results) = setup();
        let seq = create_sequencer(base_config(&env, &results));
        seq.start();
        env.advance(500.0);
        env.advance(100.0);
        seq.handle_key("r", env.time());
        assert_eq!(results.borrow()[0].flag, ValidationFlag::Anticipation);
    }

    #[test]
    fn should_flag_interrupted_on_focus_loss() {
        let (env, results) = setup();
        let seq = create_sequencer(base_config(&env, &results));
        seq.start();
        env.advance(500.0);
        env.advance(300.0);
        seq.handle_interrupt();
        assert_eq!(results.borrow()[0].flag, ValidationFlag::Interrupted);
    }

    #[test]
    fn should_treat_withheld_nogo_as_valid_correct_rejection_not_omission() {
        let (env, results) = setup();
        let mut cfg = base_config(&env, &results);
        cfg.trials = vec![TrialSpec::new("nogo", "nogo")];
        cfg.fixation_ms = 0.0;
        cfg.stimulus_visible_ms = 800.0;
        cfg.response_window_ms = 800.0;
        cfg.end_on_response = false;
        cfg.response_keys = vec![" ".into()];
        cfg.expects_response = Box::new(|t| t.condition == "go");
        cfg.evaluate = Box::new(|t, k| {
            if t.condition == "go" {
                k.is_some()
            } else {
                k.is_none()
            }
        });
        let seq = create_sequencer(cfg);
        seq.start();
        env.advance(800.0);
        let r = results.borrow();
        assert_eq!(r[0].flag, ValidationFlag::Valid);
        assert!(r[0].correct);
    }

    #[test]
    fn should_ignore_second_press_in_the_same_trial() {
        let (env, results) = setup();
        let seq = create_sequencer(base_config(&env, &results));
        seq.start();
        env.advance(500.0);
        env.advance(200.0);
        seq.handle_key("r", env.time());
        seq.handle_key("r", env.time() + 50.0);
        assert_eq!(results.borrow().len(), 1);
        assert_eq!(results.borrow()[0].rt_ms, Some(200.0));
    }

    #[test]
    fn should_run_all_trials_and_call_on_done() {
        let (env, results) = setup();
        let done = Rc::new(Cell::new(false));
        let mut cfg = base_config(&env, &results);
        cfg.trials = vec![TrialSpec::new("a", "A"), TrialSpec::new("b", "B")];
        let flag = Rc::clone(&done);
        cfg.on_done = Box::new(move || flag.set(true));
        let seq = create_sequencer(cfg);
        seq.start();
        env.advance(500.0);
        env.advance(200.0);
        seq.handle_key("r", env.time());
        env.advance(500.0); // isi
        env.advance(500.0); // fissazione
        env.advance(3000.0); // omissione
        env.advance(500.0); // isi -> done
        assert_eq!(results.borrow().len(), 2);
        assert!(done.get());
    }

    #[test]
    fn should_emit_feedback_state_in_practice() {
        let (env, results) = setup();
        let states = Rc::new(RefCell::new(Vec::new()));
        let sink = Rc::clone(&states);
        let mut cfg = base_config(&env, &results);
        cfg.phase = Phase::Practice;
        cfg.feedback_ms = 400.0;
        cfg.on_state = Box::new(move |s| sink.borrow_mut().push(*s));
        let seq = create_sequencer(cfg);
        seq.start();
        env.advance(500.0);
        env.advance(200.0);
        seq.handle_key("r", env.time());
        assert!(states
            .borrow()
            .iter()
            .any(|s| s.phase == SequencerPhase::Feedback && s.feedback == Some(Feedback::Correct)));
    }

    // --- SART con il sequencer vero (porta sart.sequencer.test.ts, senza scoreSart che vive in `engines`) ---

    const DIGIT_MS: f64 = 250.0;
    const MASK_MS: f64 = 900.0;

    fn sart_spec(digit: u32) -> TrialSpec {
        let mut s = TrialSpec::new(if digit == 3 { "nogo" } else { "go" }, digit.to_string());
        s.isi_ms = Some(0.0);
        s
    }

    fn run_sart(
        trials: Vec<TrialSpec>,
        presses: &[Option<f64>],
    ) -> (Vec<TrialResult>, Vec<SequencerPhase>) {
        let (env, results) = setup();
        let phases = Rc::new(RefCell::new(Vec::new()));
        let sink = Rc::clone(&phases);
        let mut cfg = base_config(&env, &results);
        cfg.test_id = TestId::Sart;
        cfg.trials = trials;
        cfg.fixation_ms = 0.0;
        cfg.stimulus_visible_ms = DIGIT_MS;
        cfg.response_window_ms = DIGIT_MS + MASK_MS;
        cfg.isi_ms = 0.0;
        cfg.end_on_response = false;
        cfg.response_keys = vec![" ".into()];
        cfg.expects_response = Box::new(|t| t.condition == "go");
        cfg.evaluate = Box::new(|t, k| {
            if t.condition == "go" {
                k.is_some()
            } else {
                k.is_none()
            }
        });
        cfg.on_state = Box::new(move |s| sink.borrow_mut().push(s.phase));
        let seq = create_sequencer(cfg);
        seq.start();
        for at in presses {
            if let Some(ms) = at {
                env.advance(*ms);
                seq.handle_key(" ", env.time());
            }
            env.advance(DIGIT_MS + MASK_MS - at.unwrap_or(0.0));
        }
        let out = results.borrow().clone();
        let seen = phases.borrow().clone();
        (out, seen)
    }

    fn commissions(results: &[TrialResult]) -> usize {
        results
            .iter()
            .filter(|r| r.condition == "nogo" && r.response.is_some())
            .count()
    }

    fn omissions(results: &[TrialResult]) -> usize {
        results
            .iter()
            .filter(|r| r.condition == "go" && r.response.is_none())
            .count()
    }

    #[test]
    fn should_count_a_withheld_sart_target_as_correct_and_not_as_commission() {
        let (results, _) = run_sart(
            vec![sart_spec(5), sart_spec(3), sart_spec(7)],
            &[Some(400.0), None, Some(380.0)],
        );
        assert!(results
            .iter()
            .all(|r| r.flag == ValidationFlag::Valid && r.correct));
        assert_eq!(commissions(&results), 0);
        assert_eq!(omissions(&results), 0);
        let go_rts: Vec<f64> = results
            .iter()
            .filter(|r| r.condition == "go")
            .filter_map(|r| r.rt_ms)
            .collect();
        assert_eq!(crate::validation::mean(&go_rts), 390.0);
    }

    #[test]
    fn should_record_a_press_during_the_mask_with_rt_from_digit_onset() {
        let (results, phases) = run_sart(vec![sart_spec(5)], &[Some(600.0)]);
        assert!(phases.contains(&SequencerPhase::Blank));
        assert_eq!(results[0].rt_ms, Some(600.0));
    }

    #[test]
    fn should_flag_commission_on_target_press_and_omission_on_missing_go_press() {
        let (results, _) = run_sart(vec![sart_spec(3), sart_spec(5)], &[Some(350.0), None]);
        assert_eq!(commissions(&results), 1);
        assert_eq!(omissions(&results), 1);
        assert_eq!(results[1].flag, ValidationFlag::Omission);
    }

    #[test]
    fn should_run_sart_digits_back_to_back_without_a_gap() {
        let (results, _) = run_sart(
            vec![sart_spec(1), sart_spec(2), sart_spec(4)],
            &[None, None, None],
        );
        assert_eq!(results.len(), 3);
        assert_eq!(
            results[1].onset_timestamp - results[0].onset_timestamp,
            DIGIT_MS + MASK_MS
        );
    }
}
