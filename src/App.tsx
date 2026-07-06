/**
 * Shell dell'applicazione: router a stato e stato delle impostazioni.
 * @see docs/architettura.md — sezione "Navigazione"
 */
import { useState } from 'react';
import { Home } from './ui/screens/Home';
import { TestRunner } from './ui/screens/TestRunner';
import { Results } from './ui/screens/Results';
import { Settings } from './ui/screens/Settings';
import { loadSettings, saveSettings } from './ui/storage';
import type { Route } from './ui/router';
import type { AllParams } from './config/defaults';
import type { TestId, TestResult } from './engine/types';

export function App(): JSX.Element {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [settings, setSettings] = useState<AllParams>(() => loadSettings());

  function selectTest(id: TestId): void {
    setRoute({ name: 'run', testId: id });
  }
  function completeTest(result: TestResult): void {
    setRoute({ name: 'results', result });
  }
  function goHome(): void {
    setRoute({ name: 'home' });
  }
  function persistSettings(next: AllParams): void {
    saveSettings(next);
    setSettings(next);
    setRoute({ name: 'home' });
  }

  switch (route.name) {
    case 'home':
      return <Home onSelectTest={selectTest} onOpenSettings={() => setRoute({ name: 'settings' })} />;
    case 'run':
      return (
        <TestRunner
          key={route.testId}
          testId={route.testId}
          settings={settings}
          onComplete={completeTest}
          onBack={goHome}
        />
      );
    case 'results':
      return <Results result={route.result} onHome={goHome} />;
    case 'settings':
      return <Settings settings={settings} onSave={persistSettings} onBack={goHome} />;
  }
}
