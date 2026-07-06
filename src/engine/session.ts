/**
 * Generazione dell'identificatore di sessione anonimo.
 * Formato: `XXXX-HHMM` (4 caratteri alfanumerici casuali + orario di avvio).
 * Serve a ricollegare la trascrizione manuale al file grezzo, senza dati personali.
 * @see docs/architettura.md — sezione "Esecuzione anonima"
 */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // niente 0/O/1/I ambigui

/** Due cifre con zero iniziale. */
function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

/**
 * Crea un ID sessione. La parte oraria è deterministica dalla data passata
 * (utile nei test); la parte casuale usa `rand` (default Math.random).
 */
export function makeSessionId(now: Date = new Date(), rand: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += ALPHABET[Math.floor(rand() * ALPHABET.length)];
  }
  const hhmm = `${pad2(now.getHours())}${pad2(now.getMinutes())}`;
  return `${code}-${hhmm}`;
}
