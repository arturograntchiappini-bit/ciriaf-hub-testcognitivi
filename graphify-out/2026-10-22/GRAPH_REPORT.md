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
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31

## God Nodes (most connected - your core abstractions)
1. `TestResult` - 30 edges
2. `App()` - 25 edges
3. `TrialResult` - 25 edges
4. `vitest` - 24 edges
5. `TestId` - 24 edges
6. `SessionBuilder()` - 24 edges
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
- `CIRIAF Hub HTML Entry Point` --conceptually_related_to--> `CIRIAF COLAB/NEXTROOM Cognitive Testing Hub`  [INFERRED]
  C:/Users/artur/Desktop/CIRIAF-HUB/ciriaf-hub-testcognitivi/index.html → C:/Users/artur/Desktop/CIRIAF-HUB/ciriaf-hub-testcognitivi/README.md
- `Engine Review Copies (Standalone Scripts)` --conceptually_related_to--> `Corsi Block-Tapping Task`  [INFERRED]
  C:/Users/artur/Desktop/CIRIAF-HUB/ciriaf-hub-testcognitivi/revisione-motore/README.md → C:/Users/artur/Desktop/CIRIAF-HUB/ciriaf-hub-testcognitivi/docs/scientific/corsi.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **RT Validation Framework (Anticipation + Omission + Preservation)** — scientific_validazione_rt_md_anticipation_filter, scientific_validazione_rt_md_omission_filter, scientific_validazione_rt_md_data_preservation_principle, scientific_validazione_rt_md_rt_validation_pipeline [EXTRACTED 1.00]
- **Session Mode Core Concepts** — specs_2026_07_07_feature_sessione_design_session_template, specs_2026_07_07_feature_sessione_design_time_pin, specs_2026_07_07_feature_sessione_design_session_phase, specs_2026_07_07_feature_sessione_design_session_state, docs_architettura_session_mode [EXTRACTED 1.00]
- **Six Cognitive Tests of CIRIAF Hub** — scientific_stroop_md_stroop_task, scientific_gonogo_md_go_nogo_task, scientific_corsi_md_corsi_block_task, scientific_nback_md_nback_task, scientific_wcst_md_wcst [EXTRACTED 1.00]

## Communities (32 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.10
Nodes (37): @testing-library/react, vitest, CSV_HEADER, CSV_SEPARATOR, csvField(), exportFilename(), JsonExport, toCsv() (+29 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (72): mulberry32(), pick(), randInt(), shuffle(), canonicalKey(), complexityOf(), CORSI_BLOCKS, CorsiParams (+64 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (27): ALL_COLORS, ALL_NUMBERS, ALL_SHAPES, buildDeck(), matchesOn(), matchingDims(), round1(), ruleForCategory() (+19 more)

### Community 3 - "Community 3"
Cohesion: 0.17
Nodes (14): react, react-dom, App(), goHome(), persistSettings(), resumeSession(), rootElement, DEFAULT_PREFERENCES (+6 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (19): SessionState, TestId, TestCard(), TestCardProps, Instruction, INSTRUCTIONS, Route, TEST_CATALOG (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.04
Nodes (43): dependencies, react, react-dom, description, devDependencies, autoprefixer, @fontsource/inter, jsdom (+35 more)

### Community 6 - "Community 6"
Cohesion: 0.19
Nodes (18): chooseTargetPositions(), countHitsFa(), Counts, criterionC(), dPrime(), generateNBack(), NBACK_LETTERS, NBackParams (+10 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (21): accuracyByCondition(), countFlag(), generateStroop(), mean(), meanRtByCondition(), round1(), scoreStroop(), sdRtByCondition() (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (20): canonicalKey(), complexityOf(), CORSI_BLOCKS, CorsiParams, CorsiSequence, corsiSpan(), countCrossings(), distance() (+12 more)

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (21): chooseTargetPositions(), countHitsFa(), Counts, criterionC(), dPrime(), generateNBack(), mean(), NBACK_LETTERS (+13 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (20): ALL_COLORS, ALL_NUMBERS, ALL_SHAPES, buildDeck(), matchesOn(), matchingDims(), round1(), scoreWcst() (+12 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+12 more)

### Community 12 - "Community 12"
Cohesion: 0.17
Nodes (16): arrangeKinds(), countFlag(), deterministicArrange(), generateGoNoGo(), GoNoGoKind, GoNoGoParams, GoNoGoStimulus, mean() (+8 more)

### Community 13 - "Community 13"
Cohesion: 0.09
Nodes (25): AllParams, DEFAULTS, STROOP_BASE, makeSessionId(), BatteryItem, pad2(), FieldDesc, PARAM_SECTIONS (+17 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (29): Cancel, Clock, performanceClock, realScheduler(), Scheduler, Phase, SummaryMetric, ValidationFlag (+21 more)

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (8): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, strict, include

### Community 19 - "Community 19"
Cohesion: 0.23
Nodes (16): startSession(), cloneTemplate(), computeSessionState(), distributePhasesEvenly(), FlatPin, flattenPins(), makeRunId(), movePin() (+8 more)

### Community 20 - "Community 20"
Cohesion: 0.20
Nodes (12): makeLocalId(), SessionPhase, Header(), HeaderProps, DurationInput(), DurationInputProps, split(), emptyTemplate() (+4 more)

### Community 21 - "Community 21"
Cohesion: 0.21
Nodes (15): TimePin, AudioCtor, getAudioContext(), playAlert(), ActiveContext, Mode, now(), SessionRunner() (+7 more)

### Community 22 - "Community 22"
Cohesion: 0.29
Nodes (9): refreshTemplates(), saveSessionTemplate(), doExport(), onImportFile(), deleteTemplate(), exportTemplateJson(), importTemplateJson(), loadTemplates() (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.27
Nodes (9): fmt(), PHASE_TINTS, SessionTimeline(), beginDrag(), duringDrag(), locate(), offsetFromClientX(), onTrackClick() (+1 more)

### Community 24 - "Community 24"
Cohesion: 0.27
Nodes (8): SessionTemplate, Button(), ButtonProps, STYLES, SessionBuilderProps, SessionMenu(), SessionMenuProps, SessionTimelineProps

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (7): CIRIAF Hub HTML Entry Point, CIRIAF Favicon (Blue Rounded Square with Triangles), CIRIAF COLAB/NEXTROOM Cognitive Testing Hub, SessionPhase (Named Time Block), SessionState (Derived Runtime State), SessionTemplate, TimePin (Absolute Offset for Test Battery)

### Community 26 - "Community 26"
Cohesion: 0.25
Nodes (4): Berch et al. 1998 (Corsi Methodological Considerations), Kessels et al. 2000 (Corsi Standardization and Normative Data), Corsi Block-Tapping Task, Visuo-Spatial Sketchpad (Working Memory Model)

### Community 27 - "Community 27"
Cohesion: 0.22
Nodes (5): Hautus 1995 (Corrections for Extreme Proportions and d-prime), Jaeggi et al. 2010 (Concurrent Validity of N-Back as Working Memory Measure), Kirchner 1958 (Age Differences in Short-Term Retention), Owen et al. 2005 (N-Back Meta-Analysis of Neuroimaging), N-Back Task (2-back Verbal)

### Community 28 - "Community 28"
Cohesion: 0.29
Nodes (4): Verbruggen & Logan 2008 (Automatic and Controlled Response Inhibition), Wessel 2018 (Prepotent Motor Activity and Inhibitory Control), Go/No-Go Task (Motor Inhibition), Motor Inhibition (Prepotent Response Suppression)

### Community 29 - "Community 29"
Cohesion: 0.33
Nodes (4): Berg 1948 (Simple Objective Technique for Measuring Flexibility), Heaton 1993 (WCST Manual Revised), Perseveration (WCST Perseverative Errors), Wisconsin Card Sorting Test

### Community 30 - "Community 30"
Cohesion: 0.33
Nodes (3): MacLeod 1991 (Half a Century of Research on the Stroop Effect), Stroop 1935 (Studies of Interference in Serial Verbal Reactions), Stroop Task (Color-Word Interference)

### Community 31 - "Community 31"
Cohesion: 0.33
Nodes (3): Luce 1986 (Response Times: Their Role in Inferring Elementary Mental Organization), Ratcliff 1993 (Methods for Dealing with Reaction Time Outliers), Whelan 2008 (Effective Analysis of Reaction Time Data)

## Knowledge Gaps
- **30 isolated node(s):** `CIRIAF Hub HTML Entry Point`, `CIRIAF Favicon (Blue Rounded Square with Triangles)`, `autoprefixer`, `@fontsource/inter`, `jsdom` (+25 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 222 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `Community 0` to `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 13`, `Community 14`, `Community 19`, `Community 20`, `Community 22`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **What connects `CIRIAF Hub HTML Entry Point`, `CIRIAF Favicon (Blue Rounded Square with Triangles)`, `autoprefixer` to the rest of the system?**
  _30 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.1011764705882353 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Community 3` to `Community 1`, `Community 2`, `Community 5`, `Community 13`, `Community 14`, `Community 20`, `Community 21`, `Community 23`, `Community 24`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05613951266125179 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.1268939393939394 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.13054187192118227 - nodes in this community are weakly interconnected._