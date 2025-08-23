import Phaser from 'phaser'

type Piece = {
  id: string
  name: string
  svg: string
  start: { x:number, y:number, angle:number }
  target: { x:number, y:number, angle:number }
  scale: number
}

export default class GameScene extends Phaser.Scene {
  private pieces: Piece[] = []
  private placedCount = 0
  private selected?: Phaser.GameObjects.Image

  constructor() { super('Game') }

  init(data: { pieces: Piece[] }) { this.pieces = data.pieces }

  create() {
    // faint targets
    this.pieces.forEach(p => {
      this.add.image(p.target.x, p.target.y, p.id)
        .setScale(p.scale).setAngle(p.target.angle).setAlpha(0.2).setTint(0x8fb3ff)
    })

    // pieces
    this.pieces.forEach(p => {
      const img = this.add.image(p.start.x, p.start.y, p.id)
        .setScale(p.scale).setAngle(p.start.angle)
        .setInteractive({ draggable: true, useHandCursor: true })

      img.setData('target', p.target)

      img.on('drag', (_p: any, dragX: number, dragY: number) => { img.x = dragX; img.y = dragY })
      img.on('pointerdown', () => { this.selected = img })
      this.input.keyboard?.on('keydown-R', () => {
        if (this.selected === img && !img.getData('locked')) img.setAngle((img.angle + 15) % 360)
      })
      img.on('dragend', () => {
        if (img.getData('locked')) return
        const t = img.getData('target') as Piece['target']
        const dist = Phaser.Math.Distance.Between(img.x, img.y, t.x, t.y)
        const angDiff = Phaser.Math.Angle.WrapDegrees(img.angle - t.angle)
        if (dist <= 24 && Math.abs(angDiff) <= 10) {
          this.tweens.add({
            targets: img, x: t.x, y: t.y, angle: t.angle, duration: 180, ease: 'Sine.easeOut',
            onComplete: () => {
              img.setData('locked', true); img.disableInteractive(); img.setDepth(1)
              this.placedCount++; this.sound.play('ok', { volume: 0.3 })
              if (this.placedCount === this.pieces.length) this.onAllPlaced()
            }
          })
        } else {
          this.cameras.main.shake(60, 0.002); this.sound.play('boop', { volume: 0.2 })
        }
      })
    })

    // sounds
    this.load.audio('ok', 'assets/sfx/ok.mp3')
    this.load.audio('boop', 'assets/sfx/boop.mp3')
    this.load.once('complete', () => {}); this.load.start()
  }

  private onAllPlaced() {
    const banner = this.add.text(this.scale.width/2, 60, 'Hoàn thành!', {
      fontSize: '36px', color: '#fff', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'
    }).setOrigin(0.5)
    this.tweens.add({ targets: banner, y: 100, duration: 300, ease: 'Sine.easeOut' })
  }
}
