// =====================================================================================
// OfficeScene.js  -  the main gameplay scene (security office + camera monitor).
//
// What happens here:
//   * A full-screen CCTV feed is shown. It is pitch black unless the flashlight (F) is on.
//   * New anomalies (objects that appear in a room) spawn about every 10 seconds.
//   * The player flips between 4 cameras and presses REPORT or CONFIRM NORMAL.
//   * Every mistake pulls THE PATIENT (the entity) one stage closer to the office.
//   * At stage 4 the entity is at the door: a short final test decides life or death.
//
// This file only DRAWS and CONNECTS things. The rules live in the systems/ folder:
//   GameClock (time), PowerManager (battery), AnomalyManager (what spawns), EntityAI (stages).
// Press H while playing to print the placement values of the current anomaly and entity.
// =====================================================================================
import Phaser from 'phaser';
import GameClock from '../systems/GameClock.js';
import PowerManager from '../systems/PowerManager.js';
import AnomalyManager from '../systems/AnomalyManager.js';
import EntityAI from '../systems/EntityAI.js';
import audio from '../systems/AudioManager.js';

// ------------------------------------ constants --------------------------------------
const W = 960, H = 540;                 // game resolution (the camera image fills all of it)
const K = W / 620;                      // sprite scales below were tuned for an old 620px-wide
                                        // monitor, so they are multiplied by K for full screen
const FONT = '"Lucida Console","Courier New",monospace';   // HUD font (no web font needed)
const NAMES = ['WARD 09', 'EAST CORRIDOR', 'NURSES HALL', 'WASHROOM'];   // camera names, cam 1..4

// Hints printed in the log when each in-game hour starts (index = hour, 0 = 12 AM).
const HINTS = [
  '12 AM  Keep the light moving. A camera is useless in the dark.',
  '01 AM  The corridor has started answering the intercom.',
  '02 AM  Report changes. Do not report ordinary objects.',
  '03 AM  The lights are not failing on their own.',
  '04 AM  Listen carefully. Some things move before they appear.',
  '05 AM  One more hour. Do not leave the monitors unattended.'
];

// Rows of the briefing card shown before the shift: [key, explanation].
const BRIEF = [
  ['F', 'Flashlight. Aim it with the mouse. The feeds are black without it.'],
  ['REPORT', 'Something dangerous changed in this room.'],
  ['NORMAL', 'Nothing is wrong. A wrong call brings the Patient closer.'],
  ['SPACE', 'Recharge timing test. Three hits refill the battery.'],
  ['ESC', 'Pause.']
];

// ANOMALY SPRITES. One entry per anomaly id (the ids come from AnomalyManager).
//   key   = texture name loaded in BootScene ('creature' is the painted monster image)
//   x, y  = position as a FRACTION of the screen (0.5, 0.5 = centre). Pixels = x*960, y*540
//   scale = size multiplier before K is applied
//   angle = rotation in degrees        tint = colour multiply (darkens/greys the sprite)
//   flipX = mirror horizontally
// The sprite origin is (0.5, 0.82), so x,y is where its "feet" touch the floor.
// See ANOMALY_OBJECTS.md for these converted to pixels.
const OBJECTS = {
  bed:     { key: 'creature', x: 0.47, y: 0.72, scale: 0.105, angle: -12, tint: 0x777f7d },
  wheel:   { key: 'asset-lab-bench', x: 0.25, y: 0.73, scale: 0.42, angle: 0 },
  flicker: { key: 'asset-emergency-on', x: 0.79, y: 0.18, scale: 0.62, angle: 0 },   // swaps on/off texture in render()
  box:     { key: 'asset-electrical-box', x: 0.70, y: 0.77, scale: 0.29, angle: -4 },
  biohazard: { key: 'asset-biohazard', x: 0.37, y: 0.67, scale: 0.34, angle: -3 },
  figure:  { key: 'creature', x: 0.51, y: 0.60, scale: 0.145, angle: 0, tint: 0x626b69 },
  door:    { key: 'asset-door-open', x: 0.80, y: 0.61, scale: 0.50, angle: 0 },
  brokenDoor: { key: 'asset-door-broken', x: 0.79, y: 0.62, scale: 0.43, angle: 0 },
  pipe:    { key: 'asset-pipe', x: 0.22, y: 0.69, scale: 0.82, angle: 4 },
  doll:    { key: 'creature', x: 0.54, y: 0.79, scale: 0.07, angle: 78, tint: 0x8b8b84 },   // creature, tiny and lying down
  leak:    { key: 'asset-leak', x: 0.51, y: 0.72, scale: 0.54, angle: 0 },
  slime:   { key: 'asset-slime', x: 0.58, y: 0.83, scale: 0.54, angle: -5 },
  radiation: { key: 'asset-radiation', x: 0.68, y: 0.70, scale: 0.30, angle: 5 },
  quarantine: { key: 'asset-quarantine', x: 0.52, y: 0.89, scale: 0.82, angle: 0 },
  chair:   { key: 'asset-metal-shelf', x: 0.58, y: 0.74, scale: 0.39, angle: -2 },
  sky:     { key: 'asset-emergency-on', x: 0.48, y: 0.14, scale: 0.58, angle: 0 },
  paper:   { key: 'asset-sign', x: 0.42, y: 0.81, scale: 0.27, angle: 18 },
  refl:    { key: 'creature', x: 0.57, y: 0.54, scale: 0.20, angle: 6, tint: 0x7b8581 },
  crier:   { key: 'creature', x: 0.75, y: 0.77, scale: 0.19, angle: 12, tint: 0x939995 },
  twin:    { key: 'creature', x: 0.34, y: 0.66, scale: 0.17, angle: -4, flipX: true, tint: 0x717a77 },
  moth:    { key: 'asset-debris', x: 0.65, y: 0.23, scale: 0.25, angle: -8 }
};

// THE PATIENT, by stage (index = EntityAI stage). It is drawn only on the camera in `cam`
// (0-based). Stage 4 is inside the office, so there is no entry: no camera shows it.
// Further stages are bigger, brighter and closer to the original image colours.
const ENTITY_STAGES = [
  { cam: 0, x: 0.65, y: 0.68, scale: 0.060, alpha: 0.48, tint: 0x59615f, angle: -4 },   // Ward 09: small and faint
  { cam: 1, x: 0.54, y: 0.66, scale: 0.115, alpha: 0.72, tint: 0x78817d, angle: 2 },    // East Corridor
  { cam: 2, x: 0.70, y: 0.70, scale: 0.205, alpha: 0.88, tint: 0xb0aaa0, angle: 8 },   // Nurses Hall: large, with a red ghost copy
  { cam: 3, x: 0.53, y: 0.78, scale: 0.305, alpha: 1, tint: 0xffffff, angle: -6 }      // Washroom: full size, solid
];

const BAR = 320, ZONE = 56;   // recharge minigame: width of the bar and of the green hit zone (pixels)

// Seconds until the NEXT anomaly spawns: about 10s, slowly getting a bit faster each hour
// (never below 8s), plus 0-2s of randomness. Change this line to tune the pacing.
const spawnGap = (hour) => Math.max(8, 11 - hour * 0.6) + Math.random() * 2;

// Button colours per kind: [outline colour, fill colour].
const KIND = { plain: [0x6b8079, 0x23302d], accent: [0x7fc4a8, 0x2c5a4a], danger: [0xd45a50, 0x6a2724] };

export default class Office extends Phaser.Scene {
  constructor() { super('Office'); }

  // ===================================================================================
  // UI HELPERS (kept inside this file so the scene does not depend on ui.js)
  // ===================================================================================

  // Make a HUD text object with a soft shadow so it stays readable over the camera image.
  txt(x, y, s, size = 12, color = '#cfdcd6', bold = false) {
    return this.add.text(x, y, s, { fontFamily: FONT, fontSize: size + 'px', color, fontStyle: bold ? 'bold' : 'normal' })
      .setShadow(1, 1, '#000000', 3, false, true).setDepth(12);
  }

  // Make a clickable button. Returns an object with:
  //   show(bool)  - show/hide it        dim(bool) - grey it out (still visible)
  //   label(str)  - change its text     depth(n)  - change its draw order
  chip(x, y, w, h, label, fn, kind = 'plain') {
    const [edge, fill] = KIND[kind];
    const g = this.add.graphics().setDepth(10);                    // draws the button body
    const t = this.add.text(x + w / 2, y + h / 2, label,           // the label, centred
      { fontFamily: FONT, fontSize: '12px', color: '#e6f0eb', fontStyle: 'bold' }).setOrigin(0.5).setDepth(11);
    const z = this.add.zone(x, y, w, h).setOrigin(0).setInteractive({ useHandCursor: true }).setDepth(10);   // invisible click area
    const o = { vis: true, hover: false, dimmed: false, t, r: z };

    // Redraw the button body for its current state (hover / dimmed / hidden).
    o.draw = () => {
      g.clear(); if (!o.vis) return;
      g.fillStyle(0x040808, 0.78).fillRoundedRect(x, y, w, h, 4);                              // dark backing
      g.fillStyle(fill, o.hover ? 0.9 : 0.55).fillRoundedRect(x, y, w, h, 4);                  // coloured fill (brighter on hover)
      g.fillStyle(edge, o.dimmed ? 0.25 : 0.9).fillRect(x, y + 4, 2, h - 8);                   // accent tick on the left edge
      g.lineStyle(1, o.hover ? 0xe6f0eb : edge, o.dimmed ? 0.25 : 0.55).strokeRoundedRect(x, y, w, h, 4);   // outline
    };
    z.on('pointerover', () => { o.hover = true; o.draw(); });
    z.on('pointerout', () => { o.hover = false; o.draw(); });
    z.on('pointerdown', () => { if (o.vis) fn(); });
    // These only redraw when the value really changes, so calling them every frame is cheap.
    o.show = (v) => { if (o.vis === v) return; o.vis = v; t.setVisible(v); z.input.enabled = v; o.draw(); };
    o.dim = (v) => { if (o.dimmed === v) return; o.dimmed = v; t.setAlpha(v ? 0.4 : 1); o.draw(); };
    o.label = (s) => { if (t.text !== s) t.setText(s); };
    o.depth = (d) => { g.setDepth(d); t.setDepth(d + 1); z.setDepth(d); };
    o.draw(); return o;
  }

  // Build the screen-sized overlay textures once (vignette, scanlines, top/bottom shading).
  // They are drawn with the browser canvas API so no image files are needed.
  makeTextures() {
    if (this.textures.exists('hud-vig')) return;                   // already built on a previous run
    const mk = (key, w, h, fn) => { const c = this.textures.createCanvas(key, w, h); fn(c.getContext()); c.refresh(); };
    // Vignette: transparent in the middle, dark at the corners.
    mk('hud-vig', W, H, (x) => { const g = x.createRadialGradient(480, 270, 200, 480, 270, 640); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.88)'); x.fillStyle = g; x.fillRect(0, 0, W, H); });
    // Scanlines: a thin dark line every 3 pixels (CCTV look).
    mk('hud-scan', W, H, (x) => { x.fillStyle = 'rgba(0,0,0,0.17)'; for (let i = 0; i < H; i += 3) x.fillRect(0, i, W, 1); });
    // Soft black fades behind the top HUD and the bottom HUD so text stays readable.
    mk('hud-top', W, 96, (x) => { const g = x.createLinearGradient(0, 0, 0, 96); g.addColorStop(0, 'rgba(0,0,0,0.82)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, W, 96); });
    mk('hud-bot', W, 150, (x) => { const g = x.createLinearGradient(0, 0, 0, 150); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.88)'); x.fillStyle = g; x.fillRect(0, 0, W, 150); });
  }

  // ===================================================================================
  // create(): runs once each time a shift starts. Builds the game state and all the UI.
  // ===================================================================================
  create() {
    audio.init();                                                  // start WebAudio (needs the earlier menu click)

    // --- game systems ---
    this.clock = new GameClock(720);        // 720 real seconds = the whole 12 AM - 6 AM shift
    this.power = new PowerManager();        // flashlight battery (100% at start)
    this.an = new AnomalyManager();         // decides which anomaly appears where
    this.ent = new EntityAI();              // THE PATIENT: stage 0..4

    // --- scene state (all reset every shift) ---
    Object.assign(this, {
      cam: 0,               // camera currently shown (0-3)
      log: [],              // recent messages: { m: text, born: time }
      paused: true,         // true during the briefing, the pause menu, etc.
      over: false,          // true once the shift has ended (stops all updates)
      staticT: 0,           // seconds of camera static left (after switching camera)
      lock: 0,              // short cooldown after REPORT / NORMAL (stops button spam)
      seal: 0,              // seconds the office door stays sealed
      call: null,           // active phone/intercom call, or null
      breaker: false,       // true after the 3 AM breaker trip (patrol needed)
      final: null,          // active door test when the entity arrives: { knock, t }
      hourSeen: -1,         // last in-game hour we showed a hint for
      intro: true,          // true until the briefing is clicked away
      warnedOut: false,     // so the "battery empty" message prints only once
      light: false,         // flashlight on/off
      mini: null,           // recharge minigame state, or null when not playing it
      rcd: 0,               // recharge cooldown (seconds left)
      cryT: 0,              // timer for repeating the crying sound
      creakT: 21            // timer for random ambient creaks
    });
    this.an.t = 6;          // first anomaly arrives 6 seconds into the shift

    // Scripted events, in order. t = shift time in seconds. Each runs once.
    this.sched = [
      { t: 150, f: () => this.ring({ kind: 'phone', text: 'PHONE: Previous guard here. Do not trust the incident log.' }) },
      { t: 270, f: () => this.ring({ kind: 'phone', text: 'PHONE: It copies what you ignore. Check the camera it is not in.' }) },
      { t: 365, f: () => { this.breaker = true; this.say('BREAKER TRIPPED. Restore power from the corridor.'); audio.creak(); } },
      { t: 490, f: () => this.ring({ kind: 'intercom', bad: true, text: 'INTERCOM: your own voice says, "It is me. Pick up. I am cold."' }) },   // trap: answering = mistake
      { t: 610, f: () => this.ring({ kind: 'phone', text: 'PHONE: breathing, then a click.' }) }
    ];
    this.makeTextures();

    // --- WORLD LAYER (draw order set by depth, lowest at the back) ---
    this.view = this.add.image(0, 0, 'cam0').setOrigin(0).setDisplaySize(W, H).setTint(0xc0d0cb).setDepth(1);   // the camera photo, full screen
    this.entityEcho = this.add.image(0, 0, 'creature').setOrigin(0.5, 0.82).setVisible(false).setDepth(2.8);     // red ghost copy (entity stage 2+)
    this.entityVisual = this.add.image(0, 0, 'creature').setOrigin(0.5, 0.82).setVisible(false).setDepth(3);     // the entity itself
    this.anomalyVisual = this.add.image(0, 0, 'asset-electrical-box').setOrigin(0.5, 0.82).setVisible(false).setDepth(3);   // current anomaly sprite (texture swapped per anomaly)
    this.flickerGlow = this.add.ellipse(0, 0, 100, 70, 0xc53a2e, 0).setDepth(3).setVisible(false);              // red glow used by the flicker anomaly
    this.dark = this.add.renderTexture(0, 0, W, H).setOrigin(0, 0).setDepth(5);   // black cover; the flashlight "erases" a hole in it
    this.flashMask = this.make.graphics({ add: false });                           // the beam shape used for erasing
    this.add.image(0, 0, 'hud-scan').setOrigin(0).setDepth(6);                     // scanlines
    this.add.image(0, 0, 'hud-vig').setOrigin(0).setDepth(7);                      // vignette
    this.add.image(0, 0, 'hud-top').setOrigin(0).setDepth(8);                      // shade behind top HUD
    this.add.image(0, H, 'hud-bot').setOrigin(0, 1).setDepth(8);                   // shade behind bottom HUD
    this.noise = this.add.graphics().setDepth(7.5);                                // random static lines
    this.redFlash = this.add.rectangle(0, 0, W, H, 0x8d1717, 1).setOrigin(0).setDepth(9).setAlpha(0);   // red pulse when the entity is close
    this.hudG = this.add.graphics().setDepth(12);                                  // battery cells, door light, camera frames, minigame bar

    // --- HUD TEXT ---
    this.hud = this.txt(26, 14, '12:00 AM', 30, '#e8f0ec', true);                  // big clock, top left
    this.txt(28, 50, 'NIGHT SHIFT  /  WARD 09', 10, '#7f968e');
    this.rec = this.txt(480, 16, '', 13, '#e8f0ec', true).setOrigin(0.5, 0);       // "REC  CAM 01  WARD 09", top centre
    this.stamp = this.txt(480, 36, '', 10, '#8aa299').setOrigin(0.5, 0);           // date + signal status under it
    this.txt(790, 10, 'FLASHLIGHT', 10, '#7f968e');                                // battery label, top right
    this.pw = this.txt(934, 10, '100%', 11, '#d6e2dc', true).setOrigin(1, 0);      // battery percentage
    this.txt(738, 10, 'DOOR', 10, '#7f968e');                                      // label for the warning light
    this.toasts = [0, 1, 2, 3].map(() => this.txt(28, 76, '', 12, '#d6e2dc').setWordWrapWidth(380));   // 4 fading log lines, top left
    this.center = this.txt(480, 300, '', 14, '#9fb6ad', true).setOrigin(0.5);      // centre hints ("PRESS F", "CELL EMPTY")
    this.msgT = this.txt(480, 392, '', 16, '#f0c98a', true).setOrigin(0.5);        // the final-door countdown number
    this.miniText = this.txt(480, 400, '', 11, '#e8d3a0', true).setOrigin(0.5);    // recharge minigame instructions

    // --- CONTROLS ---
    // A(fn) wraps a click handler so buttons do nothing while paused or after the shift ended.
    const A = (fn) => () => { if (!this.paused && !this.over) fn(); };

    // Four camera thumbnails along the bottom. Click one to switch camera.
    this.thumbs = NAMES.map((name, i) => {
      const x = 244 + i * 120, y = 461;
      const im = this.add.image(x, y, 'cam' + i).setOrigin(0).setDisplaySize(112, 63).setTint(0x3c4c47).setDepth(10).setInteractive({ useHandCursor: true });
      im.on('pointerdown', A(() => this.pick(i)));
      this.txt(x + 6, y + 4, 'CAM 0' + (i + 1), 9, '#e8f0ec', true); this.txt(x + 6, y + 50, name, 8, '#9fb6ad');
      return im;
    });
    // Action buttons, bottom right.
    this.repB = this.chip(784, 392, 152, 36, 'REPORT ANOMALY', A(() => this.report()), 'danger');
    this.norB = this.chip(784, 434, 152, 36, 'CONFIRM NORMAL', A(() => this.confirm()), 'accent');
    this.sealB = this.chip(784, 476, 152, 36, 'SEAL DOOR', A(() => this.sealDoor()));
    // Flashlight + recharge, top right under the battery.
    this.flB = this.chip(784, 58, 152, 28, 'FLASHLIGHT  [F]', A(() => this.toggleLight()), 'accent');
    this.rchB = this.chip(784, 92, 152, 28, 'RECHARGE', A(() => this.startMini()));
    // Call / patrol buttons, bottom left. They only show when needed (see render()).
    this.ansB = this.chip(26, 394, 190, 34, 'ANSWER', A(() => this.answer()), 'danger');
    this.ignB = this.chip(26, 434, 190, 30, 'IGNORE', A(() => { this.call = null; this.say('You let it ring.'); }));
    this.patB = this.chip(26, 474, 190, 34, 'GO TO BREAKER', A(() => this.patrol()), 'accent');

    // --- PAUSE MENU (hidden until ESC) ---
    this.cover = this.add.rectangle(0, 0, W, H, 0x000000, 0.86).setOrigin(0).setDepth(15).setVisible(false).setInteractive();   // interactive so clicks cannot reach buttons underneath
    this.pauseT = this.txt(480, 215, 'PAUSED', 30, '#e6f0eb', true).setOrigin(0.5).setDepth(16).setVisible(false);
    this.resB = this.chip(370, 268, 220, 38, 'RESUME', () => this.pause(false), 'accent');
    this.menB = this.chip(370, 316, 220, 38, 'RETURN TO TITLE', () => this.scene.start('Menu'));
    [this.resB, this.menB].forEach((b) => { b.depth(17); b.show(false); });

    // --- BRIEFING CARD (shown first; clicking anywhere starts the shift) ---
    const ov = [];                                                  // everything in the card, so it can be destroyed together
    ov.push(this.add.rectangle(0, 0, W, H, 0x020505, 0.95).setOrigin(0).setDepth(20).setInteractive());   // dark backdrop (also the click target)
    const card = this.add.graphics().setDepth(21);
    card.fillStyle(0x0a1210, 1).fillRect(190, 90, 580, 360).lineStyle(1, 0x3d554d, 1).strokeRect(190, 90, 580, 360).fillStyle(0xd45a50, 1).fillRect(190, 90, 4, 360);
    ov.push(card);
    ov.push(this.txt(218, 112, 'NIGHT OPERATIONS', 20, '#e6f0eb', true).setDepth(22));
    ov.push(this.txt(218, 140, 'You are covering the security desk until 06:00 AM.', 11, '#8aa299').setDepth(22));
    BRIEF.forEach(([k, v], i) => {                                  // one row per control: key name + explanation
      ov.push(this.txt(218, 184 + i * 44, k, 13, '#f0c98a', true).setDepth(22));
      ov.push(this.txt(318, 185 + i * 44, v, 11, '#cfdcd6').setWordWrapWidth(430).setDepth(22));
    });
    const go = this.txt(480, 418, 'CLICK TO BEGIN YOUR SHIFT', 12, '#e6f0eb', true).setOrigin(0.5).setDepth(22); ov.push(go);
    this.tweens.add({ targets: go, alpha: 0.25, duration: 800, yoyo: true, repeat: -1 });   // pulsing prompt
    ov[0].on('pointerdown', () => { ov.forEach((o) => o.destroy()); this.intro = false; this.paused = false; this.say('Shift started. Camera network online.'); });

    // --- KEYBOARD ---
    this.input.keyboard.on('keydown-ESC', () => { if (!this.intro && !this.over) this.pause(!this.paused); });      // pause / resume
    this.input.keyboard.on('keydown-F', () => { if (!this.paused && !this.over) this.toggleLight(); });            // flashlight
    this.debug = this.txt(28, 330, '', 10, '#9fe0c0').setVisible(false).setDepth(14);                              // debug readout text
    this.input.keyboard.on('keydown-H', () => this.debug.setVisible(!this.debug.visible));                         // H = toggle debug readout
    this.input.keyboard.on('keydown-SPACE', () => { if (!this.paused && !this.over) this.hit(); });                // recharge minigame hit

    // When the patrol scene hands control back, this scene "wakes". Apply the patrol result here.
    this.events.off('wake');                                       // avoid stacking duplicate listeners across restarts
    this.events.on('wake', () => {
      const r = this.registry.get('patrol') || { used: 0 };        // battery the patrol used
      this.power.spend(r.used); this.power.gain(25); this.breaker = false;   // pay for the trip, add a 25% reserve, clear the fault
      this.say('Breaker restored. Reserve charge added to the flashlight.'); audio.step(2);
    });
    this.say(HINTS[0]);
  }

  // ===================================================================================
  // GAMEPLAY LOGIC
  // ===================================================================================

  // Pause or resume. Pausing stops update() from advancing the clock, timers and spawns.
  pause(v) { this.paused = v; this.pauseT.setVisible(v); this.cover.setVisible(v); this.resB.show(v); this.menB.show(v); if (v) audio.stop('ambience'); else audio.loop('ambience', 0.12); }

  // Add a message to the on-screen log (keeps the newest 6).
  say(m) { this.log.push({ m: `${this.clock.label()}  ${m}`, born: this.time.now }); if (this.log.length > 6) this.log.shift(); }

  // Start a phone/intercom call. It expires on its own after 14 seconds.
  ring(c) { this.call = { ...c, exp: this.clock.t + 14 }; this.say(c.text); audio.ring(); }

  // Flashlight on/off. It cannot be used when the battery is empty.
  toggleLight() { if (this.power.out) return this.say('Flashlight cell is empty. Recharge it.'); this.light = !this.light; }

  // Switch camera. Shows a quarter-second of static.
  pick(i) { if (i === this.cam) return; this.cam = i; this.staticT = 0.22; }

  // REPORT ANOMALY: correct if the current camera has a DANGEROUS anomaly.
  // Wrong (nothing there, or only a harmless object) = a mistake: the entity moves closer.
  report() {
    if (this.lock > 0 || this.mini) return;                        // ignore while on cooldown or recharging
    const a = this.an.active[this.cam]; this.lock = 0.45;
    if (a && a.d) { delete this.an.active[this.cam]; this.say(`Reported: ${a.n}.`); audio.good(); }
    else { if (a) delete this.an.active[this.cam]; this.mistake(); this.say('FALSE REPORT. Something moved closer.'); audio.bad(); }
  }

  // CONFIRM NORMAL: correct if there is no dangerous anomaly on this camera.
  // Marking a dangerous one as normal is a mistake.
  confirm() {
    if (this.lock > 0 || this.mini) return;
    const a = this.an.active[this.cam]; this.lock = 0.45;
    if (a && a.d) { this.mistake(); this.say('WRONG. A dangerous change was marked normal.'); audio.bad(); }
    else { if (a) delete this.an.active[this.cam]; this.say('Feed confirmed normal.'); audio.good(); }
  }

  // SEAL DOOR. Normally blocks the entity for 7.5s. During the final test it is the right
  // answer to the knocking and the WRONG answer to the intercom voice.
  sealDoor() {
    if (this.final) { if (this.final.knock) return this.survive(); return this.die('You answered the thing using your own voice.'); }
    this.seal = 7.5; audio.creak(); this.say('Office door sealed for seven seconds.');
  }

  // ANSWER a call. Intercom calls flagged `bad` are traps (a mistake). Answering during the
  // final intercom test kills you.
  answer() {
    if (!this.call) return; const c = this.call; this.call = null;
    if (this.final) return this.die('You opened the line after it used your voice.');
    if (c.bad) { this.mistake(); this.say('The voice was not a caller. It knows where you are.'); } else this.say('Nothing useful came through.');
  }

  // GO TO BREAKER: leave the office for the patrol scene. Deadly if the warning light is red (stage 3+).
  patrol() {
    if (!this.breaker) return;
    if (this.ent.stage >= 3) return this.die('The warning light was red. The corridor was not safe.');
    this.registry.set('pw', this.power.p);                          // give the patrol scene the current battery
    this.scene.sleep(); this.scene.launch('Patrol');                // this scene sleeps (state kept) while patrol runs
  }

  // EVERY mistake goes through here: it moves the entity one stage closer.
  mistake() { this.ent.mistake(); if (this.ent.stage >= 1) audio.step(this.ent.stage); if (this.ent.stage >= 4) this.startFinal(); }

  // ---- recharge minigame: a marker slides across a bar; press SPACE inside the green zone, 3 tries ----
  startMini() {
    if (this.mini || this.rcd > 0 || this.power.p >= 99) return;    // not while running, cooling down, or already full
    this.light = false;                                             // flashlight goes off while recharging
    this.mini = { x: 0, dir: 1, zone: 40 + Math.random() * (BAR - ZONE - 80), attempt: 0, hits: 0 };
  }
  miniUpdate(dt) {                                                  // slide the marker, bouncing off both ends
    const m = this.mini; m.x += m.dir * 380 * dt;
    if (m.x >= BAR - 6) { m.x = BAR - 6; m.dir = -1; } if (m.x <= 0) { m.x = 0; m.dir = 1; }
  }
  hit() {                                                           // SPACE pressed
    const m = this.mini; if (!m) return;
    m.attempt += 1;
    if (m.x + 3 >= m.zone && m.x + 3 <= m.zone + ZONE) { m.hits += 1; audio.good(); } else audio.bad();   // +3 = centre of the marker
    m.zone = 20 + Math.random() * (BAR - ZONE - 40);                // move the green zone for the next try
    if (m.attempt >= 3) {                                           // after 3 tries, pay out: 3 hits +28%, 2 hits +17%, 1 hit +7%
      const gain = m.hits === 3 ? 28 : m.hits === 2 ? 17 : m.hits === 1 ? 7 : 0;
      this.power.gain(gain); this.say(gain ? `Cell calibrated. +${gain}% flashlight charge.` : 'Calibration failed. No charge gained.');
      this.mini = null; this.rcd = 18;                              // 18s cooldown before it can be used again
    }
  }

  // The entity reached the door and the player passed the test: it backs off to stage 2.
  survive() { this.final = null; this.call = null; this.ent.stage = 2; this.say('The lock holds. The footsteps move away.'); }

  // End the run with a death. `reason` is shown on the game-over screen.
  die(reason) { if (this.over) return; this.over = true; this.scene.start('Over', { win: false, reason, time: this.clock.label() }); }

  // The entity is at the office door. 5.5 seconds to react correctly:
  //   KNOCKING  -> press SEAL DOOR        INTERCOM VOICE -> do nothing at all
  startFinal() {
    if (this.final || this.over) return;                            // already running
    const knock = Math.random() < 0.52; this.final = { knock, t: 5.5 };
    if (knock) { this.say('THREE KNOCKS. SEAL THE DOOR NOW.'); audio.knock(); }
    else { this.call = { kind: 'intercom', bad: true, text: '', exp: 99 }; this.say('THE INTERCOM IS OPEN. IT IS USING YOUR VOICE. DO NOT ANSWER.'); audio.ring(); }
  }

  // ===================================================================================
  // update(): runs every frame. Order: draw, then (if not paused) advance the game.
  // ===================================================================================
  update(_, ms) {
    const dt = Math.min(ms, 100) / 1000;                            // seconds since last frame, capped so lag spikes cannot skip events
    this.render();                                                  // always draw, even while paused
    if (this.paused || this.over) return;                           // nothing below runs while paused

    // Time. At the end of the shift the player wins.
    this.clock.update(dt); const hour = this.clock.hour;
    if (this.clock.done) { this.over = true; return this.scene.start('Over', { win: true, time: '06:00 AM' }); }

    // Battery: only the flashlight drains it (2.35% per second while on). Empty battery forces the light off.
    if (this.power.out) this.light = false;
    this.power.update(dt, this.light ? 2.35 : 0);
    this.rcd = Math.max(0, this.rcd - dt); if (this.mini) this.miniUpdate(dt);

    // Sound cues: the crying anomaly repeats its sound; a fresh anomaly plays its own cue,
    // and that moment also schedules the NEXT spawn about 10s later.
    if (this.an.active[3]?.id === 'crier') { this.cryT -= dt; if (this.cryT <= 0) { audio.cry(); this.cryT = 5.4; } }
    if (this.an.fresh) { audio.cue(this.an.fresh.id); this.an.fresh = null; this.an.t = spawnGap(hour); }

    // New hour: print its hint in the log.
    if (hour !== this.hourSeen) { this.hourSeen = hour; if (HINTS[hour] && hour > 0) this.say(HINTS[hour]); }

    // Count down the short timers.
    this.staticT = Math.max(0, this.staticT - dt); this.lock = Math.max(0, this.lock - dt); this.seal = Math.max(0, this.seal - dt);

    // Run scripted events (calls, breaker trip) whose time has come.
    while (this.sched.length && this.clock.t >= this.sched[0].t) this.sched.shift().f();
    if (this.call && !this.final && this.clock.t > this.call.exp) this.call = null;   // unanswered calls expire

    // Random ambient creak every 22-40 seconds.
    this.creakT -= dt; if (this.creakT <= 0) { audio.creak(); this.creakT = 22 + Math.random() * 18; }

    // Anomaly system: spawns new ones and returns any dangerous ones left unreported too long.
    // Each of those counts as a mistake.
    for (const a of this.an.update(dt, hour, this.ent.stage)) { this.say(`MISSED: ${a.n}. It moved closer.`); this.mistake(); }

    // Entity system: it queues events ('moved', 'arrived') that we turn into log messages here.
    this.ent.update(dt);
    for (const e of this.ent.ev.splice(0)) {
      if (e === 'moved') this.say(['', 'Footsteps in the east corridor.', 'A second set of steps. Much closer.', 'Something is standing outside the washroom.'][this.ent.stage] || 'The office door handle turns.');
      else if (e === 'arrived') this.startFinal();
    }

    // Final door test countdown. Running out of time: knocking = death, intercom = you survive (you stayed silent).
    if (this.final) { this.final.t -= dt; if (this.final.t <= 0) { if (this.final.knock) this.die('You did not seal the door after the knocks.'); else this.survive(); } }

    // After the breaker trip the feed glitches randomly. Warn once when the battery hits zero.
    if (this.breaker && Math.random() < 0.025) this.staticT = 0.25;
    if (this.power.out && !this.warnedOut) { this.warnedOut = true; this.say('FLASHLIGHT CELL EMPTY. Recharge it to inspect the feeds.'); }
  }

  // ===================================================================================
  // render(): draws everything for the current frame. No game rules change in here.
  // ===================================================================================
  render() {
    const an = this.an.active[this.cam];                            // anomaly on the current camera (or undefined)
    const time = this.time.now / 1000, lit = this.light && !this.power.out, g = this.hudG;

    // 1) Camera picture. A small horizontal jitter while there is static.
    this.view.setTexture(`cam${this.cam}`); this.view.x = this.staticT > 0 ? Math.round((Math.random() - 0.5) * 6) : 0;

    // 2) Anomaly sprite: position/size/rotation/tint come from the OBJECTS table above.
    const o = an ? OBJECTS[an.id] : null;
    this.anomalyVisual.setVisible(Boolean(o)); this.flickerGlow.setVisible(Boolean(o && an.id === 'flicker'));
    if (o) {
      this.anomalyVisual.setTexture(o.key).setPosition(W * o.x, H * o.y).setScale(o.scale * K).setAngle(o.angle || 0).setAlpha(0.95).setTint(o.tint || 0xffffff).setFlipX(Boolean(o.flipX));
      if (an.id === 'flicker') {                                    // flicker: swap the lamp on/off about 4 times a second, with a red glow
        const on = Math.sin(time * 26) > 0.15;
        this.anomalyVisual.setTexture(on ? 'asset-emergency-on' : 'asset-emergency-off').setAlpha(on ? 1 : 0.22);
        this.flickerGlow.setPosition(W * o.x, H * o.y).setFillStyle(0xb63b31, on ? 0.18 : 0.015).setSize(200, 110);
      }
    }

    // 3) The entity: shown only on the camera that matches its stage (see ENTITY_STAGES).
    const en = ENTITY_STAGES[this.ent.stage], showEn = Boolean(en && en.cam === this.cam);
    this.entityVisual.setVisible(showEn); this.entityEcho.setVisible(showEn && this.ent.stage >= 2);
    if (showEn) {
      const ex = W * en.x, ey = H * en.y, sh = 1 + Math.sin(time * 8) * (this.ent.stage >= 2 ? 0.025 : 0.008);   // slight shimmer, stronger when close
      this.entityVisual.setPosition(ex, ey).setScale(en.scale * K * sh).setAlpha(en.alpha).setTint(en.tint).setAngle(en.angle).setFlipX(this.ent.stage === 2);
      if (this.ent.stage >= 2) this.entityEcho.setPosition(ex + 24, ey - 4).setScale(en.scale * K * 1.08).setAlpha(0.22 + Math.sin(time * 9) * 0.06).setTint(0x9d3430).setAngle(-en.angle).setFlipX(true);   // red ghost copy
    }

    // 4) Darkness. The whole screen is covered in black; with the flashlight on, a soft circle
    //    is erased at the mouse. The beam is built from 5 stacked circles (big+faint -> small+strong),
    //    so the centre is almost fully lit and the edge fades out. beam = outer radius in pixels.
    this.flashMask.clear();
    const beam = this.power.p < 18 ? 200 : 270;                     // beam shrinks when the battery is low
    [[1, 0.22], [0.85, 0.3], [0.65, 0.45], [0.45, 0.6], [0.25, 0.8]].forEach(([r, a]) => this.flashMask.fillStyle(0xffffff, a).fillCircle(0, 0, beam * r));
    this.dark.clear(); this.dark.fill(0x000000, 1);                 // alpha 1 = nothing visible without the light
    if (lit) { const p = this.input.activePointer; this.dark.erase(this.flashMask, Phaser.Math.Clamp(p.x, 10, W - 10), Phaser.Math.Clamp(p.y, 10, H - 10)); }

    // 5) Static lines (after a camera switch, or glitching after the breaker trip).
    this.noise.clear();
    if (this.staticT > 0 || (this.breaker && Math.sin(time * 11) > 0.85))
      for (let i = 0; i < 40; i++) this.noise.fillStyle(0xcbd7d3, Math.random() * 0.22).fillRect(Math.random() * W, Math.random() * H, 20 + Math.random() * 80, 1);

    // 6) Red screen pulse: fast during the final door test, faint once the entity is at stage 3.
    const stage = this.ent.stage;
    this.redFlash.setAlpha(this.final ? 0.1 + Math.sin(time * 9) * 0.05 : stage >= 3 ? 0.04 + Math.sin(time * 5) * 0.02 : 0);

    // 7) HUD text.
    const p = Math.ceil(this.power.p);
    this.hud.setText(this.clock.label());
    this.rec.setText(`${Math.sin(time * 4) > 0 ? '●' : ' '} REC   CAM 0${this.cam + 1}  ${NAMES[this.cam]}`);   // blinking REC dot
    this.stamp.setText(`03-14-1998   ${this.staticT > 0 ? 'SIGNAL INTERFERENCE' : this.breaker ? 'SIGNAL UNSTABLE' : 'IR OFF'}`);
    this.pw.setText(`${p}%`).setColor(p < 22 ? '#e27b72' : '#d6e2dc');   // turns red when the battery is low
    this.msgT.setText(this.final ? `${Math.ceil(this.final.t)}` : '');  // big countdown during the final test
    this.center.setText(this.mini ? '' : this.power.out ? 'CELL EMPTY  -  RECHARGE' : !lit && this.clock.t < 90 ? 'PRESS [F] TO USE THE FLASHLIGHT' : '').setAlpha(0.6 + Math.sin(time * 3) * 0.3);

    // 8) Log toasts, newest on top. Each older line is fainter, and every line fades out after about 9-13 seconds.
    let y = 76; const now = this.time.now;
    this.toasts.forEach((t, i) => {
      const e = this.log[this.log.length - 1 - i];
      if (!e) return t.setText('');
      const age = (now - e.born) / 1000, a = Phaser.Math.Clamp((1 - i * 0.22) * (1 - (age - 9) / 4), 0, 1);
      t.setText(e.m).setAlpha(a).setY(y); y += a > 0 ? t.height + 6 : 0;   // stack lines under each other
    });

    // 9) Button states.
    this.flB.label(lit ? 'LIGHT ON  [F]' : 'FLASHLIGHT  [F]'); this.flB.dim(false);
    this.rchB.label(this.rcd > 0 ? `COOLING  ${Math.ceil(this.rcd)}s` : 'RECHARGE'); this.rchB.dim(this.rcd > 0 || Boolean(this.mini) || p >= 99);
    this.repB.dim(this.lock > 0 || Boolean(this.mini)); this.norB.dim(this.lock > 0 || Boolean(this.mini));
    this.ansB.show(Boolean(this.call) && !this.paused);             // ANSWER shows only while a call is active
    this.ignB.show(Boolean(this.call) && !this.final && !this.paused);
    this.patB.show(this.breaker && !this.paused);                   // GO TO BREAKER shows only after the breaker trips

    // 10) Vector HUD pieces.
    g.clear();
    const cells = Math.ceil(p / 10);                                // battery shown as 10 cells
    for (let i = 0; i < 10; i++) g.fillStyle(i < cells ? (p < 22 ? 0xc6574d : 0x8fc0aa) : 0x1b2724, i < cells ? 0.95 : 0.8).fillRect(790 + i * 14.4, 26, 11, 14);
    const red = stage >= 3 && Math.sin(time * 6) > -0.3;            // door warning light: blinks red once the entity is at stage 3+
    g.fillStyle(red ? 0xff3a30 : 0x2a1412, 1).fillCircle(766, 32, 8); g.lineStyle(1, 0x000000, 0.7).strokeCircle(766, 32, 8);
    this.thumbs.forEach((im, i) => { g.lineStyle(i === this.cam ? 2 : 1, i === this.cam ? 0xe6f0eb : 0x3d4f4a, i === this.cam ? 1 : 0.9).strokeRect(im.x, im.y, 112, 63); });   // frame; the active camera is brighter
    if (this.mini) {                                                // recharge bar: dark track, green zone, white marker
      const m = this.mini, bx = 480 - BAR / 2;
      g.fillStyle(0x040808, 0.85).fillRoundedRect(bx - 20, 380, BAR + 40, 64, 6).lineStyle(1, 0x3d554d, 1).strokeRoundedRect(bx - 20, 380, BAR + 40, 64, 6);
      g.fillStyle(0x16221f, 1).fillRect(bx, 414, BAR, 14); g.fillStyle(0x2e9a6b, 1).fillRect(bx + m.zone, 414, ZONE, 14); g.fillStyle(0xf0f5f2, 1).fillRect(bx + m.x, 410, 6, 22);
      this.miniText.setText(`RECHARGE  -  PRESS SPACE IN THE GREEN BAND   ${m.attempt}/3`);
    } else this.miniText.setText('');

    // 11) Debug readout (toggle with H): shows the live placement numbers for the current anomaly and entity.
    if (this.debug.visible) {
      const e = ENTITY_STAGES[this.ent.stage];
      this.debug.setText([
        `ANOMALY cam${this.cam + 1}: ${an ? `${an.id} ${an.d ? '(dangerous)' : '(harmless)'}` : 'none'}`,
        o ? `  asset=${o.key} x=${Math.round(W * o.x)} y=${Math.round(H * o.y)} scale=${(o.scale * K).toFixed(3)} angle=${o.angle || 0}` : '',
        `ENTITY stage=${this.ent.stage} ${e ? `cam${e.cam + 1} x=${Math.round(W * e.x)} y=${Math.round(H * e.y)} scale=${(e.scale * K).toFixed(3)} alpha=${e.alpha}` : '(inside the office)'}`,
        `next anomaly in ${(this.an.t || 0).toFixed(1)}s`].join('\n'));
    }
  }
}