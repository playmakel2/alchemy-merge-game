import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';

const config = {
  type: Phaser.AUTO,
  width: 560,
  height: 660,
  backgroundColor: '#16213e',
  scene: GameScene,
};

new Phaser.Game(config);
