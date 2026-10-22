import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Home } from './Home';

describe('Home', () => {
  it('mostra il nome della piattaforma e le 6 card', () => {
    render(<Home onSelectTest={() => {}} onOpenSettings={() => {}} onOpenSession={() => {}} />);
    expect(screen.getByText('CIRIAF — COLAB/NEXTROOM')).toBeInTheDocument();
    expect(screen.getByText('Stroop 1 — Focus Parola')).toBeInTheDocument();
    expect(screen.getByText('Wisconsin Card Sorting Test')).toBeInTheDocument();
    expect(screen.getAllByText('Avvia test →')).toHaveLength(6);
  });

  it('richiama onSelectTest al click su una card', () => {
    const onSelect = vi.fn();
    render(<Home onSelectTest={onSelect} onOpenSettings={() => {}} onOpenSession={() => {}} />);
    screen.getByText('Go / No-Go').click();
    expect(onSelect).toHaveBeenCalledWith('gonogo');
  });
});
