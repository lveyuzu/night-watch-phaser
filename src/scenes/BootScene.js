import Phaser from 'phaser';

export default class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const loading = this.add.text(480, 270, 'INITIALISING SECURITY SYSTEMS…', {
      fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#b7c8c1', letterSpacing: 1
    }).setOrigin(0.5);
    this.load.on('loaderror', (file) => {
      loading.setText(`MISSING ASSET  /  ${file.key}`);
      console.warn(`[WARD 9] Missing ${file.src}`);
    });

    for (let i = 0; i < 4; i++) this.load.image(`cam${i}`, `assets/cams/cam${i}.jpg`);
    this.load.image('creature', 'assets/cams/creature.png');
    this.load.image('jumpscare', 'assets/cams/jumpscare.png');

    const base = 'assets/facility/';
    [
      ['pfloor', 'Tiles/floor_metal_plate_v2.png'],
      ['ofloor', 'Tiles/floor_grated.png'],
      ['pwall', 'Tiles/wall_front_left.png'],
      ['pdoor', 'Doors/door_auto_close.png'],
      ['pbox', 'Props/prop_electrical_box.png'],
      ['plight', 'Props/emergency_light_on.png'],
      ['psign', 'Props/prop_warning_signs_do_not_enter.png'],
      ['pblood', 'Decals/decal_blood_1.png'],
      ['asset-emergency-on', 'Props/emergency_light_on.png'],
      ['asset-emergency-off', 'Props/emergency_light_off.png'],
      ['asset-electrical-box', 'Props/prop_electrical_box.png'],
      ['asset-lab-bench', 'Props/prop_lab_bench.png'],
      ['asset-metal-shelf', 'Props/prop_metal_shelf.png'],
      ['asset-sign', 'Props/prop_warning_signs_CAUTION.png'],
      ['asset-door-open', 'Doors/door_auto_open.png'],
      ['asset-debris', 'Decals/prop_debris_scatter.png'],
      ['asset-leak', 'Decals/decal_old_leak_stain_1.png'],
      ['asset-door-broken', 'Doors/door_auto_broken.png'],
      ['asset-pipe', 'Props/prop_pipe.png'],
      ['asset-biohazard', 'Props/prop_warning_signs_BIOHAZARD.png'],
      ['asset-radiation', 'Props/prop_warning_signs_RADIATION.png'],
      ['asset-slime', 'Decals/decal_slime_puddle_1.png'],
      ['asset-quarantine', 'Decals/decal_quarantine_stripe_1.png']
    ].forEach(([key, file]) => this.load.image(key, base + file));
  }

  create() {
    
    const graphics = this.make.graphics({ add: false });
    const pixel = (color, x, y, w, h) => graphics.fillStyle(color, 1).fillRect(x, y, w, h);
    pixel(0x30403c, 2, 0, 8, 3); pixel(0x20302c, 1, 3, 10, 1);
    pixel(0xd2b48c, 3, 4, 6, 4); pixel(0x1a1a1a, 4, 5, 1, 1); pixel(0x1a1a1a, 7, 5, 1, 1);
    pixel(0x4a6a80, 2, 8, 8, 6); pixel(0x222a30, 2, 14, 3, 4); pixel(0x222a30, 7, 14, 3, 4);
    graphics.generateTexture('guard', 12, 18); graphics.clear();
    pixel(0x050505, 4, 0, 8, 8); pixel(0x050505, 2, 8, 12, 22);
    pixel(0x050505, 0, 10, 3, 18); pixel(0x050505, 13, 10, 3, 18);
    pixel(0xcc2222, 5, 3, 2, 2); pixel(0xcc2222, 9, 3, 2, 2);
    pixel(0x050505, 3, 30, 4, 10); pixel(0x050505, 9, 30, 4, 10);
    graphics.generateTexture('patient', 16, 40);
    this.scene.start('Menu');
  }
}
