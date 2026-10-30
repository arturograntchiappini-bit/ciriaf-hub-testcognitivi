//! Contratto della porta JSON, in modo nativo. La parità con il TypeScript è provata da `src/engine/backend/parity.test.ts`
//! sul modulo compilato.
use serde_json::{json, Value};
use sintropia_wasm::dispatch::handle;

fn call(request: Value) -> Value {
    serde_json::from_str(&handle(request.to_string().as_bytes())).expect("risposta JSON")
}

#[test]
fn should_report_the_engine_version() {
    assert_eq!(call(json!({ "op": "version" })), json!({ "ok": "0.2.0" }));
}

#[test]
fn should_return_an_error_object_for_invalid_input() {
    for request in [
        json!({ "op": "boh" }),
        json!({ "op": "generate", "test": "inesistente", "seed": 1 }),
        json!({ "op": "generate", "test": "stroop", "seed": 1, "params": { "nTrials": "x" } }),
        json!({ "op": "generate", "test": "stroop" }),
        json!({ "op": "score", "test": "wcst" }),
    ] {
        assert!(call(request)["error"].is_string());
    }
    let garbage: Value =
        serde_json::from_str(&handle(b"{non json")).expect("anche l'errore e JSON");
    assert!(garbage["error"].is_string());
}

#[test]
fn should_generate_the_same_sequence_for_the_same_seed_and_report_the_draws() {
    let request = json!({
        "op": "generate", "test": "stroop", "seed": 7,
        "params": { "nTrials": 8, "fixationMs": 500, "timeoutMs": 3000, "isiMs": 500, "practiceTrials": 2 }
    });
    let (a, b) = (call(request.clone()), call(request));
    assert_eq!(a, b);
    assert!(a["ok"].as_array().is_some_and(|items| items.len() == 8));
    assert!(a["calls"].as_u64().is_some_and(|n| n > 0));
}

#[test]
fn should_treat_the_seed_like_javascript_uint32() {
    let params = json!({ "nTrials": 4, "fixationMs": 500, "timeoutMs": 3000, "isiMs": 500, "practiceTrials": 2 });
    let wrapped = call(
        json!({ "op": "generate", "test": "stroop", "seed": 4_294_967_296.0 + 5.0, "params": params }),
    );
    let plain = call(json!({ "op": "generate", "test": "stroop", "seed": 5, "params": params }));
    assert_eq!(wrapped, plain);
}
