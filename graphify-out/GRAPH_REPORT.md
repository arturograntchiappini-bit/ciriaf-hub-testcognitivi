# Graph Report - ciriaf-hub-testcognitivi  (2026-10-30)

## Corpus Check
- 372 files · ~338,468 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 27 file(s) not represented in the graph (top: .gz 11, (none) 5, .ttf 3)

## Summary
- 4589 nodes · 10891 edges · 207 communities (181 shown, 26 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 642 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `23de699b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- rng.ts
- mean
- tests/wcst.ts
- sequencer.rs
- session_ui.rs
- src/corsi.rs
- golden_core.rs
- Stroop Generator & Scoring
- Corsi Sequence Generation & Scoring
- N-Back Metrics & Quartile Analysis
- WCST Scoring & Heaton Metrics
- TypeScript Compiler Configuration
- Go/No-Go Generator & Scoring
- export.rs
- tests/mentalRotation.ts
- TypeScript Strict Mode Config
- src/mental_rotation.rs
- Ui
- session.rs
- CIRIAF — COLAB/NEXTROOM Cognitive Testing Hub — Design
- Session Timeline Interactive UI
- react
- Project Identity & Entry Points
- Corsi Scientific Literature
- N-Back Scientific Literature
- Go/No-Go Scientific Literature
- WCST Scientific Literature
- Stroop Scientific Literature
- RT Validation Methodology Literature
- devDependencies
- router.ts
- SPEC — CIRIAF Cognitive Testing Hub
- Corsi Block-Tapping Task — funzionamento tecnico
- Feature "Sessione" — Implementation Plan
- N-Back (2-back) — funzionamento tecnico
- tests/sart.ts
- Go/No-Go Task — funzionamento tecnico
- Stroop Task (1 e 2) — funzionamento tecnico
- Wisconsin Card Sorting Test — funzionamento tecnico
- src/flanker.rs
- dependencies
- package.json
- model.ts
- src/nback.rs
- Sintropia — Cognitive tests Hub
- chrome.rs
- Bibliografia
- Revisione motore — copie standalone dei test cognitivi
- runtime.rs
- catalog.rs
- types.ts
- App.tsx
- Home.tsx
- views/sart.rs
- src/visual_search.rs
- tests/visualSearch.ts
- rt.rs
- src/sart.rs
- revisione-motore/sart.ts
- revisione-motore/mentalRotation.ts
- markdown.rs
- RtMachine<S>
- revisione-motore/flanker.ts
- README.md
- views_custom/trail_making.rs
- fuzz.mjs
- revisione-motore/pvt.ts
- theme.rs
- CorsiRunner
- Science.tsx
- sync-revisione-motore.mjs
- src/trail_making.rs
- SessionRunner.tsx
- json
- src/wcst.rs
- core.mjs
- SintropiaApp
- views/pvt.rs
- src/pvt.rs
- views_custom/wcst.rs
- tests/stroop.ts
- brainCloud.ts
- egui
- src/stroop.rs
- exportFormats.ts
- widgets.rs
- mulberry32
- revisione-motore/visualSearch.ts
- views_custom/corsi.rs
- Evidence
- brainScene.ts
- views/mental_rotation.rs
- BrainStage.tsx
- data.rs
- MetricValue
- ScreenArg
- layout.rs
- src/gonogo.rs
- merge.mjs
- SessionResults.tsx
- demoTimeline.ts
- perf_budget.rs
- dashboard.rs
- views/flanker.rs
- CIRIAF — COLAB/NEXTROOM Cognitive Testing Hub — Design
- ops.rs
- views/visual_search.rs
- Migrazione dei motori da TypeScript a Rust: dimostrazione sperimentale dell'equivalenza
- markdown.ts
- fuzz.rs
- results.rs
- TestId
- super
- Card
- views/stroop.rs
- TestHost.tsx
- tests/flanker.ts
- fuzz_stroop.rs
- SessionStore
- WcstRunner
- trailMaking.ts
- phase
- serialize
- validation.rs
- proptest_trail_making.rs
- tests/corsi.ts
- BatteryEditor
- SessionScreen
- tests/sart.ts
- load_fixture
- Benchmark dei motori: TypeScript vs Rust nativo vs WebAssembly
- defaults.rs
- Color
- proptest_flanker.rs
- proptest_visual_search.rs
- run-wasm.mjs
- RunnerStatus
- views_custom/mod.rs
- run_prop
- proptest_gonogo.rs
- PVT (Psychomotor Vigilance Task) — Riferimenti scientifici
- SART — Sustained Attention to Response Task — Riferimenti scientifici
- Op
- count_perseveration
- SPEC — CIRIAF Cognitive Testing Hub
- should_match_typescript_on_nback_fuzz_corpus
- papers.rs
- fsutil.rs
- proptest_sart.rs
- proptest_wcst.rs
- DesktopDownload.tsx
- js_round
- bench.mjs
- Visual Search — Ricerca visiva — Riferimenti scientifici
- brainNoise.ts
- timeline
- js_round
- golden_wcst.rs
- Ui
- settings_screen.rs
- golden_trail_making.rs
- Mental Rotation — Rotazione mentale — Riferimenti scientifici
- CsvValue
- validationflag
- golden_nback.rs
- Flanker Task (Eriksen) — Riferimenti scientifici
- Sintropia Desktop
- Trail Making Test A e B — Riferimenti scientifici
- scripts
- .templates_list
- mulberry32
- sintropia-core
- setup.ts
- SessionTemplate
- ButtonKind
- PauseChoice
- notes.md
- dependencies
- main.rs
- repository
- ENGINES
- Block
- inline
- generate_pvt
- display_family
- SpanKind
- Politica di sicurezza
- vite
- bugs

## God Nodes (most connected - your core abstractions)
1. `mulberry32()` - 93 edges
2. `run_prop()` - 53 edges
3. `vitest` - 50 edges
4. `mulberry32()` - 50 edges
5. `Evidence` - 46 edges
6. `TestResult` - 44 edges
7. `TrialResult` - 43 edges
8. `CorsiRunner` - 35 edges
9. `RtPlan` - 34 edges
10. `SessionScreen` - 31 edges

## Surprising Connections (you probably didn't know these)
- `2. Architettura` --references--> `FakeEnv`  [INFERRED]
  docs/scientific/migrazione-rust.md → src/ui/runtime/fakeEnv.ts
- `4. Regola di arresto e punteggio` --references--> `CorsiView()`  [INFERRED]
  revisione-motore/corsi.md → src/ui/tests/CorsiView.tsx
- `4. Mappatura implementativa` --references--> `MentalRotationView()`  [INFERRED]
  docs/scientific/mental-rotation.md → src/ui/tests/MentalRotationView.tsx
- `Cronologia delle revisioni` --references--> `SartView()`  [INFERRED]
  docs/scientific/sart.md → src/ui/tests/SartView.tsx
- `4. Mappatura implementativa` --references--> `classifyRt()`  [INFERRED]
  docs/scientific/sart.md → src/engine/validation.ts

## Import Cycles
- 1-file cycle: `desktop/crates/core/src/export.rs -> desktop/crates/core/src/export.rs`
- 2-file cycle: `desktop/crates/app/src/views_custom/corsi.rs -> desktop/crates/app/src/views_custom/mod.rs -> desktop/crates/app/src/views_custom/corsi.rs`
- 2-file cycle: `desktop/crates/app/src/views_custom/mod.rs -> desktop/crates/app/src/views_custom/wcst.rs -> desktop/crates/app/src/views_custom/mod.rs`
- 2-file cycle: `desktop/crates/app/src/views_custom/mod.rs -> desktop/crates/app/src/views_custom/trail_making.rs -> desktop/crates/app/src/views_custom/mod.rs`
- 3-file cycle: `desktop/crates/app/src/runner.rs -> desktop/crates/app/src/views_custom/mod.rs -> desktop/crates/app/src/views_custom/corsi.rs -> desktop/crates/app/src/runner.rs`
- 3-file cycle: `desktop/crates/app/src/runner.rs -> desktop/crates/app/src/views_custom/mod.rs -> desktop/crates/app/src/views_custom/wcst.rs -> desktop/crates/app/src/runner.rs`
- 3-file cycle: `desktop/crates/app/src/runner.rs -> desktop/crates/app/src/views_custom/mod.rs -> desktop/crates/app/src/views_custom/trail_making.rs -> desktop/crates/app/src/runner.rs`

## Hyperedges (group relationships)
- **RT Validation Framework (Anticipation + Omission + Preservation)** — docs_scientific_validazione_rt_md_anticipation_filter, docs_scientific_validazione_rt_md_omission_filter, docs_scientific_validazione_rt_md_data_preservation_principle, docs_scientific_validazione_rt_md_rt_validation_pipeline [EXTRACTED 1.00]
- **Session Mode Core Concepts** — docs_superpowers_specs_2026_07_07_feature_sessione_design_session_template, docs_superpowers_specs_2026_07_07_feature_sessione_design_time_pin, docs_superpowers_specs_2026_07_07_feature_sessione_design_session_phase, docs_superpowers_specs_2026_07_07_feature_sessione_design_session_state, docs_architettura_session_mode [EXTRACTED 1.00]
- **Six Cognitive Tests of CIRIAF Hub** — docs_scientific_stroop_md_stroop_task, docs_scientific_gonogo_md_go_nogo_task, docs_scientific_corsi_md_corsi_block_task, docs_scientific_nback_md_nback_task, docs_scientific_wcst_md_wcst [EXTRACTED 1.00]

## Communities (207 total, 26 thin omitted)

### Community 0 - "rng.ts"
Cohesion: 0.06
Nodes (67): build(), failed(), FIXED_SEQUENCES, PARAMS, passed(), TOLERANCES, tests, tests (+59 more)

### Community 1 - "mean"
Cohesion: 0.09
Nodes (30): 4. Mappatura implementativa, @testing-library/react, generatePvt(), LAPSE_THRESHOLD_MS, median(), PvtStimulus, round1(), round2() (+22 more)

### Community 2 - "tests/wcst.ts"
Cohesion: 0.08
Nodes (35): alignMetas(), ALL_COLORS, ALL_NUMBERS, ALL_SHAPES, buildDeck(), matchesOn(), matchingDims(), Dims (+27 more)

### Community 3 - "sequencer.rs"
Cohesion: 0.07
Nodes (55): after(), base_config(), clear_timers(), Clock, close_trial(), commissions(), compute_flag(), create_sequencer() (+47 more)

### Community 4 - "session_ui.rs"
Cohesion: 0.09
Nodes (24): ActiveContext, battery_editor(), default_battery_item(), DEFAULT_TOTAL_MS, demo_template(), first_metric(), MIN, MINUTE_MS (+16 more)

### Community 5 - "src/corsi.rs"
Cohesion: 0.06
Nodes (51): should_reproduce_the_typescript_sequences_for_the_same_seed(), canonical_key(), CanonicalKey, Packed, Text, complexity_of(), CORSI_BLOCKS, corsi_span() (+43 more)

### Community 6 - "golden_core.rs"
Cohesion: 0.04
Nodes (28): ENGINE_VERSION, Area, as_json(), csv_value_of(), EVIDENCE, fixture(), fixtures_dir(), flag_of() (+20 more)

### Community 7 - "Stroop Generator & Scoring"
Cohesion: 0.10
Nodes (23): accuracyByCondition(), countFlag(), generateStroop(), mean(), meanRtByCondition(), Phase, round1(), scoreStroop() (+15 more)

### Community 8 - "Corsi Sequence Generation & Scoring"
Cohesion: 0.12
Nodes (23): canonicalKey(), complexityOf(), CORSI_BLOCKS, CorsiParams, CorsiSequence, corsiSpan(), countCrossings(), distance() (+15 more)

### Community 9 - "N-Back Metrics & Quartile Analysis"
Cohesion: 0.12
Nodes (27): chooseLurePositions(), chooseTargetPositions(), countHitsFa(), Counts, criterionC(), dPrime(), generateNBack(), lureLags() (+19 more)

### Community 10 - "WCST Scoring & Heaton Metrics"
Cohesion: 0.07
Nodes (30): alignMetas(), ALL_COLORS, ALL_NUMBERS, ALL_SHAPES, buildDeck(), countPerseveration(), matchesOn(), matchingDims() (+22 more)

### Community 11 - "TypeScript Compiler Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+11 more)

### Community 12 - "Go/No-Go Generator & Scoring"
Cohesion: 0.13
Nodes (24): arrangeKinds(), countFlag(), criterionC(), deterministicArrange(), dPrime(), generateGoNoGo(), GoNoGoKind, GoNoGoParams (+16 more)

### Community 13 - "export.rs"
Cohesion: 0.07
Nodes (44): APP_NAME, CSV_SEPARATOR, CsvLocale, Intl, It, escape_html(), EVENTS_HEADER, export_filename() (+36 more)

### Community 14 - "tests/mentalRotation.ts"
Cohesion: 0.10
Nodes (39): accuracyPercent(), ARM_LENGTHS, chain(), conditionLabel(), Cube, cubeRotations(), Face, FACE_DIRECTIONS (+31 more)

### Community 15 - "TypeScript Strict Mode Config"
Cohesion: 0.22
Nodes (8): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, strict, include

### Community 19 - "src/mental_rotation.rs"
Cohesion: 0.05
Nodes (66): accuracy_percent(), apply_rotation(), ARM_LENGTHS, chain(), condition_label(), cube_rotations(), CUBES_PER_FIGURE, Face (+58 more)

### Community 20 - "Ui"
Cohesion: 0.10
Nodes (23): ActiveRun, banner(), builder_footer(), builder_header(), column(), duration_edit(), Exit, Clear (+15 more)

### Community 21 - "session.rs"
Cohesion: 0.09
Nodes (50): join_csv_row(), BatteryItem, compute_session_state(), distribute_phases_evenly(), FlatPin, flatten_pins(), ids(), make_local_id() (+42 more)

### Community 22 - "CIRIAF — COLAB/NEXTROOM Cognitive Testing Hub — Design"
Cohesion: 0.11
Nodes (18): 1. Paradigma e citazione primaria, 2. Meccanismo cognitivo (memoria visuo-spaziale di configurazione/sequenza), 3. Parametri adottati, 3bis. Coordinate dei 9 blocchi, 4. Mappatura implementativa, 5.1 Metriche calcolate dalla piattaforma, 5.2 Confronto con la letteratura, 5.3 Indice di complessità del percorso (+10 more)

### Community 23 - "Session Timeline Interactive UI"
Cohesion: 0.12
Nodes (16): 1. Motivazione (perché pulire gli RT prima dell'analisi), 2. Filtro di anticipazione (RT < 150 ms → "Errore di Anticipazione"): razionale e fonte, 3. Filtro di omissione (finestra chiusa senza risposta → "Errore di Omissione", mai valore nullo/infinito), 4. Varianza intrasoggetto (deviazione standard degli RT delle sole risposte corrette e valide), 5. Principio di conservazione del dato grezzo, 6. Mappatura implementativa, Bibliografia, Cronologia delle revisioni (+8 more)

### Community 24 - "react"
Cohesion: 0.14
Nodes (14): 1. Principio: due strati separati, 2. Struttura delle cartelle, 3. Il ciclo di un trial a tempo di reazione, 4. Validazione automatica dei dati, 5. I test interattivi (Corsi e WCST), 6. Come aggiungere un nuovo test, 7. Identità visiva, 8. Sessione, export e privacy (+6 more)

### Community 25 - "Project Identity & Entry Points"
Cohesion: 0.22
Nodes (7): SessionPhase (Named Time Block), SessionState (Derived Runtime State), SessionTemplate, TimePin (Absolute Offset for Test Battery), CIRIAF Hub HTML Entry Point, CIRIAF Favicon (Blue Rounded Square with Triangles), CIRIAF COLAB/NEXTROOM Cognitive Testing Hub

### Community 26 - "Corsi Scientific Literature"
Cohesion: 0.25
Nodes (4): Berch et al. 1998 (Corsi Methodological Considerations), Kessels et al. 2000 (Corsi Standardization and Normative Data), Corsi Block-Tapping Task, Visuo-Spatial Sketchpad (Working Memory Model)

### Community 27 - "N-Back Scientific Literature"
Cohesion: 0.22
Nodes (5): Hautus 1995 (Corrections for Extreme Proportions and d-prime), Jaeggi et al. 2010 (Concurrent Validity of N-Back as Working Memory Measure), Kirchner 1958 (Age Differences in Short-Term Retention), Owen et al. 2005 (N-Back Meta-Analysis of Neuroimaging), N-Back Task (2-back Verbal)

### Community 28 - "Go/No-Go Scientific Literature"
Cohesion: 0.29
Nodes (4): Verbruggen & Logan 2008 (Automatic and Controlled Response Inhibition), Wessel 2018 (Prepotent Motor Activity and Inhibitory Control), Go/No-Go Task (Motor Inhibition), Motor Inhibition (Prepotent Response Suppression)

### Community 29 - "WCST Scientific Literature"
Cohesion: 0.33
Nodes (4): Berg 1948 (Simple Objective Technique for Measuring Flexibility), Heaton 1993 (WCST Manual Revised), Perseveration (WCST Perseverative Errors), Wisconsin Card Sorting Test

### Community 30 - "Stroop Scientific Literature"
Cohesion: 0.33
Nodes (3): MacLeod 1991 (Half a Century of Research on the Stroop Effect), Stroop 1935 (Studies of Interference in Serial Verbal Reactions), Stroop Task (Color-Word Interference)

### Community 31 - "RT Validation Methodology Literature"
Cohesion: 0.33
Nodes (3): Luce 1986 (Response Times: Their Role in Inferring Elementary Mental Organization), Ratcliff 1993 (Methods for Dealing with Reaction Time Outliers), Whelan 2008 (Effective Analysis of Reaction Time Data)

### Community 32 - "devDependencies"
Cohesion: 0.11
Nodes (19): devDependencies, autoprefixer, @fontsource/big-shoulders-display, @fontsource/inter, @fontsource/jetbrains-mono, jsdom, postcss, tailwindcss (+11 more)

### Community 33 - "router.ts"
Cohesion: 0.14
Nodes (15): 1. Paradigma e citazione primaria, 2. Meccanismo cognitivo, 3. Parametri adottati, 4. Mappatura implementativa, 5.1 Classificazione delle risposte (per trial), 5.2 Sensibilità: d′ (d-prime), 5.3 Correzione loglinear (per evitare valori infiniti), 5.4 Tempi di risposta (RT) (+7 more)

### Community 34 - "SPEC — CIRIAF Cognitive Testing Hub"
Cohesion: 0.15
Nodes (13): 1. Paradigma e citazione primaria, 2. Meccanismo cognitivo misurato, 3. Parametri adottati, 4. Mappatura implementativa, 5.1 Accuratezza per condizione, 5.2 Tempo di reazione medio dei corretti validi, 5.3 Deviazione standard e coefficiente di variazione, 5.4 Effetto di interferenza (effetto Stroop) (+5 more)

### Community 35 - "Corsi Block-Tapping Task — funzionamento tecnico"
Cohesion: 0.12
Nodes (14): 1. Layout dei blocchi, 2. Generazione delle sequenze bilanciate, 3. Geometria di supporto, 4. Regola di arresto e punteggio, 5. Casi limite, 6. Demo, Algoritmo, Corsi Block-Tapping Task — funzionamento tecnico (+6 more)

### Community 36 - "Feature "Sessione" — Implementation Plan"
Cohesion: 0.17
Nodes (12): 1. Paradigma e citazione primaria, 2. Meccanismo cognitivo misurato, 3. Parametri adottati, 4. Mappatura implementativa, 5.1 Errori di commissione (inibizione — misura primaria), 5.2 Errori di omissione (attenzione sostenuta), 5.3 RT medio e deviazione standard dei Go corretti *validi*, 5.4 Anticipazioni (+4 more)

### Community 37 - "N-Back (2-back) — funzionamento tecnico"
Cohesion: 0.22
Nodes (8): 1. Logica del paradigma, 2. Generazione dello stream, 3. Teoria del segnale: d' e criterio c, 4. Metriche (`scoreNBack`), 5. Casi limite, 6. Demo, 7. Allineamento, N-Back (2-back) — funzionamento tecnico

### Community 38 - "tests/sart.ts"
Cohesion: 0.09
Nodes (40): pick(), randInt(), criterionC(), dPrime(), probit(), arrangeKinds(), deterministicArrange(), generateGoNoGo() (+32 more)

### Community 39 - "Go/No-Go Task — funzionamento tecnico"
Cohesion: 0.29
Nodes (6): 1. Logica del paradigma, 2. Generazione della sequenza, 3. Metriche (`scoreGoNoGo`), 4. Casi limite, 5. Demo, Go/No-Go Task — funzionamento tecnico

### Community 40 - "Stroop Task (1 e 2) — funzionamento tecnico"
Cohesion: 0.29
Nodes (6): 1. Varianti, 2. Generazione della sequenza, 3. Metriche (`scoreStroop`), 4. Note di validità, 5. Demo, Stroop Task (1 e 2) — funzionamento tecnico

### Community 41 - "Wisconsin Card Sorting Test — funzionamento tecnico"
Cohesion: 0.25
Nodes (7): 1. Materiali e regole, 2. Matching, 3. Scoring (`scoreWcst`) — operazionalizzazione di Heaton, 4. Note e limiti, 5. Demo, 6. Allineamento, Wisconsin Card Sorting Test — funzionamento tecnico

### Community 42 - "src/flanker.rs"
Cohesion: 0.07
Nodes (46): accuracy_percent(), arrange(), arrows_str(), build_arrows(), can_append(), condition_counts(), conflict_adaptation(), conflict_adaptation_refs() (+38 more)

### Community 43 - "dependencies"
Cohesion: 0.15
Nodes (12): 1. Obiettivo, 2. Modello dati, 3. Costruttore (SessionBuilder), 4. Runtime (SessionRunner), 5. Output (file di sessione), 6. Navigazione e file, 7. Testing, 8. Casi limite (+4 more)

### Community 44 - "package.json"
Cohesion: 0.10
Nodes (20): author, description, homepage, license, name, private, type, version (+12 more)

### Community 45 - "model.ts"
Cohesion: 0.10
Nodes (36): cloneTemplate(), computeSessionState(), distributePhasesEvenly(), FlatPin, flattenPins(), makeLocalId(), movePin(), movePinById() (+28 more)

### Community 47 - "src/nback.rs"
Cohesion: 0.11
Nodes (20): chunk_ranges(), count_hits_fa(), Counts, LETTERS_SEED_42, LURES_SEED_42, NBACK_LETTERS, num(), round1() (+12 more)

### Community 48 - "Sintropia — Cognitive tests Hub"
Cohesion: 0.11
Nodes (19): Aggiungere un test, Architettura, Autore, Avvio rapido, Come citare, Come si somministra un test, Contribuire, Cos'è (+11 more)

### Community 49 - "chrome.rs"
Cohesion: 0.10
Nodes (30): ACCENT_TINT, BAR_HEIGHT, button(), countdown(), draw_key(), escape_pressed(), feedback(), fixation_cross() (+22 more)

### Community 50 - "Bibliografia"
Cohesion: 0.18
Nodes (10): Bibliografia, Corsi Block-Tapping Task, Flanker Task, Go / No-Go Task, N-Back Task, PVT — Psychomotor Vigilance Task, SART — Sustained Attention to Response Task, Stroop Task (+2 more)

### Community 51 - "Revisione motore — copie standalone dei test cognitivi"
Cohesion: 0.40
Nodes (4): Allineamento con l'engine (IMPORTANTE), Cosa sono questi file, Ottimizzazioni applicate in questa revisione, Revisione motore — copie standalone dei test cognitivi

### Community 52 - "runtime.rs"
Cohesion: 0.08
Nodes (17): EguiEnv, log(), PaintCallback, SESSION_ALPHABET, session_id_for(), should_build_session_id_like_the_web_app(), should_chain_timers_from_the_nominal_time_without_accumulating_frame_lag(), should_defer_a_paint_requested_by_a_timer_to_the_next_frame() (+9 more)

### Community 53 - "catalog.rs"
Cohesion: 0.08
Nodes (40): CORSI_FIELDS, fd(), FieldDesc, FLANKER_FIELDS, focus(), focus_for(), FRONTAL, FRONTO_PARIETAL (+32 more)

### Community 54 - "types.ts"
Cohesion: 0.09
Nodes (36): Cancel, Clock, performanceClock, realScheduler(), Scheduler, CSV_HEADER, exportFilename(), JsonExport (+28 more)

### Community 55 - "App.tsx"
Cohesion: 0.09
Nodes (43): react-dom, App(), goHome(), persistSettings(), refreshTemplates(), resumeSession(), saveSessionTemplate(), startSession() (+35 more)

### Community 56 - "Home.tsx"
Cohesion: 0.08
Nodes (37): react, BatteryItem, TestId, AuthorCard(), EXTERNAL_LINK, LINKEDIN_URL, REPOSITORY_URL, Brand() (+29 more)

### Community 57 - "views/sart.rs"
Cohesion: 0.12
Nodes (26): CIRCLE_RADIUS_PX, condition(), draw(), plan(), PRACTICE_FEEDBACK_MS, run(), runner(), should_carry_the_per_trial_isi_and_withhold_rules() (+18 more)

### Community 58 - "src/visual_search.rs"
Cohesion: 0.06
Nodes (57): least_squares(), should_average_noisy_points(), should_fit_exact_line(), accuracy_percent(), BLUE_CIRCLE, condition_label(), dash(), distractors() (+49 more)

### Community 59 - "tests/visualSearch.ts"
Cohesion: 0.11
Nodes (34): build(), cell(), hit(), miss(), T(), variants, leastSquares(), shuffle() (+26 more)

### Community 60 - "rt.rs"
Cohesion: 0.10
Nodes (19): S, COUNTDOWN_STEP_MS, COUNTDOWN_STEPS, plan(), record_trial(), RtMachine, RtPlan, RtRunner (+11 more)

### Community 61 - "src/sart.rs"
Cohesion: 0.09
Nodes (41): ARRANGE_ATTEMPTS, arrange_digits(), digit_counts(), generate_sart(), is_responded(), is_usable_go_rt(), is_valid_trial(), metric() (+33 more)

### Community 62 - "revisione-motore/sart.ts"
Cohesion: 0.11
Nodes (30): arrangeDigits(), countFlag(), criterionC(), digitCounts(), dPrime(), generateSart(), isResponded(), isUsableGoRt() (+22 more)

### Community 63 - "revisione-motore/mentalRotation.ts"
Cohesion: 0.07
Nodes (42): accuracyPercent(), ARM_LENGTHS, chain(), countFlag(), Cube, cubeRotations(), Face, FACE_DIRECTIONS (+34 more)

### Community 64 - "markdown.rs"
Cohesion: 0.16
Nodes (20): find_closing(), is_block_start(), is_table_separator(), list_marker(), outline(), parse_blocks(), parse_inline(), should_keep_table_columns_within_available_width() (+12 more)

### Community 65 - "RtMachine<S>"
Cohesion: 0.08
Nodes (17): key_name(), Key, advance(), machine(), RtMachine<S>, RtRunner<S>, should_flag_interrupted_when_window_loses_focus_during_a_trial(), should_ignore_keys_and_escape_during_countdown() (+9 more)

### Community 66 - "revisione-motore/flanker.ts"
Cohesion: 0.11
Nodes (27): accuracyPercent(), arrange(), ARROW, buildArrows(), canAppend(), conditionCounts(), conflictAdaptation(), countFlag() (+19 more)

### Community 67 - "README.md"
Cohesion: 0.19
Nodes (5): Corretti in TS e Rust, Differenze di linguaggio, gestite, Note senza effetto sui risultati, Registro dei difetti trovati dal confronto Rust ↔ TypeScript, Motori TypeScript — oracolo della migrazione a Rust

### Community 68 - "views_custom/trail_making.rs"
Cohesion: 0.09
Nodes (13): PauseTimer, Block, build_blocks(), CAPTION_HEIGHT, circle_look(), CircleLook, ERROR_FLASH_MS, FIELD_MAX (+5 more)

### Community 69 - "fuzz.mjs"
Cohesion: 0.06
Nodes (28): ANGLES, buildExtras(), CASES, chaos(), EVALUATE, files, FLAG_CODE, ITEMS (+20 more)

### Community 70 - "revisione-motore/pvt.ts"
Cohesion: 0.15
Nodes (17): generatePvt(), LAPSE_THRESHOLD_MS, mean(), median(), Phase, PvtParams, PvtStimulus, randInt() (+9 more)

### Community 71 - "theme.rs"
Cohesion: 0.09
Nodes (23): ACCENT, ACCENT_GLOW, ACCENT_SOFT, BODY_SIZE, CONTROL_HEIGHT, DANGER, display_text(), ELEVATED (+15 more)

### Community 72 - "CorsiRunner"
Cohesion: 0.12
Nodes (12): CorsiRunner, paint_block(), PlannedTrial, play(), Stage, Done, Feedback, Input (+4 more)

### Community 73 - "Science.tsx"
Cohesion: 0.10
Nodes (30): @testing-library/user-event, Button(), ButtonProps, STYLES, Header(), PageHeading(), PageHeadingProps, MarkdownView() (+22 more)

### Community 74 - "sync-revisione-motore.mjs"
Cohesion: 0.22
Nodes (10): buildCopy(), collectSymbols(), ENGINES, KEEP_EXPORT_FROM, readText(), requiredSymbols(), rootDir, SOURCES (+2 more)

### Community 75 - "src/trail_making.rs"
Cohesion: 0.10
Nodes (29): js_hypot(), circles(), click(), completed_seconds(), generate_trail(), in_part(), LETTERS, MARGIN (+21 more)

### Community 76 - "SessionRunner.tsx"
Cohesion: 0.14
Nodes (21): SessionState, TimePin, AudioCtor, getAudioContext(), playAlert(), BatteryReady(), ActiveContext, Mode (+13 more)

### Community 78 - "src/wcst.rs"
Cohesion: 0.11
Nodes (31): align_metas(), build_deck(), color(), DECK_SEED_1, make_trials(), metric(), Params, params() (+23 more)

### Community 79 - "core.mjs"
Cohesion: 0.06
Nodes (29): classify, COMPLETED, csvFields, ELAPSED, entries, exports_, FIXTURE, FLAGS (+21 more)

### Community 80 - "SintropiaApp"
Cohesion: 0.10
Nodes (14): fullscreen_frame(), Outcome, Failed, Saved, Screen, Dashboard, Papers, Results (+6 more)

### Community 81 - "views/pvt.rs"
Cohesion: 0.09
Nodes (17): ALL_TESTS, bold_text(), GO_GREEN, NOGO_RED, params_object(), run_frames(), should_draw_every_test_for_several_frames_at_any_window_size_without_panic(), SIZES (+9 more)

### Community 82 - "src/pvt.rs"
Cohesion: 0.16
Nodes (19): ISI_SEED_42, LAPSE_THRESHOLD_MS, LAPSES, num(), omission(), score_pvt(), should_compute_fastest_and_slowest_ten_percent(), should_compute_mean_and_median_rt() (+11 more)

### Community 83 - "views_custom/wcst.rs"
Cohesion: 0.13
Nodes (17): CARD_ASPECT, CARD_BORDER, CARD_GAP, CardLook, color_rgb(), draw_glyph(), draw_star(), glyph_centers() (+9 more)

### Community 84 - "tests/stroop.ts"
Cohesion: 0.12
Nodes (29): ENGINES, metrics(), build(), hit(), KEYS, T(), variants, wrongOf() (+21 more)

### Community 85 - "brainCloud.ts"
Cohesion: 0.12
Nodes (32): BrainCloud, brainCloudSteps(), buildBrainCloud(), buildBrainCloudAsync(), buildEdges(), callosumSample(), CEREBELLUM, cerebellumSample() (+24 more)

### Community 86 - "egui"
Cohesion: 0.15
Nodes (8): group_ui(), GROUPS, help_window(), keycap(), KEYS_COLUMN, key_box(), READING_WIDTH, SintropiaApp

### Community 87 - "src/stroop.rs"
Cohesion: 0.09
Nodes (35): accuracy_by_condition(), correct_key_stroop(), generate_stroop(), MAX_RUN, metric(), num(), params(), score_stroop() (+27 more)

### Community 88 - "exportFormats.ts"
Cohesion: 0.15
Nodes (20): csvField(), trialCsvValues(), trialToCsvRow(), CsvLocale, escapeHtml(), EVENTS_HEADER, ExportFormat, formatFilename() (+12 more)

### Community 89 - "widgets.rs"
Cohesion: 0.14
Nodes (21): button(), button_galley(), button_in(), ButtonKind, Ghost, Primary, Secondary, Tab (+13 more)

### Community 90 - "mulberry32"
Cohesion: 0.10
Nodes (34): mulberry32(), pick(), rand_int(), should_rand_int_and_pick_stay_in_range(), should_rand_int_never_overflow_or_leave_range_with_extreme_or_inverted_bounds(), should_shuffle_like_typescript_without_mutating_input(), shuffle(), take() (+26 more)

### Community 91 - "revisione-motore/visualSearch.ts"
Cohesion: 0.11
Nodes (27): accuracyPercent(), countFlag(), distractors(), generateVisualSearch(), leastSquares(), mean(), parseCondition(), Phase (+19 more)

### Community 92 - "views_custom/corsi.rs"
Cohesion: 0.08
Nodes (22): BBOX_H, BBOX_W, BLOCK_CLICKED, BLOCK_IDLE, BLOCK_SHADOW, BLOCK_UNITS, HEADER_HEIGHT, join_indices() (+14 more)

### Community 93 - "Evidence"
Cohesion: 0.10
Nodes (5): Evidence, evidence_enabled(), evidence_path(), merge_into_file(), FLOAT_TOLERANCE

### Community 94 - "brainScene.ts"
Cohesion: 0.11
Nodes (25): buildEdgeBuffers(), REGION_COUNT, OPTIONS, anchorLayout(), AttributeSpec, BASE_COLOR, compile(), computeLayout() (+17 more)

### Community 95 - "views/mental_rotation.rs"
Cohesion: 0.11
Nodes (18): draw(), draw_figure(), EDGE_WIDTH_UNITS, EXTENT, face_color(), FIGURE_GAP_PX, FIGURE_PX, FIT_RATIO (+10 more)

### Community 96 - "BrainStage.tsx"
Cohesion: 0.13
Nodes (16): BrainScene, SceneAnchor, SceneAnchors, BrainStage(), BrainStageProps, prefersReducedMotion(), readAnchor(), readAnchors() (+8 more)

### Community 97 - "data.rs"
Cohesion: 0.16
Nodes (9): corsi_ms(), default_params(), estimated_minutes(), instructions_for(), numeric_fields(), sanitize_params(), sanitize_params_clamps_and_drops_unknown(), should_adapt_sart_instruction_to_target_digit() (+1 more)

### Community 98 - "MetricValue"
Cohesion: 0.05
Nodes (35): js_num_string(), MetricValue, Num, Text, Phase, Practice, Test, ser_num() (+27 more)

### Community 99 - "ScreenArg"
Cohesion: 0.13
Nodes (18): Instructions, PaperReader, CliArgs, parse(), parse_screen(), parse_size(), parse_test(), ScreenArg (+10 more)

### Community 100 - "layout.rs"
Cohesion: 0.10
Nodes (16): card_width(), COLUMN_GAP, columns_for(), content_column(), GUTTER_NARROW, GUTTER_WIDE, metric_columns(), NARROW_BREAKPOINT (+8 more)

### Community 101 - "src/gonogo.rs"
Cohesion: 0.14
Nodes (28): ARRANGE_ATTEMPTS, arrange_kinds(), deterministic_arrange(), go(), go_omission(), GoNoGoKind, Go, Nogo (+20 more)

### Community 102 - "merge.mjs"
Cohesion: 0.10
Nodes (21): by(), ev, extra, fmt(), here, life, mark(), meta (+13 more)

### Community 103 - "SessionResults.tsx"
Cohesion: 0.16
Nodes (23): CSV_SEPARATOR, SESSION_CSV_HEADER, sessionFilename(), SessionJsonExport, run(), trial(), toSessionCsv(), toSessionJson() (+15 more)

### Community 104 - "demoTimeline.ts"
Cohesion: 0.17
Nodes (21): DEMO_LOOP_SECONDS, DEMO_MINUTES_PER_SECOND, DEMO_PHASES, DEMO_PINS, DEMO_TOTAL_MINUTES, DemoFrame, demoFrameAt(), DemoPhase (+13 more)

### Community 105 - "perf_budget.rs"
Cohesion: 0.10
Nodes (18): BATCH_TARGET, BUDGET, CALIBRATE, main(), MAX_SAMPLES, measure(), MIN_SAMPLES, WARMUP (+10 more)

### Community 106 - "dashboard.rs"
Cohesion: 0.18
Nodes (7): ACTION_COLUMN, ACTION_WIDTH, INFO_CARD_MIN_WIDTH, NUMBER_COLUMN, paint_row_frame(), ROW_PADDING, SintropiaApp

### Community 107 - "views/flanker.rs"
Cohesion: 0.15
Nodes (16): correct_key(), draw(), draw_glyph(), GLYPH_GAP, GLYPH_HEIGHT, GLYPH_WIDTH, KEY_LEFT, KEY_RIGHT (+8 more)

### Community 108 - "CIRIAF — COLAB/NEXTROOM Cognitive Testing Hub — Design"
Cohesion: 0.09
Nodes (22): 10. Riferimenti preliminari, 1. Obiettivo e contesto d'uso, 2. Architettura, 3. Documentazione ufficiale e ancoraggio scientifico, 4.1 Stroop Task 1 e 2, 4.2 Go/No-Go, 4.3 Corsi Block Task, 4.4 N-Back (variante 2-back) (+14 more)

### Community 109 - "ops.rs"
Cohesion: 0.11
Nodes (9): ANGLES, chiral(), Extra, project_all(), score(), score_json(), ScoreInput, SEED (+1 more)

### Community 110 - "views/visual_search.rs"
Cohesion: 0.13
Nodes (13): draw(), FIELD_PX, fill(), FIT_RATIO, ITEM_PX, KEY_ABSENT, KEY_PRESENT, MAX_SCALE (+5 more)

### Community 111 - "Migrazione dei motori da TypeScript a Rust: dimostrazione sperimentale dell'equivalenza"
Cohesion: 0.08
Nodes (24): 1. Obiettivo e motivazione, 2. Architettura, 3.1 Livello 1: fixture golden generate dal TS, 3.2 Livello 2: fuzz differenziale su larga scala, 3.3 Livello 3: proprietà (proptest), 3.4 Risultati, 3.5 Analisi della deviazione massima e controllo di sensibilità, 3. Metodo di verifica (+16 more)

### Community 112 - "markdown.ts"
Cohesion: 0.10
Nodes (35): Esiti, Firmare l'installer, Metodo, Residui e limiti noti, Revisione di sicurezza, katex, Block, collectLinks() (+27 more)

### Community 113 - "fuzz.rs"
Cohesion: 0.17
Nodes (7): FINDINGS, from(), Fuzz, MAX_REPORTED, seeded(), trials(), usize_of()

### Community 114 - "results.rs"
Cohesion: 0.21
Nodes (4): EXPORT_BUTTON_COLUMN, export_card(), metric_row(), SintropiaApp

### Community 115 - "TestId"
Cohesion: 0.18
Nodes (14): makeSessionId(), pad2(), Instruction, INSTRUCTIONS, instructionsFor(), nBackInstruction(), POSITION_WORDS, sartInstruction() (+6 more)

### Community 116 - "super"
Cohesion: 0.26
Nodes (6): format_description(), format_label(), load_result(), sample(), save_export(), should_write_every_format_and_reload_the_json()

### Community 117 - "Card"
Cohesion: 0.29
Nodes (9): card_code(), dim_name(), matching_card(), play(), Card, matches_on(), matching_dims(), rule_for_category() (+1 more)

### Community 118 - "views/stroop.rs"
Cohesion: 0.22
Nodes (12): draw(), ink(), params(), plan(), PRACTICE_FEEDBACK_MS, run(), runner(), should_generate_default_trial_counts_and_variant_param() (+4 more)

### Community 119 - "TestHost.tsx"
Cohesion: 0.15
Nodes (25): vitest, AllParams, DEFAULTS, STROOP_BASE, FlankerParams, GoNoGoParams, MentalRotationParams, NBackParams (+17 more)

### Community 120 - "tests/flanker.ts"
Cohesion: 0.14
Nodes (24): build(), hit(), KEY, miss(), T(), variants, keyEvaluate(), accuracyPercent() (+16 more)

### Community 121 - "fuzz_stroop.rs"
Cohesion: 0.20
Nodes (5): keys(), should_match_typescript_on_stroop_fuzz_corpus(), keys(), should_reproduce_typescript_stroop_sequences_and_metrics(), strings()

### Community 124 - "trailMaking.ts"
Cohesion: 0.13
Nodes (22): 4.3 Trail Making: il ripiego violava la distanza minima (limite TS, corretto), 4. Mappatura implementativa, completed(), generateTrail(), inPart(), placePoints(), round2(), scoreTrailMaking() (+14 more)

### Community 125 - "phase"
Cohesion: 0.27
Nodes (5): arbitrary_trial(), params(), should_hold_pvt_invariants(), TEST, trial()

### Community 126 - "serialize"
Cohesion: 0.16
Nodes (6): Settings, should_fall_back_to_defaults_on_corrupt_or_missing_file(), should_report_corrupt_file_but_not_missing_one(), should_restore_defaults_on_reset(), should_roundtrip_overrides_through_json_file(), temp_file()

### Community 127 - "validation.rs"
Cohesion: 0.26
Nodes (10): ANTICIPATION_CUTOFF_MS, classify_rt(), count_flag(), mean(), mean_rt_of_valid_correct(), sd_rt_of_valid_correct(), standard_deviation(), trial() (+2 more)

### Community 128 - "proptest_trail_making.rs"
Cohesion: 0.22
Nodes (8): CASES, generate(), MAX_RANDOM_PLACEMENT, parts(), should_balance_numbers_and_letters_in_part_b(), should_be_deterministic_for_equal_seed(), should_keep_labels_in_connection_order(), should_keep_minimum_distance_between_circles()

### Community 129 - "tests/corsi.ts"
Cohesion: 0.17
Nodes (23): canonicalKey(), complexityOf(), CORSI_BLOCKS, CorsiParams, CorsiSequence, corsiSpan(), countCrossings(), distance() (+15 more)

### Community 130 - "BatteryEditor"
Cohesion: 0.25
Nodes (4): BatteryEditor(), addTest(), defaultParamsFor(), testTitle()

### Community 131 - "SessionScreen"
Cohesion: 0.20
Nodes (8): entropy_seed(), now_epoch_ms(), page_title(), SessionScreen, View, Builder, Menu, Run

### Community 132 - "tests/sart.ts"
Cohesion: 0.17
Nodes (21): arrangeDigits(), generateSart(), isResponded(), isUsableGoRt(), isValidTrial(), rate(), reactionTimesBeforeCommissions(), round1() (+13 more)

### Community 133 - "load_fixture"
Cohesion: 0.24
Nodes (5): load_fixture(), check_invariants(), longest_nogo_run(), should_match_typescript_on_gonogo_fuzz_corpus(), should_reproduce_typescript_gonogo_sequences_and_metrics()

### Community 134 - "Benchmark dei motori: TypeScript vs Rust nativo vs WebAssembly"
Cohesion: 0.12
Nodes (15): Ambiente, Benchmark dei motori: TypeScript vs Rust nativo vs WebAssembly, Cause diagnosticate e interventi sui motori Rust, Confine JSON, Generazione e punteggio (calcolo puro), Limiti, Limiti residui del Rust, Metodo (+7 more)

### Community 135 - "defaults.rs"
Cohesion: 0.23
Nodes (6): should_have_defaults_inside_every_param_section_range(), all_params(), AllParams, should_match_ts_defaults_for_key_values(), should_serialize_with_camel_case_keys_like_ts(), stroop_base()

### Community 136 - "Color"
Cohesion: 0.13
Nodes (15): ALL_COLORS, ALL_SHAPES, card(), Color, Blue, Green, Red, Yellow (+7 more)

### Community 137 - "proptest_flanker.rs"
Cohesion: 0.29
Nodes (11): CASES, count(), generate(), js_round(), params(), should_balance_directions_within_each_condition(), should_be_deterministic_for_equal_seed_and_params(), should_build_arrows_consistent_with_condition_and_direction() (+3 more)

### Community 138 - "proptest_visual_search.rs"
Cohesion: 0.23
Nodes (11): run_prop(), CASES, cell_count(), generate(), should_balance_type_set_size_and_presence_cells(), should_be_deterministic_for_equal_seed_and_params(), should_compose_distractors_by_search_type_and_keep_items_in_the_unit_field(), should_draw_isi_within_the_configured_interval() (+3 more)

### Community 139 - "run-wasm.mjs"
Cohesion: 0.19
Nodes (12): measure(), now(), benchVariant(), dec, enc, here, inputs, median() (+4 more)

### Community 140 - "RunnerStatus"
Cohesion: 0.22
Nodes (7): create_runner(), RunnerStatus, Aborted, Finished, Running, session_factory(), TestRunner

### Community 141 - "views_custom/mod.rs"
Cohesion: 0.30
Nodes (8): create_custom_runner(), FEEDBACK_MS, normalize_numbers(), numbers_to_params(), params_or_default(), RunnerSpec, should_parse_typed_params_and_fall_back_to_defaults_when_invalid(), should_turn_whole_floats_into_integers_so_serde_accepts_them()

### Community 142 - "run_prop"
Cohesion: 0.27
Nodes (8): CASES, generate(), params(), should_be_deterministic_for_equal_seed_and_params(), should_cycle_incongruent_word_color_pairs_evenly(), should_not_repeat_color_or_word_more_than_three_times_in_a_row(), should_represent_every_color_evenly_among_congruent_trials(), should_split_trials_half_congruent_half_incongruent()

### Community 143 - "proptest_gonogo.rs"
Cohesion: 0.21
Nodes (9): CASES, expected_go(), generate(), isi_range(), params(), should_be_deterministic_for_equal_seed_and_params(), should_draw_isi_within_the_configured_interval(), should_produce_exact_go_nogo_counts_for_any_ratio_and_terminate() (+1 more)

### Community 144 - "PVT (Psychomotor Vigilance Task) — Riferimenti scientifici"
Cohesion: 0.14
Nodes (13): 1. Paradigma e citazione primaria, 2. Meccanismo cognitivo misurato, 3. Parametri adottati, 5.1 Lapse (misura primaria), 5.2 Velocità di risposta (1/RT), 5.3 RT medio, mediano e SD, 5.4 Fastest 10% e slowest 10%, 5.5 Anticipazioni e omissioni (+5 more)

### Community 145 - "SART — Sustained Attention to Response Task — Riferimenti scientifici"
Cohesion: 0.12
Nodes (26): 1. Paradigma e citazione primaria, 2. Meccanismo cognitivo misurato, 3. Parametri adottati, 4. Mappatura implementativa, 5.1 Errori di commissione (misura primaria), 5.2 Errori di omissione, 5.3 RT dei Go: media, SD e CV, 5.4 Sensibilità $d'$ e criterio $c$ (+18 more)

### Community 146 - "Op"
Cohesion: 0.21
Nodes (15): muted(), Op, AddPhase, AddPin, AddPinAt, Distribute, MovePhase, MovePin (+7 more)

### Community 147 - "count_perseveration"
Cohesion: 0.13
Nodes (17): Candidate, COLOR, count(), count_perseveration(), Dim, Color, Number, Shape (+9 more)

### Community 148 - "SPEC — CIRIAF Cognitive Testing Hub"
Cohesion: 0.15
Nodes (12): 0. Brief, 1. Sezioni, 2. Token, 3. Componenti, 4. Interazioni, 5. Performance, 6. Responsive, 7. Accessibilità (+4 more)

### Community 149 - "should_match_typescript_on_nback_fuzz_corpus"
Cohesion: 0.26
Nodes (8): corrected_rates(), criterion_c(), d_prime(), probit(), num(), should_reproduce_typescript_probit_d_prime_and_criterion(), should_give_probit_and_d_prime_reference_values(), should_match_typescript_on_nback_fuzz_corpus()

### Community 150 - "papers.rs"
Cohesion: 0.24
Nodes (5): paper!, matching(), Paper, paper_for(), PAPERS

### Community 151 - "fsutil.rs"
Cohesion: 0.24
Nodes (6): MAX_CONFIG_BYTES, MAX_RESULT_BYTES, read_rejects_oversized_files(), temp(), write_atomic(), write_atomic_replaces_and_leaves_no_temp_file()

### Community 152 - "proptest_sart.rs"
Cohesion: 0.27
Nodes (8): CASES, digit_counts(), generate(), should_balance_font_sizes_and_keep_indices_in_range(), should_be_deterministic_for_equal_seed_and_params(), should_never_repeat_the_same_digit_twice_in_a_row(), should_present_each_digit_the_same_number_of_times_plus_a_random_remainder(), should_present_exactly_n_over_nine_targets_when_n_is_a_multiple_of_nine()

### Community 153 - "proptest_wcst.rs"
Cohesion: 0.24
Nodes (5): counts(), dim(), should_hold_wcst_invariants(), step(), TEST

### Community 154 - "DesktopDownload.tsx"
Cohesion: 0.26
Nodes (9): CHECKSUMS_URL, CopyableCommand(), currentSiteBase(), DesktopDownload(), INSTALL_COMMANDS, installCommands(), INSTALLER_URL, PORTABLE_URL (+1 more)

### Community 155 - "js_round"
Cohesion: 0.24
Nodes (5): config(), lag_letters(), params(), should_hold_nback_invariants(), TEST

### Community 156 - "bench.mjs"
Cohesion: 0.17
Nodes (6): ANGLES, desktop, GEN, here, SCORE, T

### Community 157 - "Visual Search — Ricerca visiva — Riferimenti scientifici"
Cohesion: 0.17
Nodes (11): 1. Paradigma e citazione primaria, 2. Meccanismo cognitivo misurato, 3. Parametri adottati, 4. Mappatura implementativa, 5.1 RT e accuratezza per tipo di ricerca, 5.2 Pendenza della ricerca, 5.3 Rapporto assente/presente, 5. Metriche e formule (+3 more)

### Community 158 - "brainNoise.ts"
Cohesion: 0.42
Nodes (9): fade(), fbm(), foliaShade(), gyralShade(), hash3(), lerp(), majorSulcusShade(), smoothstep() (+1 more)

### Community 159 - "timeline"
Cohesion: 0.27
Nodes (9): fmt_clock(), paint_phase_segments(), paint_pin(), timeline(), TimelineEvent, AddAt, Move, None (+1 more)

### Community 160 - "js_round"
Cohesion: 0.20
Nodes (10): seconds(), js_round(), round1(), round2(), round1(), round2(), round1(), round2() (+2 more)

### Community 161 - "golden_wcst.rs"
Cohesion: 0.53
Nodes (7): check_cards_and_rules(), check_generation(), check_perseveration(), check_scoring(), from(), should_reproduce_ts_wcst_fixture(), usize_of()

### Community 162 - "Ui"
Cohesion: 0.19
Nodes (7): CONTENT_MAX_WIDTH, index_entry(), INDEX_WIDTH_NARROW, INDEX_WIDTH_WIDE, READER_MAX_WIDTH, SintropiaApp, WIDE_BREAKPOINT

### Community 163 - "settings_screen.rs"
Cohesion: 0.20
Nodes (7): CARD_PADDING, FIELD_ROW_HEIGHT, range_text(), SECTION_CHROME_HEIGHT, SECTION_MIN_WIDTH, SintropiaApp, VALUE_WIDTH

### Community 164 - "golden_trail_making.rs"
Cohesion: 0.24
Nodes (6): GenParams, check_runs(), GenParams, part_of(), phase_of(), should_reproduce_typescript_trail_making_sequences_runs_and_metrics()

### Community 165 - "Mental Rotation — Rotazione mentale — Riferimenti scientifici"
Cohesion: 0.22
Nodes (8): 1. Paradigma e citazione primaria, 2. Meccanismo cognitivo misurato, 3. Parametri adottati, 4. Mappatura implementativa, 5. Metriche e formule, 6. Limiti, Cronologia delle revisioni, Mental Rotation — Rotazione mentale — Riferimenti scientifici

### Community 166 - "CsvValue"
Cohesion: 0.33
Nodes (8): csv_field(), CsvValue, Null, Num, Text, format_metric_value(), starts_like_formula(), tsv_cell()

### Community 167 - "validationflag"
Cohesion: 0.28
Nodes (3): demo_result(), should_build_a_result_with_metrics(), TRIALS

### Community 168 - "golden_nback.rs"
Cohesion: 0.64
Nodes (6): check_generation(), check_scoring(), check_sdt(), positions(), should_reproduce_ts_nback_fixture(), usize_of()

### Community 169 - "Flanker Task (Eriksen) — Riferimenti scientifici"
Cohesion: 0.25
Nodes (7): 1. Paradigma e citazione primaria, 2. Meccanismo cognitivo misurato, 3. Parametri implementati e loro origine, 4. Metriche calcolate, 5. Validazione dei dati, 6. Limiti e cautele, Flanker Task (Eriksen) — Riferimenti scientifici

### Community 170 - "Sintropia Desktop"
Cohesion: 0.29
Nodes (6): Compilare e testare, Creare l'installer, Distribuzione, Firma del codice (non ancora attiva), Sintropia Desktop, Struttura del workspace

### Community 171 - "Trail Making Test A e B — Riferimenti scientifici"
Cohesion: 0.29
Nodes (7): 1. Paradigma e citazioni, 2. Meccanismo cognitivo misurato, 3. Parametri adottati, 5. Metriche e formule, 6. Limiti, Cronologia delle revisioni, Trail Making Test A e B — Riferimenti scientifici

### Community 172 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, preview, test, test:watch, typecheck

### Community 174 - ".templates_list"
Cohesion: 0.60
Nodes (5): MenuAction, AskDelete, Delete, Edit, Start

### Community 175 - "mulberry32"
Cohesion: 0.15
Nodes (10): INK, StimulusCtx, DEFAULT_FONT_PX, draw(), draw_mask(), MASK_BOX_PX, plan(), PRACTICE_FEEDBACK_MS (+2 more)

### Community 176 - "sintropia-core"
Cohesion: 0.80
Nodes (5): sintropia-bench-wasm, sintropia-content, sintropia-core, sintropia-desktop, sintropia-engines

### Community 178 - "SessionTemplate"
Cohesion: 0.12
Nodes (19): BuilderState, empty_template(), export_session(), import_template_json(), new_run(), SessionExport, Csv, Json (+11 more)

### Community 179 - "ButtonKind"
Cohesion: 0.50
Nodes (4): ButtonKind, Danger, Primary, Secondary

### Community 180 - "PauseChoice"
Cohesion: 0.50
Nodes (4): PauseChoice, Abort, ExportPartial, Resume

### Community 181 - "notes.md"
Cohesion: 0.50
Nodes (3): Cause diagnosticate e interventi sui motori Rust, Limiti residui del Rust, Regressione di prestazioni

### Community 182 - "dependencies"
Cohesion: 0.50
Nodes (4): dependencies, katex, react, react-dom

### Community 186 - "repository"
Cohesion: 0.67
Nodes (3): repository, type, url

### Community 199 - "Block"
Cohesion: 0.25
Nodes (8): Block, Code, Heading, List, Paragraph, Quote, Rule, Table

### Community 200 - "inline"
Cohesion: 0.43
Nodes (5): fixed_cell(), inline(), inline_job(), render(), render_table()

### Community 201 - "generate_pvt"
Cohesion: 0.36
Nodes (8): generate_pvt(), Params, params(), should_be_deterministic_for_same_seed_and_differ_across_seeds(), should_keep_every_isi_within_bounds(), should_match_typescript_sequence_for_seed_42(), Stimulus, should_reproduce_ts_pvt_fixture()

### Community 202 - "display_family"
Cohesion: 0.33
Nodes (5): apply(), card_frame(), display_family(), install_fonts(), square_stroke()

### Community 203 - "SpanKind"
Cohesion: 0.33
Nodes (6): SpanKind, Bold, Code, Italic, Math, Plain

### Community 204 - "Politica di sicurezza"
Cohesion: 0.40
Nodes (5): Ambito e modello di minaccia, Come segnalare una vulnerabilità, Politica di sicurezza, Verifica dell'integrità dei download, Versioni supportate

## Knowledge Gaps
- **170 isolated node(s):** `Dashboard`, `Results`, `Settings`, `Session`, `Papers` (+165 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1441 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `mulberry32()` connect `mulberry32` to `proptest_trail_making.rs`, `src/corsi.rs`, `golden_core.rs`, `proptest_flanker.rs`, `proptest_visual_search.rs`, `run_prop`, `proptest_gonogo.rs`, `Op`, `src/mental_rotation.rs`, `session.rs`, `proptest_sart.rs`, `proptest_wcst.rs`, `js_round`, `golden_wcst.rs`, `golden_trail_making.rs`, `validationflag`, `golden_nback.rs`, `src/flanker.rs`, `mulberry32`, `views/sart.rs`, `src/visual_search.rs`, `src/sart.rs`, `views_custom/trail_making.rs`, `CorsiRunner`, `generate_pvt`, `src/trail_making.rs`, `src/wcst.rs`, `views/pvt.rs`, `src/stroop.rs`, `Evidence`, `views/mental_rotation.rs`, `views/flanker.rs`, `views/visual_search.rs`, `views/stroop.rs`, `SessionStore`, `WcstRunner`, `phase`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 88 inferred relationships involving `mulberry32()` (e.g. with `demo_result()` and `.with_store()`) actually correct?**
  _`mulberry32()` has 88 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Dashboard`, `Results`, `Settings` to the rest of the system?**
  _170 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `rng.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Why does `RunnerStatus` connect `RunnerStatus` to `RtMachine<S>`, `session_ui.rs`, `views_custom/trail_making.rs`, `CorsiRunner`, `rt.rs`, `SintropiaApp`, `views/pvt.rs`, `views_custom/wcst.rs`, `WcstRunner`, `views_custom/corsi.rs`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Are the 35 inferred relationships involving `run_prop()` (e.g. with `should_hold_corsi_invariants()` and `should_balance_directions_within_each_condition()`) actually correct?**
  _`run_prop()` has 35 INFERRED edges - model-reasoned connections that need verification._
- **Should `mean` be split into smaller, more focused modules?**
  _Cohesion score 0.08826945412311266 - nodes in this community are weakly interconnected._