
import Phaser from 'phaser';
import GameClock from '../systems/GameClock.js';
import PowerManager from '../systems/PowerManager.js';
import AnomalyManager from '../systems/AnomalyManager.js';
import EntityAI from '../systems/EntityAI.js';
import audio from '../systems/AudioManager.js';


const W = 960, H = 540;               
const K = W / 620;                     
                                       
const FONT = '"Lucida Console","Courier New",monospace';  
const NAMES = ['WARD 09', 'EAST CORRIDOR', 'NURSES HALL', 'WASHROOM'];  

const HINTS = [
  '12 AM  Keep the light moving. A camera is useless in the dark.',
  '01 AM  The corridor has started answering the intercom.',
  '02 AM  Report changes. Do not report ordinary objects.',
  '03 AM  The lights are not failing on their own.',
  '04 AM  Listen carefully. Some things move before they appear.',
  '05 AM  One more hour. Do not leave the monitors unattended.'
];


const BRIEF = [
  ['F', 'Flashlight. Aim it with the mouse. The feeds are black without it.'],
  ['REPORT', 'Something dangerous changed in this room.'],
  ['NORMAL', 'Nothing is wrong. A wrong call brings the Patient closer.'],
  ['SPACE', 'Recharge timing test. Three hits refill the battery.'],
  ['ESC', 'Pause.']
];

const OBJECTS = {
  bed:     { key: 'creature', x: 0.47, y: 0.72, scale: 0.105, angle: -12, tint: 0x777f7d },
  wheel:   { key: 'asset-lab-bench', x: 0.25, y: 0.73, scale: 0.42, angle: 0 },
  flicker: { key: 'asset-emergency-on', x: 0.79, y: 0.18, scale: 0.62, angle: 0 },  
  box:     { key: 'asset-electrical-box', x: 0.70, y: 0.77, scale: 0.29, angle: -4 },
  biohazard: { key: 'asset-biohazard', x: 0.37, y: 0.67, scale: 0.34, angle: -3 },
  figure:  { key: 'dark', x: 0.51, y: 0.60, scale: 0.145, angle: 0, tint: 0x626b69 },
  door:    { key: 'asset-door-open', x: 0.80, y: 0.61, scale: 0.50, angle: 0 },
  brokenDoor: { key: 'asset-door-broken', x: 0.79, y: 0.62, scale: 0.43, angle: 0 },
  pipe:    { key: 'asset-pipe', x: 0.22, y: 0.69, scale: 0.82, angle: 4 },
  doll:    { key: 'creature', x: 0.54, y: 0.79, scale: 0.07, angle: 78, tint: 0x8b8b84 },  
  leak:    { key: 'asset-leak', x: 0.51, y: 0.72, scale: 0.54, angle: 0 },
  slime:   { key: 'asset-slime', x: 0.58, y: 0.83, scale: 0.54, angle: -5 },
  radiation: { key: 'asset-radiation', x: 0.68, y: 0.70, scale: 0.30, angle: 5 },
  quarantine: { key: 'asset-quarantine', x: 0.52, y: 0.89, scale: 0.82, angle: 0 },
  chair:   { key: 'asset-metal-shelf', x: 0.58, y: 0.74, scale: 0.39, angle: -2 },
  sky:     { key: 'asset-emergency-on', x: 0.48, y: 0.14, scale: 0.58, angle: 0 },
  paper:   { key: 'asset-sign', x: 0.42, y: 0.81, scale: 0.27, angle: 18 },
  refl:    { key: 'creature', x: 0.57, y: 0.54, scale: 0.20, angle: 6, tint: 0x7b8581 },
  crier:   { key: 'creature', x: 0.75, y: 0.77, scale: 0.19, angle: 12, tint: 0x939995 },
  twin:    { key: 'knockingcamera', x: 0.34, y: 0.66, scale: 0.17, angle: -4, flipX: true, tint: 0x717a77 },
  moth:    { key: 'asset-debris', x: 0.65, y: 0.23, scale: 0.25, angle: -8 }
};

const ENTITY_STAGES = [
  { cam: 0, x: 0.57, y: 0.46, scale: 0.20, alpha: 0.48, tint: 0x59615f, angle: 0 },
  { cam: 1, x: 0.45, y: 0.66, scale: 0.28, alpha: 0.72, tint: 0x78817d, angle: 0 },
  { cam: 2, x: 0.50, y: 0.75, scale: 0.28, alpha: 0.88, tint: 0xb0aaa0, angle: 0 },
  { cam: 3, x: 0.53, y: 0.78, scale: 0.42, alpha: 1, tint: 0xffffff, angle: 0 }
];

const BAR = 320, ZONE = 56;   

const spawnGap = (hour) => Math.max(8, 11 - hour * 0.6) + Math.random() * 2;

const KIND = { plain: [0x6b8079, 0x23302d], accent: [0x7fc4a8, 0x2c5a4a], danger: [0xd45a50, 0x6a2724] };

export default class Office extends Phaser.Scene {
  constructor() { super('Office'); }


  // UI HELPERS 


  txt(x, y, s, size = 12, color = '#cfdcd6', bold = false) {
    return this.add.text(x, y, s, { fontFamily: FONT, fontSize: size + 'px', color, fontStyle: bold ? 'bold' : 'normal' })
      .setShadow(1, 1, '#000000', 3, false, true).setDepth(12);
  }

  chip(x, y, w, h, label, fn, kind = 'plain') {
    const [edge, fill] = KIND[kind];
    const g = this.add.graphics().setDepth(10);                    
    const t = this.add.text(x + w / 2, y + h / 2, label,         
      { fontFamily: FONT, fontSize: '12px', color: '#e6f0eb', fontStyle: 'bold' }).setOrigin(0.5).setDepth(11);
    const z = this.add.zone(x, y, w, h).setOrigin(0).setInteractive({ useHandCursor: true }).setDepth(10);   
    const o = { vis: true, hover: false, dimmed: false, t, r: z };

    o.draw = () => {
      g.clear(); if (!o.vis) return;
      g.fillStyle(0x040808, 0.78).fillRoundedRect(x, y, w, h, 4);                              
      g.fillStyle(fill, o.hover ? 0.9 : 0.55).fillRoundedRect(x, y, w, h, 4);                  
      g.fillStyle(edge, o.dimmed ? 0.25 : 0.9).fillRect(x, y + 4, 2, h - 8);                  
      g.lineStyle(1, o.hover ? 0xe6f0eb : edge, o.dimmed ? 0.25 : 0.55).strokeRoundedRect(x, y, w, h, 4);   
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

  create() {
    audio.init();                                                


    this.clock = new GameClock(720);      
    this.power = new PowerManager();        
    this.an = new AnomalyManager();      
    this.ent = new EntityAI();            

    Object.assign(this, {
      cam: 0,               
      log: [],           
      paused: true,       
      over: false,         
      staticT: 0,          
      lock: 0,          
      seal: 0,            
      call: null,      
      breaker: false,     
      final: null,       
      hourSeen: -1,      
      intro: true,         
      warnedOut: false,     // so the battery empty message prints only once
      light: false,       
      mini: null,       
      rcd: 0,             
      cryT: 0,           
      creakT: 21          
    });
    this.an.t = 6;         


    this.sched = [
      { t: 150, f: () => this.ring({ kind: 'phone', text: 'PHONE: Previous guard here. Do not trust the incident log.' }) },
      { t: 270, f: () => this.ring({ kind: 'phone', text: 'PHONE: It copies what you ignore. Check the camera it is not in.' }) },
      { t: 365, f: () => { this.breaker = true; this.say('BREAKER TRIPPED. Restore power from the corridor.'); audio.creak(); } },
      { t: 490, f: () => this.ring({ kind: 'intercom', bad: true, text: 'INTERCOM: your own voice says, "It is me. Pick up. I am cold."' }) },  
      { t: 610, f: () => this.ring({ kind: 'phone', text: 'PHONE: breathing, then a click.' }) }
    ];
    this.makeTextures();


    this.view = this.add.image(0, 0, 'cam0').setOrigin(0).setDisplaySize(W, H).setTint(0xc0d0cb).setDepth(1); 
    this.entityEcho = this.add.image(0, 0, 'creature').setOrigin(0.5, 0.82).setVisible(false).setDepth(2.8);    
    this.entityVisual = this.add.image(0, 0, 'creature').setOrigin(0.5, 0.82).setVisible(false).setDepth(3);   
    this.anomalyVisual = this.add.image(0, 0, 'asset-electrical-box').setOrigin(0.5, 0.82).setVisible(false).setDepth(3);  
    this.flickerGlow = this.add.ellipse(0, 0, 100, 70, 0xc53a2e, 0).setDepth(3).setVisible(false);             
    this.dark = this.add.renderTexture(0, 0, W, H).setOrigin(0, 0).setDepth(5);   
    this.flashMask = this.make.graphics({ add: false });                          
    this.add.image(0, 0, 'hud-scan').setOrigin(0).setDepth(6);                   
    this.add.image(0, 0, 'hud-vig').setOrigin(0).setDepth(7);                     
    this.add.image(0, 0, 'hud-top').setOrigin(0).setDepth(8);                      
    this.add.image(0, H, 'hud-bot').setOrigin(0, 1).setDepth(8);                  
    this.noise = this.add.graphics().setDepth(7.5);                               
    this.redFlash = this.add.rectangle(0, 0, W, H, 0x8d1717, 1).setOrigin(0).setDepth(9).setAlpha(0);  
    this.hudG = this.add.graphics().setDepth(12);                                  

    this.hud = this.txt(26, 14, '12:00 AM', 30, '#e8f0ec', true);                
    this.txt(28, 50, 'NIGHT SHIFT  /  WARD 09', 10, '#7f968e');
    this.rec = this.txt(480, 16, '', 13, '#e8f0ec', true).setOrigin(0.5, 0);       
    this.stamp = this.txt(480, 36, '', 10, '#8aa299').setOrigin(0.5, 0);         
    this.txt(790, 10, 'FLASHLIGHT', 10, '#7f968e');                                
    this.pw = this.txt(934, 10, '100%', 11, '#d6e2dc', true).setOrigin(1, 0);      
    this.txt(738, 10, 'DOOR', 10, '#7f968e');                                     
    this.toasts = [0, 1, 2, 3].map(() => this.txt(28, 76, '', 12, '#d6e2dc').setWordWrapWidth(380));   
    this.center = this.txt(480, 300, '', 14, '#9fb6ad', true).setOrigin(0.5);     
    this.msgT = this.txt(480, 392, '', 16, '#f0c98a', true).setOrigin(0.5);       
    this.miniText = this.txt(480, 400, '', 11, '#e8d3a0', true).setOrigin(0.5);   

  
    const A = (fn) => () => { if (!this.paused && !this.over) fn(); };

    this.thumbs = NAMES.map((name, i) => {
      const x = 244 + i * 120, y = 461;
      const im = this.add.image(x, y, 'cam' + i).setOrigin(0).setDisplaySize(112, 63).setTint(0x3c4c47).setDepth(10).setInteractive({ useHandCursor: true });
      im.on('pointerdown', A(() => this.pick(i)));
      this.txt(x + 6, y + 4, 'CAM 0' + (i + 1), 9, '#e8f0ec', true); this.txt(x + 6, y + 50, name, 8, '#9fb6ad');
      return im;
    });

    this.repB = this.chip(784, 392, 152, 36, 'REPORT ANOMALY', A(() => this.report()), 'danger');
    this.norB = this.chip(784, 434, 152, 36, 'CONFIRM NORMAL', A(() => this.confirm()), 'accent');
    this.sealB = this.chip(784, 476, 152, 36, 'SEAL DOOR', A(() => this.sealDoor()));

    this.flB = this.chip(784, 58, 152, 28, 'FLASHLIGHT  [F]', A(() => this.toggleLight()), 'accent');
    this.rchB = this.chip(784, 92, 152, 28, 'RECHARGE', A(() => this.startMini()));

    this.ansB = this.chip(26, 394, 190, 34, 'ANSWER', A(() => this.answer()), 'danger');
    this.ignB = this.chip(26, 434, 190, 30, 'IGNORE', A(() => { this.call = null; this.say('You let it ring.'); }));
    this.patB = this.chip(26, 474, 190, 34, 'GO TO BREAKER', A(() => this.patrol()), 'accent');


    this.cover = this.add.rectangle(0, 0, W, H, 0x000000, 0.86).setOrigin(0).setDepth(15).setVisible(false).setInteractive();   
    this.pauseT = this.txt(480, 215, 'PAUSED', 30, '#e6f0eb', true).setOrigin(0.5).setDepth(16).setVisible(false);
    this.resB = this.chip(370, 268, 220, 38, 'RESUME', () => this.pause(false), 'accent');
    this.menB = this.chip(370, 316, 220, 38, 'RETURN TO TITLE', () => this.scene.start('Menu'));
    [this.resB, this.menB].forEach((b) => { b.depth(17); b.show(false); });


    const ov = [];                                                 
    ov.push(this.add.rectangle(0, 0, W, H, 0x020505, 0.95).setOrigin(0).setDepth(20).setInteractive());  
    const card = this.add.graphics().setDepth(21);
    card.fillStyle(0x0a1210, 1).fillRect(190, 90, 580, 360).lineStyle(1, 0x3d554d, 1).strokeRect(190, 90, 580, 360).fillStyle(0xd45a50, 1).fillRect(190, 90, 4, 360);
    ov.push(card);
    ov.push(this.txt(218, 112, 'NIGHT OPERATIONS', 20, '#e6f0eb', true).setDepth(22));
    ov.push(this.txt(218, 140, 'You are covering the security desk until 06:00 AM.', 11, '#8aa299').setDepth(22));
    BRIEF.forEach(([k, v], i) => {                          
      ov.push(this.txt(218, 184 + i * 44, k, 13, '#f0c98a', true).setDepth(22));
      ov.push(this.txt(318, 185 + i * 44, v, 11, '#cfdcd6').setWordWrapWidth(430).setDepth(22));
    });
    const go = this.txt(480, 418, 'CLICK TO BEGIN YOUR SHIFT', 12, '#e6f0eb', true).setOrigin(0.5).setDepth(22); ov.push(go);
    ov[0].on('pointerdown', () => { ov.forEach((o) => o.destroy()); this.intro = false; this.paused = false; this.say('Shift started. Camera network online.'); });


    this.input.keyboard.on('keydown-ESC', () => { if (!this.intro && !this.over) this.pause(!this.paused); });      
    this.input.keyboard.on('keydown-F', () => { if (!this.paused && !this.over) this.toggleLight(); });           
    this.debug = this.txt(28, 330, '', 10, '#9fe0c0').setVisible(false).setDepth(14);                             
    this.input.keyboard.on('keydown-H', () => this.debug.setVisible(!this.debug.visible));                      
    this.input.keyboard.on('keydown-SPACE', () => { if (!this.paused && !this.over) this.hit(); });              

    this.events.off('wake');                                     
    this.events.on('wake', () => {
      const r = this.registry.get('patrol') || { used: 0 };      
      this.power.spend(r.used); this.power.gain(25); this.breaker = false;  
      this.say('Breaker restored. Reserve charge added to the flashlight.'); audio.step(2);
    });
    this.say(HINTS[0]);
  }

  // GAMEPLAY LOGIC


  pause(v) { this.paused = v; this.pauseT.setVisible(v); this.cover.setVisible(v); this.resB.show(v); this.menB.show(v); if (v) audio.stop('ambience'); else audio.loop('ambience', 0.12); }


  say(m) { this.log.push({ m: `${this.clock.label()}  ${m}`, born: this.time.now }); if (this.log.length > 6) this.log.shift(); }


  ring(c) { this.call = { ...c, exp: this.clock.t + 14 }; this.say(c.text); audio.ring(); }


  toggleLight() { if (this.power.out) return this.say('Flashlight cell is empty. Recharge it.'); this.light = !this.light; }


  pick(i) { if (i === this.cam) return; this.cam = i; this.staticT = 0.22; }



  report() {
    if (this.lock > 0 || this.mini) return;                       
    const a = this.an.active[this.cam]; this.lock = 0.45;
    if (a && a.d) { delete this.an.active[this.cam]; this.say(`Reported: ${a.n}.`); audio.good(); }
    else { if (a) delete this.an.active[this.cam]; this.mistake(); this.say('FALSE REPORT. Something moved closer.'); audio.bad(); }
  }



  confirm() {
    if (this.lock > 0 || this.mini) return;
    const a = this.an.active[this.cam]; this.lock = 0.45;
    if (a && a.d) { this.mistake(); this.say('WRONG. A dangerous change was marked normal.'); audio.bad(); }
    else { if (a) delete this.an.active[this.cam]; this.say('Feed confirmed normal.'); audio.good(); }
  }



  sealDoor() {
    if (this.final) { if (this.final.knock) return this.survive(); return this.die('You answered the thing using your own voice.'); }
    this.seal = 7.5; audio.creak(); this.say('Office door sealed for seven seconds.');
  }


  // final intercom test kills you.
  answer() {
    if (!this.call) return; const c = this.call; this.call = null;
    if (this.final) return this.die('You opened the line after it used your voice.');
    if (c.bad) { this.mistake(); this.say('The voice was not a caller. It knows where you are.'); } else this.say('Nothing useful came through.');
  }


  patrol() {
    if (!this.breaker) return;
    if (this.ent.stage >= 3) return this.die('The warning light was red. The corridor was not safe.');
    this.registry.set('pw', this.power.p);                       
    this.scene.sleep(); this.scene.launch('Patrol');              
  }


  mistake() { this.ent.mistake(); if (this.ent.stage >= 1) audio.step(this.ent.stage); if (this.ent.stage >= 4) this.startFinal(); }



//minigame
  startMini() {
    if (this.mini || this.rcd > 0 || this.power.p >= 99) return;   
    this.light = false;                                          
    this.mini = { x: 0, dir: 1, zone: 40 + Math.random() * (BAR - ZONE - 80), attempt: 0, hits: 0 };
  }
  miniUpdate(dt) {                                                 
    const m = this.mini; m.x += m.dir * 380 * dt;
    if (m.x >= BAR - 6) { m.x = BAR - 6; m.dir = -1; } if (m.x <= 0) { m.x = 0; m.dir = 1; }
  }
  hit() {                                                         
    const m = this.mini; if (!m) return;
    m.attempt += 1;
    if (m.x + 3 >= m.zone && m.x + 3 <= m.zone + ZONE) { m.hits += 1; audio.good(); } else audio.bad();   
    m.zone = 20 + Math.random() * (BAR - ZONE - 40);               
    if (m.attempt >= 3) {                                           // 3 hits +28%, 2 hits +17%, 1 hit +7
      const gain = m.hits === 3 ? 28 : m.hits === 2 ? 17 : m.hits === 1 ? 7 : 0;
      this.power.gain(gain); this.say(gain ? `Cell calibrated. +${gain}% flashlight charge.` : 'Calibration failed. No charge gained.');
      this.mini = null; this.rcd = 18;                            
    }
  }

  survive() { this.final = null; this.call = null; this.ent.stage = 2; this.say('The lock holds. The footsteps move away.'); }

  die(reason) { if (this.over) return; this.over = true; this.scene.start('Over', { win: false, reason, time: this.clock.label() }); }

  startFinal() {
    if (this.final || this.over) return;                            // already running
    const knock = Math.random() < 0.52; this.final = { knock, t: 5.5 };
    if (knock) { this.say('THREE KNOCKS. SEAL THE DOOR NOW.'); audio.knock(); }
    else { this.call = { kind: 'intercom', bad: true, text: '', exp: 99 }; this.say('THE INTERCOM IS OPEN. IT IS USING YOUR VOICE. DO NOT ANSWER.'); audio.ring(); }
  }

  update(_, ms) {
    const dt = Math.min(ms, 100) / 1000;                          
    this.render();                                                  
    if (this.paused || this.over) return;                           

    this.clock.update(dt); const hour = this.clock.hour;
    if (this.clock.done) { this.over = true; return this.scene.start('Over', { win: true, time: '06:00 AM' }); }

    if (this.power.out) this.light = false;
    this.power.update(dt, this.light ? 2.35 : 0);
    this.rcd = Math.max(0, this.rcd - dt); if (this.mini) this.miniUpdate(dt);

    if (this.an.active[3]?.id === 'crier') { this.cryT -= dt; if (this.cryT <= 0) { audio.cry(); this.cryT = 5.4; } }
    if (this.an.fresh) { audio.cue(this.an.fresh.id); this.an.fresh = null; this.an.t = spawnGap(hour); }

    if (hour !== this.hourSeen) { this.hourSeen = hour; if (HINTS[hour] && hour > 0) this.say(HINTS[hour]); }

    this.staticT = Math.max(0, this.staticT - dt); this.lock = Math.max(0, this.lock - dt); this.seal = Math.max(0, this.seal - dt);

    while (this.sched.length && this.clock.t >= this.sched[0].t) this.sched.shift().f();
    if (this.call && !this.final && this.clock.t > this.call.exp) this.call = null;   // unanswered calls expire

    this.creakT -= dt; if (this.creakT <= 0) { audio.creak(); this.creakT = 22 + Math.random() * 18; }

    for (const a of this.an.update(dt, hour, this.ent.stage)) { this.say(`MISSED: ${a.n}. It moved closer.`); this.mistake(); }

    this.ent.update(dt);
    for (const e of this.ent.ev.splice(0)) {
      if (e === 'moved') this.say(['', 'Footsteps in the east corridor.', 'A second set of steps. Much closer.', 'Something is standing outside the washroom.'][this.ent.stage] || 'The office door handle turns.');
      else if (e === 'arrived') this.startFinal();
    }

    if (this.final) { this.final.t -= dt; if (this.final.t <= 0) { if (this.final.knock) this.die('You did not seal the door after the knocks.'); else this.survive(); } }

    if (this.breaker && Math.random() < 0.025) this.staticT = 0.25;
    if (this.power.out && !this.warnedOut) { this.warnedOut = true; this.say('FLASHLIGHT CELL EMPTY. Recharge it to inspect the feeds.'); }
  }

  render() {
    const an = this.an.active[this.cam];                           
    const time = this.time.now / 1000, lit = this.light && !this.power.out, g = this.hudG;

    this.view.setTexture(`cam${this.cam}`); this.view.x = this.staticT > 0 ? Math.round((Math.random() - 0.5) * 6) : 0;

    const o = an ? OBJECTS[an.id] : null;
    this.anomalyVisual.setVisible(Boolean(o)); this.flickerGlow.setVisible(Boolean(o && an.id === 'flicker'));
    if (o) {
      this.anomalyVisual.setTexture(o.key).setPosition(W * o.x, H * o.y).setScale(o.scale * K).setAngle(o.angle || 0).setAlpha(0.95).setTint(o.tint || 0xffffff).setFlipX(Boolean(o.flipX));
      if (an.id === 'flicker') {                                    
        const on = Math.sin(time * 26) > 0.15;
        this.anomalyVisual.setTexture(on ? 'asset-emergency-on' : 'asset-emergency-off').setAlpha(on ? 1 : 0.22);
        this.flickerGlow.setPosition(W * o.x, H * o.y).setFillStyle(0xb63b31, on ? 0.18 : 0.015).setSize(200, 110);
      }
    }

    const en = ENTITY_STAGES[this.ent.stage], showEn = Boolean(en && en.cam === this.cam);
    this.entityVisual.setVisible(showEn); this.entityEcho.setVisible(showEn && this.ent.stage >= 2);
    if (showEn) {
      const ex = W * en.x, ey = H * en.y, sh = 1 + Math.sin(time * 8) * (this.ent.stage >= 2 ? 0.025 : 0.008);   
      this.entityVisual.setPosition(ex, ey).setScale(en.scale * K * sh).setAlpha(en.alpha).setTint(en.tint).setAngle(en.angle).setFlipX(this.ent.stage === 2);
      if (this.ent.stage >= 2) this.entityEcho.setPosition(ex + 24, ey - 4).setScale(en.scale * K * 1.08).setAlpha(0.22 + Math.sin(time * 9) * 0.06).setTint(0x9d3430).setAngle(-en.angle).setFlipX(true);   // red ghost copy
    }

    this.flashMask.clear();
    const beam = this.power.p < 18 ? 200 : 270;                   
    [[1, 0.22], [0.85, 0.3], [0.65, 0.45], [0.45, 0.6], [0.25, 0.8]].forEach(([r, a]) => this.flashMask.fillStyle(0xffffff, a).fillCircle(0, 0, beam * r));
    this.dark.clear(); this.dark.fill(0x000000, 1);             
    if (lit) { const p = this.input.activePointer; this.dark.erase(this.flashMask, Phaser.Math.Clamp(p.x, 10, W - 10), Phaser.Math.Clamp(p.y, 10, H - 10)); }

    this.noise.clear();
    if (this.staticT > 0 || (this.breaker && Math.sin(time * 11) > 0.85))
      for (let i = 0; i < 40; i++) this.noise.fillStyle(0xcbd7d3, Math.random() * 0.22).fillRect(Math.random() * W, Math.random() * H, 20 + Math.random() * 80, 1);

    const stage = this.ent.stage;
    this.redFlash.setAlpha(this.final ? 0.1 + Math.sin(time * 9) * 0.05 : stage >= 3 ? 0.04 + Math.sin(time * 5) * 0.02 : 0);

    const p = Math.ceil(this.power.p);
    this.hud.setText(this.clock.label());
    this.rec.setText(`${Math.sin(time * 4) > 0 ? '●' : ' '} REC   CAM 0${this.cam + 1}  ${NAMES[this.cam]}`);   
    this.stamp.setText(`03-14-1998   ${this.staticT > 0 ? 'SIGNAL INTERFERENCE' : this.breaker ? 'SIGNAL UNSTABLE' : 'IR OFF'}`);
    this.pw.setText(`${p}%`).setColor(p < 22 ? '#e27b72' : '#d6e2dc');   
    this.msgT.setText(this.final ? `${Math.ceil(this.final.t)}` : '');  
    this.center.setText(this.mini ? '' : this.power.out ? 'CELL EMPTY  -  RECHARGE' : !lit && this.clock.t < 90 ? 'PRESS [F] TO USE THE FLASHLIGHT' : '').setAlpha(0.6 + Math.sin(time * 3) * 0.3);

    let y = 76; const now = this.time.now;
    this.toasts.forEach((t, i) => {
      const e = this.log[this.log.length - 1 - i];
      if (!e) return t.setText('');
      const age = (now - e.born) / 1000, a = Phaser.Math.Clamp((1 - i * 0.22) * (1 - (age - 9) / 4), 0, 1);
      t.setText(e.m).setAlpha(a).setY(y); y += a > 0 ? t.height + 6 : 0;   // stack lines under each other
    });

    this.flB.label(lit ? 'LIGHT ON  [F]' : 'FLASHLIGHT  [F]'); this.flB.dim(false);
    this.rchB.label(this.rcd > 0 ? `COOLING  ${Math.ceil(this.rcd)}s` : 'RECHARGE'); this.rchB.dim(this.rcd > 0 || Boolean(this.mini) || p >= 99);
    this.repB.dim(this.lock > 0 || Boolean(this.mini)); this.norB.dim(this.lock > 0 || Boolean(this.mini));
    this.ansB.show(Boolean(this.call) && !this.paused);           
    this.ignB.show(Boolean(this.call) && !this.final && !this.paused);
    this.patB.show(this.breaker && !this.paused);                  

    g.clear();
    const cells = Math.ceil(p / 10);                             
    for (let i = 0; i < 10; i++) g.fillStyle(i < cells ? (p < 22 ? 0xc6574d : 0x8fc0aa) : 0x1b2724, i < cells ? 0.95 : 0.8).fillRect(790 + i * 14.4, 26, 11, 14);
    const red = stage >= 3 && Math.sin(time * 6) > -0.3;         
    g.fillStyle(red ? 0xff3a30 : 0x2a1412, 1).fillCircle(766, 32, 8); g.lineStyle(1, 0x000000, 0.7).strokeCircle(766, 32, 8);
    this.thumbs.forEach((im, i) => { g.lineStyle(i === this.cam ? 2 : 1, i === this.cam ? 0xe6f0eb : 0x3d4f4a, i === this.cam ? 1 : 0.9).strokeRect(im.x, im.y, 112, 63); });   
    if (this.mini) {                                                // recharge bar
      const m = this.mini, bx = 480 - BAR / 2;
      g.fillStyle(0x040808, 0.85).fillRoundedRect(bx - 20, 380, BAR + 40, 64, 6).lineStyle(1, 0x3d554d, 1).strokeRoundedRect(bx - 20, 380, BAR + 40, 64, 6);
      g.fillStyle(0x16221f, 1).fillRect(bx, 414, BAR, 14); g.fillStyle(0x2e9a6b, 1).fillRect(bx + m.zone, 414, ZONE, 14); g.fillStyle(0xf0f5f2, 1).fillRect(bx + m.x, 410, 6, 22);
      this.miniText.setText(`RECHARGE  -  PRESS SPACE IN THE GREEN BAND   ${m.attempt}/3`);
    } else this.miniText.setText('');

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
