# Graph Report - ciriaf-hub-testcognitivi  (2026-10-23)

## Corpus Check
- 161 files · ~130,075 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1354 nodes · 2542 edges · 78 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b08f31bf`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Testing & CSV Export|Testing & CSV Export]]
- [[_COMMUNITY_Shared RNG & Utility Functions|Shared RNG & Utility Functions]]
- [[_COMMUNITY_WCST Deck Building|WCST Deck Building]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Stroop Generator & Scoring|Stroop Generator & Scoring]]
- [[_COMMUNITY_Corsi Sequence Generation & Scoring|Corsi Sequence Generation & Scoring]]
- [[_COMMUNITY_N-Back Metrics & Quartile Analysis|N-Back Metrics & Quartile Analysis]]
- [[_COMMUNITY_WCST Scoring & Heaton Metrics|WCST Scoring & Heaton Metrics]]
- [[_COMMUNITY_TypeScript Compiler Configuration|TypeScript Compiler Configuration]]
- [[_COMMUNITY_GoNo-Go Generator & Scoring|Go/No-Go Generator & Scoring]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Core Engine Types (Clock, Validation)|Core Engine Types (Clock, Validation)]]
- [[_COMMUNITY_TypeScript Strict Mode Config|TypeScript Strict Mode Config]]
- [[_COMMUNITY_Session Model Logic|Session Model Logic]]
- [[_COMMUNITY_UI Header & Duration Components|UI Header & Duration Components]]
- [[_COMMUNITY_Session Runner & Audio Feedback|Session Runner & Audio Feedback]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Session Timeline Interactive UI|Session Timeline Interactive UI]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Project Identity & Entry Points|Project Identity & Entry Points]]
- [[_COMMUNITY_Corsi Scientific Literature|Corsi Scientific Literature]]
- [[_COMMUNITY_N-Back Scientific Literature|N-Back Scientific Literature]]
- [[_COMMUNITY_GoNo-Go Scientific Literature|Go/No-Go Scientific Literature]]
- [[_COMMUNITY_WCST Scientific Literature|WCST Scientific Literature]]
- [[_COMMUNITY_Stroop Scientific Literature|Stroop Scientific Literature]]
- [[_COMMUNITY_RT Validation Methodology Literature|RT Validation Methodology Literature]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]

## God Nodes (most connected - your core abstractions)
1. `TestResult` - 36 edges
2. `TrialResult` - 32 edges
3. `TestId` - 29 edges
4. `mulberry32()` - 27 edges
5. `Sintropia — Cognitive tests Hub` - 19 edges
6. `compilerOptions` - 18 edges
7. `AllParams` - 17 edges
8. `shuffle()` - 16 edges
9. `mean()` - 16 edges
10. `standardDeviation()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `CIRIAF Favicon (Blue Rounded Square with Triangles)` --conceptually_related_to--> `CIRIAF COLAB/NEXTROOM Cognitive Testing Hub`  [INFERRED]
  public/favicon.svg → README.md
- `Engine Review Copies (Standalone Scripts)` --conceptually_related_to--> `Corsi Block-Tapping Task`  [INFERRED]
  revisione-motore/README.md → docs/scientific/corsi.md
- `Engine Review Copies (Standalone Scripts)` --conceptually_related_to--> `Go/No-Go Task (Motor Inhibition)`  [INFERRED]
  revisione-motore/README.md → docs/scientific/gonogo.md
- `Engine Review Copies (Standalone Scripts)` --conceptually_related_to--> `N-Back Task (2-back Verbal)`  [INFERRED]
  revisione-motore/README.md → docs/scientific/nback.md
- `CIRIAF Hub HTML Entry Point` --conceptually_related_to--> `CIRIAF COLAB/NEXTROOM Cognitive Testing Hub`  [INFERRED]
  index.html → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **RT Validation Framework (Anticipation + Omission + Preservation)** — docs_scientific_validazione_rt_md_anticipation_filter, docs_scientific_validazione_rt_md_omission_filter, docs_scientific_validazione_rt_md_data_preservation_principle, docs_scientific_validazione_rt_md_rt_validation_pipeline [EXTRACTED 1.00]
- **Session Mode Core Concepts** — docs_superpowers_specs_2026_07_07_feature_sessione_design_session_template, docs_superpowers_specs_2026_07_07_feature_sessione_design_time_pin, docs_superpowers_specs_2026_07_07_feature_sessione_design_session_phase, docs_superpowers_specs_2026_07_07_feature_sessione_design_session_state, docs_architettura_session_mode [EXTRACTED 1.00]
- **Six Cognitive Tests of CIRIAF Hub** — docs_scientific_stroop_md_stroop_task, docs_scientific_gonogo_md_go_nogo_task, docs_scientific_corsi_md_corsi_block_task, docs_scientific_nback_md_nback_task, docs_scientific_wcst_md_wcst [EXTRACTED 1.00]

## Communities (78 total, 0 thin omitted)

### Community 0 - "Testing & CSV Export"
Cohesion: 0.12
Nodes (22): AuthorCard(), EXTERNAL_LINK, TestId, FACTS, OpenSourcePanel(), DEFAULT_FOCUS, FOCUS_BY_TEST, focusFor() (+14 more)

### Community 1 - "Shared RNG & Utility Functions"
Cohesion: 0.22
Nodes (7): FieldDesc, PARAM_SECTIONS, paramSectionFor(), SectionDesc, BatteryEditor(), BatteryEditorProps, BatteryItem

### Community 2 - "WCST Deck Building"
Cohesion: 0.06
Nodes (34): CIRIAF — COLAB/NEXTROOM Cognitive Testing Hub — Implementation Plan, FASE 0 — Ricerca scientifica e documenti di riferimento, FASE 1 — Setup progetto e identità visiva, FASE 2 — Motore core (TypeScript puro), FASE 3 — Moduli dei test (generatori + state machine + scoring), FASE 4 — UI React, FASE 5 — Documentazione codice e verifica finale, Global Constraints (+26 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (37): BrainCloud, buildBrainCloud(), callosumSample(), CEREBELLUM, cerebellumSample(), CloudOptions, EdgeBuffers, Ellipsoid (+29 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (30): ALL_COLORS, ALL_NUMBERS, ALL_SHAPES, buildDeck(), countPerseveration(), matchesOn(), matchingDims(), count() (+22 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (47): SciencePanel(), SciencePanelProps, TEST_PAPERS, Block, collectLinks(), Cursor, Inline, isSafeHref() (+39 more)

### Community 6 - "Community 6"
Cohesion: 0.18
Nodes (13): randInt(), generatePvt(), median(), PvtParams, PvtStimulus, round1(), round2(), scorePvt() (+5 more)

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
Cohesion: 0.06
Nodes (29): ALL_COLORS, ALL_NUMBERS, ALL_SHAPES, buildDeck(), countPerseveration(), matchesOn(), matchingDims(), PerseverationCounts (+21 more)

### Community 11 - "TypeScript Compiler Configuration"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+12 more)

### Community 12 - "Go/No-Go Generator & Scoring"
Cohesion: 0.12
Nodes (22): arrangeKinds(), countFlag(), criterionC(), deterministicArrange(), dPrime(), generateGoNoGo(), GoNoGoKind, GoNoGoParams (+14 more)

### Community 13 - "Community 13"
Cohesion: 0.19
Nodes (16): pick(), chooseLurePositions(), chooseTargetPositions(), countHitsFa(), Counts, generateNBack(), lureLags(), NBACK_LETTERS (+8 more)

### Community 14 - "Core Engine Types (Clock, Validation)"
Cohesion: 0.18
Nodes (22): canonicalKey(), complexityOf(), CORSI_BLOCKS, CorsiParams, CorsiSequence, corsiSpan(), countCrossings(), distance() (+14 more)

### Community 15 - "TypeScript Strict Mode Config"
Cohesion: 0.22
Nodes (8): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, strict, include

### Community 19 - "Session Model Logic"
Cohesion: 0.09
Nodes (22): 10. Riferimenti preliminari, 1. Obiettivo e contesto d'uso, 2. Architettura, 3. Documentazione ufficiale e ancoraggio scientifico, 4.1 Stroop Task 1 e 2, 4.2 Go/No-Go, 4.3 Corsi Block Task, 4.4 N-Back (variante 2-back) (+14 more)

### Community 20 - "UI Header & Duration Components"
Cohesion: 0.19
Nodes (14): accuracyByCondition(), correctKeyStroop(), generateStroop(), meanRtByCondition(), round1(), scoreStroop(), sdRtByCondition(), STROOP_COLORS (+6 more)

### Community 21 - "Session Runner & Audio Feedback"
Cohesion: 0.23
Nodes (9): GoNoGoParams, GoNoGoViewProps, StroopParams, stroopStimulusLabel(), StroopVariant, StroopViewProps, toSpec(), STIMULUS_COLORS (+1 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (18): 1. Paradigma e citazione primaria, 2. Meccanismo cognitivo (memoria visuo-spaziale di configurazione/sequenza), 3. Parametri adottati, 3bis. Coordinate dei 9 blocchi, 4. Mappatura implementativa, 5.1 Metriche calcolate dalla piattaforma, 5.2 Confronto con la letteratura, 5.3 Indice di complessità del percorso (+10 more)

### Community 23 - "Session Timeline Interactive UI"
Cohesion: 0.12
Nodes (16): 1. Motivazione (perché pulire gli RT prima dell'analisi), 2. Filtro di anticipazione (RT < 150 ms → "Errore di Anticipazione"): razionale e fonte, 3. Filtro di omissione (finestra chiusa senza risposta → "Errore di Omissione", mai valore nullo/infinito), 4. Varianza intrasoggetto (deviazione standard degli RT delle sole risposte corrette e valide), 5. Principio di conservazione del dato grezzo, 6. Mappatura implementativa, Bibliografia, Cronologia delle revisioni (+8 more)

### Community 24 - "Community 24"
Cohesion: 0.13
Nodes (14): 1. Principio: due strati separati, 2. Struttura delle cartelle, 3. Il ciclo di un trial a tempo di reazione, 4. Validazione automatica dei dati, 5. I test interattivi (Corsi e WCST), 6. Come aggiungere un nuovo test, 7. Identità visiva, 8. Sessione, export e privacy (+6 more)

### Community 25 - "Project Identity & Entry Points"
Cohesion: 0.22
Nodes (9): Session Mode (Protocol Chronometric), Two-Layer Architecture (Engine + UI Separation), SessionPhase (Named Time Block), SessionState (Derived Runtime State), SessionTemplate, TimePin (Absolute Offset for Test Battery), CIRIAF Hub HTML Entry Point, CIRIAF Favicon (Blue Rounded Square with Triangles) (+1 more)

### Community 26 - "Corsi Scientific Literature"
Cohesion: 0.25
Nodes (9): Berch et al. 1998 (Corsi Methodological Considerations), Kessels et al. 2000 (Corsi Standardization and Normative Data), Balanced Sequence Generation (Intra-Level Equivalence), Corsi Block-Tapping Task, Corsi Span (Visuo-Spatial Memory Span), Level Target Difficulty (k-1 * d-bar), Path Complexity Index (L(S) + X(S)), Reverse Trajectory Exclusion (Corsi Deduplication) (+1 more)

### Community 27 - "N-Back Scientific Literature"
Cohesion: 0.22
Nodes (9): Hautus 1995 (Corrections for Extreme Proportions and d-prime), Jaeggi et al. 2010 (Concurrent Validity of N-Back as Working Memory Measure), Kirchner 1958 (Age Differences in Short-Term Retention), Owen et al. 2005 (N-Back Meta-Analysis of Neuroimaging), Criterion c (Response Bias), d-prime (Sensitivity), Loglinear Correction (Hautus 1995), N-Back Task (2-back Verbal) (+1 more)

### Community 28 - "Go/No-Go Scientific Literature"
Cohesion: 0.29
Nodes (8): Verbruggen & Logan 2008 (Automatic and Controlled Response Inhibition), Wessel 2018 (Prepotent Motor Activity and Inhibitory Control), Commission Errors (False Alarms on No-Go), Coefficient of Variation (CV) of RT, Go/No-Go Task (Motor Inhibition), Motor Inhibition (Prepotent Response Suppression), Omission Errors (Missed Go Responses), Anticipation Filter (RT < 150ms)

### Community 29 - "WCST Scientific Literature"
Cohesion: 0.33
Nodes (7): Berg 1948 (Simple Objective Technique for Measuring Flexibility), Heaton 1993 (WCST Manual Revised), Conceptual Level Responses (CLR, WCST), Failure to Maintain Set (WCST), Heaton Scoring (WCST), Perseveration (WCST Perseverative Errors), Wisconsin Card Sorting Test

### Community 30 - "Stroop Scientific Literature"
Cohesion: 0.33
Nodes (6): MacLeod 1991 (Half a Century of Research on the Stroop Effect), Stroop 1935 (Studies of Interference in Serial Verbal Reactions), Coefficient of Variation (CV) of RT (Stroop), Interference Effect (Stroop Effect), Stroop Task (Color-Word Interference), Engine Review Copies (Standalone Scripts)

### Community 31 - "RT Validation Methodology Literature"
Cohesion: 0.33
Nodes (6): Luce 1986 (Response Times: Their Role in Inferring Elementary Mental Organization), Ratcliff 1993 (Methods for Dealing with Reaction Time Outliers), Whelan 2008 (Effective Analysis of Reaction Time Data), Raw Data Preservation Principle (Flag-Dont-Delete), Omission Filter (No Response Within Window), Reaction Time Validation Pipeline

### Community 32 - "Community 32"
Cohesion: 0.05
Nodes (43): author, bugs, url, dependencies, katex, react, react-dom, description (+35 more)

### Community 33 - "Community 33"
Cohesion: 0.14
Nodes (15): 1. Paradigma e citazione primaria, 2. Meccanismo cognitivo, 3. Parametri adottati, 4. Mappatura implementativa, 5.1 Classificazione delle risposte (per trial), 5.2 Sensibilità: d′ (d-prime), 5.3 Correzione loglinear (per evitare valori infiniti), 5.4 Tempi di risposta (RT) (+7 more)

### Community 34 - "Community 34"
Cohesion: 0.15
Nodes (13): 1. Paradigma e citazione primaria, 2. Meccanismo cognitivo misurato, 3. Parametri adottati, 4. Mappatura implementativa, 5.1 Accuratezza per condizione, 5.2 Tempo di reazione medio dei corretti validi, 5.3 Deviazione standard e coefficiente di variazione, 5.4 Effetto di interferenza (effetto Stroop) (+5 more)

### Community 35 - "Community 35"
Cohesion: 0.17
Nodes (11): 1. Layout dei blocchi, 2. Generazione delle sequenze bilanciate, 3. Geometria di supporto, 4. Regola di arresto e punteggio, 5. Casi limite, 6. Demo, Algoritmo, Corsi Block-Tapping Task — funzionamento tecnico (+3 more)

### Community 36 - "Community 36"
Cohesion: 0.17
Nodes (12): 1. Paradigma e citazione primaria, 2. Meccanismo cognitivo misurato, 3. Parametri adottati, 4. Mappatura implementativa, 5.1 Errori di commissione (inibizione — misura primaria), 5.2 Errori di omissione (attenzione sostenuta), 5.3 RT medio e deviazione standard dei Go corretti *validi*, 5.4 Anticipazioni (+4 more)

### Community 37 - "Community 37"
Cohesion: 0.22
Nodes (8): 1. Logica del paradigma, 2. Generazione dello stream, 3. Teoria del segnale: d' e criterio c, 4. Metriche (`scoreNBack`), 5. Casi limite, 6. Demo, 7. Allineamento, N-Back (2-back) — funzionamento tecnico

### Community 38 - "Community 38"
Cohesion: 0.14
Nodes (14): 1. Paradigma e citazione primaria, 2. Meccanismo cognitivo misurato, 3. Parametri adottati, 4. Mappatura implementativa, 5.1 Lapse (misura primaria), 5.2 Velocità di risposta (1/RT), 5.3 RT medio, mediano e SD, 5.4 Fastest 10% e slowest 10% (+6 more)

### Community 39 - "Community 39"
Cohesion: 0.29
Nodes (6): 1. Logica del paradigma, 2. Generazione della sequenza, 3. Metriche (`scoreGoNoGo`), 4. Casi limite, 5. Demo, Go/No-Go Task — funzionamento tecnico

### Community 40 - "Community 40"
Cohesion: 0.29
Nodes (6): 1. Varianti, 2. Generazione della sequenza, 3. Metriche (`scoreStroop`), 4. Note di validità, 5. Demo, Stroop Task (1 e 2) — funzionamento tecnico

### Community 41 - "Community 41"
Cohesion: 0.25
Nodes (7): 1. Materiali e regole, 2. Matching, 3. Scoring (`scoreWcst`) — operazionalizzazione di Heaton, 4. Note e limiti, 5. Demo, 6. Allineamento, Wisconsin Card Sorting Test — funzionamento tecnico

### Community 42 - "Community 42"
Cohesion: 0.25
Nodes (11): Button(), ButtonProps, STYLES, Instruction, INSTRUCTIONS, instructionsFor(), nBackInstruction(), POSITION_WORDS (+3 more)

### Community 43 - "Community 43"
Cohesion: 0.15
Nodes (12): 1. Obiettivo, 2. Modello dati, 3. Costruttore (SessionBuilder), 4. Runtime (SessionRunner), 5. Output (file di sessione), 6. Navigazione e file, 7. Testing, 8. Casi limite (+4 more)

### Community 45 - "Community 45"
Cohesion: 0.15
Nodes (12): 0. Brief, 1. Sezioni, 2. Token, 3. Componenti, 4. Interazioni, 5. Performance, 6. Responsive, 7. Accessibilità (+4 more)

### Community 47 - "Community 47"
Cohesion: 0.17
Nodes (11): Feature "Sessione" — Implementation Plan, Global Constraints, Self-Review (spec → piano), Task 1: Modello sessione (engine puro), Task 2: Export sessione (engine puro), Task 3: Descrittori parametri condivisi (refactor), Task 4: Prop `practice` sulle viste, Task 5: Storage sessione + alert (+3 more)

### Community 48 - "Community 48"
Cohesion: 0.11
Nodes (19): Aggiungere un test, Architettura, Autore, Avvio rapido, Come citare, Come si somministra un test, Contribuire, Cos'è (+11 more)

### Community 49 - "Community 49"
Cohesion: 0.42
Nodes (6): DEFAULTS, loadSettings(), mergeWithDefaults(), resetSettings(), saveSettings(), structuredCloneSafe()

### Community 50 - "Community 50"
Cohesion: 0.18
Nodes (10): Bibliografia, Corsi Block-Tapping Task, Flanker Task, Go / No-Go Task, N-Back Task, PVT — Psychomotor Vigilance Task, SART — Sustained Attention to Response Task, Stroop Task (+2 more)

### Community 51 - "Community 51"
Cohesion: 0.40
Nodes (4): Allineamento con l'engine (IMPORTANTE), Cosa sono questi file, Ottimizzazioni applicate in questa revisione, Revisione motore — copie standalone dei test cognitivi

### Community 53 - "Community 53"
Cohesion: 0.07
Nodes (31): buildBrainCloudAsync(), buildEdgeBuffers(), anchorLayout(), AttributeSpec, BASE_COLOR, BrainScene, compile(), computeLayout() (+23 more)

### Community 54 - "Community 54"
Cohesion: 0.15
Nodes (16): ValidationFlag, accuracyPercent(), arrange(), ARROW, buildArrows(), conditionCounts(), conflictAdaptation(), Draft (+8 more)

### Community 55 - "Community 55"
Cohesion: 0.11
Nodes (20): PageHeading(), PageHeadingProps, Settings(), SettingsProps, TestRunner(), App(), Results, Science (+12 more)

### Community 56 - "Community 56"
Cohesion: 0.17
Nodes (18): DEMO_PHASES, DEMO_PINS, DemoFrame, demoFrameAt(), DemoPhase, DemoPin, DemoStage, formatClock() (+10 more)

### Community 57 - "Community 57"
Cohesion: 0.14
Nodes (22): mulberry32(), TestResult, RtTestRunner(), RtTestRunnerProps, CorsiView(), FlankerParams, FlankerView(), FlankerViewProps (+14 more)

### Community 58 - "Community 58"
Cohesion: 0.15
Nodes (19): Cancel, Clock, performanceClock, realScheduler(), Scheduler, Phase, SummaryMetric, FakeEnv (+11 more)

### Community 59 - "Community 59"
Cohesion: 0.25
Nodes (15): cloneTemplate(), computeSessionState(), distributePhasesEvenly(), FlatPin, flattenPins(), makeRunId(), movePin(), movePinById() (+7 more)

### Community 60 - "Community 60"
Cohesion: 0.16
Nodes (13): AudioCtor, getAudioContext(), playAlert(), SessionState, TimePin, ActiveContext, Mode, SessionRunner() (+5 more)

### Community 61 - "Community 61"
Cohesion: 0.25
Nodes (7): 1. Paradigma e citazione primaria, 2. Meccanismo cognitivo misurato, 3. Parametri implementati e loro origine, 4. Metriche calcolate, 5. Validazione dei dati, 6. Limiti e cautele, Flanker Task (Eriksen) — Riferimenti scientifici

### Community 62 - "Community 62"
Cohesion: 0.11
Nodes (26): arrangeDigits(), countFlag(), criterionC(), digitCounts(), dPrime(), generateSart(), mean(), Phase (+18 more)

### Community 63 - "Community 63"
Cohesion: 0.20
Nodes (12): SESSION_CSV_HEADER, sessionFilename(), SessionJsonExport, run(), trial(), toSessionCsv(), toSessionJson(), SessionRun (+4 more)

### Community 64 - "Community 64"
Cohesion: 0.19
Nodes (14): criterionC(), dPrime(), probit(), countFlag(), arrangeKinds(), deterministicArrange(), generateGoNoGo(), GoNoGoKind (+6 more)

### Community 65 - "Community 65"
Cohesion: 0.27
Nodes (6): AllParams, STROOP_BASE, makeSessionId(), pad2(), TestRunnerProps, TestHost()

### Community 66 - "Community 66"
Cohesion: 0.10
Nodes (23): accuracyPercent(), arrange(), ARROW, conditionCounts(), conflictAdaptation(), countFlag(), Draft, FlankerCondition (+15 more)

### Community 68 - "Community 68"
Cohesion: 0.16
Nodes (16): shuffle(), arrangeDigits(), digitCounts(), generateSart(), rate(), reactionTimesBeforeCommissions(), round1(), round2() (+8 more)

### Community 69 - "Community 69"
Cohesion: 0.16
Nodes (13): CSV_HEADER, csvField(), exportFilename(), JsonExport, toCsv(), toJson(), trialCsvValues(), trialToCsvRow() (+5 more)

### Community 70 - "Community 70"
Cohesion: 0.16
Nodes (14): mean(), median(), Phase, PvtParams, PvtStimulus, round1(), round2(), scorePvt() (+6 more)

### Community 71 - "Community 71"
Cohesion: 0.14
Nodes (14): 1. Paradigma e citazione primaria, 2. Meccanismo cognitivo misurato, 3. Parametri adottati, 4. Mappatura implementativa, 5.1 Errori di commissione (misura primaria), 5.2 Errori di omissione, 5.3 RT dei Go: media, SD e CV, 5.4 Sensibilità $d'$ e criterio $c$ (+6 more)

### Community 72 - "Community 72"
Cohesion: 0.22
Nodes (9): DurationInput(), DurationInputProps, split(), makeLocalId(), SessionPhase, emptyTemplate(), fmtMs(), SessionBuilder() (+1 more)

### Community 73 - "Community 73"
Cohesion: 0.23
Nodes (8): Brand(), BrandProps, Header(), countWord(), WORDS, Hero(), HeroProps, TestFocus

### Community 74 - "Community 74"
Cohesion: 0.27
Nodes (10): COPIES, buildCopy(), collectSymbols(), ENGINES, KEEP_EXPORT_FROM, readText(), requiredSymbols(), rootDir (+2 more)

### Community 75 - "Community 75"
Cohesion: 0.25
Nodes (9): SessionTemplate, SessionBuilderProps, SessionMenu(), SessionMenuProps, fmt(), PHASE_TINTS, SessionTimeline(), SessionTimelineProps (+1 more)

### Community 76 - "Community 76"
Cohesion: 0.36
Nodes (8): clearRun(), deleteTemplate(), exportTemplateJson(), importTemplateJson(), loadRun(), loadTemplates(), saveRun(), saveTemplate()

### Community 77 - "Community 77"
Cohesion: 0.50
Nodes (6): classifyRt(), mean(), meanRtOfValidCorrect(), sdRtOfValidCorrect(), standardDeviation(), validCorrectRts()

## Knowledge Gaps
- **515 isolated node(s):** `name`, `private`, `version`, `type`, `description` (+510 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TestResult` connect `Community 57` to `Testing & CSV Export`, `Community 65`, `Community 4`, `Community 69`, `Community 6`, `Core Engine Types (Clock, Validation)`, `Session Runner & Audio Feedback`, `Community 55`, `Community 58`, `Community 59`, `Community 60`, `Community 63`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `mulberry32()` connect `Community 57` to `Community 64`, `Community 3`, `Community 68`, `Community 4`, `Community 6`, `Community 13`, `Core Engine Types (Clock, Validation)`, `UI Header & Duration Components`, `Community 53`, `Community 54`, `Session Runner & Audio Feedback`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `TrialResult` connect `Community 69` to `Community 64`, `Community 68`, `Community 4`, `Community 6`, `Community 77`, `Core Engine Types (Clock, Validation)`, `Community 13`, `UI Header & Duration Components`, `Community 54`, `Community 58`, `Community 63`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _528 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Testing & CSV Export` be split into smaller, more focused modules?**
  _Cohesion score 0.11693548387096774 - nodes in this community are weakly interconnected._
- **Should `WCST Deck Building` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.08970099667774087 - nodes in this community are weakly interconnected._