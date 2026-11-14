import Phaser from 'phaser';
import {T} from '../ui.js';
import audio from '../systems/AudioManager.js';

export default class Patrol extends Phaser.Scene{
  constructor(){super('Patrol')}
  create(){
    this.p={x:90,y:272};this.light=true;this.done=false;this.scared=false;this.scare=0;this.en=null;this.used=0;this.sc=0;this.pw=this.registry.get('pw');
    this.add.rectangle(0,0,960,540,0x050808).setOrigin(0);
    this.add.tileSprite(0,150,960,86,'pwall').setOrigin(0).setTint(0x8a9a96);
    this.add.tileSprite(0,236,960,76,'pfloor').setOrigin(0).setTileScale(.3).setTint(0xb0c0bc);
    this.add.tileSprite(0,312,960,70,'pwall').setOrigin(0).setTint(0x445550);
    this.add.image(8,236,'pdoor').setOrigin(0,1).setScale(.5);
    this.add.image(880,236,'pbox').setOrigin(.5,1).setScale(.55);
    [260,520,740].forEach(x=>this.add.image(x,190,'plight').setScale(.6));
    this.add.image(420,195,'psign').setScale(.7);this.add.image(600,272,'pblood').setScale(.6).setAlpha(.8);
    this.pl=this.add.image(this.p.x,this.p.y,'guard').setScale(2.2);this.pat=this.add.image(0,0,'patient').setScale(2.2).setVisible(false);
    this.fx=this.add.image(780,262,'patient').setScale(2.4).setDepth(6).setVisible(false);
    this.rt=this.add.renderTexture(0,0,960,540).setOrigin(0,0).setDepth(5);
    this.m=this.make.graphics({add:false});this.m.fillStyle(0xffffff,1).fillCircle(0,0,125);
    this.m2=this.make.graphics({add:false});this.m2.fillStyle(0xffffff,1).fillCircle(0,0,30);
    this.k=this.input.keyboard.addKeys('W,A,S,D,E,F');
    this.hint=T(this,20,20,'WASD move · F flashlight · E interact. Reach the breaker (far right).',14,'#e0c070').setDepth(7);
    T(this,20,500,'← OFFICE DOOR (run here when done)',14,'#cfe').setDepth(7);
  }
  update(_,ms){
    const dt=Math.min(ms,100)/1000,k=this.k,p=this.p;
    if(Phaser.Input.Keyboard.JustDown(k.F))this.light=!this.light;
    if(this.pw<=0)this.light=false;
    if(this.light){this.used+=2.35*dt;this.pw-=2.35*dt}
    p.x=Phaser.Math.Clamp(p.x+((k.D.isDown?1:0)-(k.A.isDown?1:0))*110*dt,30,930);
    p.y=Phaser.Math.Clamp(p.y+((k.S.isDown?1:0)-(k.W.isDown?1:0))*110*dt,252,296);
    if(!this.scared&&p.x>420){this.scared=true;this.scare=1.4;audio.step(3);this.hint.setText('Something stood at the far end... and is gone.')}
    this.scare-=dt;
    if(Phaser.Input.Keyboard.JustDown(k.E)&&!this.done&&Math.abs(p.x-880)<50){
      this.done=true;this.en={x:Math.max(960,p.x+90)};audio.knock();this.hint.setText('BREAKER RESET. It is behind you. The light slows it. RUN.')}
    if(this.en){
      const lit=this.light&&Math.abs(this.en.x-p.x)<125;this.en.x-=(lit?45:92)*dt;
      this.sc+=dt;if(this.sc>.5){this.sc=0;audio.step(Math.max(1,4-Math.floor((this.en.x-p.x)/60)))}
      if(this.en.x-p.x<16){this.scene.stop('Office');return this.scene.start('Over',{win:false,reason:'Caught in the corridor during the patrol. The flashlight slows it; running in the dark does not.',time:'03:__ AM'})}
    }
    if(this.done&&p.x<60){this.registry.set('patrol',{used:this.used});this.scene.wake('Office');return this.scene.stop()}
    this.pl.setPosition(p.x,p.y);
    this.pat.setVisible(!!this.en);if(this.en)this.pat.setPosition(this.en.x,p.y-6);
    this.fx.setVisible(this.scare>0&&Math.sin(this.scare*40)>-.3);
    this.rt.clear();this.rt.fill(0x000000,.94);this.rt.erase(this.m2,p.x,p.y);if(this.light)this.rt.erase(this.m,p.x,p.y);
  }
}
