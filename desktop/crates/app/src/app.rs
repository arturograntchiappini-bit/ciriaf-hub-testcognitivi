//! Stato dell'applicazione, navigazione tra schermate e cornice (header).
use std::collections::HashMap;
use std::path::PathBuf;

use eframe::egui;
use sintropia_core::{TestId, TestResult};

use crate::cli::{CliArgs, ScreenArg};
use crate::markdown::{self, Block};
use crate::runner::{self, RunnerStatus, TestRunner};
use crate::session_ui::SessionScreen;
use crate::settings::{self, Settings};
use crate::theme::{self, space};
use crate::ui::widgets::{self, ButtonKind};

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

/// Esito dell'ultima operazione di salvataggio/caricamento, mostrato in pagina.
#[derive(Debug, Clone, PartialEq)]
pub enum Outcome {
    Saved(PathBuf),
    Failed(String),
}

pub struct SintropiaApp {
    pub screen: Screen,
    pub settings: Settings,
    pub settings_path: PathBuf,
    pub settings_dirty: bool,
    /// Avviso mostrato se il file delle impostazioni era presente ma illeggibile.
    pub settings_warning: Option<String>,
    pub settings_outcome: Option<Outcome>,
    pub status_message: Option<String>,
    pub runner: Option<Box<dyn TestRunner>>,
    pub result: Option<TestResult>,
    pub result_path_input: String,
    pub export_outcome: Option<Outcome>,
    pub load_error: Option<String>,
    pub paper_cache: HashMap<usize, Vec<Block>>,
    pub paper_query: String,
    pub paper_jump: Option<usize>,
    pub session_screen: SessionScreen,
    /// Riga evidenziata nel catalogo (tastiera e mouse).
    pub catalog_selected: usize,
    /// Guida delle scorciatoie (F1).
    pub show_help: bool,
}

/// Cornice dell'area stimoli a tutta finestra: fondo bianco, niente bordo.
fn fullscreen_frame() -> egui::Frame {
    egui::Frame::new()
        .fill(theme::stimulus::PAPER)
        .inner_margin(egui::Margin::same(space::XL as i8))
}

impl SintropiaApp {
    pub fn new(cli: &CliArgs) -> Self {
        let settings_path = settings::default_path();
        let (settings, settings_warning) = Settings::load_checked(&settings_path);
        let mut app = Self {
            screen: Screen::Dashboard,
            settings,
            settings_path,
            settings_dirty: false,
            settings_warning,
            settings_outcome: None,
            status_message: None,
            runner: None,
            result: None,
            result_path_input: String::new(),
            export_outcome: None,
            load_error: None,
            paper_cache: HashMap::new(),
            paper_query: String::new(),
            paper_jump: None,
            session_screen: SessionScreen::new(),
            catalog_selected: 0,
            show_help: false,
        };
        app.apply_cli(cli);
        app
    }

    /// Applica i flag `--screen`, `--demo-results` e `--test` (quest'ultimo ha la precedenza).
    fn apply_cli(&mut self, cli: &CliArgs) {
        if cli.demo_results {
            self.result = Some(crate::demo::demo_result());
        }
        match &cli.screen {
            Some(ScreenArg::Dashboard) | None => {}
            Some(ScreenArg::Shortcuts) => self.show_help = true,
            Some(ScreenArg::Settings) => self.screen = Screen::Settings,
            Some(ScreenArg::Papers) => self.screen = Screen::Papers,
            Some(ScreenArg::Session) => self.screen = Screen::Session,
            Some(ScreenArg::Results) => self.screen = Screen::Results,
            Some(ScreenArg::Instructions(test)) => self.screen = Screen::Instructions(*test),
            Some(ScreenArg::ResultsDemo) => {
                self.result = Some(crate::demo::demo_result());
                self.screen = Screen::Results;
            }
            Some(ScreenArg::Paper(slug)) => {
                let file = format!("{slug}.md");
                if let Some(index) = crate::papers::PAPERS.iter().position(|p| p.file == file) {
                    self.screen = Screen::PaperReader(index);
                }
            }
        }
        if let Some(test) = cli.test {
            self.start_test_with(test, !cli.no_practice);
        }
    }

    pub fn navigate(&mut self, screen: Screen) {
        self.status_message = None;
        self.screen = screen;
    }

    pub fn start_test(&mut self, test: TestId) {
        self.start_test_with(test, true);
    }

    fn start_test_with(&mut self, test: TestId, practice: bool) {
        let params = self.settings.effective(test.as_str());
        let started_at = sintropia_core::export::iso_now();
        let seed = crate::runtime::fresh_seed();
        let session_id = crate::runtime::session_id_for(&started_at, seed);
        match runner::create_runner(test, params, session_id, started_at, seed, practice, false) {
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
                    .inner_margin(egui::Margin::symmetric(24, 8)),
            )
            .show(ui, |ui| {
                ui.horizontal_wrapped(|ui| {
                    ui.spacing_mut().item_spacing = egui::vec2(space::XS, space::XS);
                    ui.add(
                        egui::Label::new(theme::display_text("Sintropia", 26.0, theme::INK, 3.0))
                            .selectable(false),
                    );
                    ui.add_space(space::S);
                    if ui.ctx().content_rect().width() >= 1100.0 {
                        ui.add(
                            egui::Label::new(theme::eyebrow("Cognitive tests Hub"))
                                .selectable(false),
                        );
                    }
                    ui.add_space(space::L);
                    self.nav_buttons(ui);
                    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                        if widgets::button(ui, ButtonKind::Ghost, "? Guida")
                            .on_hover_text("Scorciatoie da tastiera (F1)")
                            .clicked()
                        {
                            self.show_help = !self.show_help;
                        }
                    });
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
            if widgets::button(ui, ButtonKind::Tab(active), label).clicked() {
                self.navigate(target);
            }
        }
    }

    /// Test della batteria a tutta finestra, come il test singolo (Esc è gestito dal runner).
    fn drive_session_test(&mut self, ui: &mut egui::Ui) {
        egui::CentralPanel::default()
            .frame(fullscreen_frame())
            .show(ui, |ui| {
                self.session_screen.ui(ui, &runner::session_factory);
            });
    }

    /// Il test occupa tutta la finestra: niente header, area stimoli bianca. Esc è gestito dal runner.
    fn drive_runner(&mut self, ui: &mut egui::Ui, test: TestId) {
        let Some(runner) = self.runner.as_mut().filter(|r| r.test_id() == test) else {
            self.navigate(Screen::Dashboard);
            return;
        };
        let status = egui::CentralPanel::default()
            .frame(fullscreen_frame())
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
                self.export_outcome = None;
                self.navigate(Screen::Results);
            }
        }
    }

    /// F1 apre e chiude la guida; con la guida aperta Esc la chiude senza fare altro.
    fn handle_help_key(&mut self, ctx: &egui::Context) {
        let (f1, esc) = ctx.input_mut(|i| {
            (
                i.consume_key(egui::Modifiers::NONE, egui::Key::F1),
                self.show_help && i.consume_key(egui::Modifiers::NONE, egui::Key::Escape),
            )
        });
        if f1 {
            self.show_help = !self.show_help;
        } else if esc {
            self.show_help = false;
        }
    }
}

impl eframe::App for SintropiaApp {
    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        if let Screen::Running(test) = self.screen {
            self.drive_runner(ui, test);
            return;
        }
        if self.screen == Screen::Session && self.session_screen.is_running() {
            self.drive_session_test(ui);
            return;
        }
        self.handle_help_key(ui.ctx());
        self.header(ui);
        egui::CentralPanel::default()
            .frame(egui::Frame::new().fill(theme::PAPER))
            .show(ui, |ui| match self.screen {
                Screen::Dashboard => self.dashboard(ui),
                Screen::Instructions(test) => self.instructions(ui, test),
                Screen::Running(_) => {}
                Screen::Results => self.results(ui),
                Screen::Settings => self.settings_screen(ui),
                Screen::Session => self.session(ui),
                Screen::Papers => self.papers(ui, None),
                Screen::PaperReader(index) => self.papers(ui, Some(index)),
            });
        if self.show_help {
            crate::ui::help_window(ui.ctx(), &mut self.show_help);
        }
    }
}
