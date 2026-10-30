//! Nucleo condiviso di Sintropia Desktop: porting fedele di `src/engine` e `src/ui/runtime` della web app.
#![forbid(unsafe_code)]

pub mod export;
pub mod rng;
pub mod sdt;
pub mod sequencer;
pub mod session;
pub mod types;
pub mod validation;

pub use types::*;

/// Versione semver del motore, scritta in ogni export (`engineVersion` nei JSON, piè di pagina nel report HTML).
/// Va incrementata a ogni cambiamento osservabile di sequenze, metriche o formati.
pub const ENGINE_VERSION: &str = "0.2.0";
