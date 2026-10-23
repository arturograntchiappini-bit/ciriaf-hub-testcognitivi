/**
 * Monta la vista del test corrispondente a un testId con parametri e seed dati.
 * Riusato dalla somministrazione singola (TestRunner) e dalla batteria di Sessione.
 */
import { StroopView } from './StroopView';
import { GoNoGoView } from './GoNoGoView';
import { NBackView } from './NBackView';
import { CorsiView } from './CorsiView';
import { WcstView } from './WcstView';
import { PvtView } from './PvtView';
import { FlankerView } from './FlankerView';
import { SartView } from './SartView';
import type { TestId, TestResult } from '../../engine/types';
import type { StroopParams } from '../../engine/tests/stroop';
import type { GoNoGoParams } from '../../engine/tests/gonogo';
import type { NBackParams } from '../../engine/tests/nback';
import type { CorsiParams } from '../../engine/tests/corsi';
import type { WcstParams } from '../../engine/tests/wcst';
import type { PvtParams } from '../../engine/tests/pvt';
import type { FlankerParams } from '../../engine/tests/flanker';
import type { SartParams } from '../../engine/tests/sart';

interface TestHostProps {
  testId: TestId;
  params: Record<string, unknown>;
  sessionId: string;
  startedAt: string;
  seed: number;
  practice?: boolean;
  /** Mostra "Corretto/Errato" durante i test RT (Corsi/WCST lo mostrano sempre). */
  feedbackDuringTest?: boolean;
  onComplete: (result: TestResult) => void;
  onAbort: () => void;
}

export function TestHost(props: TestHostProps): JSX.Element {
  const { testId, params, feedbackDuringTest } = props;
  const common = {
    sessionId: props.sessionId,
    startedAt: props.startedAt,
    seed: props.seed,
    practice: props.practice,
    onComplete: props.onComplete,
    onAbort: props.onAbort,
  };
  switch (testId) {
    case 'stroop1':
      return <StroopView variant="stroop1" params={params as unknown as StroopParams} feedbackDuringTest={feedbackDuringTest} {...common} />;
    case 'stroop2':
      return <StroopView variant="stroop2" params={params as unknown as StroopParams} feedbackDuringTest={feedbackDuringTest} {...common} />;
    case 'gonogo':
      return <GoNoGoView params={params as unknown as GoNoGoParams} feedbackDuringTest={feedbackDuringTest} {...common} />;
    case 'nback':
      return <NBackView params={params as unknown as NBackParams} feedbackDuringTest={feedbackDuringTest} {...common} />;
    case 'corsi':
      return <CorsiView params={params as unknown as CorsiParams} {...common} />;
    case 'wcst':
      return <WcstView params={params as unknown as WcstParams} {...common} />;
    case 'pvt':
      return <PvtView params={params as unknown as PvtParams} feedbackDuringTest={feedbackDuringTest} {...common} />;
    case 'flanker':
      return <FlankerView params={params as unknown as FlankerParams} feedbackDuringTest={feedbackDuringTest} {...common} />;
    case 'sart':
      return <SartView params={params as unknown as SartParams} feedbackDuringTest={feedbackDuringTest} {...common} />;
  }
}
