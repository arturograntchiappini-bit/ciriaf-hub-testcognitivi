//! Logica di layout pura (testabile senza egui): colonna centrale, colonne responsive, formattazione.

/// Larghezza massima leggibile del contenuto.
pub const CONTENT_MAX_WIDTH: f32 = 1200.0;
/// Margine laterale della pagina (scala 16/24/32).
pub const GUTTER_WIDE: f32 = 32.0;
pub const GUTTER_NARROW: f32 = 16.0;
/// Sotto questa larghezza il margine laterale si riduce.
const NARROW_BREAKPOINT: f32 = 720.0;

/// Posizione orizzontale e larghezza della colonna di contenuto dentro lo spazio disponibile.
pub fn content_column(available_left: f32, available_width: f32, max_width: f32) -> (f32, f32) {
    let gutter = if available_width < NARROW_BREAKPOINT {
        GUTTER_NARROW
    } else {
        GUTTER_WIDE
    };
    let width = (available_width - 2.0 * gutter).min(max_width).max(1.0);
    let left = available_left + (available_width - width) / 2.0;
    (left, width)
}

/// Colonne di una riga del catalogo: titolo/etichette e, se c'è spazio, descrizione accanto (offset, larghezza).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct RowColumns {
    pub body: f32,
    pub task: Option<(f32, f32)>,
}

/// Larghezza minima, oltre la quale la descrizione sta a fianco del titolo.
const SIDE_BY_SIDE_MIN: f32 = 700.0;
const COLUMN_GAP: f32 = 24.0;

/// Divide `inner` (larghezza fra numero e azioni) fra titolo e descrizione.
pub fn row_columns(inner: f32) -> RowColumns {
    if inner < SIDE_BY_SIDE_MIN {
        return RowColumns {
            body: inner.max(120.0),
            task: None,
        };
    }
    let body = (inner * 0.46).floor();
    let offset = body + COLUMN_GAP;
    RowColumns {
        body,
        task: Some((offset, inner - offset)),
    }
}

/// Larghezze delle tre colonne della tabella metriche (metrica, valore, unità); la somma è `width`.
pub fn metric_columns(width: f32) -> [f32; 3] {
    let width = width.max(240.0);
    let value = (width * 0.22).clamp(90.0, 220.0);
    let unit = (width * 0.18).clamp(60.0, 180.0);
    [width - value - unit, value, unit]
}

/// Numero di colonne di card che entrano in `width` con larghezza minima `min_card` e spazio `gap` (almeno 1).
pub fn columns_for(width: f32, min_card: f32, gap: f32) -> usize {
    if width <= min_card {
        return 1;
    }
    (((width + gap) / (min_card + gap)).floor() as usize).max(1)
}

/// Larghezza di ogni card dato il numero di colonne.
pub fn card_width(width: f32, columns: usize, gap: f32) -> f32 {
    let columns = columns.max(1);
    (width - gap * (columns - 1) as f32) / columns as f32
}

/// Durata stimata leggibile: «~5 min».
pub fn format_minutes(minutes: u32) -> String {
    format!("~{minutes} min")
}

/// Numero d'ordine a due cifre: 1 → «01».
pub fn format_index(index: usize) -> String {
    format!("{:02}", index + 1)
}

/// Data ISO 8601 in forma leggibile («2026-07-07T09:30:15Z» diventa «07/07/2026 09:30»); testo non ISO invariato.
pub fn format_started_at(iso: &str) -> String {
    let parsed = iso.split_once('T').and_then(|(date, time)| {
        let mut d = date.split('-');
        let (year, month, day) = (d.next()?, d.next()?, d.next()?);
        let hhmm = time.get(..5)?;
        Some(format!("{day}/{month}/{year} {hhmm}"))
    });
    parsed.unwrap_or_else(|| iso.to_owned())
}

/// Cella di indice dopo un passo di tastiera (-1/+1), con arresto ai bordi.
pub fn step_selection(current: usize, delta: i32, len: usize) -> usize {
    if len == 0 {
        return 0;
    }
    (current as i64 + delta as i64).clamp(0, len as i64 - 1) as usize
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_cap_column_width_and_center_it() {
        let (left, width) = content_column(0.0, 2560.0, CONTENT_MAX_WIDTH);
        assert_eq!(width, 1200.0);
        assert_eq!(left, 680.0);
    }

    #[test]
    fn should_keep_gutters_on_small_windows() {
        let (left, width) = content_column(0.0, 900.0, CONTENT_MAX_WIDTH);
        assert_eq!((left, width), (32.0, 836.0));
        let (left, width) = content_column(0.0, 600.0, CONTENT_MAX_WIDTH);
        assert_eq!((left, width), (16.0, 568.0));
    }

    #[test]
    fn should_never_return_zero_columns_or_negative_width() {
        assert_eq!(columns_for(100.0, 300.0, 16.0), 1);
        assert_eq!(columns_for(0.0, 300.0, 16.0), 1);
        assert!(content_column(0.0, 10.0, 1200.0).1 >= 1.0);
    }

    #[test]
    fn should_fit_columns_without_overflow() {
        for width in [600.0_f32, 836.0, 1136.0, 1200.0, 1700.0] {
            let cols = columns_for(width, 320.0, 16.0);
            let card = card_width(width, cols, 16.0);
            assert!(card * cols as f32 + 16.0 * (cols - 1) as f32 <= width + 0.01);
            assert!(cols == 1 || card >= 320.0 - 0.01, "{width}: {card}");
        }
    }

    #[test]
    fn should_format_index_and_duration() {
        assert_eq!(format_index(0), "01");
        assert_eq!(format_index(11), "12");
        assert_eq!(format_minutes(5), "~5 min");
    }

    #[test]
    fn should_place_task_beside_title_only_when_wide_enough() {
        assert_eq!(row_columns(500.0).task, None);
        let wide = row_columns(900.0);
        let (offset, width) = wide.task.unwrap();
        assert!(wide.body + 24.0 <= offset + 0.01 && offset + width <= 900.0 + 0.01);
        assert!(width >= 300.0);
    }

    #[test]
    fn should_format_started_at_and_keep_non_iso_text() {
        assert_eq!(
            format_started_at("2026-07-07T09:30:15.123Z"),
            "07/07/2026 09:30"
        );
        assert_eq!(format_started_at("ieri"), "ieri");
    }

    #[test]
    fn should_split_metric_columns_to_the_full_width() {
        for width in [300.0_f32, 836.0, 1136.0] {
            let c = metric_columns(width);
            assert!((c.iter().sum::<f32>() - width).abs() < 0.01);
            assert!(c[0] > c[1] && c[0] > c[2]);
        }
    }

    #[test]
    fn should_clamp_keyboard_selection() {
        assert_eq!(step_selection(0, -1, 12), 0);
        assert_eq!(step_selection(11, 1, 12), 11);
        assert_eq!(step_selection(3, 1, 12), 4);
        assert_eq!(step_selection(0, 1, 0), 0);
    }
}
