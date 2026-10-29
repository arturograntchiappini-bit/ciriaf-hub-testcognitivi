//! Fuzz differenziale Go/No-Go. Dove il TS viola il limite di 2 No-Go consecutivi (DIVERGENZE.md #1) si verificano gli
//! invarianti del paper; i casi `tsHang` (nessuno osservato) si verificano per terminazione e conteggi.
mod common;

use common::fuzz::{from, load, seeded, trials, Fuzz};
use serde_json::json;
use sintropia_engines::gonogo::{
    generate_go_nogo, score_go_nogo, GoNoGoKind, GoNoGoParams, GoNoGoStimulus,
};

fn longest_nogo_run(stimuli: &[GoNoGoStimulus]) -> usize {
    stimuli
        .split(|s| s.kind == GoNoGoKind::Go)
        .map(<[_]>::len)
        .max()
        .unwrap_or(0)
}

/// Invarianti del paper: lunghezza e numero di Go esatti, ISI nell'intervallo, serie di No-Go <= 2 quando è realizzabile.
fn check_invariants(
    ev: &mut common::Evidence,
    stimuli: &[GoNoGoStimulus],
    params: &GoNoGoParams,
    id: &str,
) {
    let n = params.n_trials as usize;
    let n_go = (f64::from(params.n_trials) * params.go_ratio + 0.5).floor() as usize;
    ev.exact(&stimuli.len(), &n, &format!("{id}.len"));
    ev.exact(
        &stimuli.iter().filter(|s| s.kind == GoNoGoKind::Go).count(),
        &n_go,
        &format!("{id}.go_count"),
    );
    let isi_ok = stimuli
        .iter()
        .all(|s| (params.isi_min_ms..=params.isi_max_ms).contains(&s.isi_ms));
    ev.exact(&isi_ok, &true, &format!("{id}.isi"));
    let feasible = n - n_go <= 2 * n_go; // il primo trial è sempre Go: servono almeno n_nogo/2 Go
    if feasible {
        ev.exact(
            &(longest_nogo_run(stimuli) <= 2),
            &true,
            &format!("{id}.max_nogo_run<=2"),
        );
    }
}

#[test]
fn should_match_typescript_on_gonogo_fuzz_corpus() {
    let fx = load("gonogo");
    let mut fz = Fuzz::new("gonogo");
    let (mut diverged, mut hung) = (0, 0);
    fz.each(&fx, "generation", |c, id, ev| {
        let params: GoNoGoParams = from(&c["params"]);
        let mut rand = seeded(c);
        let stimuli = generate_go_nogo(&params, &mut rand);
        if c.get("expectedDivergence").is_some() {
            diverged += 1;
            check_invariants(ev, &stimuli, &params, id);
            let ts_go = c["stimuli"]
                .as_array()
                .expect("stimuli")
                .iter()
                .filter(|s| s["kind"] == "go")
                .count();
            ev.exact(
                &stimuli.iter().filter(|s| s.kind == GoNoGoKind::Go).count(),
                &ts_go,
                &format!("{id}.go_count_vs_ts"),
            );
            return;
        }
        ev.json(&json!(stimuli), &c["stimuli"], &format!("{id}.stimuli"));
        ev.close(
            rand(),
            c["nextRand"].as_f64().expect("nextRand"),
            &format!("{id}.nextRand"),
        );
    });
    fz.each(&fx, "tsHang", |c, id, ev| {
        hung += 1;
        let params: GoNoGoParams = from(&c["params"]);
        check_invariants(ev, &generate_go_nogo(&params, &mut seeded(c)), &params, id);
    });
    fz.each(&fx, "scoring", |c, id, ev| {
        ev.metrics(
            &score_go_nogo(&trials("gonogo", &c["trials"])),
            &c["metrics"],
            &format!("{id}.metrics"),
        );
    });
    (0..diverged).for_each(|_| fz.expected_divergence("ts-more-than-2-consecutive-nogo"));
    (0..hung).for_each(|_| fz.expected_divergence("ts-hang-rust-terminates"));
    fz.finish(&fx);
}
