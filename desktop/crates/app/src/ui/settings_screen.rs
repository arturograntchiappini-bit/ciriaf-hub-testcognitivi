//! Impostazioni: parametri per test in sezioni comprimibili.
use eframe::egui::{self, RichText, Ui};

use super::layout::{self, CONTENT_MAX_WIDTH};
use super::widgets::{self, NoticeKind};
use crate::app::{Outcome, SintropiaApp};
use crate::data::{self, FieldDesc, SectionDesc};
use crate::theme::{self, space};

const SECTION_MIN_WIDTH: f32 = 360.0;
const VALUE_WIDTH: f32 = 112.0;
const FIELD_ROW_HEIGHT: f32 = 38.0;
/// Titolo, spazi e pulsante «Ripristina» di una scheda, in aggiunta alle righe dei campi.
const SECTION_CHROME_HEIGHT: f32 = 78.0;
/// Margine interno della scheda (16 per lato) più il bordo.
const CARD_PADDING: f32 = 34.0;

/// Testo dell'intervallo ammesso, es. «1 – 200 ms».
fn range_text(field: &FieldDesc) -> String {
    let unit = field.unit.map(|u| format!(" {u}")).unwrap_or_default();
    format!("{} – {}{unit}", field.min, field.max)
}

impl SintropiaApp {
    pub fn settings_screen(&mut self, ui: &mut Ui) {
        egui::ScrollArea::vertical()
            .auto_shrink(false)
            .show(ui, |ui| {
                widgets::centered_column(ui, CONTENT_MAX_WIDTH, |ui| {
                    widgets::page_header(
                        ui,
                        "Impostazioni",
                        "Parametri dei test",
                        "Valori usati quando avvii un test. Ogni campo è limitato al suo intervallo (passa il mouse sul valore per vederlo); «Ripristina» riporta la scheda ai valori predefiniti.",
                    );
                    self.settings_notices(ui);
                    self.settings_toolbar(ui);
                    ui.add_space(space::M);
                    self.settings_grid(ui);
                    widgets::footer(ui);
                });
            });
    }

    fn settings_notices(&self, ui: &mut Ui) {
        if let Some(warning) = &self.settings_warning {
            widgets::notice(ui, NoticeKind::Error, warning);
            ui.add_space(space::M);
        }
    }

    fn settings_toolbar(&mut self, ui: &mut Ui) {
        ui.horizontal_wrapped(|ui| {
            let label = if self.settings_dirty {
                "Salva modifiche"
            } else {
                "Salva"
            };
            if widgets::primary_button(ui, label).clicked() {
                self.save_settings();
            }
            if self.settings_dirty {
                ui.label(RichText::new("modifiche non salvate").color(theme::ACCENT_GLOW));
            }
        });
        ui.add_space(space::S);
        match &self.settings_outcome {
            Some(Outcome::Saved(path)) => {
                widgets::notice(
                    ui,
                    NoticeKind::Info,
                    &format!("Salvato in {}", path.display()),
                );
            }
            Some(Outcome::Failed(message)) => widgets::notice(ui, NoticeKind::Error, message),
            None => {}
        }
    }

    fn save_settings(&mut self) {
        self.settings_outcome = Some(match self.settings.save_to(&self.settings_path) {
            Ok(()) => {
                self.settings_dirty = false;
                self.settings_warning = None;
                Outcome::Saved(self.settings_path.clone())
            }
            Err(e) => Outcome::Failed(format!("Salvataggio non riuscito: {e}")),
        });
    }

    /// Schede dei test in colonne (2-3 secondo la larghezza); ogni riga di schede ha la stessa altezza.
    fn settings_grid(&mut self, ui: &mut Ui) {
        let width = ui.available_width();
        let columns = layout::columns_for(width, SECTION_MIN_WIDTH, space::L);
        let card = layout::card_width(width, columns, space::L);
        for chunk in data::PARAM_SECTIONS.chunks(columns) {
            let rows = chunk.iter().map(|s| s.fields.len()).max().unwrap_or(0);
            let height = rows as f32 * FIELD_ROW_HEIGHT + SECTION_CHROME_HEIGHT;
            ui.horizontal_top(|ui| {
                ui.spacing_mut().item_spacing.x = space::L;
                for section in chunk {
                    self.settings_section(ui, section, card, height);
                }
            });
            ui.add_space(space::L);
        }
    }

    fn settings_section(&mut self, ui: &mut Ui, section: &SectionDesc, card: f32, height: f32) {
        theme::card_frame().show(ui, |ui| {
            ui.set_width(card - CARD_PADDING);
            ui.set_min_height(height);
            ui.label(RichText::new(section.title).size(17.0));
            ui.add_space(space::S);
            for field in section.fields {
                self.param_row(ui, section.test_key, field);
            }
            ui.add_space(space::XS);
            if widgets::ghost_button(ui, "Ripristina").clicked() {
                self.settings.reset(section.test_key);
                self.settings_dirty = true;
            }
        });
    }

    /// Una riga compatta: etichetta a sinistra, valore con unità a destra; l'intervallo è nel suggerimento.
    fn param_row(&mut self, ui: &mut Ui, test_key: &str, field: &FieldDesc) {
        let Some(mut value) = self.settings.get(test_key, field.key) else {
            return;
        };
        let decimals = if field.step >= 1.0 { 0 } else { 2 };
        let suffix = field.unit.map(|u| format!(" {u}")).unwrap_or_default();
        let changed = ui
            .horizontal(|ui| {
                ui.set_min_height(FIELD_ROW_HEIGHT - space::XS);
                ui.add(egui::Label::new(field.label).truncate());
                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    let drag = egui::DragValue::new(&mut value)
                        .range(field.min..=field.max)
                        .speed(field.step)
                        .fixed_decimals(decimals)
                        .suffix(suffix);
                    ui.add_sized([VALUE_WIDTH, theme::CONTROL_HEIGHT - 8.0], drag)
                        .on_hover_text(range_text(field))
                        .changed()
                })
                .inner
            })
            .inner;
        if changed {
            self.settings.set(test_key, field.key, value);
            self.settings_dirty = true;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_format_range_with_and_without_unit() {
        let with_unit = FieldDesc {
            key: "k",
            label: "l",
            unit: Some("ms"),
            min: 100.0,
            max: 2000.0,
            step: 10.0,
        };
        assert_eq!(range_text(&with_unit), "100 – 2000 ms");
        let bare = FieldDesc {
            unit: None,
            ..with_unit
        };
        assert_eq!(range_text(&bare), "100 – 2000");
    }
}
