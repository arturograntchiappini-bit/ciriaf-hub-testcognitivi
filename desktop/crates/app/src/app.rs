//! Stato dell'applicazione, navigazione tra schermate e cornice (header).
use std::collections::HashMap;
use std::path::PathBuf;

use eframe::egui;
use sintropia_core::{TestId, TestResult};

use crate::markdown::{self, Block};
use crate::runner::{self, RunnerStatus, TestRunner};
use crate::settings::{self, Settings};
use crate::theme;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Screen {
    Dashboard,
    Instructions(TestId),
    Running(TestId),
    Results,
    Settings,
    Session,
    Papers,
    PaperReader(usize),
}

pub struct SintropiaApp {
    pub screen: Screen,
    pub settings: Settings,
    pub settings_path: PathBuf,
    pub settings_dirty: bool,
    pub status_message: Option<String>,
    pub runner: Option<Box<dyn TestRunner>>,
    pub result: Option<TestResult>,
    pub result_path_input: String,
    pub paper_cache: HashMap<usize, Vec<Block>>,
}

impl SintropiaApp {
    pub fn new() -> Self {
        let settings_path = settings::default_path();
        Self {
            screen: Screen::Dashboard,
            settings: Settings::load_from(&settings_path),
            settings_path,
            settings_dirty: false,
            status_message: None,
            runner: None,
            result: None,
            result_path_input: String::new(),
            paper_cache: HashMap::new(),
        }
    }

    pub fn navigate(&mut self, screen: Screen) {
        self.status_message = None;
        self.screen = screen;
    }

    pub fn start_test(&mut self, test: TestId) {
        let params = self.settings.effective(test.as_str());
        let started_at = sintropia_core::export::iso_now();
        let seed = crate::runtime::fresh_seed();
        let session_id = crate::runtime::session_id_for(&started_at, seed);
        match runner::create_runner(test, params, session_id, started_at, seed, true, false) {
            Ok(created) => {
                self.runner = Some(created);
                self.navigate(Screen::Running(test));
            }
            Err(message) => self.status_message = Some(message),
        }
    }

    pub fn paper_blocks(&mut self, index: usize) -> &[Block] {
        self.paper_cache
            .entry(index)
            .or_insert_with(|| markdown::parse_blocks(crate::papers::PAPERS[index].source))
    }

    fn header(&mut self, ui: &mut egui::Ui) {
        egui::Panel::top("header")
            .frame(
                egui::Frame::new()
                    .fill(theme::SURFACE)
                    .stroke(egui::Stroke::new(1.0, theme::LINE))
                    .inner_margin(egui::Margin::symmetric(20, 10)),
            )
            .show(ui, |ui| {
                ui.horizontal(|ui| {
                    ui.label(theme::display_text("Sintropia", 28.0, theme::INK, 3.0));
                    ui.label(theme::display_text(
                        "— Cognitive tests Hub",
                        28.0,
                        theme::ACCENT,
                        3.0,
                    ));
                    ui.add_space(24.0);
                    self.nav_buttons(ui);
                });
            });
    }

    fn nav_buttons(&mut self, ui: &mut egui::Ui) {
        let items = [
            ("Dashboard", Screen::Dashboard),
            ("Sessione", Screen::Session),
            ("Fondamenti", Screen::Papers),
            ("Risultati", Screen::Results),
            ("Impostazioni", Screen::Settings),
        ];
        for (label, target) in items {
            let active = self.screen == target
                || (target == Screen::Papers && matches!(self.screen, Screen::PaperReader(_)))
                || (target == Screen::Dashboard
                    && matches!(self.screen, Screen::Instructions(_) | Screen::Running(_)));
            let text = egui::RichText::new(label.to_uppercase())
                .monospace()
                .size(12.0)
                .color(if active {
                    theme::ACCENT_GLOW
                } else {
                    theme::MUTED
                });
            let button = egui::Button::new(text).fill(if active {
                theme::ACCENT_SOFT
            } else {
                egui::Color32::TRANSPARENT
            });
            if ui.add(button).clicked() {
                self.navigate(target);
            }
        }
    }

    fn drive_runner(&mut self, ui: &mut egui::Ui, test: TestId) {
        let Some(runner) = self.runner.as_mut().filter(|r| r.test_id() == test) else {
            self.navigate(Screen::Dashboard);
            return;
        };
        let status = theme::stimulus_frame()
            .show(ui, |ui| {
                ui.set_min_size(ui.available_size());
                runner.ui(ui)
            })
            .inner;
        match status {
            RunnerStatus::Running => {}
            RunnerStatus::Aborted => {
                self.runner = None;
                self.navigate(Screen::Dashboard);
            }
            RunnerStatus::Finished(result) => {
                self.runner = None;
                self.result = Some(*result);
                self.navigate(Screen::Results);
            }
        }
    }
}

impl eframe::App for SintropiaApp {
    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        self.header(ui);
        egui::CentralPanel::default()
            .frame(
                egui::Frame::new()
                    .fill(theme::PAPER)
                    .inner_margin(egui::Margin::same(24)),
            )
            .show(ui, |ui| match self.screen {
                Screen::Dashboard => self.dashboard(ui),
                Screen::Instructions(test) => self.instructions(ui, test),
                Screen::Running(test) => self.drive_runner(ui, test),
                Screen::Results => self.results(ui),
                Screen::Settings => self.settings_screen(ui),
                Screen::Session => self.session(ui),
                Screen::Papers => self.papers(ui),
                Screen::PaperReader(index) => self.paper_reader(ui, index),
            });
    }
}
