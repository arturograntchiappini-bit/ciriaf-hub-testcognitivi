//! Schermate: dashboard, istruzioni, risultati, impostazioni, sessione, fondamenti scientifici.
use std::path::Path;

use eframe::egui::{self, RichText};
use sintropia_core::export::ExportFormat;
use sintropia_core::TestId;

use crate::app::{Screen, SintropiaApp};
use crate::data::{self, TestMeta, TEST_CATALOG};
use crate::papers::{self, PAPERS};
use crate::{markdown, storage, theme};

const CARD_MIN_WIDTH: f32 = 300.0;

fn page_title(ui: &mut egui::Ui, eyebrow: &str, title: &str) {
    ui.label(theme::eyebrow(eyebrow));
    ui.label(theme::display_text(title, 38.0, theme::INK, 2.5));
    ui.add_space(10.0);
}

fn section_title(ui: &mut egui::Ui, title: &str) {
    ui.add_space(18.0);
    ui.label(theme::display_text(title, 24.0, theme::INK, 2.0));
    ui.add_space(4.0);
}

impl SintropiaApp {
    pub fn dashboard(&mut self, ui: &mut egui::Ui) {
        egui::ScrollArea::vertical().auto_shrink(false).show(ui, |ui| {
            page_title(ui, "Dashboard", "Catalogo dei test");
            self.catalog_grid(ui);
            section_title(ui, "Sessione");
            theme::card_frame().show(ui, |ui| {
                ui.set_width(ui.available_width());
                ui.label("Componi una batteria di test su una linea temporale di fasi e punti nel tempo.");
                if ui.button("Apri sessione").clicked() {
                    self.navigate(Screen::Session);
                }
            });
            section_title(ui, "Fondamenti scientifici");
            theme::card_frame().show(ui, |ui| {
                ui.set_width(ui.available_width());
                ui.label(format!(
                    "{} documenti di riferimento: paradigma, parametri, metriche e fonti di ogni test.",
                    PAPERS.len()
                ));
                if ui.button("Leggi i paper").clicked() {
                    self.navigate(Screen::Papers);
                }
            });
        });
    }

    fn catalog_grid(&mut self, ui: &mut egui::Ui) {
        let spacing = ui.spacing().item_spacing.x;
        let columns =
            (((ui.available_width() + spacing) / (CARD_MIN_WIDTH + spacing)) as usize).max(1);
        let width = (ui.available_width() - spacing * (columns - 1) as f32) / columns as f32;
        for row in TEST_CATALOG.chunks(columns) {
            ui.horizontal_top(|ui| {
                for meta in row {
                    self.test_card(ui, meta, width);
                }
            });
        }
    }

    fn test_card(&mut self, ui: &mut egui::Ui, meta: &TestMeta, width: f32) {
        theme::card_frame().fill(theme::SURFACE).show(ui, |ui| {
            ui.set_width(width - 34.0);
            ui.set_min_height(150.0);
            ui.label(theme::eyebrow(meta.domain));
            ui.label(RichText::new(meta.title).size(16.0).strong());
            ui.label(RichText::new(meta.task).color(theme::MUTED));
            ui.add_space(6.0);
            if ui.button("Avvia").clicked() {
                self.navigate(Screen::Instructions(meta.id));
            }
        });
    }

    pub fn instructions(&mut self, ui: &mut egui::Ui, test: TestId) {
        let params = self.settings.effective(test.as_str());
        let Some(instruction) = data::instructions_for(test, &params) else {
            self.navigate(Screen::Dashboard);
            return;
        };
        egui::ScrollArea::vertical()
            .auto_shrink(false)
            .show(ui, |ui| {
                page_title(ui, "Istruzioni", &instruction.title);
                theme::stimulus_frame().show(ui, |ui| {
                    ui.set_width(ui.available_width());
                    for p in &instruction.paragraphs {
                        ui.label(RichText::new(p).size(16.0).color(theme::stimulus::INK));
                    }
                    ui.add_space(8.0);
                    for hint in &instruction.key_hints {
                        ui.label(
                            RichText::new(hint)
                                .monospace()
                                .color(theme::stimulus::ACCENT),
                        );
                    }
                });
                ui.add_space(12.0);
                ui.horizontal(|ui| {
                    if ui.button("Indietro").clicked() {
                        self.navigate(Screen::Dashboard);
                    }
                    if ui.button("Inizia").clicked() {
                        self.start_test(test);
                    }
                    if let Some(index) = papers::paper_for(test) {
                        if ui.button("Paper di riferimento").clicked() {
                            self.navigate(Screen::PaperReader(index));
                        }
                    }
                });
            });
    }

    pub fn session(&mut self, ui: &mut egui::Ui) {
        page_title(ui, "Sessione", "Batteria di test");
        theme::card_frame().show(ui, |ui| {
            ui.set_width(ui.available_width());
            ui.label("Il costruttore di sessione (fasi, punti nel tempo, batteria per punto) è in arrivo.");
            ui.label(RichText::new("Il modello dati è già in sintropia-core::session.").color(theme::MUTED));
        });
    }

    pub fn papers(&mut self, ui: &mut egui::Ui) {
        page_title(ui, "Fondamenti scientifici", "Paper di riferimento");
        egui::ScrollArea::vertical()
            .auto_shrink(false)
            .show(ui, |ui| {
                for (index, paper) in PAPERS.iter().enumerate() {
                    theme::card_frame().show(ui, |ui| {
                        ui.set_width(ui.available_width());
                        ui.horizontal(|ui| {
                            ui.vertical(|ui| {
                                ui.label(theme::eyebrow(paper.file));
                                ui.label(RichText::new(paper.title()).size(15.0));
                            });
                            ui.with_layout(
                                egui::Layout::right_to_left(egui::Align::Center),
                                |ui| {
                                    if ui.button("Leggi").clicked() {
                                        self.navigate(Screen::PaperReader(index));
                                    }
                                },
                            );
                        });
                    });
                }
            });
    }

    pub fn paper_reader(&mut self, ui: &mut egui::Ui, index: usize) {
        if index >= PAPERS.len() {
            self.navigate(Screen::Papers);
            return;
        }
        if ui.button("← Tutti i paper").clicked() {
            self.navigate(Screen::Papers);
        }
        let blocks = self.paper_blocks(index).to_vec();
        egui::ScrollArea::vertical()
            .auto_shrink(false)
            .show(ui, |ui| {
                ui.set_max_width(900.0);
                markdown::render(ui, &blocks);
            });
    }

    pub fn settings_screen(&mut self, ui: &mut egui::Ui) {
        page_title(ui, "Impostazioni", "Parametri dei test");
        ui.horizontal(|ui| {
            let label = if self.settings_dirty {
                "Salva *"
            } else {
                "Salva"
            };
            if ui.button(label).clicked() {
                self.status_message = Some(match self.settings.save_to(&self.settings_path) {
                    Ok(()) => {
                        self.settings_dirty = false;
                        format!("Salvato in {}", self.settings_path.display())
                    }
                    Err(e) => format!("Errore: {e}"),
                });
            }
            if let Some(msg) = &self.status_message {
                ui.label(RichText::new(msg).monospace().color(theme::MUTED));
            }
        });
        ui.add_space(6.0);
        egui::ScrollArea::vertical()
            .auto_shrink(false)
            .show(ui, |ui| {
                for section in data::param_sections() {
                    self.settings_section(ui, section);
                }
            });
    }

    fn settings_section(&mut self, ui: &mut egui::Ui, section: &data::SectionDesc) {
        egui::CollapsingHeader::new(RichText::new(&section.title).size(15.0))
            .id_salt(&section.test_key)
            .show(ui, |ui| {
                egui::Grid::new(("params", &section.test_key))
                    .num_columns(2)
                    .show(ui, |ui| {
                        for field in &section.fields {
                            self.param_row(ui, &section.test_key, field);
                        }
                    });
                if ui.button("Ripristina default").clicked() {
                    self.settings.reset(&section.test_key);
                    self.settings_dirty = true;
                }
            });
    }

    fn param_row(&mut self, ui: &mut egui::Ui, test_key: &str, field: &data::FieldDesc) {
        ui.label(&field.label);
        let Some(mut value) = self.settings.get(test_key, &field.key) else {
            ui.end_row();
            return;
        };
        let step = field.step.unwrap_or(1.0);
        let mut drag = egui::DragValue::new(&mut value)
            .range(field.min..=field.max)
            .speed(step)
            .fixed_decimals(if step >= 1.0 { 0 } else { 2 });
        if let Some(unit) = &field.unit {
            drag = drag.suffix(format!(" {unit}"));
        }
        if ui.add(drag).changed() {
            self.settings.set(test_key, &field.key, value);
            self.settings_dirty = true;
        }
        ui.end_row();
    }

    pub fn results(&mut self, ui: &mut egui::Ui) {
        page_title(ui, "Risultati", "Ultima somministrazione");
        egui::ScrollArea::vertical()
            .auto_shrink(false)
            .show(ui, |ui| {
                self.load_result_row(ui);
                ui.add_space(10.0);
                if self.result.is_some() {
                    self.metrics_table(ui);
                    self.export_buttons(ui);
                } else {
                    ui.label(
                        RichText::new(
                            "Nessun risultato disponibile: esegui un test o apri un JSON salvato.",
                        )
                        .color(theme::MUTED),
                    );
                }
            });
    }

    fn load_result_row(&mut self, ui: &mut egui::Ui) {
        ui.horizontal(|ui| {
            ui.label("Apri JSON:");
            ui.add(egui::TextEdit::singleline(&mut self.result_path_input).desired_width(420.0));
            if ui.button("Carica").clicked() {
                match storage::load_result(Path::new(self.result_path_input.trim())) {
                    Ok(result) => {
                        self.result = Some(result);
                        self.status_message = None;
                    }
                    Err(e) => self.status_message = Some(format!("Errore: {e}")),
                }
            }
        });
        if let Some(msg) = &self.status_message {
            ui.label(RichText::new(msg).monospace().color(theme::MUTED));
        }
    }

    fn metrics_table(&self, ui: &mut egui::Ui) {
        let Some(result) = &self.result else { return };
        ui.label(theme::eyebrow(&format!(
            "{} · sessione {} · {} trial · {}",
            result.test_id,
            result.session_id,
            result.trials.len(),
            result.started_at
        )));
        theme::card_frame().show(ui, |ui| {
            ui.set_width(ui.available_width());
            egui::Grid::new("metrics")
                .striped(true)
                .num_columns(3)
                .spacing([24.0, 6.0])
                .show(ui, |ui| {
                    for h in ["Metrica", "Valore", "Unità"] {
                        ui.label(theme::eyebrow(h));
                    }
                    ui.end_row();
                    for m in &result.summary {
                        ui.label(&m.label);
                        ui.label(
                            RichText::new(m.value.to_string())
                                .monospace()
                                .color(theme::ACCENT_GLOW),
                        );
                        ui.label(
                            RichText::new(m.unit.as_deref().unwrap_or(""))
                                .monospace()
                                .color(theme::MUTED),
                        );
                        ui.end_row();
                    }
                });
        });
    }

    fn export_buttons(&mut self, ui: &mut egui::Ui) {
        section_title(ui, "Esporta");
        let dir = storage::export_dir();
        ui.label(
            RichText::new(format!("Cartella: {}", dir.display()))
                .monospace()
                .color(theme::MUTED),
        );
        ui.horizontal_wrapped(|ui| {
            for format in ExportFormat::ALL {
                if ui.button(storage::format_label(format)).clicked() {
                    self.export_as(format, &dir);
                }
            }
            if ui.button("Apri cartella").clicked() {
                let _ = std::fs::create_dir_all(&dir);
                let _ = std::process::Command::new("explorer").arg(&dir).spawn();
            }
        });
        if let Some(msg) = &self.status_message {
            ui.label(RichText::new(msg).monospace().color(theme::ACCENT_GLOW));
        }
    }

    fn export_as(&mut self, format: ExportFormat, dir: &Path) {
        let Some(result) = &self.result else { return };
        self.status_message = Some(match storage::save_export(result, format, dir) {
            Ok(path) => format!("Salvato: {}", path.display()),
            Err(e) => format!("Errore: {e}"),
        });
    }
}
