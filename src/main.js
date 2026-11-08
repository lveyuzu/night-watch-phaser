import Phaser from 'phaser';
import Boot from './scenes/BootScene.js';
import Menu from './scenes/MenuScene.js';
import Office from './scenes/OfficeScene.js';
import Patrol from './scenes/PatrolScene.js';
import Over from './scenes/GameOverScene.js';
new Phaser.Game({type:Phaser.AUTO,width:960,height:540,parent:'game',backgroundColor:'#050808',pixelArt:true,scale:{mode:Phaser.Scale.FIT},scene:[Boot,Menu,Office,Patrol,Over]});
