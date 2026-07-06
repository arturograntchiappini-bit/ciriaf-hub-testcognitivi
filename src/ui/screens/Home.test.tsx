import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Home } from './Home';

describe('Home', () => {
  it('mostra il nome della piattaforma e le 6 card', () => {
    render(<Home onSelectTest={() => {}} onOpenSettings={() => {}} />);
    expect(screen.getByText('CIRIAF — COLAB/NEXTROOM COGNITIVE TESTING HUB')).toBeInTheDocument();
    expect(screen.getByText('Stroop 1 — Focus Parola')).toBeInTheDocument();
    expect(screen.getByText('Wisconsin Card Sorting Test')).toBeInTheDocument();
    expect(screen.getAllByText('Avvia →')).toHaveLength(6);
  });

  it('richiama onSelectTest al click su una card', () => {
    const onSelect = vi.fn();
    render(<Home onSelectTest={onSelect} onOpenSettings={() => {}} />);
    screen.getByText('Go / No-Go').click();
    expect(onSelect).toHaveBeenCalledWith('gonogo');
  });
});
