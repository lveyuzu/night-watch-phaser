import Phaser from 'phaser';
import audio from '../systems/AudioManager.js';

const W = 960, H = 540;
const FONT = '"Lucida Console","Courier New",monospace';
const ITEMS = ['START SHIFT', 'SETTINGS', 'QUIT'];
const MENU_X = 80, MENU_Y = 300, MENU_STEP = 52;          // where the menu list starts and how far apart items are
const SL_X = 640, SL_W = 240, SL_Y = 262;                  // volume slider: left edge, width, y (screen pixels)

export default class Menu extends Phaser.Scene {
  constructor() { super('Menu'); }

  // Small helper so every piece of text uses the same font and soft shadow.
  txt(x, y, s, size, color, bold = false, spacing = 0) {
    return this.add.text(x, y, s, { fontFamily: FONT, fontSize: size + 'px', color, fontStyle: bold ? 'bold' : 'normal', letterSpacing: spacing })
      .setShadow(2, 2, '#000000', 4, false, true);
  }

  // Overlay textures drawn once with the canvas API (no image files needed).
  makeTextures() {
    if (this.textures.exists('menu-vig')) return;            // already made on an earlier visit to the menu
    const mk = (key, w, h, fn) => { const c = this.textures.createCanvas(key, w, h); fn(c.getContext()); c.refresh(); };
    // Vignette: clear centre, dark corners.
    mk('menu-vig', W, H, (x) => { const g = x.createRadialGradient(480, 270, 220, 480, 270, 650); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.9)'); x.fillStyle = g; x.fillRect(0, 0, W, H); });
    // Left-to-right shade: almost black behind the menu, fading out so the photo shows on the right.
    mk('menu-shade', W, H, (x) => { const g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(0,0,0,0.92)'); g.addColorStop(0.45, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0.1)'); x.fillStyle = g; x.fillRect(0, 0, W, H); });
    // Scanlines.
    mk('menu-scan', W, H, (x) => { x.fillStyle = 'rgba(0,0,0,0.18)'; for (let i = 0; i < H; i += 3) x.fillRect(0, i, W, 1); });
  }

  create() {
    this.sel = 0; this.settingsOpen = false; this.starting = false; this.drag = false;
    this.makeTextures();
    this.cameras.main.fadeIn(1400, 0, 0, 0);                  // fade in from black when the game opens

    // ---- background: the hall photo, slowly drifting so the screen never feels frozen ----
    this.bg = this.add.image(470, 270, 'cam2').setDisplaySize(1040, 585).setTint(0x7d8f89).setDepth(0);
    this.tweens.add({ targets: this.bg, x: 495, y: 262, duration: 16000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // ---- the creature: dark and barely there on the right edge, with an occasional glimpse ----
    this.creature = this.add.image(790, H + 10, 'creature').setOrigin(0.5, 1).setScale(0.92).setTint(0x4a5753).setAlpha(0.12).setDepth(1);
    this.tweens.add({ targets: this.creature, y: H + 24, duration: 5200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });   // slow breathing
    const peek = () => {
      this.time.delayedCall(9000 + Math.random() * 8000, () => {
        if (this.starting) return;
        this.tweens.add({ targets: this.creature, alpha: 0.5, duration: 90, yoyo: true, hold: 120, onComplete: () => { this.creature.setAlpha(0.12); peek(); } });
      });
    };
    peek();

    // ---- lighting: a dim layer that flickers like a failing lamp ----
    this.dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.4).setOrigin(0).setDepth(2);
    const flicker = () => {
      this.time.delayedCall(2500 + Math.random() * 5000, () => {
        const seq = [0.8, 0.4, 0.7, 0.4, 0.9, 0.4];            // alpha values played 60ms apart
        seq.forEach((a, i) => this.time.delayedCall(i * 60, () => this.dim.setAlpha(a)));
        this.time.delayedCall(seq.length * 60, flicker);
      });
    };
    flicker();

    this.add.image(0, 0, 'menu-shade').setOrigin(0).setDepth(3);
    this.add.image(0, 0, 'menu-vig').setOrigin(0).setDepth(4);
    this.add.image(0, 0, 'menu-scan').setOrigin(0).setDepth(5);
    this.grain = this.add.graphics().setDepth(6);             // film grain, redrawn every frame in update()

    // ---- title block (left side) ----
    this.add.rectangle(MENU_X, 92, 52, 3, 0xc0392b).setOrigin(0).setDepth(10);
    this.title = this.txt(MENU_X - 3, 104, 'NIGHT SHIFT', 68, '#e9eee9', true, 3).setDepth(10);
    // Two colour-offset copies of the title. They are invisible until the glitch effect below uses them.
    this.glR = this.txt(MENU_X - 3, 104, 'NIGHT SHIFT', 68, '#ff2a2a', true, 3).setDepth(9).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    this.glC = this.txt(MENU_X - 3, 104, 'NIGHT SHIFT', 68, '#22d8e8', true, 3).setDepth(9).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    this.txt(MENU_X, 188, 'W A R D   9', 22, '#c0453b', true).setDepth(10);
    this.txt(MENU_X, 226, 'Abandoned psychiatric hospital   ·   1998   ·   Midnight to six', 11, '#7f918a').setDepth(10);
    const glitch = () => {
      this.time.delayedCall(4000 + Math.random() * 5000, () => {
        for (let i = 0; i < 6; i++) this.time.delayedCall(i * 55, () => {            // 6 quick jitters, then reset
          const d = i === 5 ? 0 : 3 + Math.random() * 5;
          this.glR.setAlpha(d ? 0.55 : 0).setX(MENU_X - 3 + d); this.glC.setAlpha(d ? 0.55 : 0).setX(MENU_X - 3 - d);
          this.title.setX(MENU_X - 3 + (d ? (Math.random() - 0.5) * 4 : 0));
        });
        this.time.delayedCall(6 * 55, glitch);
      });
    };
    glitch();

    // ---- vertical menu ----
    this.items = ITEMS.map((label, i) => {
      const y = MENU_Y + i * MENU_STEP;
      const marker = this.add.rectangle(MENU_X - 20, y + 3, 3, 26, 0xc0392b).setOrigin(0).setDepth(10).setAlpha(0);   // red bar shown beside the selected item
      const text = this.txt(MENU_X, y, label, 24, '#7f918a', true, 2).setDepth(10);
      const zone = this.add.zone(MENU_X - 24, y - 8, 320, 44).setOrigin(0).setInteractive({ useHandCursor: true }).setDepth(10);
      zone.on('pointerover', () => { if (!this.starting) this.select(i); });
      zone.on('pointerdown', () => this.activate(i));
      return { marker, text, zone };
    });
    this.select(0);

    // ---- footer ----
    this.txt(MENU_X, 500, 'HEADPHONES RECOMMENDED   ·   F  FLASHLIGHT   ·   ESC  PAUSE', 10, '#566860').setDepth(10);
    this.note = this.txt(MENU_X, 452, '', 12, '#c9a46a').setDepth(10).setAlpha(0);                      // message line (used by QUIT)

    // ---- settings card (hidden until opened) ----
    this.buildSettings();

    // ---- keyboard ----
    const k = this.input.keyboard;
    k.on('keydown-UP', () => this.select(this.sel - 1)); k.on('keydown-W', () => this.select(this.sel - 1));
    k.on('keydown-DOWN', () => this.select(this.sel + 1)); k.on('keydown-S', () => this.select(this.sel + 1));
    k.on('keydown-ENTER', () => this.activate(this.sel)); k.on('keydown-SPACE', () => this.activate(this.sel));
    k.on('keydown-ESC', () => { if (this.settingsOpen) this.toggleSettings(false); });
  }

  // Highlight item i: bright text, nudged right, red marker bar. Wraps around at both ends.
  select(i) {
    this.sel = (i + ITEMS.length) % ITEMS.length;
    this.items.forEach((it, n) => {
      const on = n === this.sel;
      it.text.setColor(on ? '#f2f6f3' : '#7f918a');
      it.marker.setAlpha(on ? 1 : 0);
      this.tweens.add({ targets: it.text, x: MENU_X + (on ? 14 : 0), duration: 120 });
    });
  }

  // Run the chosen menu item.
  activate(i) {
    if (this.starting) return;
    if (i === 0) this.startShift();
    else if (i === 1) this.toggleSettings(!this.settingsOpen);
    else this.say('The shift will wait for you. Close this tab to leave.');
  }

  // Start the game: unlock audio (needs this click), play a door creak, fade out, then load the office.
  startShift() {
    this.starting = true;
    audio.init(); audio.creak();
    this.cameras.main.fadeOut(900, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Office'));
  }

  // Show a short message under the menu, then fade it away.
  say(msg) {
    this.note.setText(msg).setAlpha(1);
    this.tweens.killTweensOf(this.note);
    this.tweens.add({ targets: this.note, alpha: 0, delay: 3000, duration: 1200 });
  }

  // ---------- settings card ----------
  buildSettings() {
    this.sp = [];                                              // every settings object, so they can be shown/hidden together
    const add = (o) => { o.setDepth(11).setVisible(false); this.sp.push(o); return o; };
    this.spG = add(this.add.graphics());                      // card, slider track and knob are drawn here
    this.spTitle = add(this.txt(620, 178, 'SETTINGS', 18, '#e9eee9', true, 2));
    this.spVolL = add(this.txt(SL_X, 236, 'MASTER VOLUME', 10, '#7f918a'));
    this.spVol = add(this.txt(SL_X + SL_W, 236, '', 10, '#cfdcd6')).setOrigin(1, 0);
    this.spMute = add(this.txt(SL_X, 304, '', 13, '#cfdcd6', true));
    this.spBack = add(this.txt(SL_X, 350, '< BACK', 13, '#c9a46a', true));

    // Invisible click areas on top of the slider, mute row and back button.
    const zone = (x, y, w, h) => this.add.zone(x, y, w, h).setOrigin(0).setInteractive({ useHandCursor: true }).setDepth(12);
    this.zSl = zone(SL_X - 10, SL_Y - 14, SL_W + 20, 34); this.zMute = zone(SL_X, 298, 200, 28); this.zBack = zone(SL_X, 344, 100, 28);
    [this.zSl, this.zMute, this.zBack].forEach((z) => { z.input.enabled = false; });
    this.zSl.on('pointerdown', (p) => { this.drag = true; this.setVol(p.x); });                // click or start dragging the slider
    this.input.on('pointermove', (p) => { if (this.drag) this.setVol(p.x); });
    this.input.on('pointerup', () => { this.drag = false; });
    this.zMute.on('pointerdown', () => { audio.setMute(!audio.mute); this.drawSettings(); });
    this.zBack.on('pointerdown', () => this.toggleSettings(false));
    this.drawSettings();
  }

  setVol(px) { audio.setVolume(Phaser.Math.Clamp((px - SL_X) / SL_W, 0, 1)); this.drawSettings(); }

  // Open or close the card with a fade.
  toggleSettings(open) {
    this.settingsOpen = open;
    [this.zSl, this.zMute, this.zBack].forEach((z) => { z.input.enabled = open; });
    if (open) this.sp.forEach((o) => o.setVisible(true).setAlpha(0));
    this.tweens.add({ targets: this.sp, alpha: open ? 1 : 0, duration: 220, onComplete: () => { if (!open) this.sp.forEach((o) => o.setVisible(false)); } });
  }

  // Redraw the card and refresh its labels from the current audio values.
  drawSettings() {
    const g = this.spG, v = Phaser.Math.Clamp(audio.vol, 0, 1);
    g.clear();
    g.fillStyle(0x050909, 0.92).fillRect(600, 160, 300, 232);                              // card
    g.lineStyle(1, 0x3d554d, 1).strokeRect(600, 160, 300, 232);
    g.fillStyle(0xc0392b, 1).fillRect(600, 160, 3, 232);                                   // red edge, matches the menu marker
    g.fillStyle(0x1b2724, 1).fillRect(SL_X, SL_Y, SL_W, 6);                                // slider track
    g.fillStyle(audio.mute ? 0x4a5753 : 0x8fc0aa, 1).fillRect(SL_X, SL_Y, SL_W * v, 6);    // filled part
    g.fillStyle(0xe9eee9, 1).fillRect(SL_X + SL_W * v - 4, SL_Y - 7, 8, 20);               // knob
    this.spVol.setText(`${Math.round(v * 100)}%`);
    this.spMute.setText(audio.mute ? '[X]  SOUND OFF' : '[ ]  SOUND ON');
  }

  // Film grain: a handful of random specks every frame.
  update() {
    this.grain.clear();
    for (let i = 0; i < 70; i++) this.grain.fillStyle(0xdfe8e4, Math.random() * 0.14).fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2, 1);
  }
}
