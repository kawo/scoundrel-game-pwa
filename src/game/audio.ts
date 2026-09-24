/*
 * Scoundrel: sound.
 *
 * No audio files — every cue is built from oscillators and a noise buffer.
 * The palette is deliberately dry and low: short percussive hits, minor
 * intervals, no reverb tails. A dungeon, not a fanfare.
 *
 * Browsers refuse to start an AudioContext until the player has interacted with
 * the page, so the context is created lazily on the first gesture and every
 * call before that is a silent no-op rather than an error.
 */
import * as Prefs from './prefs.ts';

type AudioCtorType = typeof AudioContext;

const AudioCtor: AudioCtorType | undefined = typeof window === 'undefined'
  ? undefined
  : window.AudioContext
    || (window as unknown as { webkitAudioContext?: AudioCtorType }).webkitAudioContext;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let broken = false;

/* ------------------------------------------------------------------ *
 * Context
 * ------------------------------------------------------------------ */

function ensure(): AudioContext | null {
  if (broken || !AudioCtor) return null;
  if (ctx) {
    // Browsers suspend the context when a tab is backgrounded.
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  try {
    ctx = new AudioCtor({ latencyHint: 'interactive' });
    master = ctx.createGain();
    master.gain.value = 0.28; // headroom: cues stack during a fast room
    master.connect(ctx.destination);
    noiseBuffer = makeNoise(ctx);
    return ctx;
  } catch (err) {
    broken = true;
    console.warn('[Scoundrel] no audio:', err);
    return null;
  }
}

/** Two seconds of white noise, reused by every percussive cue. */
function makeNoise(context: AudioContext): AudioBuffer {
  const frames = context.sampleRate * 2;
  const buffer = context.createBuffer(1, frames, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Called from the first real user gesture; see App.tsx. */
export function unlock(): void {
  ensure();
}

const on = () => Prefs.get('sound') && !broken && !!AudioCtor;

/* ------------------------------------------------------------------ *
 * Voices
 * ------------------------------------------------------------------ */

interface ToneOpts {
  freq: number;
  type?: OscillatorType;
  at?: number;
  dur?: number;
  gain?: number;
  glide?: number | null;
}

/**
 * One enveloped oscillator. Every node disconnects itself when the note
 * ends, so nothing accumulates over a long session.
 */
function tone({ freq, type = 'sine', at = 0, dur = 0.18, gain = 0.5, glide = null }: ToneOpts): void {
  const c = ctx!;
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (glide !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, glide), t + dur);

  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  osc.connect(env).connect(master!);
  osc.start(t);
  osc.stop(t + dur + 0.02);
  osc.onended = () => { osc.disconnect(); env.disconnect(); };
}

interface NoiseOpts {
  at?: number;
  dur?: number;
  gain?: number;
  freq?: number;
  q?: number;
  type?: BiquadFilterType;
}

/** Filtered noise: paper, stone, steel, depending on the filter. */
function noise({ at = 0, dur = 0.12, gain = 0.4, freq = 1200, q = 1, type = 'bandpass' }: NoiseOpts): void {
  const c = ctx!;
  const t = c.currentTime + at;
  const src = c.createBufferSource();
  const filter = c.createBiquadFilter();
  const env = c.createGain();
  src.buffer = noiseBuffer;
  src.loop = true;
  filter.type = type;
  filter.frequency.setValueAtTime(freq, t);
  filter.Q.value = q;

  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  src.connect(filter).connect(env).connect(master!);
  src.start(t);
  src.stop(t + dur + 0.02);
  src.onended = () => { src.disconnect(); filter.disconnect(); env.disconnect(); };
}

/* ------------------------------------------------------------------ *
 * Cues
 * ------------------------------------------------------------------ */

const CUES = {
  /** A card turning over: short, papery. */
  flip: () => noise({ dur: 0.09, gain: 0.22, freq: 2400, q: 0.7, type: 'highpass' }),

  /** Steel leaving a scabbard. */
  equip: () => {
    noise({ dur: 0.18, gain: 0.3, freq: 3200, q: 2 });
    tone({ freq: 320, type: 'triangle', dur: 0.22, gain: 0.18, glide: 520 });
  },

  /** Cork, then something rising. */
  potion: () => {
    noise({ dur: 0.05, gain: 0.3, freq: 800, q: 6 });
    tone({ freq: 440, type: 'sine', at: 0.04, dur: 0.3, gain: 0.22, glide: 880 });
  },

  /** Taking damage: a low thud with grit. Scales with how hard you were hit. */
  hit: (amount = 4) => {
    const weight = Math.min(1, amount / 12);
    tone({ freq: 90 - weight * 25, type: 'sine', dur: 0.26, gain: 0.5, glide: 40 });
    noise({ dur: 0.14, gain: 0.22 + weight * 0.2, freq: 420, q: 0.8 });
  },

  /** A clean kill: metal on bone. */
  kill: () => {
    noise({ dur: 0.07, gain: 0.35, freq: 5200, q: 1.5 });
    tone({ freq: 1180, type: 'square', dur: 0.14, gain: 0.1, glide: 760 });
    tone({ freq: 196, type: 'triangle', dur: 0.2, gain: 0.2 });
  },

  /** Cards sliding under the deck. */
  avoid: () => noise({ dur: 0.26, gain: 0.2, freq: 1100, q: 0.5, type: 'lowpass' }),

  /** A new room dealt. */
  deal: () => noise({ dur: 0.12, gain: 0.16, freq: 1800, q: 0.6, type: 'highpass' }),

  /** Out alive: an open fifth, then the octave. */
  win: () => {
    [0, 0.12, 0.26].forEach((at, i) => {
      tone({ freq: [294, 440, 587][i], type: 'triangle', at, dur: 0.75, gain: 0.26 });
    });
  },

  /** Not out alive: the same shape, falling and minor. */
  lose: () => {
    tone({ freq: 220, type: 'sawtooth', dur: 0.9, gain: 0.2, glide: 82 });
    tone({ freq: 233, type: 'sine', at: 0.06, dur: 0.8, gain: 0.16, glide: 92 });
    noise({ at: 0.02, dur: 0.5, gain: 0.14, freq: 300, q: 0.4, type: 'lowpass' });
  },

  /** An achievement: a small bright arpeggio, clearly not a game sound. */
  unlock: () => {
    [523, 659, 784, 1047].forEach((freq, i) => {
      tone({ freq, type: 'triangle', at: i * 0.07, dur: 0.3, gain: 0.16 });
    });
  },
};

export type Cue = keyof typeof CUES;
export const cues = Object.keys(CUES) as Cue[];

/**
 * Play a cue by name. Silent and harmless when sound is off, when the
 * context has not been unlocked yet, or when the browser has no WebAudio.
 */
export function play(name: Cue, amount?: number): void {
  if (!on()) return;
  const cue = CUES[name];
  if (!cue) return;
  if (!ensure()) return;
  try {
    if (name === 'hit') CUES.hit(amount);
    else (cue as () => void)();
  } catch (err) {
    // A failed sound must never interrupt a turn.
    console.warn('[Scoundrel] sound failed:', name, err);
  }
}
