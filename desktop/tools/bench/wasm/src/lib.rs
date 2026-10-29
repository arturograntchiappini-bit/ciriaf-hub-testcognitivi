//! Wrapper `extern "C"` senza dipendenze di binding: i buffer vivono in memoria statica del modulo,
//! JS scrive/legge la memoria lineare agli indirizzi restituiti da `in_ptr`/`out_ptr` (nessun `unsafe`).
mod ops;

use std::cell::RefCell;

thread_local! {
    static INPUT: RefCell<Vec<u8>> = const { RefCell::new(Vec::new()) };
    static OUTPUT: RefCell<String> = const { RefCell::new(String::new()) };
    static LOADED: RefCell<Option<ops::ScoreInput>> = const { RefCell::new(None) };
}

fn test_name(id: u32) -> &'static str {
    ops::TESTS.get(id as usize).copied().unwrap_or("")
}

/// Riserva `len` byte nel buffer di input e ne restituisce l'indirizzo.
#[no_mangle]
pub extern "C" fn in_ptr(len: u32) -> *const u8 {
    INPUT.with(|b| {
        let mut b = b.borrow_mut();
        b.clear();
        b.resize(len as usize, 0);
        b.as_ptr()
    })
}

#[no_mangle]
pub extern "C" fn out_ptr() -> *const u8 {
    OUTPUT.with(|o| o.borrow().as_ptr())
}

#[no_mangle]
pub extern "C" fn out_len() -> u32 {
    OUTPUT.with(|o| o.borrow().len() as u32)
}

/// Genera la sequenza; ritorna il numero di elementi (u32::MAX se test sconosciuto).
#[no_mangle]
pub extern "C" fn generate(test: u32, scale: u32) -> u32 {
    ops::generate(test_name(test), scale, false).map_or(u32::MAX, |(n, _)| n as u32)
}

/// Come `generate` ma serializza in JSON nel buffer di output.
#[no_mangle]
pub extern "C" fn generate_json(test: u32, scale: u32) -> u32 {
    match ops::generate(test_name(test), scale, true) {
        Some((n, text)) => {
            OUTPUT.with(|o| *o.borrow_mut() = text);
            n as u32
        }
        None => u32::MAX,
    }
}

/// Decodifica il JSON di input (già scritto in memoria) e lo tiene pronto per `score_loaded`.
#[no_mangle]
pub extern "C" fn load_input() -> u32 {
    let parsed = INPUT.with(|b| serde_json::from_slice::<ops::ScoreInput>(&b.borrow()).ok());
    let ok = parsed.is_some();
    LOADED.with(|l| *l.borrow_mut() = parsed);
    ok as u32
}

/// Punteggio sull'input già decodificato (calcolo puro, senza JSON).
#[no_mangle]
pub extern "C" fn score_loaded(test: u32) -> u32 {
    LOADED.with(|l| {
        l.borrow()
            .as_ref()
            .and_then(|i| ops::score(test_name(test), i))
            .map_or(u32::MAX, |m| m.len() as u32)
    })
}

/// Confine completo: JSON in memoria → punteggio → JSON nel buffer di output.
#[no_mangle]
pub extern "C" fn score_json(test: u32) -> u32 {
    let text = INPUT.with(|b| {
        let b = b.borrow();
        ops::score_json(test_name(test), std::str::from_utf8(&b).unwrap_or(""))
    });
    OUTPUT.with(|o| *o.borrow_mut() = text);
    OUTPUT.with(|o| o.borrow().len() as u32)
}

/// Carica i cubetti (JSON `[[x,y,z],...]`) per `project_all`/`chiral`.
#[no_mangle]
pub extern "C" fn load_cubes() -> u32 {
    let cubes = INPUT.with(|b| serde_json::from_slice::<Vec<ops::Cube>>(&b.borrow()).ok());
    let ok = cubes.is_some();
    CUBES.with(|c| *c.borrow_mut() = cubes.unwrap_or_default());
    ok as u32
}

thread_local! {
    static CUBES: RefCell<Vec<ops::Cube>> = const { RefCell::new(Vec::new()) };
}

#[no_mangle]
pub extern "C" fn project_all() -> u32 {
    CUBES.with(|c| ops::project_all(&c.borrow()) as u32)
}

#[no_mangle]
pub extern "C" fn chiral() -> u32 {
    CUBES.with(|c| ops::chiral(&c.borrow()) as u32)
}
