/**
 * Avvia il download di un file testuale nel browser (Blob + anchor).
 * @see docs/architettura.md — sezione "Export dei dati"
 */

/** Nome file sicuro: niente separatori di percorso, caratteri riservati o di controllo; lunghezza limitata. */
export function safeFilename(name: string): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = name.replace(/[\/:*?"<>|\u0000-\u001f]+/g, '_').replace(/^\.+/, '').trim().slice(0, 120);
  return cleaned || 'download';
}

export function triggerDownload(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeFilename(filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Alcuni browser avviano il salvataggio in modo asincrono: revocare subito può annullarlo.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
