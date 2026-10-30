import { useState } from 'react';
import { REPOSITORY_URL } from '../components/AuthorCard';

export const RELEASES_URL = `${REPOSITORY_URL}/releases/latest`;
// Relativi: i file sono serviti dallo stesso sito (public/download), così il download parte senza passare da GitHub.
export const INSTALLER_URL = './download/Sintropia-Setup-x64.msi';
export const PORTABLE_URL = './download/Sintropia-Desktop-x64.zip';
export const CHECKSUMS_URL = './download/SHA256SUMS.txt';
const INSTALL_SCRIPT_URL = 'https://raw.githubusercontent.com/arturograntchiappini-bit/ciriaf-hub-testcognitivi/main/scripts/install.ps1';

/** Con il sito servito in https il comando PowerShell scarica da qui (script e MSI sono in public/); altrimenti da GitHub. */
export function installCommands(siteBase: string | null): ReadonlyArray<{ label: string; command: string }> {
  const powershell = siteBase
    ? `$env:SINTROPIA_BASE_URL='${siteBase}/download'; irm ${siteBase}/install.ps1 | iex`
    : `irm ${INSTALL_SCRIPT_URL} | iex`;
  return [
    { label: 'PowerShell', command: powershell },
    { label: 'Rust (cargo)', command: `cargo install --git ${REPOSITORY_URL} sintropia-desktop` },
  ];
}

export const INSTALL_COMMANDS = installCommands(null);

function currentSiteBase(): string | null {
  if (window.location.protocol !== 'https:') return null;
  return new URL('.', window.location.href).href.replace(/\/$/, '');
}

function CopyableCommand({ label, command }: { label: string; command: string }): JSX.Element {
  const [copied, setCopied] = useState(false);
  function copy(): void {
    void navigator.clipboard?.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <div className="border border-line bg-paper">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">{label}</span>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copia il comando ${label}`}
          className="min-h-[32px] px-2 font-mono text-[11px] uppercase tracking-[0.18em] text-accent-glow hover:text-ink"
        >
          {copied ? 'Copiato' : 'Copia'}
        </button>
      </div>
      <pre className="whitespace-pre-wrap break-all px-4 py-3 font-mono text-[12px] leading-relaxed text-ink" tabIndex={0}>
        <code>{command}</code>
      </pre>
    </div>
  );
}

/** App desktop per Windows: stessi motori e stessi test della versione web, per chi preferisce un programma installato. */
export function DesktopDownload(): JSX.Element {
  return (
    <section id="app-desktop" aria-labelledby="desktop-title" className="reveal mt-20 scroll-mt-8 border border-line bg-surface/60 p-6 sm:p-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-accent-glow">App per Windows</p>
      <h3 id="desktop-title" className="mt-2 font-display text-4xl font-bold uppercase leading-none tracking-wide text-ink sm:text-5xl">
        Sintropia sul tuo computer
      </h3>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
        La stessa dashboard dei test, come programma nativo scritto in Rust: stessi motori, stessi test, nessuna connessione
        necessaria. I dati restano sul tuo computer. Il programma per ora non è firmato digitalmente (la firma arriverà a breve): Windows
        può mostrare un avviso di SmartScreen alla prima esecuzione. Il progetto è in sviluppo e sperimentale, molte parti
        devono ancora essere testate.
      </p>
      <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.28em] text-accent-glow">Opzione 1 · dal terminale (consigliata)</p>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
        Il comando PowerShell scarica l&apos;installer, verifica lo SHA-256 e installa per utente, senza permessi di amministratore.
      </p>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {installCommands(currentSiteBase()).map((c) => (
          <CopyableCommand key={c.label} {...c} />
        ))}
      </div>
      <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.28em] text-muted">Opzione 2 · scarica l&apos;installer</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <a
          href={INSTALLER_URL}
          className="inline-flex min-h-[48px] items-center gap-3 bg-accent px-6 font-mono text-[12px] font-medium uppercase tracking-[0.16em] text-paper transition-colors duration-200 hover:bg-accent-glow"
        >
          Scarica l&apos;installer <span aria-hidden>↓</span>
        </a>
        <a
          href={PORTABLE_URL}
          className="inline-flex min-h-[48px] items-center border border-line px-6 font-mono text-[12px] font-medium uppercase tracking-[0.16em] text-ink transition-colors duration-200 hover:border-accent"
        >
          Versione portatile (.zip)
        </a>
      </div>
      <p className="mt-3 font-mono text-[11px] text-muted">
        Windows 10/11 a 64 bit, installazione per utente senza permessi di amministratore.{' '}
        <a href={CHECKSUMS_URL} className="underline hover:text-ink">Checksum SHA-256</a>
        {' · '}
        <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">
          Note di rilascio (nuova scheda)
        </a>
      </p>
    </section>
  );
}
