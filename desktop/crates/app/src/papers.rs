//! Paper markdown di `docs/scientific/*.md`, incorporati a compile time dal repo.
use sintropia_core::TestId;

pub struct Paper {
    pub file: &'static str,
    pub test: Option<TestId>,
    pub source: &'static str,
}

macro_rules! paper {
    ($file:literal, $test:expr) => {
        Paper {
            file: $file,
            test: $test,
            source: include_str!(concat!("../../../../docs/scientific/", $file)),
        }
    };
}

pub const PAPERS: [Paper; 13] = [
    paper!("stroop.md", Some(TestId::Stroop1)),
    paper!("gonogo.md", Some(TestId::Gonogo)),
    paper!("corsi.md", Some(TestId::Corsi)),
    paper!("nback.md", Some(TestId::Nback)),
    paper!("wcst.md", Some(TestId::Wcst)),
    paper!("pvt.md", Some(TestId::Pvt)),
    paper!("flanker.md", Some(TestId::Flanker)),
    paper!("sart.md", Some(TestId::Sart)),
    paper!("visual-search.md", Some(TestId::VisualSearch)),
    paper!("mental-rotation.md", Some(TestId::MentalRotation)),
    paper!("trail-making.md", Some(TestId::TrailMaking)),
    paper!("validazione-rt.md", None),
    paper!("bibliography.md", None),
];

impl Paper {
    /// Titolo = primo `# ` del documento (ripiega sul nome file).
    pub fn title(&self) -> &str {
        self.source
            .lines()
            .find_map(|l| l.strip_prefix("# "))
            .map(str::trim)
            .unwrap_or(self.file)
    }
}

impl Paper {
    /// Titolo senza il suffisso comune « — Riferimenti scientifici», per l'indice.
    pub fn short_title(&self) -> &str {
        let title = self.title();
        title
            .strip_suffix(" — Riferimenti scientifici")
            .unwrap_or(title)
    }
}

/// Paper del test dato (Stroop 1 e 2 condividono lo stesso documento).
pub fn paper_for(test: TestId) -> Option<usize> {
    let key = if test == TestId::Stroop2 {
        TestId::Stroop1
    } else {
        test
    };
    PAPERS.iter().position(|p| p.test == Some(key))
}

/// Indici dei paper il cui titolo o testo contiene `query` (senza distinzione di maiuscole); tutti se vuota.
pub fn matching(query: &str) -> Vec<usize> {
    let needle = query.trim().to_lowercase();
    (0..PAPERS.len())
        .filter(|&i| {
            needle.is_empty()
                || PAPERS[i].title().to_lowercase().contains(&needle)
                || PAPERS[i].source.to_lowercase().contains(&needle)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_drop_common_suffix_from_short_title() {
        assert_eq!(PAPERS[0].short_title(), "Stroop Task");
        assert!(PAPERS.iter().all(|p| !p.short_title().is_empty()));
    }

    #[test]
    fn should_filter_papers_by_title_or_body_and_return_all_when_empty() {
        assert_eq!(matching("  ").len(), PAPERS.len());
        assert!(matching("zzzz-non-esiste-zzzz").is_empty());
        assert!(matching("STROOP").contains(&0));
    }

    #[test]
    fn should_have_titles_and_map_stroop2_to_stroop_paper() {
        assert!(PAPERS
            .iter()
            .all(|p| !p.source.is_empty() && p.title() != p.file));
        assert_eq!(paper_for(TestId::Stroop2), paper_for(TestId::Stroop1));
        assert!(paper_for(TestId::Sart).is_some());
    }
}
