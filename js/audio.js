/**
 * Bridge the Gap Arena — Live Audio Engine & Soundpack Synthesizer
 * Uses native Web Audio API (zero external assets required)
 */
window.Arena = window.Arena || {};

window.Arena.Audio = (function () {
  let ctx = null;
  let on = true;
  let vol = 0.75;
  let soundpack = 'cyber'; // 'cyber' | 'arcade' | 'stadium' | 'chime'

  const soundpacks = {
    cyber: { name: 'Cyber Synth', desc: 'Futuristic arena lasers and harmonics' },
    arcade: { name: '8-Bit Retro', desc: 'Classic arcade square-wave chiptunes' },
    stadium: { name: 'Stadium Energy', desc: 'Bold fanfare brass and arena horns' },
    chime: { name: 'Clean Chimes', desc: 'Gentle pure-tone bells and acoustic cues' }
  };

  function init() {
    if (!ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        ctx = new AudioContextClass();
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  function playTone(freq, type = 'sine', dur = 0.15, volMul = 1, freqEnd = null) {
    if (!on) return;
    init();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (freqEnd !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + dur);
      }

      gain.gain.setValueAtTime(0.2 * vol * volMul, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + dur);
    } catch (e) {
      console.warn('Audio tone error', e);
    }
  }

  // --- Soundpack Implementations ---
  function pass() {
    if (!on) return;
    init();

    if (soundpack === 'arcade') {
      // 8-bit fast arpeggio
      const notes = [440, 554, 659, 880];
      notes.forEach((f, i) => setTimeout(() => playTone(f, 'square', 0.08, 0.8), i * 45));
    } else if (soundpack === 'stadium') {
      // Brass dual-tone punch
      playTone(523.25, 'sawtooth', 0.18, 0.9);
      setTimeout(() => {
        playTone(659.25, 'sawtooth', 0.25, 1.1);
        playTone(783.99, 'triangle', 0.25, 0.8);
      }, 90);
    } else if (soundpack === 'chime') {
      // Soft crystalline chime
      playTone(659.25, 'sine', 0.35, 0.7);
      setTimeout(() => playTone(1046.50, 'sine', 0.5, 0.9), 60);
    } else {
      // Default: Cyber
      [523, 659, 784, 1046].forEach((f, i) =>
        setTimeout(() => playTone(f, i === 3 ? 'triangle' : 'sine', 0.2, 1), i * 80)
      );
    }
  }

  function fail() {
    if (!on) return;
    init();

    if (soundpack === 'arcade') {
      // 8-bit noise sweep down
      playTone(220, 'square', 0.25, 1.2, 55);
      setTimeout(() => playTone(110, 'sawtooth', 0.3, 1.2, 40), 100);
    } else if (soundpack === 'stadium') {
      // Deep arena buzzer
      playTone(130, 'sawtooth', 0.45, 1.4);
      playTone(98, 'sawtooth', 0.45, 1.2);
    } else if (soundpack === 'chime') {
      // Subtle low chime
      playTone(220, 'sine', 0.3, 0.8, 160);
    } else {
      // Cyber: double distortion snap
      playTone(150, 'sawtooth', 0.4, 1.5);
      setTimeout(() => playTone(130, 'square', 0.4, 1.5), 10);
    }
  }

  function adv() {
    if (!on) return;
    init();

    if (soundpack === 'arcade') {
      // Quick power-up blip
      playTone(261, 'square', 0.08, 0.8);
      setTimeout(() => playTone(523, 'square', 0.15, 0.9, 1046), 70);
    } else if (soundpack === 'stadium') {
      // Charge-up horn
      playTone(330, 'sawtooth', 0.25, 1.1, 660);
    } else if (soundpack === 'chime') {
      playTone(440, 'sine', 0.25, 0.8, 880);
    } else {
      // Cyber sweep riser
      if (!ctx) return;
      try {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const t = ctx.currentTime;
        o.frequency.setValueAtTime(220, t);
        o.frequency.exponentialRampToValueAtTime(880, t + 0.3);
        g.gain.setValueAtTime(0.15 * vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(t + 0.36);
      } catch (e) {}
    }
  }

  function alert() {
    if (!on) return;
    init();
    // Sudden death warning siren
    playTone(146, 'sawtooth', 0.8, 2);
    playTone(220, 'sawtooth', 0.8, 2);
    playTone(73, 'sine', 0.8, 2);
  }

  function fanfare() {
    if (!on) return;
    init();
    // High victory fanfare for record break
    const melody = [
      { f: 349.23, d: 0.12, w: 0 },
      { f: 440.00, d: 0.12, w: 100 },
      { f: 523.25, d: 0.14, w: 200 },
      { f: 698.46, d: 0.45, w: 320 }
    ];
    melody.forEach(m => {
      setTimeout(() => playTone(m.f, soundpack === 'arcade' ? 'square' : 'triangle', m.d, 1.5), m.w);
    });
  }

  function crown() {
    if (!on) return;
    init();
    // Grand royal coronation anthem
    const notes = [
      { f: 261.63, d: 0.2 },
      { f: 329.63, d: 0.2 },
      { f: 392.00, d: 0.2 },
      { f: 523.25, d: 0.2 },
      { f: 659.25, d: 0.3 },
      { f: 783.99, d: 0.7 }
    ];
    notes.forEach((n, i) => {
      setTimeout(() => playTone(n.f, soundpack === 'arcade' ? 'square' : 'triangle', n.d, 1.6), i * 140);
    });
  }

  // Auto-init on first user gesture
  ['click', 'keydown', 'touchstart'].forEach(e =>
    window.addEventListener(e, () => init(), { once: true })
  );

  return {
    init,
    playTone,
    pass,
    fail,
    adv,
    alert,
    fanfare,
    crown,
    get on() { return on; },
    set on(val) { on = !!val; },
    get vol() { return vol; },
    set vol(val) { vol = Math.max(0, Math.min(1, val)); },
    get soundpack() { return soundpack; },
    set soundpack(val) { if (soundpacks[val]) soundpack = val; },
    get soundpacks() { return soundpacks; }
  };
})();
