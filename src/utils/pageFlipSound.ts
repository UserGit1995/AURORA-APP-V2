// Suono dello sfoglio della pagina, generato dal browser (nessun file audio, nessun costo).
let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let lastPlay = 0;

const KEY = 'aurora_flyer_sound';

export const isFlipSoundOn = () => {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
};

export const setFlipSoundOn = (on: boolean) => {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* niente */
  }
};

const getCtx = () => {
  if (!ctx) {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
};

/** Da chiamare al primo tocco/clic: i browser attivano l'audio solo dopo un gesto dell'utente */
export const unlockFlipSound = () => {
  const c = getCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => undefined);
};

const getNoise = (c: AudioContext) => {
  if (!noise) {
    const len = Math.floor(c.sampleRate * 0.6);
    noise = c.createBuffer(1, len, c.sampleRate);
    const d = noise.getChannelData(0);
    // rumore "carta": fruscio con piccole irregolarità
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.55 + white * 0.45;
      d[i] = last * (0.75 + 0.25 * Math.random());
    }
  }
  return noise;
};

export function playFlipSound(minGapMs = 250) {
  if (!isFlipSoundOn()) return;
  const now = Date.now();
  if (now - lastPlay < minGapMs) return; // evita suoni doppi
  lastPlay = now;
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => undefined);

  const t = c.currentTime + 0.01;
  const dur = 0.42;

  const src = c.createBufferSource();
  src.buffer = getNoise(c);

  // il fruscio parte acuto e scende, come la pagina che passa
  const band = c.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 0.9;
  band.frequency.setValueAtTime(3200, t);
  band.frequency.exponentialRampToValueAtTime(700, t + dur);

  const high = c.createBiquadFilter();
  high.type = 'highpass';
  high.frequency.value = 350;

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.32, t + 0.06);
  gain.gain.setValueAtTime(0.28, t + 0.18);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  src.connect(band).connect(high).connect(gain).connect(c.destination);
  src.start(t);
  src.stop(t + dur + 0.05);

  // piccolo "tocco" finale della pagina che si appoggia
  const thud = c.createBufferSource();
  thud.buffer = getNoise(c);
  const low = c.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 900;
  const g2 = c.createGain();
  const t2 = t + dur - 0.06;
  g2.gain.setValueAtTime(0.0001, t2);
  g2.gain.exponentialRampToValueAtTime(0.22, t2 + 0.015);
  g2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.12);
  thud.connect(low).connect(g2).connect(c.destination);
  thud.start(t2);
  thud.stop(t2 + 0.15);
}
