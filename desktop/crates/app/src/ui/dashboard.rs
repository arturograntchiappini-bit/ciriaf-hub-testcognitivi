//! Dashboard: indice numerato dei 12 test, blocco Sessione e Fondamenti scientifici.
use eframe::egui::{
    self, Align2, CursorIcon, FontId, Key, Rect, RichText, Sense, Stroke, Ui, Vec2,
};
use sintropia_core::TestId;

use super::layout::{self, CONTENT_MAX_WIDTH};
use super::widgets::{self, ButtonKind, NoticeKind};
use crate::app::{Screen, SintropiaApp};
use crate::data::{self, TestMeta, TEST_CATALOG};
use crate::papers::PAPERS;
use crate::theme::{self, space};

const NUMBER_COLUMN: f32 = 56.0;
const ACTION_COLUMN: f32 = 140.0;
const ACTION_WIDTH: f32 = 108.0;
const ROW_PADDING: f32 = 14.0;
const INFO_CARD_MIN_WIDTH: f32 = 460.0;

struct InfoBlock {
    title: &'static str,
    text: String,
    action: &'static str,
    target: Screen,
}

impl SintropiaApp {
    pub fn dashboard(&mut self, ui: &mut Ui) {
        egui::ScrollArea::vertical()
            .auto_shrink(false)
            .show(ui, |ui| {
                widgets::centered_column(ui, CONTENT_MAX_WIDTH, |ui| {
                    widgets::page_header(
                        ui,
                        "Dashboard",
                        "Catalogo dei test",
                        "Dodici compiti cognitivi, ognuno con istruzioni, pratica e metriche: sceglierne uno per iniziare.",
                    );
                    self.dashboard_notices(ui);
                    self.catalog_index(ui);
                    ui.add_space(space::XL);
                    self.info_blocks(ui);
                    widgets::footer(ui);
                });
            });
    }

    fn dashboard_notices(&mut self, ui: &mut Ui) {
        for message in [self.status_message.clone(), self.settings_warning.clone()]
            .into_iter()
            .flatten()
        {
            widgets::notice(ui, NoticeKind::Error, &message);
            ui.add_space(space::M);
        }
    }

    /// Indice ordinato; frecce su/giù per spostarsi, Invio per aprire le istruzioni.
    fn catalog_index(&mut self, ui: &mut Ui) {
        self.handle_catalog_keys(ui);
        let width = ui.available_width();
        let origin = ui.cursor().left_top();
        ui.painter().line_segment(
            [origin, origin + Vec2::new(width, 0.0)],
            Stroke::new(1.0, theme::LINE),
        );
        for (index, meta) in TEST_CATALOG.iter().enumerate() {
            if let Some(chosen) = self.catalog_row(ui, index, meta, width) {
                self.navigate(Screen::Instructions(chosen));
            }
        }
    }

    fn handle_catalog_keys(&mut self, ui: &Ui) {
        let (up, down, enter) = ui.input(|i| {
            (
                i.key_pressed(Key::ArrowUp),
                i.key_pressed(Key::ArrowDown),
                i.key_pressed(Key::Enter),
            )
        });
        let len = TEST_CATALOG.len();
        if up {
            self.catalog_selected = layout::step_selection(self.catalog_selected, -1, len);
        }
        if down {
            self.catalog_selected = layout::step_selection(self.catalog_selected, 1, len);
        }
        if enter {
            if let Some(meta) = TEST_CATALOG.get(self.catalog_selected) {
                self.navigate(Screen::Instructions(meta.id));
            }
        }
    }

    /// Disegna una riga e ritorna il test scelto (click sulla riga o su «Avvia»).
    fn catalog_row(
        &mut self,
        ui: &mut Ui,
        index: usize,
        meta: &TestMeta,
        width: f32,
    ) -> Option<TestId> {
        let focus = data::focus_for(meta.id);
        let columns = layout::row_columns(width - NUMBER_COLUMN - ACTION_COLUMN);
        let painter = ui.painter().clone();
        let title = painter.layout(
            meta.title.to_uppercase(),
            FontId::new(26.0, theme::display_family()),
            theme::INK,
            columns.body,
        );
        let tags = painter.layout(
            format!("{} · {}", meta.domain, focus.region_label).to_uppercase(),
            FontId::monospace(theme::LABEL_SIZE),
            theme::ACCENT_GLOW,
            columns.body,
        );
        let task_width = columns.task.map_or(columns.body, |(_, w)| w);
        let task = painter.layout(
            focus.task.to_owned(),
            FontId::proportional(theme::BODY_SIZE),
            theme::MUTED,
            task_width,
        );
        let stacked = title.size().y + tags.size().y + space::XS;
        let body_height = if columns.task.is_some() {
            stacked.max(task.size().y)
        } else {
            stacked + task.size().y + space::XS
        };
        let action_height = theme::CONTROL_HEIGHT + 22.0;
        let height = body_height.max(action_height) + 2.0 * ROW_PADDING;
        let (rect, response) = ui.allocate_exact_size(Vec2::new(width, height), Sense::click());
        if response.hovered() {
            self.catalog_selected = index;
        }
        let selected = self.catalog_selected == index;
        paint_row_frame(ui, rect, selected);

        painter.text(
            egui::pos2(rect.left() + space::M, rect.top() + ROW_PADDING + 14.0),
            Align2::LEFT_CENTER,
            layout::format_index(index),
            FontId::monospace(theme::LABEL_SIZE + 1.0),
            if selected {
                theme::ACCENT_GLOW
            } else {
                theme::MUTED
            },
        );
        let left = rect.left() + NUMBER_COLUMN;
        let top = rect.top() + ROW_PADDING;
        let tags_y = top + title.size().y + space::XS;
        let task_pos = match columns.task {
            Some((offset, _)) => egui::pos2(left + offset, top + 4.0),
            None => egui::pos2(left, tags_y + tags.size().y + space::XS),
        };
        painter.galley(egui::pos2(left, top), title, theme::INK);
        painter.galley(egui::pos2(left, tags_y), tags, theme::INK);
        painter.galley(task_pos, task, theme::INK);
        let chosen = self.paint_row_action(ui, rect, index, meta.id);
        let clicked = chosen || response.clicked();
        if response.hovered() {
            ui.ctx().set_cursor_icon(CursorIcon::PointingHand);
        }
        clicked.then_some(meta.id)
    }

    fn paint_row_action(&self, ui: &mut Ui, rect: Rect, index: usize, id: TestId) -> bool {
        let right = rect.right() - space::M;
        ui.painter().text(
            egui::pos2(right, rect.top() + ROW_PADDING + 7.0),
            Align2::RIGHT_CENTER,
            layout::format_minutes(data::estimated_minutes(
                id,
                &self.settings.effective(id.as_str()),
            )),
            FontId::monospace(theme::LABEL_SIZE),
            theme::MUTED,
        );
        let button = Rect::from_min_size(
            egui::pos2(right - ACTION_WIDTH, rect.top() + ROW_PADDING + 22.0),
            Vec2::new(ACTION_WIDTH, theme::CONTROL_HEIGHT),
        );
        let kind = if self.catalog_selected == index {
            ButtonKind::Primary
        } else {
            ButtonKind::Secondary
        };
        let button_id = ui.scope_id().with(("start", index));
        widgets::button_in(ui, button, button_id, kind, "Avvia").clicked()
    }

    fn info_blocks(&mut self, ui: &mut Ui) {
        let width = ui.available_width();
        let columns = layout::columns_for(width, INFO_CARD_MIN_WIDTH, space::L);
        let card = layout::card_width(width, columns, space::L);
        let blocks = [
            InfoBlock {
                title: "Sessione",
                text: "Componi una batteria di test su una linea temporale di fasi e punti nel tempo, poi eseguila in sequenza.".to_owned(),
                action: "Apri sessione",
                target: Screen::Session,
            },
            InfoBlock {
                title: "Fondamenti scientifici",
                text: format!(
                    "{} documenti di riferimento: paradigma, parametri, metriche e fonti di ogni test.",
                    PAPERS.len()
                ),
                action: "Leggi i paper",
                target: Screen::Papers,
            },
        ];
        let mut chosen = None;
        let mut draw = |ui: &mut Ui, block: &InfoBlock| {
            theme::card_frame().show(ui, |ui| {
                ui.set_width(card - 34.0);
                ui.set_min_height(112.0);
                ui.label(theme::eyebrow(block.title));
                ui.add(egui::Label::new(RichText::new(&block.text).size(theme::BODY_SIZE)).wrap());
                ui.add_space(space::S);
                if widgets::secondary_button(ui, block.action).clicked() {
                    chosen = Some(block.target);
                }
            });
        };
        if columns >= 2 {
            ui.horizontal_top(|ui| {
                for block in &blocks {
                    draw(ui, block);
                }
            });
        } else {
            for block in &blocks {
                draw(ui, block);
            }
        }
        if let Some(screen) = chosen {
            self.navigate(screen);
        }
    }
}

fn paint_row_frame(ui: &Ui, rect: Rect, selected: bool) {
    let painter = ui.painter();
    if selected {
        painter.rect_filled(rect, 0.0, theme::SURFACE);
        painter.rect_filled(
            Rect::from_min_size(rect.min, Vec2::new(3.0, rect.height())),
            0.0,
            theme::ACCENT,
        );
    }
    painter.line_segment(
        [rect.left_bottom(), rect.right_bottom()],
        Stroke::new(1.0, theme::LINE),
    );
}
