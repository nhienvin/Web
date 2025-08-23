import Phaser from 'phaser'

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot') }
  preload() { this.load.json('pieces', 'assets/data/pieces.json') }
  create() {
    const pieces = this.cache.json.get('pieces') as any[]
    pieces.forEach(p => this.load.text(p.id, p.svg))
    this.load.once('complete', () => {
      pieces.forEach(p => {
        const svgText: string = this.cache.text.get(p.id)
        const base64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgText)))
        this.textures.addBase64(p.id, base64)
      })
      this.scene.start('Game', { pieces })
    })
    this.load.start()
  }
}
