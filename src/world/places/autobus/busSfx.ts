import { playTones as tones } from '../../scene/tones'

export const busSfx = {
  /** A friendly two-tone "mec-mec". */
  horn: () =>
    tones([
      { freq: 392, duration: 0.16, type: 'square', volume: 0.06 },
      { freq: 330, at: 0.2, duration: 0.24, type: 'square', volume: 0.06 },
    ]),
  /** Engine starting: a low growl that rises. */
  engine: () => tones([{ freq: 60, to: 120, duration: 0.6, type: 'sawtooth', volume: 0.05 }]),
  /** Brakes and the doors: a soft hiss down. */
  brake: () => tones([{ freq: 900, to: 300, duration: 0.35, type: 'triangle', volume: 0.04 }]),
  /** Indicator click. */
  tick: () =>
    tones([
      { freq: 1800, duration: 0.03, type: 'square', volume: 0.03 },
      { freq: 1400, at: 0.25, duration: 0.03, type: 'square', volume: 0.03 },
    ]),
  /** Wipers swish. */
  swish: () =>
    tones([
      { freq: 500, to: 900, duration: 0.18, volume: 0.04 },
      { freq: 900, to: 500, at: 0.2, duration: 0.18, volume: 0.04 },
    ]),
  /** One stop along the line (driving a jump). */
  hop: () => tones([{ freq: 520, to: 700, duration: 0.1, type: 'triangle', volume: 0.06 }]),
  /** Ten stops at once: a longer zoom. */
  zoom: () => tones([{ freq: 300, to: 1100, duration: 0.3, type: 'triangle', volume: 0.06 }]),
}
