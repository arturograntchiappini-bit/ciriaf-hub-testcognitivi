import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CorsiView } from './CorsiView';
import { WcstView } from './WcstView';
import { DEFAULTS } from '../../config/defaults';

const common = {
  sessionId: 'TEST-0000',
  startedAt: '2026-07-06T10:00:00.000Z',
  seed: 1,
  onComplete: () => {},
  onAbort: () => {},
};

describe('smoke render viste interattive', () => {
  it('CorsiView mostra la schermata iniziale', () => {
    render(<CorsiView params={DEFAULTS.corsi} {...common} />);
    expect(screen.getByText('Inizia la pratica')).toBeInTheDocument();
  });

  it('WcstView mostra la carta da smistare e le carte di riferimento', () => {
    render(<WcstView params={DEFAULTS.wcst} {...common} />);
    expect(screen.getByText('Carta da smistare')).toBeInTheDocument();
    // 4 carte chiave in alto + 4 zone risposta + 1 carta da abbinare = 9 CardFace
    expect(screen.getByText(/Carta 1\//)).toBeInTheDocument();
  });
});
