/**
 * Shell dell'applicazione: router a stato, impostazioni e modalità Sessione.
 * @see docs/architettura.md — sezione "Navigazione"
 */
import { useState } from 'react';
import { Home } from './ui/screens/Home';
import { TestRunner } from './ui/screens/TestRunner';
import { Results } from './ui/screens/Results';
import { Settings } from './ui/screens/Settings';
import { SessionMenu } from './ui/session/SessionMenu';
import { SessionBuilder } from './ui/session/SessionBuilder';
import { SessionRunner } from './ui/session/SessionRunner';
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

  switch (route.name) {
    case 'home':
      return (
        <Home
          onSelectTest={(id: TestId) => setRoute({ name: 'run', testId: id })}
          onOpenSettings={() => setRoute({ name: 'settings' })}
          onOpenSession={() => setRoute({ name: 'sessionMenu' })}
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
}
