import Phaser from 'phaser';
import GameScene from './scenes/GameScene';
import Phase1_Level1_Scene from './scenes/Phase1_Level1_Scene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  backgroundColor: '#ffffff',
  parent: 'app',
  scene: [GameScene, Phase1_Level1_Scene], // GameScene là menu, Level1Scene là gameplay
};

new Phaser.Game(config);
