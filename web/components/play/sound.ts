// Tiny synthesized sound effects. No audio files; the context is created on first use (a user gesture).

type Sfx = "coin" | "roll" | "win" | "lose" | "roar";

let ctx: AudioContext | null = null;

const NOTES: Record<Sfx, [freq: number, dur: number, type: OscillatorType][]> = {
  coin: [
    [988, 0.06, "square"],
    [1319, 0.12, "square"],
  ],
  roll: [
    [220, 0.04, "triangle"],
    [260, 0.04, "triangle"],
    [200, 0.04, "triangle"],
  ],
  win: [
    [523, 0.08, "square"],
    [659, 0.08, "square"],
    [784, 0.16, "square"],
  ],
  lose: [
    [330, 0.12, "sawtooth"],
    [247, 0.22, "sawtooth"],
  ],
  roar: [[90, 0.45, "sawtooth"]],
};

export function play(sfx: Sfx) {
  try {
    ctx ??= new AudioContext();
    let t = ctx.currentTime;
    for (const [freq, dur, type] of NOTES[sfx]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur);
      t += dur;
    }
  } catch {
    // Audio unavailable: the game works silently.
  }
}
