import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CorsiView } from './CorsiView';
import { WcstView } from './WcstView';
import { PvtView } from './PvtView';
import { FlankerView } from './FlankerView';
import { SartView } from './SartView';
import { VisualSearchView } from './VisualSearchView';
import { TrailMakingView } from './TrailMakingView';
import { MentalRotationView } from './MentalRotationView';
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

  it('FlankerView si monta senza errori', () => {
    render(<FlankerView params={DEFAULTS.flanker} {...common} />);
  });

  it('SartView si monta senza errori', () => {
    render(<SartView params={DEFAULTS.sart} {...common} />);
    expect(screen.getByText(/Pratica/)).toBeInTheDocument();
  });

  it('VisualSearchView si monta senza errori', () => {
    render(<VisualSearchView params={DEFAULTS.visualSearch} {...common} />);
    expect(screen.getByText(/Pratica/)).toBeInTheDocument();
  });

  it('MentalRotationView si monta senza errori', () => {
    render(<MentalRotationView params={DEFAULTS.mentalRotation} {...common} />);
    expect(screen.getByText(/Pratica/)).toBeInTheDocument();
  });

  it('TrailMakingView mostra la parte A e avvia il campo dei cerchi', () => {
    render(<TrailMakingView params={DEFAULTS.trailMaking} {...common} />);
    expect(screen.getByText(/parte A/)).toBeInTheDocument();
  });

  it('PvtView si monta senza errori', () => {
    render(<PvtView params={DEFAULTS.pvt} {...common} />);
    // Il PVT usa il sequencer RT, quindi si ferma alla schermata di pratica
    expect(screen.getByText(/Pratica/)).toBeInTheDocument();
  });
});