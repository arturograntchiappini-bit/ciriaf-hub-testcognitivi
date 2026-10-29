//! Schermate della shell (dashboard, istruzioni, risultati, impostazioni, fondamenti scientifici).
use eframe::egui;

use crate::app::SintropiaApp;

mod dashboard;
mod help;
mod instructions;
pub mod layout;
mod papers_screen;
mod results;
mod settings_screen;
pub mod widgets;

pub use help::help_window;

impl SintropiaApp {
    /// La modalità Sessione gestisce da sé scorrimento e layout: qui le dà solo il margine.
    pub fn session(&mut self, ui: &mut egui::Ui) {
        egui::Frame::new()
            .inner_margin(egui::Margin::symmetric(24, 8))
            .show(ui, |ui| {
                self.session_screen.ui(ui, &crate::runner::session_factory);
            });
    }
}
