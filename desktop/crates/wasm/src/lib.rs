//! Motore Sintropia per il browser: un'unica porta JSON → JSON sopra `sintropia-engines`.
//!
//! La web app scrive una richiesta nel buffer di input, chiama `engine_call` e legge la risposta dal buffer di output
//! (nessun binding generato). Tutta la logica sta in [`dispatch::handle`], testabile in modo nativo; `ffi` contiene
//! solo l'esposizione `extern "C"` (l'unico punto che richiede `unsafe_code`, vedi `docs/sicurezza.md`).
#![deny(unsafe_code)]

pub mod dispatch;
mod ffi;
