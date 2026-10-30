//! Componenti di base della shell: colonna centrale, intestazioni, pulsanti, avvisi.
use std::sync::Arc;

use eframe::egui::{
    self, text::LayoutJob, Align2, Color32, CursorIcon, FontId, Galley, Rect, Response, RichText,
    Sense, Stroke, TextFormat, Ui, Vec2,
};

use super::layout;
use crate::theme::{self, space};

/// Aspetto di un pulsante.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ButtonKind {
    /// Azione principale (riempimento accento).
    Primary,
    /// Azione secondaria (bordo `line`).
    Secondary,
    /// Azione terziaria senza bordo.
    Ghost,
    /// Voce di navigazione; `true` se la schermata è attiva.
    Tab(bool),
}

/// Disegna `add_contents` in una colonna centrata larga al massimo `max_width`.
pub fn centered_column<R>(
    ui: &mut Ui,
    max_width: f32,
    add_contents: impl FnOnce(&mut Ui) -> R,
) -> R {
    let avail = ui.available_rect_before_wrap();
    let (left, width) = layout::content_column(avail.left(), avail.width(), max_width);
    let rect = Rect::from_min_size(
        egui::pos2(left, avail.top()),
        Vec2::new(width, avail.height()),
    );
    let mut child = ui.new_child(egui::UiBuilder::new().max_rect(rect));
    let result = add_contents(&mut child);
    ui.allocate_rect(child.min_rect(), Sense::hover());
    result
}

/// Intestazione di pagina: etichetta mono, titolo condensato e riga di spiegazione.
pub fn page_header(ui: &mut Ui, eyebrow: &str, title: &str, lead: &str) {
    ui.add_space(space::XL);
    ui.label(theme::eyebrow(eyebrow).color(theme::ACCENT_GLOW));
    ui.add(egui::Label::new(theme::display_text(title, 44.0, theme::INK, 2.0)).wrap());
    if !lead.is_empty() {
        ui.add_space(space::XS);
        ui.add(
            egui::Label::new(
                RichText::new(lead)
                    .size(theme::BODY_SIZE + 1.0)
                    .color(theme::MUTED),
            )
            .wrap(),
        );
    }
    ui.add_space(space::L);
}

/// Titolo di sezione con filetto sottile.
pub fn section_heading(ui: &mut Ui, title: &str) {
    ui.add_space(space::XL);
    ui.add(egui::Label::new(theme::display_text(title, 26.0, theme::INK, 2.0)).wrap());
    ui.add_space(space::XS);
}

fn button_galley(ui: &Ui, label: &str, size: f32) -> Arc<Galley> {
    let mut job = LayoutJob::default();
    job.append(
        &label.to_uppercase(),
        0.0,
        TextFormat {
            font_id: FontId::monospace(size),
            color: Color32::PLACEHOLDER,
            extra_letter_spacing: 1.0,
            ..Default::default()
        },
    );
    ui.painter().layout_job(job)
}

fn paint_button(ui: &Ui, response: &Response, galley: Arc<Galley>, kind: ButtonKind) {
    let hovered = response.hovered() || response.has_focus();
    let (fill, stroke, text) = match kind {
        ButtonKind::Primary => (
            if hovered {
                theme::ACCENT_GLOW
            } else {
                theme::ACCENT
            },
            Color32::TRANSPARENT,
            theme::PAPER,
        ),
        ButtonKind::Secondary => (
            if hovered {
                theme::ACCENT_SOFT
            } else {
                theme::SURFACE
            },
            if hovered { theme::ACCENT } else { theme::LINE },
            theme::INK,
        ),
        ButtonKind::Ghost => (
            if hovered {
                theme::ACCENT_SOFT
            } else {
                Color32::TRANSPARENT
            },
            Color32::TRANSPARENT,
            if hovered { theme::INK } else { theme::MUTED },
        ),
        ButtonKind::Tab(active) => (
            if active {
                theme::ACCENT_SOFT
            } else if hovered {
                theme::SURFACE
            } else {
                Color32::TRANSPARENT
            },
            Color32::TRANSPARENT,
            if active {
                theme::ACCENT_GLOW
            } else if hovered {
                theme::INK
            } else {
                theme::MUTED
            },
        ),
    };
    let painter = ui.painter();
    painter.rect_filled(response.rect, 0.0, fill);
    if stroke != Color32::TRANSPARENT {
        painter.rect_stroke(
            response.rect,
            0.0,
            Stroke::new(1.0, stroke),
            egui::StrokeKind::Inside,
        );
    }
    if response.has_focus() {
        painter.rect_stroke(
            response.rect,
            0.0,
            Stroke::new(2.0, theme::ACCENT_GLOW),
            egui::StrokeKind::Inside,
        );
    }
    if kind == ButtonKind::Tab(true) {
        let bar = Rect::from_min_size(
            egui::pos2(response.rect.left(), response.rect.bottom() - 2.0),
            Vec2::new(response.rect.width(), 2.0),
        );
        painter.rect_filled(bar, 0.0, theme::ACCENT);
    }
    let pos = Align2::CENTER_CENTER
        .anchor_size(response.rect.center(), galley.size())
        .min;
    painter.galley(pos, galley, text);
}

/// Pulsante con altezza minima `CONTROL_HEIGHT`, cursore a mano e anello di focus.
pub fn button(ui: &mut Ui, kind: ButtonKind, label: &str) -> Response {
    let galley = button_galley(ui, label, theme::LABEL_SIZE + 1.0);
    let padding = if matches!(kind, ButtonKind::Tab(_)) {
        14.0
    } else {
        20.0
    };
    let size = Vec2::new(galley.size().x + 2.0 * padding, theme::CONTROL_HEIGHT);
    let response = ui
        .allocate_response(size, Sense::click())
        .on_hover_cursor(CursorIcon::PointingHand);
    paint_button(ui, &response, galley, kind);
    response
}

/// Pulsante in un rettangolo prefissato (per le righe del catalogo).
pub fn button_in(ui: &mut Ui, rect: Rect, id: egui::Id, kind: ButtonKind, label: &str) -> Response {
    let galley = button_galley(ui, label, theme::LABEL_SIZE + 1.0);
    let response = ui
        .interact(rect, id, Sense::click())
        .on_hover_cursor(CursorIcon::PointingHand);
    paint_button(ui, &response, galley, kind);
    response
}

pub fn primary_button(ui: &mut Ui, label: &str) -> Response {
    button(ui, ButtonKind::Primary, label)
}

pub fn secondary_button(ui: &mut Ui, label: &str) -> Response {
    button(ui, ButtonKind::Secondary, label)
}

pub fn ghost_button(ui: &mut Ui, label: &str) -> Response {
    button(ui, ButtonKind::Ghost, label)
}

/// Livello di un avviso in pagina.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NoticeKind {
    Info,
    Error,
}

/// Avviso su tutta la larghezza, con testo che va a capo.
pub fn notice(ui: &mut Ui, kind: NoticeKind, text: &str) {
    let (fill, line, ink) = match kind {
        NoticeKind::Info => (theme::ACCENT_SOFT, theme::ACCENT, theme::ACCENT_GLOW),
        NoticeKind::Error => (theme::SURFACE, theme::DANGER, theme::DANGER),
    };
    egui::Frame::new()
        .fill(fill)
        .stroke(Stroke::new(1.0, line))
        .inner_margin(egui::Margin::symmetric(16, 12))
        .show(ui, |ui| {
            ui.set_width(ui.available_width());
            ui.add(egui::Label::new(RichText::new(text).color(ink)).wrap());
        });
}

/// Stato vuoto: titolo, spiegazione e (all'esterno) le azioni.
pub fn empty_state(ui: &mut Ui, title: &str, body: &str, actions: impl FnOnce(&mut Ui)) {
    theme::card_frame().show(ui, |ui| {
        ui.set_width(ui.available_width());
        ui.add_space(space::M);
        ui.add(egui::Label::new(theme::display_text(title, 28.0, theme::INK, 2.0)).wrap());
        ui.add(egui::Label::new(RichText::new(body).color(theme::MUTED)).wrap());
        ui.add_space(space::S);
        ui.horizontal_wrapped(actions);
        ui.add_space(space::M);
    });
}

/// Piè di pagina: licenza, autore e collegamenti.
pub fn footer(ui: &mut Ui) {
    ui.add_space(space::XXL);
    ui.separator();
    ui.add_space(space::S);
    ui.horizontal_wrapped(|ui| {
        ui.label(theme::eyebrow("Licenza MIT"));
        ui.label(theme::eyebrow("·"));
        ui.hyperlink_to(
            RichText::new("ARTURO GRANT CHIAPPINI")
                .monospace()
                .size(theme::LABEL_SIZE)
                .color(theme::ACCENT_GLOW),
            "https://www.linkedin.com/in/arturo-grant-chiappini/",
        );
        ui.label(theme::eyebrow("·"));
        ui.hyperlink_to(
            RichText::new("GITHUB")
                .monospace()
                .size(theme::LABEL_SIZE)
                .color(theme::ACCENT_GLOW),
            "https://github.com/arturograntchiappini-bit/sintropia-hub",
        );
    });
    ui.add_space(space::XL);
}
