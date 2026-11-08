import Phaser from 'phaser';
import { T, btn, panel } from '../ui.js';
import audio from '../systems/AudioManager.js';

export default class Over extends Phaser.Scene {
  constructor() { 
    super('Over'); 
  }

  create(data) {
    this.add.rectangle(0, 0, 960, 540, 0x020505).setOrigin(0);

    if (data.win) {
      this.add.image(480, 270, 'cam2').setDisplaySize(960, 540).setTint(0x778b82).setAlpha(0.36);
      this.add.rectangle(0, 0, 960, 540, 0x020505, 0.76).setOrigin(0);
      panel(this, 170, 112, 620, 318, 0x57766a);
      T(this, 480, 165, 'SHIFT COMPLETE', 34, '#d6e6de', 'bold').setOrigin(0.5);
      T(this, 480, 244, '06:00 AM. The replacement arrives early.\n\nHis badge reads your name.\nHe has your face.\n\nThe incident log lists no events.', 17, '#c7d5ce').setOrigin(0.5).setAlign('center').setLineSpacing(8);
      this.menuButtons();
      return;
    }

    const scare = this.add.image(480, 270, 'jumpscare').setDisplaySize(960, 540).setDepth(4).setAlpha(1);

    audio.scare();

    this.cameras.main.shake(1100, 0.025);
    this.cameras.main.flash(180, 220, 225, 220);

    const glitchInterval = this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        if (!scare.active) return;
        
        if (Math.random() > 0.4) {
          scare.setX(480 + (Math.random() * 24 - 12));
          scare.setTint(Math.random() > 0.5 ? 0xff3333 : 0x33ffff);
        } else {
          scare.setX(480);
          scare.clearTint();
        }
      }
    });

    this.time.delayedCall(1350, () => {
      glitchInterval.destroy();
      scare.destroy();
      
      this.add.rectangle(0, 0, 960, 540, 0x020505, 0.92).setOrigin(0);
      panel(this, 115, 92, 730, 350, 0x713c37);
      T(this, 480, 132, 'CONTAINMENT FAILURE', 30, '#e18a80', 'bold').setOrigin(0.5);
      T(this, 155, 190, `INCIDENT REPORT #09  /  ${data.time || '??:??'}\n\nCAUSE: ${data.reason || 'Unknown breach'}\n\nOFFICIAL RECORD (AMENDED):\n“Guard resigned voluntarily. No incident occurred.\nWard 09 has been empty since 1994.”`, 16, '#d1dcd6').setWordWrapWidth(650).setLineSpacing(7);
      
      this.menuButtons();
    });
  }

  menuButtons() {
    btn(this, 300, 470, 160, 38, 'NEW SHIFT', () => this.scene.start('Office'), 'accent');
    btn(this, 500, 470, 160, 38, 'MAIN MENU', () => this.scene.start('Menu'));
  }
}