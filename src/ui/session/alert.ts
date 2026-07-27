/**
 * Alert sonoro per l'inizio di una batteria (WebAudio). Silenzioso se l'API non
 * è disponibile o è bloccata dal browser (non deve mai lanciare).
 * @see docs/superpowers/specs/2026-07-07-feature-sessione-design.md
 */

type AudioCtor = typeof AudioContext;

function getAudioContext(): AudioContext | null {
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

/** Emette due brevi beep. No-op se l'audio non è disponibile. */
export function playAlert(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const beep = (start: number, freq: number): void => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.2, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + 0.24);
    };
    beep(0, 880);
    beep(0.3, 1175);
  } catch {
    /* audio non disponibile: nessun suono, ma la sessione prosegue */
  }
}
