
import Phaser from 'phaser';
import audio from '../systems/AudioManager.js';

const W = 960, H = 540;
const FONT = '"Lucida Console","Courier New",monospace';

export default class Over extends Phaser.Scene {
  constructor() { super('Over'); }

  // Same shadowed text helper as the other scenes.
  txt(x, y, s, size, color, bold = false, spacing = 0) {
    return this.add.text(x, y, s, { fontFamily: FONT, fontSize: size + 'px', color, fontStyle: bold ? 'bold' : 'normal', letterSpacing: spacing })
      .setShadow(2, 2, '#000000', 4, false, true);
  }

  // Vignette / scanline / left-shade overlays. Same textures MenuScene makes; created here too in case this scene runs first.
  ensureTextures() {
    if (this.textures.exists('menu-vig')) return;
    const mk = (key, fn) => { const c = this.textures.createCanvas(key, W, H); fn(c.getContext()); c.refresh(); };
    mk('menu-vig', (x) => { const g = x.createRadialGradient(480, 270, 220, 480, 270, 650); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.9)'); x.fillStyle = g; x.fillRect(0, 0, W, H); });
    mk('menu-shade', (x) => { const g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(0,0,0,0.92)'); g.addColorStop(0.45, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0.1)'); x.fillStyle = g; x.fillRect(0, 0, W, H); });
    mk('menu-scan', (x) => { x.fillStyle = 'rgba(0,0,0,0.18)'; for (let i = 0; i < H; i += 3) x.fillRect(0, i, W, 1); });
  }

  // Typewriter effect: reveal `full` in obj at `cps` characters per second, then call done().
  type(obj, full, cps, done) {
    if (!full) { if (done) done(); return; }                       // nothing to type (also avoids an endless timer)
    let i = 0;
    this.time.addEvent({ delay: 1000 / cps, repeat: full.length - 1, callback: () => {
      i += 1; obj.setText(full.slice(0, i)); if (i >= full.length && done) done();
    } });
  }

  // Fade to black, then change scene.
  go(key) {
    if (this.leaving) return; this.leaving = true;
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key));
  }

  // Vertical text menu (same look as the title screen). Hidden until showMenu() is called.
  // list = [[label, callback], ...]
  makeMenu(x, y, list) {
    this.menuOn = false; this.msel = 0;
    this.mItems = list.map(([label, fn], i) => {
      const yy = y + i * 44;
      const marker = this.add.rectangle(x - 20, yy + 2, 3, 24, 0xc0392b).setOrigin(0).setDepth(10).setAlpha(0);
      const text = this.txt(x, yy, label, 22, '#7f918a', true, 2).setDepth(10).setAlpha(0);
      const zone = this.add.zone(x - 24, yy - 8, 280, 40).setOrigin(0).setInteractive({ useHandCursor: true }).setDepth(10);
      zone.input.enabled = false;                                  // disabled until the menu is revealed
      zone.on('pointerover', () => this.pickItem(i)); zone.on('pointerdown', () => { if (this.menuOn) fn(); });
      return { marker, text, zone, fn, x };
    });
    const k = this.input.keyboard;
    k.on('keydown-UP', () => this.menuOn && this.pickItem(this.msel - 1)); k.on('keydown-DOWN', () => this.menuOn && this.pickItem(this.msel + 1));
    k.on('keydown-ENTER', () => this.menuOn && this.mItems[this.msel].fn());
  }
  pickItem(i) {
    if (!this.menuOn) return;
    this.msel = (i + this.mItems.length) % this.mItems.length;
    this.mItems.forEach((it, n) => {
      const on = n === this.msel;
      it.text.setColor(on ? '#f2f6f3' : '#7f918a'); it.marker.setAlpha(on ? 1 : 0);
      this.tweens.add({ targets: it.text, x: it.x + (on ? 12 : 0), duration: 110 });
    });
  }
  showMenu() {                                                     // fade the menu in and make it clickable
    this.menuOn = true;
    this.mItems.forEach((it) => { it.zone.input.enabled = true; this.tweens.add({ targets: it.text, alpha: 1, duration: 600 }); });
    this.pickItem(0);
  }

  // Draw the shared overlay stack (vignette, scanlines, grain layer).
  overlays(withShade) {
    if (withShade) this.add.image(0, 0, 'menu-shade').setOrigin(0).setDepth(3);
    this.add.image(0, 0, 'menu-vig').setOrigin(0).setDepth(4);
    this.add.image(0, 0, 'menu-scan').setOrigin(0).setDepth(5);
    this.grain = this.add.graphics().setDepth(6);
  }

  create(data) {
    this.leaving = false; this.ensureTextures();
    if (data.win) this.winScreen(); else this.deathScreen(data);
  }

  // ===================================================================================
  // WIN: slow dawn, lines appear one at a time, the last one is the reveal.
  // ===================================================================================
  winScreen() {
    this.cameras.main.fadeIn(2500, 0, 0, 0);                       // slow fade up, like light coming in
    const bg = this.add.image(470, 270, 'cam2').setDisplaySize(1040, 585).setTint(0xa9bdb8).setDepth(0);
    this.tweens.add({ targets: bg, x: 495, duration: 20000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.3).setOrigin(0).setDepth(2);
    this.overlays(true);

    this.add.rectangle(70, 70, 52, 3, 0x7fc4a8).setOrigin(0).setDepth(10);
    this.txt(70, 84, '06:00', 88, '#eef3ef', true, 2).setDepth(10);
    this.txt(300, 142, 'AM', 22, '#9fb6ad', true).setDepth(10);
    this.txt(74, 196, 'SHIFT COMPLETE', 14, '#7fc4a8', true, 3).setDepth(10);

    // The ending, one line at a time. The last line is red and makes the lights stutter.
    const lines = [
      ['The replacement arrives early.', '#cfdcd6'],
      ['His badge reads your name.', '#cfdcd6'],
      ['He has your face.', '#e9eee9'],
      ['The incident log lists no events.', '#c9553f']
    ];
    lines.forEach(([s, color], i) => {
      const t = this.txt(74, 248 + i * 36, s, 19, color, i === 3).setDepth(10).setAlpha(0);
      this.time.delayedCall(2800 + i * 1600, () => {
        this.tweens.add({ targets: t, alpha: 1, duration: 900 });
        if (i === 3) [0.8, 0.3, 0.7, 0.3].forEach((a, n) => this.time.delayedCall(n * 70, () => dim.setAlpha(a)));   // light stutter
      });
    });
    this.makeMenu(74, 432, [['NEW SHIFT', () => this.go('Office')], ['MAIN MENU', () => this.go('Menu')]]);
    this.time.delayedCall(2800 + lines.length * 1600 + 600, () => this.showMenu());
  }

  // ===================================================================================
  // DEATH: jumpscare -> one beat of black silence -> typed incident report that is then covered up.
  // ===================================================================================
  deathScreen(data) {
    this.add.rectangle(0, 0, W, H, 0x050707).setOrigin(0).setDepth(0);
    const key = this.textures.exists('jumpscare') ? 'jumpscare' : 'creature';
    // Stretched to fill the whole 960x540 screen (the aspect ratio is NOT kept, on purpose),
    // then it grows a little past the edges over 1.5s so it feels like it lunges at the camera.
    const scare = this.add.image(480, 270, key).setDepth(20).setDisplaySize(W, H);
    this.tweens.add({ targets: scare, displayWidth: W * 1.2, displayHeight: H * 1.2, duration: 1500, ease: 'Cubic.easeIn' });

    audio.scare();                                                  // your existing scare sound...
    this.jumpscareSound();                                          // ...layered with the extra jumpscare sound below
    this.cameras.main.shake(1300, 0.03);
    this.cameras.main.flash(160, 255, 235, 235);

    // Glitch: every 50ms either jitter + colour flash, or sit still; sometimes drop to black for one frame.
    const glitch = this.time.addEvent({ delay: 50, loop: true, callback: () => {
      if (!scare.active) return;
      if (Math.random() > 0.4) { scare.setX(480 + (Math.random() * 30 - 15)); scare.setTint(Math.random() > 0.5 ? 0xff3333 : 0x33ffff); }
      else { scare.setX(480); scare.clearTint(); }
      scare.setAlpha(Math.random() > 0.9 ? 0 : 1);
    } });

    
    this.time.delayedCall(1700, () => {
      glitch.destroy(); scare.destroy(); this.cameras.main.resetFX();
      this.time.delayedCall(900, () => this.report(data));
    });
  }

  report(data) {
    this.overlays(false);
    this.cameras.main.fadeIn(600, 0, 0, 0);

 
    this.add.rectangle(60, 48, 52, 3, 0xc0392b).setOrigin(0).setDepth(10);
    this.txt(58, 60, 'CONTAINMENT', 34, '#d9554a', true, 3).setDepth(10);
    this.txt(58, 100, 'FAILURE', 34, '#d9554a', true, 3).setDepth(10);
    this.txt(60, 160, `TIME OF INCIDENT   ${data.time || '??:??'}`, 11, '#7f918a').setDepth(10);
    this.txt(60, 180, 'STATUS             UNRESOLVED', 11, '#7f918a').setDepth(10);
    this.makeMenu(60, 400, [['NEW SHIFT', () => this.go('Office')], ['MAIN MENU', () => this.go('Menu')]]);

    // The paper: slightly rotated, aged colour, dark typed text.
    const px = 360, py = 70, pw = 540, ph = 400;
    const paper = this.add.container(px, py).setDepth(10).setAngle(-1.2);
    const sheet = this.add.graphics();
    sheet.fillStyle(0x000000, 0.45).fillRect(6, 8, pw, ph);                
    sheet.fillStyle(0xb9b19b, 1).fillRect(0, 0, pw, ph);               
    sheet.fillStyle(0xa79f89, 1).fillRect(0, 0, pw, 3);            
    paper.add(sheet);

    const ink = { fontFamily: FONT, fontSize: '13px', color: '#1d1a15', lineSpacing: 5, wordWrap: { width: pw - 56 } };
    const head = this.add.text(28, 26, '', ink);
    const full1 = `SECURITY DIVISION  -  INCIDENT REPORT #09\nDATE: 03-14-1998        TIME: ${data.time || '??:??'}\nLOCATION: SECURITY OFFICE, WARD 09\n\nCAUSE:`;
    head.setText(full1); const hh = head.height; head.setText('');          
    const cause = this.add.text(28, 26 + hh + 6, '', ink);
    const causeFull = data.reason || 'Unknown breach.';
    cause.setText(causeFull); const ch = cause.height, cw = cause.width; cause.setText('');
    const amend = this.add.text(28, 26 + hh + ch + 40, '', ink);
    const amendFull = 'OFFICIAL RECORD (AMENDED):\nGuard resigned voluntarily. No incident occurred.\nWard 09 has been empty since 1994.';
    const bar = this.add.rectangle(24, 26 + hh + 6 - 3, cw + 10, ch + 6, 0x14110e).setOrigin(0).setScale(0, 1);   // black redaction bar, grows over the cause
    paper.add([head, cause, bar, amend]);

 
    const stampT = this.add.text(0, 0, 'AMENDED', { fontFamily: FONT, fontSize: '36px', color: '#a8231b', fontStyle: 'bold' }).setOrigin(0.5);
    const sg = this.add.graphics().lineStyle(4, 0xa8231b, 1).strokeRect(-stampT.width / 2 - 12, -stampT.height / 2 - 6, stampT.width + 24, stampT.height + 12);
    const stamp = this.add.container(px + pw - 150, py + ph - 70, [sg, stampT]).setDepth(12).setAngle(-14).setAlpha(0).setScale(2.4);
 
    this.type(head, full1, 60, () => {
      this.type(cause, causeFull, 55, () => {
        this.time.delayedCall(1100, () => {
          this.tweens.add({ targets: bar, scaleX: 1, duration: 450, onComplete: () => {
            this.time.delayedCall(500, () => this.type(amend, amendFull, 55, () => {
              this.time.delayedCall(700, () => {
                this.tweens.add({ targets: stamp, alpha: 0.92, scale: 1, duration: 160, ease: 'Quint.in', onComplete: () => {
                  audio.knock(); this.cameras.main.shake(180, 0.006);       // the stamp lands
                  this.time.delayedCall(900, () => this.showMenu());
                } });
              });
            }));
          } });
        });
      });
    });
  }

  
  jumpscareSound() {
    if (audio.mute) return;                                         // respect the mute setting
    const c = audio.ctx || (this.ownCtx = this.ownCtx || new (window.AudioContext || window.webkitAudioContext)());
    if (c.state === 'suspended') c.resume();
    const dest = audio.ctx && audio.master ? audio.master : c.destination;
    const out = c.createGain(); out.gain.value = dest === c.destination ? (audio.vol ?? 0.7) : 1;
    const lim = c.createDynamicsCompressor(); out.connect(lim); lim.connect(dest);
    const t = c.currentTime;
    const env = (g, peak, attack, end) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + end); };
 
    const im = c.createOscillator(), ig = c.createGain();
    im.type = 'sine'; im.frequency.setValueAtTime(140, t); im.frequency.exponentialRampToValueAtTime(28, t + 0.5);
    env(ig, 1, 0.01, 0.7); im.connect(ig); ig.connect(out); im.start(t); im.stop(t + 0.8);
 
    const shaper = c.createWaveShaper(), curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) curve[i] = Math.tanh((i / 128 - 1) * 6);
    shaper.curve = curve;
    const sg = c.createGain(), bp = c.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 0.8;
    env(sg, 0.8, 0.03, 2.0); shaper.connect(bp); bp.connect(sg); sg.connect(out);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 8; lg.gain.value = 90; lfo.connect(lg); lfo.start(t); lfo.stop(t + 2.1);
    [700, 707, 691].forEach((f) => {
      const o = c.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * 2.1, t + 0.45); o.frequency.linearRampToValueAtTime(950, t + 1.8);
      lg.connect(o.frequency); o.connect(shaper); o.start(t); o.stop(t + 2.1);
    });

 
    const hs = c.createOscillator(), hg = c.createGain(), hp = c.createBiquadFilter();
    hs.type = 'square'; hs.frequency.setValueAtTime(2400, t); hs.frequency.linearRampToValueAtTime(3600, t + 0.25);
    hp.type = 'highpass'; hp.frequency.value = 1800; env(hg, 0.25, 0.01, 0.4);
    hs.connect(hp); hp.connect(hg); hg.connect(out); hs.start(t); hs.stop(t + 0.5);

 
    const buf = c.createBuffer(1, c.sampleRate, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const ns = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain();
    ns.buffer = buf; ns.loop = true; nf.type = 'highpass'; nf.frequency.value = 1200; env(ng, 0.5, 0.01, 1.5);
    ns.connect(nf); nf.connect(ng); ng.connect(out); ns.start(t); ns.stop(t + 1.6);
  }

 
  update() {
    if (!this.grain) return;
    this.grain.clear();
    for (let i = 0; i < 70; i++) this.grain.fillStyle(0xdfe8e4, Math.random() * 0.14).fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2, 1);
  }
}
