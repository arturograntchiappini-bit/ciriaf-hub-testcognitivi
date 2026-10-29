//! Palette, tipografia e stile egui: scuro per la dashboard, chiaro per l'area stimoli (da `src/index.css`).
use std::sync::Arc;

use eframe::egui::{
    self, text::LayoutJob, Color32, CornerRadius, FontData, FontDefinitions, FontFamily, FontId,
    RichText, Stroke, TextFormat,
};

pub const INK: Color32 = Color32::from_rgb(225, 231, 239);
pub const PAPER: Color32 = Color32::from_rgb(10, 14, 26);
pub const SURFACE: Color32 = Color32::from_rgb(17, 24, 39);
pub const ELEVATED: Color32 = Color32::from_rgb(26, 37, 56);
pub const ACCENT: Color32 = Color32::from_rgb(74, 144, 217);
pub const ACCENT_SOFT: Color32 = Color32::from_rgb(19, 34, 56);
pub const ACCENT_GLOW: Color32 = Color32::from_rgb(107, 181, 255);
pub const LINE: Color32 = Color32::from_rgb(30, 39, 64);
pub const MUTED: Color32 = Color32::from_rgb(136, 146, 164);
pub const DANGER: Color32 = Color32::from_rgb(255, 107, 107);

/// Area stimoli (`theme-stimulus`): sfondo bianco, inchiostro scuro.
pub mod stimulus {
    use super::Color32;
    pub const INK: Color32 = Color32::from_rgb(17, 17, 17);
    pub const PAPER: Color32 = Color32::WHITE;
    pub const ACCENT: Color32 = Color32::from_rgb(31, 95, 168);
    pub const LINE: Color32 = Color32::from_rgb(228, 231, 236);
    pub const MUTED: Color32 = Color32::from_rgb(102, 112, 133);
    pub const DANGER: Color32 = Color32::from_rgb(208, 2, 27);
}

/// Scala di spaziatura (4/8/12/16/24/32).
pub mod space {
    pub const XS: f32 = 4.0;
    pub const S: f32 = 8.0;
    pub const M: f32 = 12.0;
    pub const L: f32 = 16.0;
    pub const XL: f32 = 24.0;
    pub const XXL: f32 = 32.0;
}

/// Dimensioni del testo: corpo >= 15, etichette >= 12.
pub const BODY_SIZE: f32 = 15.5;
pub const LABEL_SIZE: f32 = 12.5;
/// Altezza minima dei controlli cliccabili.
pub const CONTROL_HEIGHT: f32 = 38.0;

const FONT_INTER: &str = "inter";
const FONT_MONO: &str = "jetbrains-mono";
const FONT_DISPLAY: &str = "big-shoulders-display";
/// Nome del font Hack tra i font predefiniti di egui.
const FONT_ARROWS: &str = "Hack";

/// Famiglia dei titoli condensati (Big Shoulders Display).
pub fn display_family() -> FontFamily {
    FontFamily::Name(FONT_DISPLAY.into())
}

/// Incorpora Inter, JetBrains Mono e Big Shoulders Display (SIL OFL 1.1, vedi `assets/fonts/`).
pub fn install_fonts(ctx: &egui::Context) {
    let mut fonts = FontDefinitions::default();
    let embedded: [(&str, &'static [u8]); 3] = [
        (
            FONT_INTER,
            include_bytes!("../assets/fonts/Inter-Regular.ttf"),
        ),
        (
            FONT_MONO,
            include_bytes!("../assets/fonts/JetBrainsMono-Regular.ttf"),
        ),
        (
            FONT_DISPLAY,
            include_bytes!("../assets/fonts/BigShouldersDisplay-Bold.ttf"),
        ),
    ];
    for (name, bytes) in embedded {
        fonts
            .font_data
            .insert(name.to_owned(), Arc::new(FontData::from_static(bytes)));
    }
    // I font di default restano in coda come ripiego per i glifi mancanti (frecce, simboli).
    for (family, name) in [
        (FontFamily::Proportional, FONT_INTER),
        (FontFamily::Monospace, FONT_MONO),
    ] {
        fonts
            .families
            .entry(family)
            .or_default()
            .insert(0, name.to_owned());
    }
    // Inter non ha le frecce ← →: Hack (già nei font di egui) le fornisce a ogni famiglia, senza «tofu».
    if let Some(list) = fonts.families.get_mut(&FontFamily::Proportional) {
        list.push(FONT_ARROWS.to_owned());
    }
    let mut display = vec![FONT_DISPLAY.to_owned()];
    display.extend(
        fonts
            .families
            .get(&FontFamily::Proportional)
            .cloned()
            .unwrap_or_default(),
    );
    fonts.families.insert(display_family(), display);
    ctx.set_fonts(fonts);
}

fn square_stroke(color: Color32) -> Stroke {
    Stroke::new(1.0, color)
}

/// Applica palette scura, angoli netti, bordi `line` e accento blu.
pub fn apply(ctx: &egui::Context) {
    let mut visuals = egui::Visuals::dark();
    visuals.override_text_color = Some(INK);
    visuals.panel_fill = PAPER;
    visuals.window_fill = SURFACE;
    visuals.extreme_bg_color = PAPER;
    visuals.faint_bg_color = SURFACE;
    visuals.code_bg_color = ELEVATED;
    visuals.hyperlink_color = ACCENT_GLOW;
    visuals.warn_fg_color = DANGER;
    visuals.error_fg_color = DANGER;
    visuals.window_stroke = square_stroke(LINE);
    visuals.window_corner_radius = CornerRadius::ZERO;
    visuals.menu_corner_radius = CornerRadius::ZERO;
    visuals.window_shadow = egui::Shadow::NONE;
    visuals.popup_shadow = egui::Shadow::NONE;
    visuals.selection.bg_fill = ACCENT_SOFT;
    visuals.selection.stroke = Stroke::new(2.0, ACCENT_GLOW);
    visuals.interact_cursor = Some(egui::CursorIcon::PointingHand);

    let widgets = &mut visuals.widgets;
    for (w, fill, stroke) in [
        (&mut widgets.noninteractive, SURFACE, LINE),
        (&mut widgets.inactive, ELEVATED, LINE),
        (&mut widgets.hovered, ACCENT_SOFT, ACCENT),
        (&mut widgets.active, ACCENT_SOFT, ACCENT_GLOW),
        (&mut widgets.open, ELEVATED, ACCENT),
    ] {
        w.bg_fill = fill;
        w.weak_bg_fill = fill;
        w.bg_stroke = square_stroke(stroke);
        w.corner_radius = CornerRadius::ZERO;
        w.fg_stroke = square_stroke(INK);
    }
    // `bg_fill` colora anche la maniglia delle barre di scorrimento: deve staccarsi dal fondo.
    visuals.widgets.inactive.bg_fill = Color32::from_rgb(46, 62, 92);
    visuals.widgets.hovered.bg_fill = Color32::from_rgb(74, 100, 140);
    visuals.widgets.active.bg_fill = ACCENT;
    ctx.set_visuals(visuals);

    let mut style = (*ctx.global_style()).clone();
    style.spacing.item_spacing = egui::vec2(space::M, space::S);
    style.spacing.button_padding = egui::vec2(space::L, space::S);
    style.spacing.interact_size.y = CONTROL_HEIGHT;
    style.spacing.scroll = egui::style::ScrollStyle::solid();
    style.spacing.scroll.bar_width = 12.0;
    style.text_styles = [
        (
            egui::TextStyle::Heading,
            FontId::new(26.0, display_family()),
        ),
        (
            egui::TextStyle::Body,
            FontId::new(BODY_SIZE, FontFamily::Proportional),
        ),
        (
            egui::TextStyle::Button,
            FontId::new(14.5, FontFamily::Proportional),
        ),
        (
            egui::TextStyle::Small,
            FontId::new(LABEL_SIZE, FontFamily::Monospace),
        ),
        (
            egui::TextStyle::Monospace,
            FontId::new(14.0, FontFamily::Monospace),
        ),
    ]
    .into();
    ctx.set_global_style(style);
}

/// Titolo maiuscolo, condensato e spaziato (`tracking` in punti).
pub fn display_text(text: &str, size: f32, color: Color32, tracking: f32) -> LayoutJob {
    let mut job = LayoutJob::default();
    job.append(
        &text.to_uppercase(),
        0.0,
        TextFormat {
            font_id: FontId::new(size, display_family()),
            color,
            extra_letter_spacing: tracking,
            ..Default::default()
        },
    );
    job
}

/// Etichetta mono maiuscola e smorzata (eyebrow delle sezioni).
pub fn eyebrow(text: &str) -> RichText {
    RichText::new(text.to_uppercase())
        .monospace()
        .size(LABEL_SIZE)
        .color(MUTED)
}

/// Cornice di un pannello rialzato con bordo `line`.
pub fn card_frame() -> egui::Frame {
    egui::Frame::new()
        .fill(SURFACE)
        .stroke(square_stroke(LINE))
        .inner_margin(egui::Margin::same(16))
}
