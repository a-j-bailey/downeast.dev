import { impulse, crackle, noise, tapeCurve, clipCurve, hold } from "./dsp.js";

export const MIX = {
  MUSIC_DRIVE: 0.95,
  MUSIC_MAKEUP: 1.4,
  REVERB_RETURN: 0.28,
  CRACKLE: 0.045,
  HISS: 0.0055,
  ECHO_RETURN: 0.48,
};

export function createMixer(ac, { lite = false, musicVolume = 0.8, ambienceVolume = 0.6, dest = ac.destination } = {}) {
  const all = [];
  const add = (n) => (all.push(n), n);
  const G = (v = 1) => {
    const g = add(ac.createGain());
    g.gain.value = v;
    return g;
  };
  const BQ = (type, f, Q) => {
    const b = add(ac.createBiquadFilter());
    b.type = type;
    b.frequency.value = f;
    if (Q != null) b.Q.value = Q;
    return b;
  };

  const master = G(1);
  const limiter = add(ac.createDynamicsCompressor());
  limiter.threshold.value = -3;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.25;
  const clip = add(ac.createWaveShaper());
  clip.curve = clipCurve();
  clip.oversample = "none";
  master.connect(limiter);
  limiter.connect(clip);
  clip.connect(dest);

  const musicFader = G(musicVolume * musicVolume);
  const ambFader = G(ambienceVolume * ambienceVolume);
  musicFader.connect(master);
  ambFader.connect(master);

  const musicIn = G(1);
  const revIn = G(1);
  const revRet = G(MIX.REVERB_RETURN);
  const conv = add(ac.createConvolver());
  conv.normalize = true;
  conv.buffer = impulse(ac, { sec: lite ? 1.6 : 2.3, rt60: 1.9 });
  revIn.connect(conv);
  conv.connect(revRet);
  revRet.connect(musicIn);

  const tone = BQ("lowpass", 7800, 0.7);
  const drive = G(MIX.MUSIC_DRIVE);
  const sat = add(ac.createWaveShaper());
  sat.curve = tapeCurve(2.1, 0.07);
  sat.oversample = lite ? "none" : "2x";
  const makeup = G(MIX.MUSIC_MAKEUP);
  const hp = BQ("highpass", 28, 0.707);
  const tapeDelay = add(ac.createDelay(0.05));
  tapeDelay.delayTime.value = 0.014;
  musicIn.connect(tone);
  tone.connect(drive);
  drive.connect(sat);
  sat.connect(makeup);
  makeup.connect(hp);
  hp.connect(tapeDelay);
  tapeDelay.connect(musicFader);

  const wow = add(ac.createOscillator());
  const wowDepth = G(0.00095);
  const flutter = add(ac.createOscillator());
  const flutterDepth = G(1.8e-5);
  wow.frequency.value = 0.52;
  flutter.frequency.value = 6.9;
  wow.connect(wowDepth);
  wowDepth.connect(tapeDelay.delayTime);
  flutter.connect(flutterDepth);
  flutterDepth.connect(tapeDelay.delayTime);
  wow.start();
  flutter.start();

  const vinyl = G(1);
  const crackleGain = G(MIX.CRACKLE);
  const hissGain = G(MIX.HISS);
  const crk = add(ac.createBufferSource());
  crk.buffer = crackle(ac);
  crk.loop = true;
  const hiss = add(ac.createBufferSource());
  hiss.buffer = noise(ac, "pink");
  hiss.loop = true;
  const hissHP = BQ("highpass", 2100, 0.707);
  crk.connect(crackleGain);
  crackleGain.connect(vinyl);
  hiss.connect(hissHP);
  hissHP.connect(hissGain);
  hissGain.connect(vinyl);
  vinyl.connect(musicFader);
  crk.start();
  hiss.start();

  const ambIn = G(1);
  const echoIn = G(1);
  const echoOut = G(MIX.ECHO_RETURN);
  const fb = G(0.32);
  const echoLP = BQ("lowpass", 1700, 0.5);
  const dA = add(ac.createDelay(1));
  const dB = add(ac.createDelay(1));
  dA.delayTime.value = 0.21;
  dB.delayTime.value = 0.39;
  echoIn.connect(echoLP);
  echoLP.connect(dA);
  echoLP.connect(dB);
  dA.connect(echoOut);
  dB.connect(echoOut);
  dB.connect(fb);
  fb.connect(echoLP);
  echoOut.connect(ambIn);
  ambIn.connect(ambFader);

  const setMusicVolume = (v) => {
    const t = ac.currentTime;
    hold(musicFader.gain, t);
    musicFader.gain.setTargetAtTime(v * v, t, 0.05);
  };
  const setAmbienceVolume = (v) => {
    const t = ac.currentTime;
    hold(ambFader.gain, t);
    ambFader.gain.setTargetAtTime(v * v, t, 0.05);
  };

  return {
    musicIn,
    revIn,
    echoIn,
    ambIn,
    tone,
    vinyl,
    crackleGain,
    musicFader,
    ambFader,
    master,
    wowDepth,
    setMusicVolume,
    setAmbienceVolume,
    dispose() {
      try {
        wow.stop();
        flutter.stop();
        crk.stop();
        hiss.stop();
      } catch {
        /* already stopped */
      }
      for (const n of all) {
        try {
          n.disconnect();
        } catch {
          /* gone */
        }
      }
    },
  };
}
