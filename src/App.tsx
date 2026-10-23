/**
 * Shell dell'applicazione: router a stato, impostazioni e modalità Sessione.
 * @see docs/architettura.md — sezione "Navigazione"
 */
import { Suspense, lazy, useState } from 'react';
import { Home } from './ui/screens/Home';
import { loadSettings, saveSettings } from './ui/storage';
import { loadPreferences, savePreferences, type Preferences } from './ui/preferences';
import {
  loadTemplates,
  saveTemplate,
  deleteTemplate,
  loadRun,
  saveRun,
} from './ui/session/storage';
import { makeRunId, type SessionTemplate, type SessionRun } from './engine/session/model';
import type { Route } from './ui/router';
import type { AllParams } from './config/defaults';
import type { TestId, TestResult } from './engine/types';
import { paperForTest } from './ui/science/papers';

// Solo la Home è nel bundle iniziale: le altre schermate si caricano alla prima visita.
const TestRunner = lazy(() => import('./ui/screens/TestRunner').then((m) => ({ default: m.TestRunner })));
const Results = lazy(() => import('./ui/screens/Results').then((m) => ({ default: m.Results })));
const Settings = lazy(() => import('./ui/screens/Settings').then((m) => ({ default: m.Settings })));
const SessionMenu = lazy(() => import('./ui/session/SessionMenu').then((m) => ({ default: m.SessionMenu })));
const SessionBuilder = lazy(() => import('./ui/session/SessionBuilder').then((m) => ({ default: m.SessionBuilder })));
const Science = lazy(() => import('./ui/science/Science').then((m) => ({ default: m.Science })));
const SessionRunner = lazy(() => import('./ui/session/SessionRunner').then((m) => ({ default: m.SessionRunner })));

export function App(): JSX.Element {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [settings, setSettings] = useState<AllParams>(() => loadSettings());
  const [prefs, setPrefs] = useState<Preferences>(() => loadPreferences());
  const [templates, setTemplates] = useState<SessionTemplate[]>(() => loadTemplates());

  function goHome(): void {
    setRoute({ name: 'home' });
  }
  function persistSettings(next: AllParams, nextPrefs: Preferences): void {
    saveSettings(next);
    savePreferences(nextPrefs);
    setSettings(next);
    setPrefs(nextPrefs);
    goHome();
  }

  // --- Sessione ---
  function refreshTemplates(): void {
    setTemplates(loadTemplates());
  }
  function saveSessionTemplate(t: SessionTemplate): void {
    saveTemplate(t);
    refreshTemplates();
    setRoute({ name: 'sessionMenu' });
  }
  function startSession(t: SessionTemplate): void {
    const run: SessionRun = {
      runId: makeRunId(new Date()),
      template: JSON.parse(JSON.stringify(t)) as SessionTemplate,
      startedAtEpoch: Date.now(),
      startedAtIso: new Date().toISOString(),
      completedPinIds: [],
      results: [],
      finished: false,
    };
    saveRun(run);
    setRoute({ name: 'sessionRun', run });
  }
  function resumeSession(): void {
    const r = loadRun();
    if (r) setRoute({ name: 'sessionRun', run: r });
  }

  const renderRoute = (): JSX.Element => {
    switch (route.name) {
      case 'home':
        return (
          <Home
            onSelectTest={(id: TestId) => setRoute({ name: 'run', testId: id })}
            onOpenSettings={() => setRoute({ name: 'settings' })}
            onOpenSession={() => setRoute({ name: 'sessionMenu' })}
            onOpenScience={(slug) => setRoute({ name: 'science', slug: slug ?? null, from: 'home' })}
          />
        );
      case 'science':
        return (
          <Science
            slug={route.slug}
            backLabel={route.from === 'home' ? 'Home' : 'Torna al test'}
            onSelectPaper={(slug) => setRoute({ ...route, slug })}
            onBack={() => setRoute(route.from === 'home' ? { name: 'home' } : { name: 'run', testId: route.from })}
          />
        );
      case 'run':
        return (
          <TestRunner
            key={route.testId}
            testId={route.testId}
            settings={settings}
            feedbackDuringTest={prefs.feedbackDuringTest}
            onComplete={(result: TestResult) => setRoute({ name: 'results', result })}
            onBack={goHome}
            onOpenScience={() => setRoute({ name: 'science', slug: paperForTest(route.testId)?.slug ?? null, from: route.testId })}
          />
        );
      case 'results':
        return <Results result={route.result} onHome={goHome} />;
      case 'settings':
        return <Settings settings={settings} prefs={prefs} onSave={persistSettings} onBack={goHome} />;
      case 'sessionMenu':
        return (
          <SessionMenu
            templates={templates}
            runInProgress={loadRun()}
            onNew={() => setRoute({ name: 'sessionBuilder', template: null })}
            onEdit={(t) => setRoute({ name: 'sessionBuilder', template: t })}
            onDelete={(id) => {
              deleteTemplate(id);
              refreshTemplates();
            }}
            onStart={startSession}
            onResume={resumeSession}
            onHome={goHome}
          />
        );
      case 'sessionBuilder':
        return (
          <SessionBuilder
            initial={route.template}
            onSave={saveSessionTemplate}
            onBack={() => setRoute({ name: 'sessionMenu' })}
          />
        );
      case 'sessionRun':
        return (
          <SessionRunner
            initialRun={route.run}
            feedbackDuringTest={prefs.feedbackDuringTest}
            onExit={() => setRoute({ name: 'sessionMenu' })}
          />
        );
    }
  };

  return <Suspense fallback={<div className="min-h-full bg-paper" />}>{renderRoute()}</Suspense>;
}
