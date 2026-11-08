import Phaser from 'phaser';
import { T, btn, panel } from '../ui.js';
import audio from '../systems/AudioManager.js';

export default class Menu extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    this.add.image(480, 270, 'cam1').setDisplaySize(960, 540).setTint(0x87928c).setAlpha(0.5);
    this.add.rectangle(0, 0, 960, 540, 0x020606, 0.76).setOrigin(0);
    this.add.rectangle(0, 0, 960, 540, 0x07110f, 0.22).setOrigin(0);
    panel(this, 235, 76, 490, 392, 0x536d63);
    T(this, 480, 126, 'NIGHT SHIFT', 47, '#e0e9e4', 'bold').setOrigin(0.5);
    T(this, 480, 184, 'WARD 09  /  SECURITY DIVISION', 13, '#b7c7c0', 'bold').setOrigin(0.5);
    this.add.rectangle(350, 218, 260, 1, 0x668077, 0.85).setOrigin(0);
    T(this, 480, 245, 'MARCH 14, 1998     ·     12:00 AM', 11, '#a9bbb3').setOrigin(0.5);
    T(this, 480, 280, 'Your shift ends at 06:00.\nThe incident log is already open.', 16, '#d0dbd6').setOrigin(0.5).setAlign('center').setLineSpacing(8);
    this.settings = T(this, 480, 404, '', 11, '#91a69d').setOrigin(0.5);
    const update = () => this.settings.setText(`MASTER VOLUME  ${Math.round(audio.vol * 100)}%   ${audio.mute ? '· MUTED' : ''}`);
    btn(this, 316, 330, 38, 28, '−', () => { audio.setVolume(audio.vol - 0.08); update(); });
    btn(this, 365, 330, 38, 28, '+', () => { audio.setVolume(audio.vol + 0.08); update(); });
    btn(this, 414, 330, 132, 28, 'MUTE / UNMUTE', () => { audio.setMute(!audio.mute); update(); });
    btn(this, 294, 438, 176, 38, 'BEGIN SHIFT', () => { audio.init(); this.scene.start('Office'); }, 'accent');
    btn(this, 490, 438, 176, 38, 'CLOSE TERMINAL', () => { this.settings.setText('You can close this browser tab.'); });
    update();
    T(this, 480, 500, 'HEADPHONES RECOMMENDED  ·  F = FLASHLIGHT  ·  ESC = PAUSE', 10, '#82958d').setOrigin(0.5);
  }
}
