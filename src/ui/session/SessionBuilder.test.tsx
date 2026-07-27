import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionBuilder, validateTemplate } from './SessionBuilder';
import type { SessionTemplate } from '../../engine/session/model';

function tpl(overrides: Partial<SessionTemplate> = {}): SessionTemplate {
  return {
    id: 't',
    name: 'Protocollo',
    createdAt: '2026-07-07T09:00:00.000Z',
    phases: [
      { id: 'p1', name: 'Baseline', pins: [{ id: 'pin-a', offsetMs: 0, battery: [{ testId: 'stroop1', params: {}, practice: false }] }] },
    ],
    ...overrides,
  };
}

describe('validateTemplate', () => {
  it('accetta un protocollo valido', () => {
    expect(validateTemplate(tpl())).toBeNull();
  });
  it('richiede il nome', () => {
    expect(validateTemplate(tpl({ name: '  ' }))).toMatch(/nome/i);
  });
  it('richiede almeno un pin', () => {
    expect(validateTemplate(tpl({ phases: [{ id: 'p1', name: 'x', pins: [] }] }))).toMatch(/pin/i);
  });
  it('richiede almeno un test per pin', () => {
    const t = tpl({ phases: [{ id: 'p1', name: 'x', pins: [{ id: 'pin', offsetMs: 0, battery: [] }] }] });
    expect(validateTemplate(t)).toMatch(/test/i);
  });
});

describe('SessionBuilder', () => {
  it('rende il costruttore con nome e fase iniziale (nuovo)', () => {
    render(<SessionBuilder initial={null} onSave={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Costruttore sessione')).toBeInTheDocument();
    expect(screen.getByText('+ Aggiungi fase')).toBeInTheDocument();
    expect(screen.getByText('Salva modello')).toBeInTheDocument();
  });

  it('in modifica precarica il nome del modello', () => {
    render(<SessionBuilder initial={tpl({ name: 'Esistente' })} onSave={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByDisplayValue('Esistente')).toBeInTheDocument();
  });
});
