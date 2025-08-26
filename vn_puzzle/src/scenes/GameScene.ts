import Phaser from 'phaser';

const W = 1280, H = 720;

export default class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  preload() {
    // nền map để làm backdrop (SVG hoặc PNG)
    this.load.svg?.('menu-map', 'assets/map/level1_map.svg', { width: W, height: H });
    // this.load.image('menu-map', 'assets/map/level1_map.png'); // fallback nếu cần
  }

  create() {
    // Gradient nền (vẽ bằng 2 rect xếp chồng với alpha)
    const bg1 = this.add.rectangle(W/2, H/2, W, H, 0xe6f2ff).setAlpha(1);
    const bg2 = this.add.rectangle(W/2, H/2, W, H, 0xffffff).setAlpha(0.6);

    // Bubbles động cho vui mắt
    for (let i=0;i<18;i++){
      const c = this.add.circle(Phaser.Math.Between(0,W), Phaser.Math.Between(0,H), Phaser.Math.Between(10,28), 0xdbe4ff);
      this.tweens.add({ targets: c, y: c.y - Phaser.Math.Between(40,120), yoyo: true, duration: Phaser.Math.Between(1800,2800), repeat: -1, delay: Phaser.Math.Between(0,800) });
    }

    // Backdrop map mờ
    const hasSVG = (this.textures as any).exists('menu-map');
    const map = hasSVG ? this.add.image(W/2, H/2, 'menu-map') : this.add.image(W/2, H/2, 'menu-map');
    map.setDisplaySize(W, H).setAlpha(0.18).setDepth(-5);

    // ---- Shadow (lớp dưới, hơi lệch) ----
    this.add.rectangle(W/2 + 6, H/2 + 8, 700, 440, 0x000000, 0.12)
    .setDepth(-1); // thấp hơn panel
    // Panel giữa cho menu
    const panel = this.add.rectangle(W/2, H/2, 680, 420, 0xffffff, 0.95).setStrokeStyle(3, 0x457b9d);

    // Tiêu đề
    this.add.text(W/2, 200, 'XẾP HÌNH BẢN ĐỒ VIỆT NAM', {
      fontFamily: 'Inter, system-ui, sans-serif', fontSize: '36px', color: '#1b1b1b'
    }).setOrigin(0.5);

    this.add.text(W/2, 238, 'Chọn chế độ chơi', {
      fontFamily: 'Inter, system-ui, sans-serif', fontSize: '18px', color: '#4a5568'
    }).setOrigin(0.5);

    // Nút Level 1 (enabled) + các level khác (disabled)
    this.makeButton(W/2, 310, 520, 64, 'Level 1 — Gắn nhãn tên tỉnh', true, () => this.scene.start('Phase1_Level1_Scene'));
    this.makeButton(W/2, 380, 520, 64, 'Level 2 — Mảnh là hình tỉnh (có tên)', false);
    this.makeButton(W/2, 450, 520, 64, 'Level 3 — Hình tỉnh + gợi ý tên', false);
    // có thể thêm Level 4 sau
  }

  private makeButton(x:number,y:number,w:number,h:number,label:string,enabled:boolean,onClick?:()=>void){
    const fill = enabled ? 0xffffff : 0xf1f5f9;
    const stroke = enabled ? 0x1d4ed8 : 0x94a3b8;
    const rect = this.add.rectangle(x,y,w,h,fill).setStrokeStyle(2,stroke).setOrigin(0.5)
      .setInteractive({ useHandCursor: enabled });
    const t = this.add.text(x,y,label,{
      fontFamily:'Inter, system-ui, sans-serif', fontSize:'20px', color: enabled ? '#1d4ed8' : '#64748b'
    }).setOrigin(0.5);
    if (!enabled) { rect.disableInteractive(); return; }
    rect.on('pointerover',()=>rect.setFillStyle(0xf0f9ff));
    rect.on('pointerout', ()=>rect.setFillStyle(fill));
    rect.on('pointerdown',()=>{
      this.tweens.add({ targets: rect, scaleX:0.98, scaleY:0.98, duration:80, yoyo:true });
      onClick && onClick();
    });
  }
}
