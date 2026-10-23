//! Runtime di temporizzazione per egui: `Scheduler` e `Clock` guidati dai frame.
//!
//! Scelte di timing (documentate perché determinano la precisione delle misure):
//! - L'orologio è `std::time::Instant` (monotono), in ms dalla creazione di [`EguiEnv`].
//! - I timer non hanno thread: scadono quando la GUI chiama [`EguiEnv::pump`] all'inizio di un
//!   frame. Una durata è quindi quantizzata al frame (≈ 16,7 ms a 60 Hz, vsync attivo).
//! - Un timer lanciato da un altro timer parte dal suo istante *nominale*, non da quello (in ritardo)
//!   a cui è stato eseguito: i ritardi di frame non si accumulano lungo la catena
//!   fissazione → stimolo → ISI.
//! - `after_paint` esegue la callback al frame SUCCESSIVO a quello in cui lo stimolo è stato
//!   disegnato, con l'istante di inizio di quel frame: con vsync, `swap_buffers` ritorna quando il
//!   frame precedente è stato presentato, quindi l'inizio del frame successivo è la migliore stima
//!   dell'onset visibile che egui consenta (non espone il timestamp di presentazione).
//! - I tasti non hanno un timestamp per evento in egui: valgono l'inizio del frame in cui sono letti
//!   (errore massimo: un frame, stessa quantizzazione dell'onset).
use std::cell::{Cell, RefCell};
use std::rc::Rc;
use std::time::{Instant, SystemTime, UNIX_EPOCH};

use eframe::egui;
use sintropia_core::sequencer::{Cancel, Clock, Scheduler};

struct Timer {
    at: f64,
    cb: Option<Box<dyn FnOnce()>>,
    cancelled: Rc<Cell<bool>>,
}

struct PaintCallback {
    cb: Box<dyn FnOnce(f64)>,
    cancelled: Rc<Cell<bool>>,
}

/// Orologio e scheduler per la GUI. Condiviso (`Rc`) fra il runner e il sequencer.
pub struct EguiEnv {
    epoch: Instant,
    /// Inizio dell'ultimo frame (ms).
    frame_ms: Cell<f64>,
    /// Base temporale dei nuovi timer mentre ne sta girando uno (istante nominale).
    nominal_ms: Cell<f64>,
    in_pump: Cell<bool>,
    timers: RefCell<Vec<Timer>>,
    paints: RefCell<Vec<PaintCallback>>,
}

impl EguiEnv {
    pub fn new() -> Rc<Self> {
        Rc::new(Self {
            epoch: Instant::now(),
            frame_ms: Cell::new(0.0),
            nominal_ms: Cell::new(0.0),
            in_pump: Cell::new(false),
            timers: RefCell::new(Vec::new()),
            paints: RefCell::new(Vec::new()),
        })
    }

    fn elapsed_ms(&self) -> f64 {
        self.epoch.elapsed().as_secs_f64() * 1000.0
    }

    /// Inizio del frame corrente (ms).
    pub fn frame_ms(&self) -> f64 {
        self.frame_ms.get()
    }

    /// Da chiamare all'inizio di ogni frame: lancia le callback di paint in attesa e i timer scaduti.
    pub fn pump(&self) {
        self.pump_at(self.elapsed_ms());
    }

    /// Come [`pump`](Self::pump) con l'istante `now` esplicito (testabile senza orologio reale).
    pub fn pump_at(&self, now: f64) {
        self.frame_ms.set(now);
        self.in_pump.set(true);
        // Le callback accodate da ciò che gira ora restano per il frame successivo.
        let paints = std::mem::take(&mut *self.paints.borrow_mut());
        self.nominal_ms.set(now);
        for paint in paints {
            if !paint.cancelled.get() {
                (paint.cb)(now);
            }
        }
        while let Some(mut timer) = self.take_due_timer(now) {
            self.nominal_ms.set(timer.at);
            if let Some(cb) = timer.cb.take() {
                cb();
            }
        }
        self.nominal_ms.set(now);
        self.in_pump.set(false);
    }

    /// Estrae il timer scaduto più vecchio (a parità, il primo inserito).
    fn take_due_timer(&self, now: f64) -> Option<Timer> {
        let mut timers = self.timers.borrow_mut();
        timers.retain(|t| !t.cancelled.get());
        let (index, _) = timers
            .iter()
            .enumerate()
            .filter(|(_, t)| t.at <= now)
            .min_by(|(_, a), (_, b)| a.at.total_cmp(&b.at))?;
        Some(timers.remove(index))
    }

    /// Una callback di paint attende il prossimo frame.
    pub fn has_pending_paint(&self) -> bool {
        self.paints.borrow().iter().any(|p| !p.cancelled.get())
    }

    /// Ms al prossimo timer (0 se già scaduto), per `request_repaint_after`.
    pub fn next_timer_in_ms(&self) -> Option<f64> {
        let now = self.elapsed_ms();
        self.timers
            .borrow()
            .iter()
            .filter(|t| !t.cancelled.get())
            .map(|t| (t.at - now).max(0.0))
            .min_by(f64::total_cmp)
    }

    /// Chiede a egui il prossimo frame: subito se serve un paint, altrimenti alla scadenza del timer.
    pub fn request_repaint(&self, ctx: &egui::Context) {
        if self.has_pending_paint() {
            ctx.request_repaint();
        } else if let Some(ms) = self.next_timer_in_ms() {
            ctx.request_repaint_after(std::time::Duration::from_secs_f64(ms / 1000.0));
        }
    }

    fn base_ms(&self) -> f64 {
        if self.in_pump.get() {
            self.nominal_ms.get()
        } else {
            self.elapsed_ms()
        }
    }
}

impl Clock for EguiEnv {
    fn now(&self) -> f64 {
        self.elapsed_ms()
    }
}

impl Scheduler for EguiEnv {
    fn after_paint(&self, cb: Box<dyn FnOnce(f64)>) -> Cancel {
        let cancelled = Rc::new(Cell::new(false));
        self.paints.borrow_mut().push(PaintCallback {
            cb,
            cancelled: Rc::clone(&cancelled),
        });
        Box::new(move || cancelled.set(true))
    }

    fn timeout(&self, ms: f64, cb: Box<dyn FnOnce()>) -> Cancel {
        let cancelled = Rc::new(Cell::new(false));
        self.timers.borrow_mut().push(Timer {
            at: self.base_ms() + ms,
            cb: Some(cb),
            cancelled: Rc::clone(&cancelled),
        });
        Box::new(move || cancelled.set(true))
    }
}

/// Nome del tasto come lo usa il sequencer (stesso lessico del `KeyboardEvent.key` minuscolo del TS).
pub fn key_name(key: egui::Key) -> Option<&'static str> {
    use egui::Key;
    Some(match key {
        Key::R => "r",
        Key::V => "v",
        Key::B => "b",
        Key::G => "g",
        Key::Space => " ",
        Key::ArrowLeft => "arrowleft",
        Key::ArrowRight => "arrowright",
        _ => return None,
    })
}

/// Seme fresco (< 1e9, come `Math.floor(Math.random() * 1e9)` del TS) dai nanosecondi di sistema.
pub fn fresh_seed() -> u32 {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| d.as_nanos());
    (nanos % 1_000_000_000) as u32
}

const SESSION_ALPHABET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/// ID di sessione `XXXX-HHMM` come `makeSessionId` del TS. Ora e minuti sono quelli dell'ISO UTC
/// `started_at` (nessuna dipendenza da un fuso orario locale); le 4 lettere derivano dal `seed`.
pub fn session_id_for(started_at: &str, seed: u32) -> String {
    let mut rest = u64::from(seed);
    let code: String = (0..4)
        .map(|_| {
            let c = SESSION_ALPHABET[(rest % SESSION_ALPHABET.len() as u64) as usize];
            rest /= SESSION_ALPHABET.len() as u64;
            char::from(c)
        })
        .collect();
    let hhmm: String = started_at
        .get(11..16)
        .map(|t| t.replace(':', ""))
        .unwrap_or_else(|| "0000".into());
    format!("{code}-{hhmm}")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn log() -> Rc<RefCell<Vec<String>>> {
        Rc::new(RefCell::new(Vec::new()))
    }

    #[test]
    fn should_fire_a_timer_only_once_it_is_due() {
        let env = EguiEnv::new();
        let events = log();
        let sink = Rc::clone(&events);
        let _cancel = env.timeout(100.0, Box::new(move || sink.borrow_mut().push("t".into())));
        env.pump_at(50.0);
        assert!(events.borrow().is_empty());
        env.pump_at(130.0);
        assert_eq!(*events.borrow(), ["t"]);
        env.pump_at(500.0);
        assert_eq!(events.borrow().len(), 1);
    }

    #[test]
    fn should_not_fire_a_cancelled_timer() {
        let env = EguiEnv::new();
        let events = log();
        let sink = Rc::clone(&events);
        let cancel = env.timeout(10.0, Box::new(move || sink.borrow_mut().push("t".into())));
        cancel();
        env.pump_at(1000.0);
        assert!(events.borrow().is_empty());
    }

    #[test]
    fn should_run_paint_callback_on_the_frame_after_it_was_requested_with_that_frame_time() {
        let env = EguiEnv::new();
        let seen = Rc::new(Cell::new(f64::NAN));
        env.pump_at(100.0); // frame in cui lo stimolo viene disegnato
        let sink = Rc::clone(&seen);
        let _cancel = env.after_paint(Box::new(move |t| sink.set(t)));
        assert!(env.has_pending_paint());
        assert!(seen.get().is_nan(), "non deve girare nello stesso frame");
        env.pump_at(117.0);
        assert_eq!(seen.get(), 117.0);
        assert!(!env.has_pending_paint());
    }

    #[test]
    fn should_defer_a_paint_requested_by_a_timer_to_the_next_frame() {
        let env = EguiEnv::new();
        let env2 = Rc::clone(&env);
        let seen = Rc::new(Cell::new(f64::NAN));
        let sink = Rc::clone(&seen);
        let _t = env.timeout(
            10.0,
            Box::new(move || {
                let sink = Rc::clone(&sink);
                let _c = env2.after_paint(Box::new(move |t| sink.set(t)));
            }),
        );
        env.pump_at(20.0);
        assert!(seen.get().is_nan());
        env.pump_at(37.0);
        assert_eq!(seen.get(), 37.0);
    }

    #[test]
    fn should_chain_timers_from_the_nominal_time_without_accumulating_frame_lag() {
        let env = EguiEnv::new();
        let env2 = Rc::clone(&env);
        let fired_at = Rc::new(RefCell::new(Vec::<f64>::new()));
        let sink = Rc::clone(&fired_at);
        let _t = env.timeout(
            100.0,
            Box::new(move || {
                let sink = Rc::clone(&sink);
                let env3 = Rc::clone(&env2);
                let _c = env2.timeout(
                    100.0,
                    Box::new(move || sink.borrow_mut().push(env3.frame_ms())),
                );
            }),
        );
        env.pump_at(116.0); // primo timer in ritardo di 16 ms
        env.pump_at(199.0); // il secondo è nominalmente a 200: non ancora
        assert!(fired_at.borrow().is_empty());
        env.pump_at(205.0);
        assert_eq!(*fired_at.borrow(), [205.0]);
    }

    #[test]
    fn should_map_response_keys_to_sequencer_names() {
        assert_eq!(key_name(egui::Key::Space), Some(" "));
        assert_eq!(key_name(egui::Key::ArrowLeft), Some("arrowleft"));
        assert_eq!(key_name(egui::Key::R), Some("r"));
        assert_eq!(key_name(egui::Key::Escape), None);
    }

    #[test]
    fn should_build_session_id_like_the_web_app() {
        let id = session_id_for("2026-10-23T14:07:31.000Z", 123_456_789);
        assert_eq!(id.len(), 9);
        assert!(id.ends_with("-1407"));
        assert_eq!(id, session_id_for("2026-10-23T14:07:31.000Z", 123_456_789));
        assert!(fresh_seed() < 1_000_000_000);
    }
}
