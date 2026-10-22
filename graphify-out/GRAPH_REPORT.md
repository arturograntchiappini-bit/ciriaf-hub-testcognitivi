# Graph Report - ciriaf-hub-testcognitivi  (2026-10-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 660 nodes · 1577 edges · 32 communities (29 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4e169d0f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Testing & CSV Export
- Shared RNG & Utility Functions
- WCST Deck Building
- App Shell & React Bootstrap
- Test Catalog & Navigation
- Project Dependencies (package.json)
- N-Back Generator & Signal Detection
- Stroop Generator & Scoring
- Corsi Sequence Generation & Scoring
- N-Back Metrics & Quartile Analysis
- WCST Scoring & Heaton Metrics
- TypeScript Compiler Configuration
- Go/No-Go Generator & Scoring
- Test Configuration Defaults
- Core Engine Types (Clock, Validation)
- TypeScript Strict Mode Config
- Session Model Logic
- UI Header & Duration Components
- Session Runner & Audio Feedback
- Session Template CRUD & Export
- Session Timeline Interactive UI
- Session Builder & Menu Components
- Project Identity & Entry Points
- Corsi Scientific Literature
- N-Back Scientific Literature
- Go/No-Go Scientific Literature
- WCST Scientific Literature
- Stroop Scientific Literature
- RT Validation Methodology Literature

## God Nodes (most connected - your core abstractions)
1. `TestResult` - 30 edges
2. `TrialResult` - 25 edges
3. `App()` - 25 edges
4. `TestId` - 24 edges
5. `SessionBuilder()` - 24 edges
6. `vitest` - 24 edges
7. `Button()` - 23 edges
8. `SessionRunner()` - 20 edges
9. `compilerOptions` - 18 edges
10. `mulberry32()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `CIRIAF Favicon (Blue Rounded Square with Triangles)` --conceptually_related_to--> `CIRIAF COLAB/NEXTROOM Cognitive Testing Hub`  [INFERRED]
  C:/Users/artur/Desktop/CIRIAF-HUB/ciriaf-hub-testcognitivi/public/favicon.svg → C:/Users/artur/Desktop/CIRIAF-HUB/ciriaf-hub-testcognitivi/README.md
- `d-prime (Sensitivity)` --semantically_similar_to--> `Commission Errors (False Alarms on No-Go)`  [INFERRED] [semantically similar]
  C:/Users/artur/Desktop/CIRIAF-HUB/ciriaf-hub-testcognitivi/docs/scientific/nback.md → C:/Users/artur/Desktop/CIRIAF-HUB/ciriaf-hub-testcognitivi/docs/scientific/gonogo.md
- `Stroop Task (Color-Word Interference)` --semantically_similar_to--> `Go/No-Go Task (Motor Inhibition)`  [INFERRED] [semantically similar]
  C:/Users/artur/Desktop/CIRIAF-HUB/ciriaf-hub-testcognitivi/docs/scientific/stroop.md → C:/Users/artur/Desktop/CIRIAF-HUB/ciriaf-hub-testcognitivi/docs/scientific/gonogo.md
- `SessionTestResult` --references--> `TestResult`  [EXTRACTED]
  src/engine/session/model.ts → src/engine/types.ts
- `RtTestRunnerProps` --references--> `TestResult`  [EXTRACTED]
  src/ui/runtime/RtTestRunner.tsx → src/engine/types.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **RT Validation Framework (Anticipation + Omission + Preservation)** — scientific_validazione_rt_md_anticipation_filter, scientific_validazione_rt_md_omission_filter, scientific_validazione_rt_md_data_preservation_principle, scientific_validazione_rt_md_rt_validation_pipeline [EXTRACTED 1.00]
- **Session Mode Core Concepts** — specs_2026_07_07_feature_sessione_design_session_template, specs_2026_07_07_feature_sessione_design_time_pin, specs_2026_07_07_feature_sessione_design_session_phase, specs_2026_07_07_feature_sessione_design_session_state, docs_architettura_session_mode [EXTRACTED 1.00]
- **Six Cognitive Tests of CIRIAF Hub** — scientific_stroop_md_stroop_task, scientific_gonogo_md_go_nogo_task, scientific_corsi_md_corsi_block_task, scientific_nback_md_nback_task, scientific_wcst_md_wcst [EXTRACTED 1.00]

## Communities (32 total, 3 thin omitted)

### Community 0 - "Testing & CSV Export"
Cohesion: 0.10
Nodes (37): @testing-library/react, vitest, CSV_HEADER, CSV_SEPARATOR, csvField(), exportFilename(), JsonExport, toCsv() (+29 more)

### Community 1 - "Shared RNG & Utility Functions"
Cohesion: 0.06
Nodes (72): mulberry32(), pick(), randInt(), shuffle(), canonicalKey(), complexityOf(), CORSI_BLOCKS, CorsiParams (+64 more)

### Community 2 - "WCST Deck Building"
Cohesion: 0.13
Nodes (27): ALL_COLORS, ALL_NUMBERS, ALL_SHAPES, buildDeck(), matchesOn(), matchingDims(), round1(), ruleForCategory() (+19 more)

### Community 3 - "App Shell & React Bootstrap"
Cohesion: 0.17
Nodes (14): react, react-dom, App(), goHome(), persistSettings(), resumeSession(), rootElement, DEFAULT_PREFERENCES (+6 more)

### Community 4 - "Test Catalog & Navigation"
Cohesion: 0.13
Nodes (19): SessionState, TestId, TestCard(), TestCardProps, Instruction, INSTRUCTIONS, Route, TEST_CATALOG (+11 more)

### Community 5 - "Project Dependencies (package.json)"
Cohesion: 0.04
Nodes (43): dependencies, react, react-dom, description, devDependencies, autoprefixer, @fontsource/inter, jsdom (+35 more)

### Community 6 - "N-Back Generator & Signal Detection"
Cohesion: 0.19
Nodes (18): chooseTargetPositions(), countHitsFa(), Counts, criterionC(), dPrime(), generateNBack(), NBACK_LETTERS, NBackParams (+10 more)

### Community 7 - "Stroop Generator & Scoring"
Cohesion: 0.11
Nodes (21): accuracyByCondition(), countFlag(), generateStroop(), mean(), meanRtByCondition(), round1(), scoreStroop(), sdRtByCondition() (+13 more)

### Community 8 - "Corsi Sequence Generation & Scoring"
Cohesion: 0.14
Nodes (20): canonicalKey(), complexityOf(), CORSI_BLOCKS, CorsiParams, CorsiSequence, corsiSpan(), countCrossings(), distance() (+12 more)

### Community 9 - "N-Back Metrics & Quartile Analysis"
Cohesion: 0.14
Nodes (21): chooseTargetPositions(), countHitsFa(), Counts, criterionC(), dPrime(), generateNBack(), mean(), NBACK_LETTERS (+13 more)

### Community 10 - "WCST Scoring & Heaton Metrics"
Cohesion: 0.10
Nodes (20): ALL_COLORS, ALL_NUMBERS, ALL_SHAPES, buildDeck(), matchesOn(), matchingDims(), round1(), scoreWcst() (+12 more)

### Community 11 - "TypeScript Compiler Configuration"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+12 more)

### Community 12 - "Go/No-Go Generator & Scoring"
Cohesion: 0.17
Nodes (16): arrangeKinds(), countFlag(), deterministicArrange(), generateGoNoGo(), GoNoGoKind, GoNoGoParams, GoNoGoStimulus, mean() (+8 more)

### Community 13 - "Test Configuration Defaults"
Cohesion: 0.09
Nodes (25): AllParams, DEFAULTS, STROOP_BASE, makeSessionId(), BatteryItem, pad2(), FieldDesc, PARAM_SECTIONS (+17 more)

### Community 14 - "Core Engine Types (Clock, Validation)"
Cohesion: 0.11
Nodes (29): Cancel, Clock, performanceClock, realScheduler(), Scheduler, Phase, SummaryMetric, ValidationFlag (+21 more)

### Community 15 - "TypeScript Strict Mode Config"
Cohesion: 0.22
Nodes (8): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, strict, include

### Community 19 - "Session Model Logic"
Cohesion: 0.23
Nodes (16): startSession(), cloneTemplate(), computeSessionState(), distributePhasesEvenly(), FlatPin, flattenPins(), makeRunId(), movePin() (+8 more)

### Community 20 - "UI Header & Duration Components"
Cohesion: 0.20
Nodes (12): makeLocalId(), SessionPhase, Header(), HeaderProps, DurationInput(), DurationInputProps, split(), emptyTemplate() (+4 more)

### Community 21 - "Session Runner & Audio Feedback"
Cohesion: 0.21
Nodes (15): TimePin, AudioCtor, getAudioContext(), playAlert(), ActiveContext, Mode, now(), SessionRunner() (+7 more)

### Community 22 - "Session Template CRUD & Export"
Cohesion: 0.29
Nodes (9): refreshTemplates(), saveSessionTemplate(), doExport(), onImportFile(), deleteTemplate(), exportTemplateJson(), importTemplateJson(), loadTemplates() (+1 more)

### Community 23 - "Session Timeline Interactive UI"
Cohesion: 0.27
Nodes (9): fmt(), PHASE_TINTS, SessionTimeline(), beginDrag(), duringDrag(), locate(), offsetFromClientX(), onTrackClick() (+1 more)

### Community 24 - "Session Builder & Menu Components"
Cohesion: 0.27
Nodes (8): SessionTemplate, Button(), ButtonProps, STYLES, SessionBuilderProps, SessionMenu(), SessionMenuProps, SessionTimelineProps

### Community 25 - "Project Identity & Entry Points"
Cohesion: 0.22
Nodes (7): CIRIAF Hub HTML Entry Point, CIRIAF Favicon (Blue Rounded Square with Triangles), CIRIAF COLAB/NEXTROOM Cognitive Testing Hub, SessionPhase (Named Time Block), SessionState (Derived Runtime State), SessionTemplate, TimePin (Absolute Offset for Test Battery)

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

## Knowledge Gaps
- **30 isolated node(s):** `autoprefixer`, `@fontsource/inter`, `jsdom`, `postcss`, `tailwindcss` (+25 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 222 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `Testing & CSV Export` to `Shared RNG & Utility Functions`, `WCST Deck Building`, `Test Catalog & Navigation`, `Project Dependencies (package.json)`, `N-Back Generator & Signal Detection`, `Test Configuration Defaults`, `Core Engine Types (Clock, Validation)`, `Session Model Logic`, `UI Header & Duration Components`, `Session Template CRUD & Export`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **What connects `autoprefixer`, `@fontsource/inter`, `jsdom` to the rest of the system?**
  _30 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Testing & CSV Export` be split into smaller, more focused modules?**
  _Cohesion score 0.1011764705882353 - nodes in this community are weakly interconnected._
- **Why does `react` connect `App Shell & React Bootstrap` to `Shared RNG & Utility Functions`, `WCST Deck Building`, `Project Dependencies (package.json)`, `Test Configuration Defaults`, `Core Engine Types (Clock, Validation)`, `UI Header & Duration Components`, `Session Runner & Audio Feedback`, `Session Timeline Interactive UI`, `Session Builder & Menu Components`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Should `Shared RNG & Utility Functions` be split into smaller, more focused modules?**
  _Cohesion score 0.05613951266125179 - nodes in this community are weakly interconnected._
- **Should `WCST Deck Building` be split into smaller, more focused modules?**
  _Cohesion score 0.1268939393939394 - nodes in this community are weakly interconnected._
- **Should `Test Catalog & Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.13054187192118227 - nodes in this community are weakly interconnected._