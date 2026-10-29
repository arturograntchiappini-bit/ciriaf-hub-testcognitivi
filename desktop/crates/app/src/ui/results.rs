//! Risultati dopo un test: codice sessione, tabella delle metriche, export in sei formati.
use std::path::Path;

use eframe::egui::{self, RichText, Ui};
use sintropia_core::export::ExportFormat;

use super::layout::{self, CONTENT_MAX_WIDTH};
use super::widgets::{self, NoticeKind};
use crate::app::{Outcome, Screen, SintropiaApp};
use crate::data;
use crate::storage;
use crate::theme::{self, space};

const EXPORT_BUTTON_COLUMN: f32 = 150.0;

impl SintropiaApp {
    pub fn results(&mut self, ui: &mut Ui) {
        egui::ScrollArea::vertical()
            .auto_shrink(false)
            .show(ui, |ui| {
                widgets::centered_column(ui, CONTENT_MAX_WIDTH, |ui| {
                    widgets::page_header(
                        ui,
                        "Risultati",
                        "Ultima somministrazione",
                        "Metriche della sessione appena conclusa e salvataggio dei dati nei formati di analisi.",
                    );
                    if self.result.is_some() {
                        self.session_summary(ui);
                        self.metrics_table(ui);
                        self.export_list(ui);
                    } else {
                        self.empty_results(ui);
                    }
                    self.open_saved_result(ui);
                    widgets::footer(ui);
                });
            });
    }

    fn empty_results(&mut self, ui: &mut Ui) {
        let mut go_catalog = false;
        widgets::empty_state(
            ui,
            "Nessun risultato",
            "Non c’è ancora nessuna somministrazione in memoria. Esegui un test dal catalogo oppure apri un file JSON salvato in precedenza.",
            |ui| go_catalog = widgets::primary_button(ui, "Vai al catalogo").clicked(),
        );
        if go_catalog {
            self.navigate(Screen::Dashboard);
        }
    }

    fn session_summary(&self, ui: &mut Ui) {
        let Some(result) = &self.result else { return };
        let title = data::TEST_CATALOG
            .iter()
            .find(|m| m.id == result.test_id)
            .map_or_else(|| result.test_id.to_string(), |m| m.title.to_owned());
        theme::card_frame()
            .fill(theme::ACCENT_SOFT)
            .stroke(egui::Stroke::new(1.0, theme::ACCENT))
            .show(ui, |ui| {
                ui.set_width(ui.available_width());
                ui.label(theme::eyebrow("Codice sessione").color(theme::ACCENT_GLOW));
                ui.add(egui::Label::new(
                    RichText::new(&result.session_id).monospace().size(26.0),
                ));
                ui.add_space(space::XS);
                ui.add(
                    egui::Label::new(
                        RichText::new(format!(
                            "{title} · {} trial · {}",
                            result.trials.len(),
                            layout::format_started_at(&result.started_at)
                        ))
                        .color(theme::MUTED),
                    )
                    .wrap(),
                );
            });
    }

    fn metrics_table(&self, ui: &mut Ui) {
        let Some(result) = &self.result else { return };
        widgets::section_heading(ui, "Metriche");
        theme::card_frame()
            .inner_margin(egui::Margin::ZERO)
            .show(ui, |ui| {
                ui.set_width(ui.available_width());
                if result.summary.is_empty() {
                    ui.add_space(space::L);
                    ui.label(
                        RichText::new("  Nessuna metrica calcolata per questa somministrazione.")
                            .color(theme::MUTED),
                    );
                    ui.add_space(space::L);
                    return;
                }
                let widths = layout::metric_columns(ui.available_width() - 2.0 * space::L);
                ui.spacing_mut().item_spacing.y = 0.0;
                metric_row(ui, &widths, theme::ELEVATED, |ui, column| match column {
                    0 => ui.label(theme::eyebrow("Metrica")),
                    1 => ui.label(theme::eyebrow("Valore")),
                    _ => ui.label(theme::eyebrow("Unità")),
                });
                for (i, m) in result.summary.iter().enumerate() {
                    let fill = if i % 2 == 0 {
                        theme::SURFACE
                    } else {
                        theme::PAPER
                    };
                    metric_row(ui, &widths, fill, |ui, column| match column {
                        0 => ui.add(egui::Label::new(RichText::new(&m.label)).wrap()),
                        1 => ui.label(
                            RichText::new(m.value.to_string())
                                .monospace()
                                .size(16.0)
                                .color(theme::ACCENT_GLOW),
                        ),
                        _ => ui.label(
                            RichText::new(m.unit.as_deref().unwrap_or(""))
                                .monospace()
                                .color(theme::MUTED),
                        ),
                    });
                }
            });
    }

    fn export_list(&mut self, ui: &mut Ui) {
        widgets::section_heading(ui, "Esporta i dati");
        let dir = storage::export_dir();
        ui.add(
            egui::Label::new(
                RichText::new(format!("I file vengono salvati in {}", dir.display()))
                    .monospace()
                    .size(theme::LABEL_SIZE)
                    .color(theme::MUTED),
            )
            .wrap(),
        );
        ui.add_space(space::S);
        self.export_outcome_banner(ui, &dir);
        let mut chosen = None;
        for format in ExportFormat::ALL {
            if export_card(ui, format) {
                chosen = Some(format);
            }
            ui.add_space(space::S);
        }
        if let Some(format) = chosen {
            self.export_as(format, &dir);
        }
    }

    fn export_outcome_banner(&mut self, ui: &mut Ui, dir: &Path) {
        match &self.export_outcome {
            None => return,
            Some(Outcome::Failed(message)) => {
                widgets::notice(ui, NoticeKind::Error, message);
            }
            Some(Outcome::Saved(path)) => {
                widgets::notice(
                    ui,
                    NoticeKind::Info,
                    &format!("Salvato: {}", path.display()),
                );
                ui.add_space(space::S);
                if widgets::secondary_button(ui, "Apri cartella").clicked() {
                    let _ = std::fs::create_dir_all(dir);
                    let _ = std::process::Command::new("explorer").arg(dir).spawn();
                }
            }
        }
        ui.add_space(space::M);
    }

    fn export_as(&mut self, format: ExportFormat, dir: &Path) {
        let Some(result) = &self.result else { return };
        self.export_outcome = Some(match storage::save_export(result, format, dir) {
            Ok(path) => Outcome::Saved(path),
            Err(e) => Outcome::Failed(e),
        });
    }

    fn open_saved_result(&mut self, ui: &mut Ui) {
        widgets::section_heading(ui, "Apri un risultato salvato");
        ui.add(
            egui::Label::new(
                RichText::new("Incolla il percorso di un file JSON esportato da Sintropia.")
                    .color(theme::MUTED),
            )
            .wrap(),
        );
        ui.add_space(space::S);
        let mut load = false;
        ui.horizontal_wrapped(|ui| {
            let field = egui::TextEdit::singleline(&mut self.result_path_input)
                .hint_text("C:\\Users\\…\\Documents\\Sintropia\\risultato.json")
                .desired_width((ui.available_width() - 160.0).clamp(200.0, 560.0))
                .margin(egui::Margin::symmetric(10, 10));
            let response = ui.add(field);
            let submitted = response.lost_focus() && ui.input(|i| i.key_pressed(egui::Key::Enter));
            load = widgets::secondary_button(ui, "Carica").clicked() || submitted;
        });
        if load {
            self.load_saved_result();
        }
        if let Some(error) = &self.load_error {
            ui.add_space(space::S);
            widgets::notice(ui, NoticeKind::Error, error);
        }
    }

    fn load_saved_result(&mut self) {
        match storage::load_result(Path::new(self.result_path_input.trim())) {
            Ok(result) => {
                self.result = Some(result);
                self.load_error = None;
                self.export_outcome = None;
            }
            Err(e) => self.load_error = Some(e),
        }
    }
}

/// Riga di esportazione: nome, descrizione e pulsante. Ritorna `true` se premuto.
fn export_card(ui: &mut Ui, format: ExportFormat) -> bool {
    let mut clicked = false;
    theme::card_frame().show(ui, |ui| {
        ui.set_width(ui.available_width());
        ui.horizontal(|ui| {
            let text_width = (ui.available_width() - EXPORT_BUTTON_COLUMN - space::L).max(160.0);
            ui.vertical(|ui| {
                ui.set_width(text_width);
                ui.label(RichText::new(storage::format_label(format)).size(16.0));
                ui.add(
                    egui::Label::new(
                        RichText::new(storage::format_description(format)).color(theme::MUTED),
                    )
                    .wrap(),
                );
            });
            ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                clicked = widgets::primary_button(ui, "Salva").clicked();
            });
        });
    });
    clicked
}

/// Riga della tabella delle metriche con colonne a larghezza fissa e fondo a strisce.
fn metric_row(
    ui: &mut Ui,
    widths: &[f32; 3],
    fill: egui::Color32,
    mut cell: impl FnMut(&mut Ui, usize) -> egui::Response,
) {
    egui::Frame::new()
        .fill(fill)
        .inner_margin(egui::Margin::symmetric(space::L as i8, space::S as i8))
        .show(ui, |ui| {
            ui.set_width(ui.available_width());
            ui.horizontal_top(|ui| {
                ui.spacing_mut().item_spacing.x = 0.0;
                for (column, width) in widths.iter().enumerate() {
                    ui.scope(|ui| {
                        ui.set_min_width(*width);
                        ui.set_max_width(*width);
                        cell(ui, column);
                    });
                }
            });
        });
}
