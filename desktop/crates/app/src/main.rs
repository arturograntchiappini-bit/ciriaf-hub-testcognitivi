//! Sintropia Desktop: dashboard tecnica dei test cognitivi (eframe/egui).
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod app;
mod cli;
mod data;
mod demo;
mod fsutil;
mod markdown;
mod papers;
mod runner;
mod runtime;
mod session_ui;
mod settings;
mod storage;
mod theme;
mod ui;
mod views;
mod views_custom;

const DEFAULT_SIZE: (f32, f32) = (1280.0, 800.0);

fn main() -> eframe::Result {
    let cli = match cli::CliArgs::parse(std::env::args().skip(1)) {
        Ok(cli) => cli,
        Err(message) => {
            eprintln!("{message}");
            std::process::exit(2);
        }
    };
    let (width, height) = cli.size.unwrap_or(DEFAULT_SIZE);
    let options = eframe::NativeOptions {
        viewport: eframe::egui::ViewportBuilder::default()
            .with_title("Sintropia - Cognitive tests Hub")
            .with_inner_size([width, height])
            .with_min_inner_size([900.0, 600.0]),
        ..Default::default()
    };
    eframe::run_native(
        "Sintropia Desktop",
        options,
        Box::new(move |cc| {
            theme::install_fonts(&cc.egui_ctx);
            theme::apply(&cc.egui_ctx);
            Ok(Box::new(app::SintropiaApp::new(&cli)))
        }),
    )
}
