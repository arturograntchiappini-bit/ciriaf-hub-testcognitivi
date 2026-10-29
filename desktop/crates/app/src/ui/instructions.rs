//! Schermata di istruzioni prima di ogni test (come `Instructions.tsx`).
use eframe::egui::{self, Key, RichText, Ui};
use sintropia_core::TestId;

use super::widgets;
use crate::app::{Screen, SintropiaApp};
use crate::data;
use crate::papers;
use crate::theme::{self, space};

const READING_WIDTH: f32 = 860.0;

impl SintropiaApp {
    pub fn instructions(&mut self, ui: &mut Ui, test: TestId) {
        let (start, back) = ui.input(|i| (i.key_pressed(Key::Enter), i.key_pressed(Key::Escape)));
        if back {
            self.navigate(Screen::Dashboard);
            return;
        }
        if start {
            self.start_test(test);
            return;
        }
        let params = self.settings.effective(test.as_str());
        let instruction = data::instructions_for(test, &params);
        egui::ScrollArea::vertical()
            .auto_shrink(false)
            .show(ui, |ui| {
                widgets::centered_column(ui, READING_WIDTH, |ui| {
                    widgets::page_header(ui, "Istruzioni", &instruction.title, "");
                    for paragraph in &instruction.paragraphs {
                        ui.add(
                            egui::Label::new(RichText::new(paragraph).size(17.5)).wrap(),
                        );
                        ui.add_space(space::XS);
                    }
                    ui.add_space(space::L);
                    key_box(ui, &instruction.key_hints);
                    ui.add_space(space::XL);
                    self.instruction_actions(ui, test);
                    ui.add_space(space::M);
                    ui.add(
                        egui::Label::new(
                            RichText::new(
                                "Prima del test vero c’è una breve pratica con feedback. Invio per iniziare, Esc per tornare al catalogo.",
                            )
                            .color(theme::MUTED),
                        )
                        .wrap(),
                    );
                    ui.add_space(space::XXL);
                });
            });
    }

    fn instruction_actions(&mut self, ui: &mut Ui, test: TestId) {
        ui.horizontal_wrapped(|ui| {
            if widgets::primary_button(ui, "Inizia").clicked() {
                self.start_test(test);
            }
            if widgets::ghost_button(ui, "← Torna al catalogo").clicked() {
                self.navigate(Screen::Dashboard);
            }
            if let Some(index) = papers::paper_for(test) {
                if widgets::secondary_button(ui, "Base scientifica del test").clicked() {
                    self.navigate(Screen::PaperReader(index));
                }
            }
        });
    }
}

/// Riquadro «Tasti» con lo schema dei comandi.
fn key_box(ui: &mut Ui, hints: &[String]) {
    egui::Frame::new()
        .fill(theme::ACCENT_SOFT)
        .stroke(egui::Stroke::new(1.0, theme::LINE))
        .inner_margin(egui::Margin::symmetric(24, 16))
        .show(ui, |ui| {
            ui.set_width(ui.available_width());
            ui.label(theme::eyebrow("Tasti").color(theme::ACCENT_GLOW));
            ui.add_space(space::XS);
            ui.horizontal_wrapped(|ui| {
                ui.spacing_mut().item_spacing = egui::vec2(space::XXL, space::S);
                for hint in hints {
                    ui.label(RichText::new(hint).monospace().size(15.0));
                }
            });
        });
}
