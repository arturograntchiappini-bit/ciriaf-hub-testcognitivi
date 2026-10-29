//! Guida «?» (F1): elenco dei tasti dell'applicazione, in una finestra sopra la schermata corrente.
use eframe::egui::{self, Align2, RichText, Ui};

use crate::theme::{self, space};

/// Gruppi di scorciatoie: titolo e coppie (tasti, azione). I tasti sono disegnati come keycap.
const GROUPS: &[(&str, &[(&[&str], &str)])] = &[
    (
        "Ovunque",
        &[
            (&["F1"], "apre e chiude questa guida"),
            (
                &["Esc"],
                "torna indietro, chiude la guida o mette in pausa il test",
            ),
        ],
    ),
    (
        "Catalogo dei test",
        &[
            (&["↑", "↓"], "seleziona un test"),
            (&["Invio"], "apre le istruzioni del test selezionato"),
        ],
    ),
    (
        "Istruzioni",
        &[
            (&["Invio"], "avvia il test (con la pratica)"),
            (&["Esc"], "torna al catalogo"),
        ],
    ),
    (
        "Durante un test",
        &[
            (&["Spazio"], "risposta di PVT, SART, Go / No-Go e N-Back"),
            (
                &["←", "→"],
                "risposta di Flanker, Visual Search e Mental Rotation",
            ),
            (&["clic"], "risposta di Corsi, WCST e Trail Making"),
            (
                &["R", "V", "B", "G"],
                "colori rosso, verde, blu e giallo nello Stroop",
            ),
            (&["Esc"], "pausa: riprendi, esporta i dati parziali o esci"),
        ],
    ),
];

/// Disegna un keycap inline e restituisce il suo ingombro.
fn keycap(ui: &mut Ui, label: &str) {
    egui::Frame::new()
        .fill(theme::ELEVATED)
        .stroke(egui::Stroke::new(1.0, theme::LINE))
        .inner_margin(egui::Margin::symmetric(8, 3))
        .show(ui, |ui| {
            ui.label(RichText::new(label).monospace().size(theme::LABEL_SIZE));
        });
}

fn group_ui(ui: &mut Ui, title: &str, rows: &[(&[&str], &str)]) {
    ui.add_space(space::S);
    ui.label(theme::eyebrow(title).color(theme::ACCENT_GLOW));
    for (keys, action) in rows {
        ui.horizontal(|ui| {
            ui.spacing_mut().item_spacing.x = space::XS;
            ui.allocate_ui_with_layout(
                egui::vec2(KEYS_COLUMN, theme::CONTROL_HEIGHT - 8.0),
                egui::Layout::left_to_right(egui::Align::Center),
                |ui| {
                    for key in *keys {
                        keycap(ui, key);
                    }
                },
            );
            ui.label(RichText::new(*action).color(theme::INK));
        });
    }
}

const KEYS_COLUMN: f32 = 150.0;

/// Mostra la guida; `open` diventa falso se l'utente la chiude.
pub fn help_window(ctx: &egui::Context, open: &mut bool) {
    egui::Window::new("Scorciatoie da tastiera")
        .open(open)
        .collapsible(false)
        .resizable(false)
        .anchor(Align2::CENTER_CENTER, egui::vec2(0.0, 0.0))
        .show(ctx, |ui| {
            for (title, rows) in GROUPS {
                group_ui(ui, title, rows);
            }
        });
}
