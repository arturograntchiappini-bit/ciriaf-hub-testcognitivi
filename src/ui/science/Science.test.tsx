import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Science } from './Science';
import { PAPERS } from './papers';

const noop = (): void => {};

describe('Science', () => {
  it('mostra l’indice con un paper per ogni voce registrata', () => {
    render(<Science slug={null} onSelectPaper={noop} onBack={noop} backLabel="Home" />);
    expect(screen.getByRole('heading', { level: 1, name: /Cosa misura ogni test/ })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(PAPERS.length);
  });

  it('apre un paper dall’indice e torna indietro', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onBack = vi.fn();
    render(<Science slug={null} onSelectPaper={onSelect} onBack={onBack} backLabel="Home" />);
    await user.click(screen.getByRole('button', { name: /Flanker/ }));
    expect(onSelect).toHaveBeenCalledWith('flanker');
    await user.click(screen.getByRole('button', { name: /← Home/ }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('carica e mostra il testo del paper con indice dei paragrafi e citazione della piattaforma', async () => {
    render(<Science slug="flanker" onSelectPaper={noop} onBack={noop} backLabel="Home" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: /Flanker Task \(Eriksen\)/ })).toBeInTheDocument());
    expect(screen.getByRole('navigation', { name: 'Indice del paper' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://doi.org/10.3758/BF03203267' })).toHaveAttribute('target', '_blank');
    expect(screen.getByLabelText('Come citare la piattaforma')).toBeInTheDocument();
  });

  it('rende le formule come MathML', async () => {
    const { container } = render(<Science slug="gonogo" onSelectPaper={noop} onBack={noop} backLabel="Home" />);
    await waitFor(() => expect(container.querySelector('math')).not.toBeNull());
  });
});
