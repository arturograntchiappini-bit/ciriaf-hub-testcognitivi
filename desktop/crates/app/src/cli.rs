//! Flag da riga di comando per aprire direttamente una schermata o un test (screenshot e prove).
use sintropia_core::TestId;

/// Schermata richiesta con `--screen`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ScreenArg {
    Dashboard,
    Settings,
    Papers,
    Paper(String),
    Session,
    ResultsDemo,
    /// Risultati senza dati (stato vuoto).
    Results,
    Instructions(TestId),
    /// Dashboard con la guida delle scorciatoie aperta.
    Shortcuts,
}

#[derive(Debug, Default, Clone, PartialEq)]
pub struct CliArgs {
    pub screen: Option<ScreenArg>,
    pub test: Option<TestId>,
    pub no_practice: bool,
    pub size: Option<(f32, f32)>,
    pub demo_results: bool,
}

fn parse_screen(value: &str) -> Result<ScreenArg, String> {
    match value {
        "dashboard" => Ok(ScreenArg::Dashboard),
        "settings" => Ok(ScreenArg::Settings),
        "papers" => Ok(ScreenArg::Papers),
        "session" => Ok(ScreenArg::Session),
        "results-demo" => Ok(ScreenArg::ResultsDemo),
        "results" => Ok(ScreenArg::Results),
        "shortcuts" => Ok(ScreenArg::Shortcuts),
        other if other.starts_with("instructions:") => {
            parse_test(&other["instructions:".len()..]).map(ScreenArg::Instructions)
        }
        other => match other.strip_prefix("paper:") {
            Some(slug) if !slug.is_empty() => Ok(ScreenArg::Paper(slug.to_string())),
            _ => Err(format!("schermata sconosciuta: {other}")),
        },
    }
}

fn parse_size(value: &str) -> Result<(f32, f32), String> {
    let parsed = value.split_once('x').and_then(|(w, h)| {
        let (w, h) = (w.parse::<f32>().ok()?, h.parse::<f32>().ok()?);
        (w >= 200.0 && h >= 200.0).then_some((w, h))
    });
    parsed.ok_or_else(|| format!("dimensione non valida (atteso WxH): {value}"))
}

fn parse_test(value: &str) -> Result<TestId, String> {
    TestId::ALL
        .into_iter()
        .find(|t| t.as_str().eq_ignore_ascii_case(value))
        .ok_or_else(|| format!("test sconosciuto: {value}"))
}

impl CliArgs {
    pub fn parse(args: impl IntoIterator<Item = String>) -> Result<Self, String> {
        let mut cli = Self::default();
        let mut args = args.into_iter();
        while let Some(flag) = args.next() {
            let mut value = || {
                args.next()
                    .ok_or_else(|| format!("{flag} richiede un valore"))
            };
            match flag.as_str() {
                "--screen" => cli.screen = Some(parse_screen(&value()?)?),
                "--test" => cli.test = Some(parse_test(&value()?)?),
                "--size" => cli.size = Some(parse_size(&value()?)?),
                "--no-practice" => cli.no_practice = true,
                "--demo-results" => cli.demo_results = true,
                other => return Err(format!("opzione sconosciuta: {other}")),
            }
        }
        Ok(cli)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(line: &str) -> Result<CliArgs, String> {
        CliArgs::parse(line.split_whitespace().map(String::from))
    }

    #[test]
    fn should_parse_all_flags() {
        let cli = parse(
            "--screen paper:sart --test visualSearch --no-practice --size 1280x800 --demo-results",
        )
        .unwrap();
        assert_eq!(cli.screen, Some(ScreenArg::Paper("sart".into())));
        assert_eq!(cli.test, Some(TestId::VisualSearch));
        assert!(cli.no_practice && cli.demo_results);
        assert_eq!(cli.size, Some((1280.0, 800.0)));
    }

    #[test]
    fn should_reject_unknown_or_incomplete_flags() {
        assert!(parse("--bogus").is_err());
        assert!(parse("--screen").is_err());
        assert!(parse("--screen nowhere").is_err());
        assert!(parse("--size 10x10").is_err());
        assert!(parse("--test nope").is_err());
    }
}
