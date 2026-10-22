import { mtof, hold, createRegistry } from "./dsp.js";

function voicePool(ac, n, make) {
  const pool = [];
  for (let i = 0; i < n; i++) pool.push(make());
  let i = 0;
  return {
    next() {
      const v = pool[i % pool.length];
      i++;
      return v;
    },
    all: pool,
    dispose() {
      for (const v of pool) v.dispose();
    },
  };
}

export function createEP(ac, out, send, { cap = 14 } = {}) {
  const pool = voicePool(ac, cap, () => {
    const car = ac.createOscillator();
    const body = ac.createOscillator();
    const tine = ac.createOscillator();
    const gCar = ac.createGain();
    const gBody = ac.createGain();
    const gTine = ac.createGain();
    const amp = ac.createGain();
    const lp = ac.createBiquadFilter();
    car.type = "sine";
    body.type = "sine";
    tine.type = "sine";
    amp.gain.value = 0;
    gBody.gain.value = 0;
    gTine.gain.value = 0;
    lp.type = "lowpass";
    lp.frequency.value = 3200;
    body.connect(gBody);
    gBody.connect(car.frequency);
    tine.connect(gTine);
    gTine.connect(car.frequency);
    car.connect(gCar);
    gCar.connect(lp);
    lp.connect(amp);
    amp.connect(out);
    if (send) amp.connect(send);
    car.start();
    body.start();
    tine.start();
    return {
      car, body, tine, gCar, gBody, gTine, amp, lp,
      dispose() {
        try {
          car.stop();
          body.stop();
          tine.stop();
        } catch {
          /* stopped */
        }
      },
    };
  });
  const trem = ac.createOscillator();
  const tremG = ac.createGain();
  trem.frequency.value = 4.2;
  tremG.gain.value = 0.08;
  trem.connect(tremG);
  trem.start();

  return {
    play(t, notes, vel, dur, strum = 0.015, rel = 0.08) {
      notes.forEach((midi, i) => {
        const v = pool.next();
        const f = mtof(midi);
        const at = t + i * strum;
        v.car.frequency.setValueAtTime(f, at);
        v.body.frequency.setValueAtTime(f, at);
        v.tine.frequency.setValueAtTime(f * 13.7, at);
        const I = (0.7 + 2 * vel) * clampFreq(f);
        hold(v.gBody.gain, at);
        v.gBody.gain.setValueAtTime(I, at);
        v.gBody.gain.setTargetAtTime(I * 0.22, at, 0.28);
        hold(v.gTine.gain, at);
        v.gTine.gain.setValueAtTime(0.32 * vel, at);
        v.gTine.gain.setTargetAtTime(0, at, 0.03);
        const peak = 0.14 * Math.pow(vel, 1.35) * (i === notes.length - 1 ? 1.1 : 1);
        hold(v.amp.gain, at);
        v.amp.gain.setValueAtTime(0, at);
        v.amp.gain.linearRampToValueAtTime(peak, at + 0.004);
        v.amp.gain.setTargetAtTime(peak * 0.55, at + 0.05, 0.09);
        v.amp.gain.setTargetAtTime(0, at + Math.min(dur, 0.28), 1.2 * Math.pow(262 / f, 0.28));
        v.amp.gain.setTargetAtTime(0, at + dur, rel);
      });
    },
    dispose() {
      try {
        trem.stop();
      } catch {
        /* stopped */
      }
      pool.dispose();
    },
  };
}

function clampFreq(f) {
  return Math.min(1.2, Math.max(0.5, Math.sqrt(440 / f)));
}

export function createBass(ac, out) {
  const sine = ac.createOscillator();
  const tri = ac.createOscillator();
  const gS = ac.createGain();
  const gT = ac.createGain();
  const lp = ac.createBiquadFilter();
  const amp = ac.createGain();
  sine.type = "sine";
  tri.type = "triangle";
  gT.gain.value = 0.32;
  amp.gain.value = 0;
  lp.type = "lowpass";
  lp.frequency.value = 700;
  lp.Q.value = 0.8;
  sine.connect(gS);
  tri.connect(gT);
  gS.connect(lp);
  gT.connect(lp);
  lp.connect(amp);
  amp.connect(out);
  sine.start();
  tri.start();
  return {
    play(t, midi, vel, dur) {
      const f = mtof(midi);
      sine.frequency.setValueAtTime(f, t);
      tri.frequency.setValueAtTime(f, t);
      hold(lp.frequency, t);
      lp.frequency.setValueAtTime(1400, t);
      lp.frequency.setTargetAtTime(480, t, 0.11);
      hold(amp.gain, t);
      amp.gain.setTargetAtTime(0.42 * vel, t, 0.004);
      amp.gain.setTargetAtTime(0.42 * vel * 0.6, t + 0.05, 0.32);
      amp.gain.setTargetAtTime(0, t + dur, 0.04);
    },
    dispose() {
      try {
        sine.stop();
        tri.stop();
      } catch {
        /* stopped */
      }
    },
  };
}

export function createKit(ac, out, send) {
  const noiseBuf = ac.createBufferSource();
  const nGain = ac.createGain();
  nGain.gain.value = 0;
  const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  noiseBuf.buffer = buf;
  noiseBuf.loop = true;
  noiseBuf.connect(nGain);
  noiseBuf.start();

  const kickO = ac.createOscillator();
  const kickG = ac.createGain();
  kickO.type = "sine";
  kickG.gain.value = 0;
  kickO.connect(kickG);
  kickG.connect(out);
  kickO.start();

  const snTone = ac.createOscillator();
  const snTG = ac.createGain();
  snTone.type = "triangle";
  snTG.gain.value = 0;
  snTone.connect(snTG);
  snTG.connect(out);
  snTone.start();

  const snHP = ac.createBiquadFilter();
  const snBP = ac.createBiquadFilter();
  const snNG = ac.createGain();
  snHP.type = "highpass";
  snHP.frequency.value = 900;
  snBP.type = "bandpass";
  snBP.frequency.value = 2400;
  snBP.Q.value = 0.6;
  snNG.gain.value = 0;
  nGain.connect(snHP);
  snHP.connect(snBP);
  snBP.connect(snNG);
  snNG.connect(out);
  if (send) snNG.connect(send);

  const hatHP = ac.createBiquadFilter();
  const hatG = ac.createGain();
  hatHP.type = "highpass";
  hatHP.frequency.value = 7200;
  hatG.gain.value = 0;
  nGain.connect(hatHP);
  hatHP.connect(hatG);
  hatG.connect(out);

  const rimA = ac.createOscillator();
  const rimB = ac.createOscillator();
  const rimG = ac.createGain();
  rimA.type = "sine";
  rimB.type = "triangle";
  rimG.gain.value = 0;
  const rimMix = ac.createGain();
  rimMix.gain.value = 0.4;
  rimA.connect(rimG);
  rimB.connect(rimMix);
  rimMix.connect(rimG);
  rimG.connect(out);
  if (send) rimG.connect(send);
  rimA.frequency.value = 470;
  rimB.frequency.value = 1650;
  rimA.start();
  rimB.start();

  nGain.gain.value = 1;

  return {
    kick(t, vel) {
      kickO.frequency.setValueAtTime(160, t);
      kickO.frequency.setTargetAtTime(50, t, 0.03);
      hold(kickG.gain, t);
      kickG.gain.setTargetAtTime(0.5 * vel, t, 0.0012);
      kickG.gain.setTargetAtTime(0, t + 0.02, 0.13);
    },
    snare(t, vel, ghost) {
      snTone.frequency.setValueAtTime(210, t);
      snTone.frequency.setTargetAtTime(180, t, 0.03);
      hold(snTG.gain, t);
      snTG.gain.setTargetAtTime(0.2 * vel, t, 0.002);
      snTG.gain.setTargetAtTime(0, t + 0.01, ghost ? 0.03 : 0.045);
      hold(snNG.gain, t);
      snNG.gain.setTargetAtTime((ghost ? 0.18 : 0.38) * vel, t, 0.002);
      snNG.gain.setTargetAtTime(0, t + 0.01, ghost ? 0.03 : 0.06);
    },
    hat(t, vel, open) {
      hold(hatG.gain, t);
      hatG.gain.setTargetAtTime(0.12 * vel, t, 0.001);
      hatG.gain.setTargetAtTime(0, t + 0.005, open ? 0.12 : 0.016);
    },
    rim(t, vel) {
      hold(rimG.gain, t);
      rimG.gain.setTargetAtTime(0.22 * vel, t, 0.001);
      rimG.gain.setTargetAtTime(0, t + 0.004, 0.008);
    },
    dispose() {
      try {
        noiseBuf.stop();
        kickO.stop();
        snTone.stop();
        rimA.stop();
        rimB.stop();
      } catch {
        /* stopped */
      }
    },
  };
}

export function createLead(ac, out, send) {
  const o1 = ac.createOscillator();
  const o2 = ac.createOscillator();
  const g2 = ac.createGain();
  const lp = ac.createBiquadFilter();
  const amp = ac.createGain();
  o1.type = "sine";
  o2.type = "triangle";
  g2.gain.value = 0.14;
  amp.gain.value = 0;
  lp.type = "lowpass";
  lp.frequency.value = 2400;
  o1.connect(lp);
  o2.connect(g2);
  g2.connect(lp);
  lp.connect(amp);
  amp.connect(out);
  if (send) amp.connect(send);
  o1.start();
  o2.start();
  return {
    play(t, midi, vel, dur) {
      const f = mtof(midi);
      o1.frequency.setTargetAtTime(f, t, 0.04);
      o2.frequency.setTargetAtTime(f * 2, t, 0.04);
      hold(amp.gain, t);
      amp.gain.setTargetAtTime(0.12 * vel, t, 0.02);
      amp.gain.setTargetAtTime(0, t + dur, 0.22);
    },
    dispose() {
      try {
        o1.stop();
        o2.stop();
      } catch {
        /* stopped */
      }
    },
  };
}

export function fadeOut(node, t, tau = 0.1) {
  hold(node.gain, t);
  node.gain.setTargetAtTime(0, t, tau);
}
