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

pub const PAPERS: [Paper; 12] = [
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

/// Paper del test dato (Stroop 1 e 2 condividono lo stesso documento).
pub fn paper_for(test: TestId) -> Option<usize> {
    let key = if test == TestId::Stroop2 {
        TestId::Stroop1
    } else {
        test
    };
    PAPERS.iter().position(|p| p.test == Some(key))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_have_titles_and_map_stroop2_to_stroop_paper() {
        assert!(PAPERS
            .iter()
            .all(|p| !p.source.is_empty() && p.title() != p.file));
        assert_eq!(paper_for(TestId::Stroop2), paper_for(TestId::Stroop1));
        assert!(paper_for(TestId::Sart).is_some());
    }
}
