//! Sintropia Desktop: dashboard tecnica dei test cognitivi (eframe/egui).
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod app;
mod data;
mod markdown;
mod papers;
mod runner;
mod runtime;
mod screens;
mod session_ui;
mod settings;
mod storage;
mod theme;
mod views;
mod views_custom;

fn main() -> eframe::Result {
    let options = eframe::NativeOptions {
        viewport: eframe::egui::ViewportBuilder::default()
            .with_title("Sintropia — Cognitive tests Hub")
            .with_inner_size([1180.0, 760.0])
            .with_min_inner_size([760.0, 520.0]),
        ..Default::default()
    };
    eframe::run_native(
        "Sintropia Desktop",
        options,
        Box::new(|cc| {
            theme::install_fonts(&cc.egui_ctx);
            theme::apply(&cc.egui_ctx);
            Ok(Box::new(app::SintropiaApp::new()))
        }),
    )
}
