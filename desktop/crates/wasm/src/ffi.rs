//! Esposizione `extern "C"`: buffer in memoria del modulo, indirizzi letti da JS nella memoria lineare.
// `#[no_mangle]` conta come unsafe per il lint: è l'unico motivo di questo `allow`, e non c'è codice `unsafe` vero.
#![allow(unsafe_code)]

use crate::dispatch;
use std::cell::RefCell;

thread_local! {
    static INPUT: RefCell<Vec<u8>> = const { RefCell::new(Vec::new()) };
    static OUTPUT: RefCell<String> = const { RefCell::new(String::new()) };
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

/// Esegue la richiesta JSON presente nel buffer di input; ritorna la lunghezza della risposta.
#[no_mangle]
pub extern "C" fn engine_call() -> u32 {
    let response = INPUT.with(|b| dispatch::handle(&b.borrow()));
    OUTPUT.with(|o| {
        *o.borrow_mut() = response;
        o.borrow().len() as u32
    })
}

#[no_mangle]
pub extern "C" fn out_ptr() -> *const u8 {
    OUTPUT.with(|o| o.borrow().as_ptr())
}
