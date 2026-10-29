//! Fondamenti scientifici: indice dei paper a sinistra, lettore a destra.
use eframe::egui::{self, RichText, Ui};

use super::layout::{self, CONTENT_MAX_WIDTH};
use super::widgets::{self, ButtonKind};
use crate::app::{Screen, SintropiaApp};
use crate::markdown;
use crate::papers::{self, PAPERS};
use crate::theme::{self, space};

const READER_MAX_WIDTH: f32 = 880.0;
const INDEX_WIDTH_WIDE: f32 = 320.0;
const INDEX_WIDTH_NARROW: f32 = 260.0;
const WIDE_BREAKPOINT: f32 = 1100.0;

impl SintropiaApp {
    /// Elenco a sinistra e lettore a destra; `selected` è il paper aperto (il primo se `None`).
    pub fn papers(&mut self, ui: &mut Ui, selected: Option<usize>) {
        let current = selected.filter(|&i| i < PAPERS.len()).unwrap_or(0);
        let index_width = if ui.available_width() >= WIDE_BREAKPOINT {
            INDEX_WIDTH_WIDE
        } else {
            INDEX_WIDTH_NARROW
        };
        egui::Panel::left("papers_index")
            .resizable(false)
            .exact_size(index_width)
            .frame(
                egui::Frame::new()
                    .fill(theme::SURFACE)
                    .stroke(egui::Stroke::new(1.0, theme::LINE))
                    .inner_margin(egui::Margin::same(space::L as i8)),
            )
            .show(ui, |ui| self.paper_index(ui, current));
        egui::CentralPanel::default()
            .frame(egui::Frame::new().fill(theme::PAPER))
            .show(ui, |ui| self.paper_reader(ui, current));
    }

    fn paper_index(&mut self, ui: &mut Ui, current: usize) {
        ui.label(theme::eyebrow("Fondamenti scientifici").color(theme::ACCENT_GLOW));
        ui.add_space(space::XS);
        ui.add(
            egui::TextEdit::singleline(&mut self.paper_query)
                .hint_text("Cerca nei paper…")
                .desired_width(f32::INFINITY)
                .margin(egui::Margin::symmetric(10, 10)),
        );
        let hits = papers::matching(&self.paper_query);
        ui.add_space(space::XS);
        ui.label(theme::eyebrow(&format!(
            "{} di {} documenti",
            hits.len(),
            PAPERS.len()
        )));
        ui.add_space(space::S);
        let mut open = None;
        egui::ScrollArea::vertical()
            .auto_shrink(false)
            .show(ui, |ui| {
                if hits.is_empty() {
                    ui.add(
                        egui::Label::new(
                            RichText::new("Nessun paper corrisponde alla ricerca.")
                                .color(theme::MUTED),
                        )
                        .wrap(),
                    );
                }
                for &i in &hits {
                    if index_entry(ui, i, i == current) {
                        open = Some(i);
                    }
                }
            });
        if let Some(i) = open {
            self.paper_jump = None;
            self.navigate(Screen::PaperReader(i));
        }
    }

    fn paper_reader(&mut self, ui: &mut Ui, index: usize) {
        let blocks = self.paper_blocks(index).to_vec();
        let jump = self.paper_jump.take();
        egui::ScrollArea::vertical()
            .id_salt(("paper-reader", index))
            .auto_shrink(false)
            .show(ui, |ui| {
                widgets::centered_column(ui, READER_MAX_WIDTH.min(CONTENT_MAX_WIDTH), |ui| {
                    ui.add_space(space::XL);
                    self.paper_actions(ui, index);
                    self.paper_outline(ui, &blocks);
                    ui.add_space(space::M);
                    markdown::render(ui, &blocks, jump);
                    ui.add_space(space::XXL);
                });
            });
    }

    fn paper_actions(&mut self, ui: &mut Ui, index: usize) {
        ui.horizontal(|ui| {
            ui.label(theme::eyebrow(PAPERS[index].file).color(theme::ACCENT_GLOW));
            let Some(test) = PAPERS[index].test else {
                return;
            };
            if widgets::button(ui, ButtonKind::Secondary, "Vai al test").clicked() {
                self.navigate(Screen::Instructions(test));
            }
        });
    }

    /// Indice delle sezioni: un clic scorre il lettore fino al titolo.
    fn paper_outline(&mut self, ui: &mut Ui, blocks: &[markdown::Block]) {
        let outline = markdown::outline(blocks);
        if outline.is_empty() {
            return;
        }
        ui.add_space(space::M);
        egui::CollapsingHeader::new(
            RichText::new(format!("In questa pagina ({} sezioni)", outline.len()))
                .size(theme::BODY_SIZE),
        )
        .id_salt("paper-outline")
        .show(ui, |ui| {
            for (position, (block, title)) in outline.iter().enumerate() {
                let label = format!("{}  {title}", layout::format_index(position));
                if ui
                    .add(
                        egui::Button::new(RichText::new(label).color(theme::ACCENT_GLOW))
                            .frame(false),
                    )
                    .on_hover_cursor(egui::CursorIcon::PointingHand)
                    .clicked()
                {
                    self.paper_jump = Some(*block);
                }
            }
        });
    }
}

/// Voce dell'indice: titolo che va a capo, evidenziata se aperta. Ritorna `true` se cliccata.
fn index_entry(ui: &mut Ui, index: usize, active: bool) -> bool {
    let width = ui.available_width();
    let galley = ui.painter().layout(
        PAPERS[index].short_title().to_owned(),
        egui::FontId::proportional(theme::BODY_SIZE),
        theme::INK,
        width - 2.0 * space::M,
    );
    let height = (galley.size().y + 2.0 * space::M).max(theme::CONTROL_HEIGHT);
    let (rect, response) = ui.allocate_exact_size(egui::vec2(width, height), egui::Sense::click());
    let response = response.on_hover_cursor(egui::CursorIcon::PointingHand);
    let painter = ui.painter();
    if active || response.hovered() {
        painter.rect_filled(
            rect,
            0.0,
            if active {
                theme::ACCENT_SOFT
            } else {
                theme::ELEVATED
            },
        );
    }
    if active {
        painter.rect_filled(
            egui::Rect::from_min_size(rect.min, egui::vec2(3.0, rect.height())),
            0.0,
            theme::ACCENT,
        );
    }
    let color = if active {
        theme::ACCENT_GLOW
    } else {
        theme::INK
    };
    let pos = egui::pos2(
        rect.left() + space::M,
        rect.center().y - galley.size().y / 2.0,
    );
    painter.galley(pos, galley, color);
    response.clicked()
}
