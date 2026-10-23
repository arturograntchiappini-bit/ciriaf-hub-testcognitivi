//! Renderer markdown minimale per i paper: titoli, paragrafi, citazioni, liste, tabelle, codice, formule.
use eframe::egui::{self, text::LayoutJob, FontFamily, FontId, RichText, TextFormat};

use crate::theme;

#[derive(Debug, Clone, PartialEq)]
pub enum Block {
    Heading(u8, String),
    Paragraph(String),
    Quote(String),
    List {
        ordered: bool,
        items: Vec<String>,
    },
    Table {
        header: Vec<String>,
        rows: Vec<Vec<String>>,
    },
    Code(String),
    Rule,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SpanKind {
    Plain,
    Bold,
    Italic,
    Code,
    /// Formula `$...$`, mostrata come testo monospace.
    Math,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Span {
    pub kind: SpanKind,
    pub text: String,
}

fn is_table_separator(line: &str) -> bool {
    let t = line.trim();
    t.contains('-') && t.starts_with('|') && t.chars().all(|c| matches!(c, '|' | '-' | ':' | ' '))
}

fn split_row(line: &str) -> Vec<String> {
    line.trim()
        .trim_matches('|')
        .split('|')
        .map(|c| c.trim().to_owned())
        .collect()
}

fn list_marker(line: &str) -> Option<(bool, &str)> {
    let t = line.trim_start();
    if let Some(rest) = t.strip_prefix("- ").or_else(|| t.strip_prefix("* ")) {
        return Some((false, rest));
    }
    let digits = t.chars().take_while(char::is_ascii_digit).count();
    if digits > 0 {
        if let Some(rest) = t[digits..].strip_prefix(". ") {
            return Some((true, rest));
        }
    }
    None
}

fn is_block_start(line: &str) -> bool {
    let t = line.trim_start();
    t.starts_with('#')
        || t.starts_with('>')
        || t.starts_with("```")
        || t.starts_with('|')
        || t == "---"
        || list_marker(line).is_some()
}

/// Spezza il testo in blocchi. Le righe consecutive di un paragrafo si uniscono con uno spazio.
pub fn parse_blocks(src: &str) -> Vec<Block> {
    let lines: Vec<&str> = src.lines().collect();
    let mut blocks = Vec::new();
    let mut i = 0;
    while i < lines.len() {
        let line = lines[i];
        let t = line.trim();
        if t.is_empty() {
            i += 1;
        } else if t.starts_with("```") {
            let mut code = Vec::new();
            i += 1;
            while i < lines.len() && !lines[i].trim_start().starts_with("```") {
                code.push(lines[i]);
                i += 1;
            }
            i += 1;
            blocks.push(Block::Code(code.join("\n")));
        } else if t == "---" {
            blocks.push(Block::Rule);
            i += 1;
        } else if t.starts_with('#') {
            let level = t.chars().take_while(|&c| c == '#').count().min(6);
            blocks.push(Block::Heading(level as u8, t[level..].trim().to_owned()));
            i += 1;
        } else if t.starts_with('>') {
            let mut parts = Vec::new();
            while i < lines.len() && lines[i].trim_start().starts_with('>') {
                parts.push(lines[i].trim_start()[1..].trim().to_owned());
                i += 1;
            }
            blocks.push(Block::Quote(parts.join(" ")));
        } else if t.starts_with('|') && lines.get(i + 1).is_some_and(|l| is_table_separator(l)) {
            let header = split_row(t);
            i += 2;
            let mut rows = Vec::new();
            while i < lines.len() && lines[i].trim_start().starts_with('|') {
                rows.push(split_row(lines[i]));
                i += 1;
            }
            blocks.push(Block::Table { header, rows });
        } else if let Some((ordered, _)) = list_marker(line) {
            let mut items: Vec<String> = Vec::new();
            while i < lines.len() {
                match list_marker(lines[i]) {
                    Some((o, rest)) if o == ordered => items.push(rest.trim().to_owned()),
                    // Riga di continuazione indentata della voce precedente.
                    None if lines[i].starts_with(' ') && !lines[i].trim().is_empty() => {
                        if let Some(last) = items.last_mut() {
                            last.push(' ');
                            last.push_str(lines[i].trim());
                        }
                    }
                    _ => break,
                }
                i += 1;
            }
            blocks.push(Block::List { ordered, items });
        } else {
            let mut parts = Vec::new();
            while i < lines.len()
                && !lines[i].trim().is_empty()
                && (parts.is_empty() || !is_block_start(lines[i]))
            {
                parts.push(lines[i].trim());
                i += 1;
            }
            blocks.push(Block::Paragraph(parts.join(" ")));
        }
    }
    blocks
}

fn find_closing(chars: &[char], from: usize, delim: &[char]) -> Option<usize> {
    (from..chars.len().saturating_sub(delim.len() - 1)).find(|&j| chars[j..].starts_with(delim))
}

/// Inline: `**grassetto**`, `*corsivo*`, `` `codice` ``, `$formula$`; i link `[t](u)` diventano `t`.
pub fn parse_inline(text: &str) -> Vec<Span> {
    let chars: Vec<char> = text.chars().collect();
    let mut spans: Vec<Span> = Vec::new();
    let mut plain = String::new();
    let mut i = 0;
    let flush = |plain: &mut String, spans: &mut Vec<Span>| {
        if !plain.is_empty() {
            spans.push(Span {
                kind: SpanKind::Plain,
                text: std::mem::take(plain),
            });
        }
    };
    while i < chars.len() {
        let (kind, delim): (Option<SpanKind>, &[char]) = match chars[i] {
            '*' if chars.get(i + 1) == Some(&'*') => (Some(SpanKind::Bold), &['*', '*']),
            '*' if chars.get(i + 1).is_some_and(|c| !c.is_whitespace()) => {
                (Some(SpanKind::Italic), &['*'])
            }
            '`' => (Some(SpanKind::Code), &['`']),
            '$' => (Some(SpanKind::Math), &['$']),
            _ => (None, &[]),
        };
        if let Some(kind) = kind {
            let start = i + delim.len();
            if let Some(end) = find_closing(&chars, start, delim).filter(|&e| e > start) {
                flush(&mut plain, &mut spans);
                spans.push(Span {
                    kind,
                    text: chars[start..end].iter().collect(),
                });
                i = end + delim.len();
                continue;
            }
        }
        if chars[i] == '[' {
            let mid =
                find_closing(&chars, i + 1, &[']']).filter(|&m| chars.get(m + 1) == Some(&'('));
            if let Some((mid, end)) =
                mid.and_then(|m| Some((m, find_closing(&chars, m + 2, &[')'])?)))
            {
                plain.extend(&chars[i + 1..mid]);
                i = end + 1;
                continue;
            }
        }
        plain.push(chars[i]);
        i += 1;
    }
    flush(&mut plain, &mut spans);
    spans
}

fn inline_job(text: &str, size: f32, base: egui::Color32) -> LayoutJob {
    let mut job = LayoutJob::default();
    for span in parse_inline(text) {
        let mono = matches!(span.kind, SpanKind::Code | SpanKind::Math);
        let (family, color, italics) = match span.kind {
            SpanKind::Plain => (FontFamily::Proportional, base, false),
            SpanKind::Bold => (FontFamily::Proportional, egui::Color32::WHITE, false),
            SpanKind::Italic => (FontFamily::Proportional, base, true),
            SpanKind::Code | SpanKind::Math => (FontFamily::Monospace, theme::ACCENT_GLOW, false),
        };
        let font_size = if mono { size - 1.5 } else { size };
        job.append(
            &span.text,
            0.0,
            TextFormat {
                font_id: FontId::new(font_size, family),
                color,
                italics,
                ..Default::default()
            },
        );
    }
    job
}

fn inline(ui: &mut egui::Ui, text: &str, size: f32, color: egui::Color32) {
    ui.add(egui::Label::new(inline_job(text, size, color)).wrap());
}

fn render_table(ui: &mut egui::Ui, id: usize, header: &[String], rows: &[Vec<String>]) {
    let cols = header.len().max(1);
    let width = ((ui.available_width() - 12.0 * cols as f32) / cols as f32).max(60.0);
    egui::Grid::new(("md-table", id))
        .striped(true)
        .min_col_width(width)
        .max_col_width(width)
        .show(ui, |ui| {
            for cell in header {
                ui.label(
                    RichText::new(cell.to_uppercase())
                        .monospace()
                        .size(11.0)
                        .color(theme::MUTED),
                );
            }
            ui.end_row();
            for row in rows {
                for cell in row.iter().take(cols) {
                    inline(ui, cell, 13.0, theme::INK);
                }
                ui.end_row();
            }
        });
}

/// Disegna i blocchi nell'`Ui` corrente (da usare dentro una `ScrollArea`).
pub fn render(ui: &mut egui::Ui, blocks: &[Block]) {
    for (idx, block) in blocks.iter().enumerate() {
        match block {
            Block::Heading(level, text) => {
                ui.add_space(if *level <= 2 { 14.0 } else { 8.0 });
                let size = match level {
                    1 => 34.0,
                    2 => 26.0,
                    3 => 20.0,
                    _ => 17.0,
                };
                ui.add(egui::Label::new(theme::display_text(text, size, theme::INK, 1.5)).wrap());
                if *level <= 2 {
                    ui.separator();
                }
            }
            Block::Paragraph(text) => inline(ui, text, 14.5, theme::INK),
            Block::Quote(text) => {
                egui::Frame::new()
                    .fill(theme::ACCENT_SOFT)
                    .inner_margin(egui::Margin::symmetric(12, 8))
                    .show(ui, |ui| {
                        ui.set_width(ui.available_width());
                        inline(ui, text, 14.0, theme::MUTED);
                    });
            }
            Block::List { ordered, items } => {
                for (n, item) in items.iter().enumerate() {
                    ui.horizontal_top(|ui| {
                        let marker = if *ordered {
                            format!("{}.", n + 1)
                        } else {
                            "•".to_owned()
                        };
                        ui.label(RichText::new(marker).monospace().color(theme::ACCENT));
                        inline(ui, item, 14.5, theme::INK);
                    });
                }
            }
            Block::Table { header, rows } => render_table(ui, idx, header, rows),
            Block::Code(code) => {
                egui::Frame::new()
                    .fill(theme::ELEVATED)
                    .inner_margin(egui::Margin::same(10))
                    .show(ui, |ui| {
                        ui.set_width(ui.available_width());
                        ui.add(egui::Label::new(RichText::new(code).monospace().size(12.5)).wrap());
                    });
            }
            Block::Rule => {
                ui.separator();
            }
        }
        ui.add_space(4.0);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_parse_headings_paragraphs_and_join_wrapped_lines() {
        let b = parse_blocks("# Titolo\n\nprima riga\nseconda riga\n\n## Sub\n---\n");
        assert_eq!(
            b,
            vec![
                Block::Heading(1, "Titolo".into()),
                Block::Paragraph("prima riga seconda riga".into()),
                Block::Heading(2, "Sub".into()),
                Block::Rule,
            ]
        );
    }

    #[test]
    fn should_parse_lists_with_continuation_lines() {
        let b = parse_blocks("- uno\n  segue\n- due\n\n1. a\n2. b");
        assert_eq!(
            b[0],
            Block::List {
                ordered: false,
                items: vec!["uno segue".into(), "due".into()]
            }
        );
        assert_eq!(
            b[1],
            Block::List {
                ordered: true,
                items: vec!["a".into(), "b".into()]
            }
        );
    }

    #[test]
    fn should_parse_tables_quotes_and_code_fences() {
        let b = parse_blocks(
            "| A | B |\n|---|:-:|\n| 1 | 2 |\n\n> cita\n> due\n\n```\nlet x = 1;\n\nfine\n```",
        );
        assert_eq!(
            b[0],
            Block::Table {
                header: vec!["A".into(), "B".into()],
                rows: vec![vec!["1".into(), "2".into()]]
            }
        );
        assert_eq!(b[1], Block::Quote("cita due".into()));
        assert_eq!(b[2], Block::Code("let x = 1;\n\nfine".into()));
    }

    #[test]
    fn should_parse_inline_styles_math_and_links() {
        let s = parse_inline("a **b** *c* `d` $x_i$ [t](http://u) fine");
        let kinds: Vec<_> = s.iter().map(|s| (s.kind, s.text.as_str())).collect();
        assert_eq!(
            kinds,
            vec![
                (SpanKind::Plain, "a "),
                (SpanKind::Bold, "b"),
                (SpanKind::Plain, " "),
                (SpanKind::Italic, "c"),
                (SpanKind::Plain, " "),
                (SpanKind::Code, "d"),
                (SpanKind::Plain, " "),
                (SpanKind::Math, "x_i"),
                (SpanKind::Plain, " t fine"),
            ]
        );
    }

    #[test]
    fn should_keep_unmatched_delimiters_as_plain_text() {
        let s = parse_inline("costo 5$ e 2 * 3 e **aperto");
        assert!(s.iter().all(|s| s.kind == SpanKind::Plain));
        let joined: String = s.iter().map(|s| s.text.as_str()).collect();
        assert_eq!(joined, "costo 5$ e 2 * 3 e **aperto");
    }

    #[test]
    fn should_parse_every_embedded_paper_without_panicking() {
        for p in crate::papers::PAPERS {
            assert!(!parse_blocks(p.source).is_empty(), "{}", p.file);
        }
    }
}
