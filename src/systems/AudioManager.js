// Recorded creator-made sounds are loaded as ordinary audio files; no procedural
// WebAudio voices or synthesized scream effects are used.
const OGA = 'https://opengameart.org/sites/default/files/';
const SOURCES = {
  step1: { remote: OGA + '01-footstep.ogg', local: 'assets/audio/01-footstep.ogg' },
  step2: { remote: OGA + '02-footstep.ogg', local: 'assets/audio/02-footstep.ogg' },
  step3: { remote: OGA + '03-footstep.ogg', local: 'assets/audio/03-footstep.ogg' },
  step4: { remote: OGA + '04-footstep.ogg', local: 'assets/audio/04-footstep.ogg' },
  step5: { remote: OGA + '05-footstep.ogg', local: 'assets/audio/05-footstep.ogg' },
  step6: { remote: OGA + '06-footstep.ogg', local: 'assets/audio/06-footstep.ogg' },
  door: { remote: OGA + 'door_open.wav', local: 'assets/audio/door_open.wav' },
  scream: { remote: OGA + 'screams_0.ogg', local: 'assets/audio/screams_0.ogg' },
  ambience: { remote: OGA + 'ambient_horror.ogg', local: 'assets/audio/ambient_horror.ogg' },
  // The human crying recording is downloaded separately; see AUDIO_SOURCES.md.
  crying: { local: 'assets/audio/crying.wav' }
};

class AudioManager {
  constructor() {
    this.vol = 0.90;
    this.mute = false;
    this.ready = false;
    this.pool = new Map();
    this.missing = new Set();
  }

  init() {
    this.ready = true;
    this.loop('ambience', 0.12);
  }

  setVolume(value) {
    this.vol = Math.max(0, Math.min(1, value));
    for (const list of this.pool.values()) {
      for (const audio of list) audio.volume = this.mute ? 0 : this.vol * (audio.dataset.gain ? Number(audio.dataset.gain) : 1);
    }
  }

  setMute(value) {
    this.mute = Boolean(value);
    this.setVolume(this.vol);
  }

  getAudio(key, gain = 1) {
    const source = SOURCES[key];
    if (!source) return null;
    const url = source.remote || source.local;
    const list = this.pool.get(key) || [];
    let audio = list.find((item) => item.paused || item.ended);
    if (!audio) {
      audio = new Audio(url);
      audio.preload = 'auto';
      audio.dataset.gain = String(gain);
      audio.dataset.fallback = source.remote && source.local ? source.local : '';
      list.push(audio);
      this.pool.set(key, list);
      audio.addEventListener('error', () => {
        if (audio.dataset.fallback && !audio.dataset.fallbackTried) {
          audio.dataset.fallbackTried = 'yes';
          audio.src = audio.dataset.fallback;
          audio.load();
          return;
        }
        if (!this.missing.has(key)) {
          this.missing.add(key);
          console.warn(`[WARD 9] Audio source unavailable: ${key}. See AUDIO_SOURCES.md.`);
        }
      });
    }
    audio.dataset.gain = String(gain);
    audio.volume = this.mute ? 0 : Math.min(1, this.vol * gain);
    return audio;
  }

  play(key, gain = 1, rate = 1) {
    if (!this.ready) return;
    const audio = this.getAudio(key, gain);
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.playbackRate = rate;
      audio.play().catch(() => {});
    } catch (_) { /* Browser may block audio until a user gesture. */ }
  }

  loop(key, gain = 1) {
    if (!this.ready) return;
    const active = (this.pool.get(key) || []).find((item) => !item.paused && !item.ended);
    if (active) return;
    const audio = this.getAudio(key, gain);
    if (!audio) return;
    audio.loop = true;
    audio.volume = this.mute ? 0 : Math.min(1, this.vol * gain);
    audio.play().catch(() => {});
  }

  stop(key) {
    for (const audio of this.pool.get(key) || []) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  step(stage = 0) {
    const variant = 1 + Math.floor(Math.random() * 6);
    this.play(`step${variant}`, 0.55 + Math.min(stage, 3) * 0.08, 0.92 + Math.random() * 0.16);
  }
  creak() { this.play('door', 0.72, 0.82 + Math.random() * 0.22); }
  knock() { this.play('door', 0.7, 1.12); }
  cry() { this.play('crying', 0.68, 0.94 + Math.random() * 0.12); }
  scare() { this.stop('ambience'); this.play('scream', 1, 0.96); }
  noise() { /* Camera switching stays quiet; avoid fake digital noise. */ }
  ring() { this.play('door', 0.28, 1.25); }
  good() { /* no synthetic confirmation chirps */ }
  bad() { this.creak(); }
  cue(id) {
    if (id === 'door') this.creak();
    else if (id === 'crier') this.cry();
    else if (id === 'flicker') { /* the pulsing fixture is the cue */ }
    else if (id === 'figure' || id === 'refl' || id === 'twin') this.step(2);
  }
}

export default new AudioManager();
