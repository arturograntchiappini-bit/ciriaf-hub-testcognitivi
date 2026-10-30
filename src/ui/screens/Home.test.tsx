import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Home } from './Home';
import { TEST_CATALOG } from '../router';

const noop = (): void => {};

/** Rende la Home e restituisce il catalogo dei test (i titoli compaiono anche nella sezione dei paper). */
function renderHome(overrides: Partial<Parameters<typeof Home>[0]> = {}): HTMLElement {
  const { container } = render(<Home onSelectTest={noop} onOpenSettings={noop} onOpenSession={noop} onOpenScience={noop} {...overrides} />);
  return container.querySelector('#test') as HTMLElement;
}

describe('Home', () => {
  it('ha un solo h1 e mostra il nome del laboratorio', () => {
    renderHome();
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(/Misura\s*la mente/i);
    expect(screen.getAllByText(/Sintropia/).length).toBeGreaterThan(0);
  });

  it('elenca tutti i test del catalogo come righe avviabili', () => {
    const catalog = renderHome();
    expect(within(catalog).getAllByRole('button', { name: /Avvia test/ })).toHaveLength(TEST_CATALOG.length);
    expect(within(catalog).getByText('Stroop 1 — Focus Parola')).toBeInTheDocument();
    expect(within(catalog).getByText('Wisconsin Card Sorting Test')).toBeInTheDocument();
  });

  it('richiama onSelectTest al click su una riga', () => {
    const onSelect = vi.fn();
    const catalog = renderHome({ onSelectTest: onSelect });
    within(catalog).getByText('Go / No-Go').click();
    expect(onSelect).toHaveBeenCalledWith('gonogo');
  });

  it('mostra la regione cerebrale quando il puntatore è su un test e la toglie all’uscita', async () => {
    const user = userEvent.setup();
    const catalog = renderHome();
    expect(screen.getByText('nessuno', { selector: 'dd' })).toBeInTheDocument();
    const row = within(catalog).getByRole('button', { name: /Corsi Block Task/ });
    await user.hover(row);
    expect(screen.getByText('Parietale', { selector: 'dd' })).toBeInTheDocument();
    await user.unhover(row);
    expect(screen.getByText('nessuno', { selector: 'dd' })).toBeInTheDocument();
  });

  it('apre la modalità Sessione dalla hero e dal pannello dedicato', async () => {
    const user = userEvent.setup();
    const onSession = vi.fn();
    renderHome({ onOpenSession: onSession });
    await user.click(screen.getByRole('button', { name: /Avvia una sessione/ }));
    await user.click(screen.getByRole('button', { name: /Apri la modalità sessione/ }));
    expect(onSession).toHaveBeenCalledTimes(2);
  });

  it('apre i fondamenti scientifici dall’header e il paper scelto dalla sezione dedicata', async () => {
    const user = userEvent.setup();
    const onScience = vi.fn();
    renderHome({ onOpenScience: onScience });
    await user.click(screen.getByRole('button', { name: /Fondamenti scientifici|Paper/ }));
    expect(onScience).toHaveBeenLastCalledWith();
    await user.click(screen.getByRole('button', { name: 'Leggi il paper: Flanker — Frecce di Eriksen' }));
    expect(onScience).toHaveBeenLastCalledWith('flanker');
  });

  it('apre le impostazioni dal pulsante in alto', async () => {
    const user = userEvent.setup();
    const onSettings = vi.fn();
    renderHome({ onOpenSettings: onSettings });
    await user.click(screen.getByRole('button', { name: 'Impostazioni' }));
    expect(onSettings).toHaveBeenCalledTimes(1);
  });

  it('mostra la card autore con link LinkedIn sicuro in fondo alla pagina', () => {
    renderHome();
    expect(screen.getByRole('heading', { name: 'Arturo Grant Chiappini' })).toBeInTheDocument();
    expect(screen.getByText('Studente e sviluppatore')).toBeInTheDocument();
    const linkedin = screen.getByRole('link', { name: /LinkedIn di Arturo Grant Chiappini/ });
    expect(linkedin).toHaveAttribute('href', 'https://www.linkedin.com/in/arturo-grant-chiappini/');
    expect(linkedin).toHaveAttribute('target', '_blank');
    expect(linkedin).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('linka il repository open source e dichiara la licenza MIT', () => {
    renderHome();
    const repoLink = screen.getByRole('link', { name: /Codice open source \(licenza MIT\)/ });
    expect(repoLink).toHaveAttribute(
      'href',
      'https://github.com/arturograntchiappini-bit/sintropia-hub',
    );
  });

  it('passa al fallback statico quando WebGL non è disponibile', async () => {
    const { container } = render(<Home onSelectTest={noop} onOpenSettings={noop} onOpenSession={noop} onOpenScience={noop} />);
    await waitFor(() => expect(container.querySelector('[data-render]')).toHaveAttribute('data-render', 'fallback'));
  });
});
