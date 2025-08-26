import Phaser from 'phaser';

type LabelPiece = {
  id: string;
  text: string;
  start: { x: number; y: number };
  target: { x: number; y: number };
  fontSize?: number;
};

const W = 1280, H = 720;
const SNAP_DIST = 28;
const CORRECT_TINT = 0x31c48d;
const HOVER_TINT   = 0xfff3a3;
const RIGHT_PANE_W = 400;  // nhớ build asset cùng thông số --right-pane

export default class Phase1_Level1_Scene extends Phaser.Scene {
  private pieces: LabelPiece[] = [];
  private placedCount = 0;
  private sfxOK?: Phaser.Sound.BaseSound;
  private sfxNG?: Phaser.Sound.BaseSound;
  private palette = [0x4cc9f0,0x4895ef,0x4361ee,0x3f37c9,0x560bad,0xb5179e,0xf72585,0xff8500,0x2ec4b6,0x80ed99];

  constructor(){ super('Phase1_Level1_Scene'); }

  preload(){
    // map nền
    this.load.svg?.('level1-map', 'assets/map/level1_map.svg', { width: W, height: H });
    // this.load.image('level1-map', 'assets/map/level1_map.png');

    // data nhãn
    this.load.json('level1-pieces', 'assets/data/level1_pieces.json');

    // âm thanh (bạn thêm file vào public/assets/audio/)
    this.load.audio('sfx-correct', ['assets/audio/correct.mp3','assets/audio/correct.ogg']);
    this.load.audio('sfx-wrong',   ['assets/audio/wrong.mp3','assets/audio/wrong.ogg']);
  }

  create(){
    // BG nhẹ
    this.add.rectangle(W/2, H/2, W, H, 0xf8fbff);

    // map ở bên trái (đã có khung trong SVG; vẫn set size để chắc)
    const map = this.add.image(W/2, H/2, 'level1-map').setDisplaySize(W, H).setDepth(-5);

    // vẽ panel phải
    const panelX = W - RIGHT_PANE_W/2 - 24;
    const panel = this.add.rectangle(panelX, H/2, RIGHT_PANE_W, H - 48, 0xffffff).setStrokeStyle(2, 0x94a3b8);
    this.add.text(panelX, 60, 'Kéo tên tỉnh vào bản đồ', {
      fontFamily:'Inter, system-ui, sans-serif', fontSize:'20px', color:'#1f2937'
    }).setOrigin(0.5);

    // nút Back (về menu)
    const back = this.add.text(20, 14, '← Menu', {
      fontFamily:'Inter, system-ui, sans-serif', fontSize:'18px', color:'#1d4ed8', backgroundColor:'#e2e8f0'
    }).setPadding(8,6,8,6).setInteractive({ useHandCursor:true });
    back.on('pointerdown', ()=> this.scene.start('GameScene'));

    // tải sfx
    this.sfxOK = this.sound.get('sfx-correct') || this.sound.add('sfx-correct', { volume: 0.7 });
    this.sfxNG = this.sound.get('sfx-wrong')   || this.sound.add('sfx-wrong',   { volume: 0.7 });

    // pieces
    this.pieces = this.cache.json.get('level1-pieces') as LabelPiece[];
    this.pieces.forEach((p,i)=> this.spawnLabel(p,i));

    // tiến độ
    const progress = this.add.text(W - RIGHT_PANE_W - 10, H - 28, `0 / ${this.pieces.length}`, {
      fontFamily:'Inter, system-ui, sans-serif', fontSize:'16px', color:'#4b5563'
    }).setOrigin(0,0.5);

    this.events.on('piece-placed', ()=>{
      this.placedCount++;
      progress.setText(`${this.placedCount} / ${this.pieces.length}`);
      if (this.placedCount === this.pieces.length){
        this.time.delayedCall(250, ()=> this.showWinDialog());
      }
    });
  }

  private spawnLabel(p: LabelPiece, idx: number){
    const text = this.add.text(0,0,p.text,{
      fontFamily:'Inter, system-ui, sans-serif',
      fontSize:`${p.fontSize || 20}px`, color:'#1f2937'
    }).setOrigin(0.5);
    const padX=10,padY=8;
    const bg = this.add.rectangle(0,0, text.width+padX*2, text.height+padY*2, 0xffffff)
      .setStrokeStyle(2, 0x222222).setOrigin(0.5);

    const box = this.add.container(p.start.x, p.start.y, [bg,text]);
    box.setSize(bg.width, bg.height);
    box.setData('piece', p);
    box.setData('placed', false);
    text.setTint(this.palette[idx % this.palette.length]);

    box.setInteractive(new Phaser.Geom.Rectangle(-bg.width/2, -bg.height/2, bg.width, bg.height), Phaser.Geom.Rectangle.Contains);
    this.input.setDraggable(box);

    box.on('pointerover', ()=> { if (!box.getData('placed')) text.setTint(HOVER_TINT); });
    box.on('pointerout',  ()=> { if (!box.getData('placed')) text.setTint(this.palette[idx % this.palette.length]); });

    // drag
    this.input.on(
      'drag',
      (_ptr: Phaser.Input.Pointer, obj: Phaser.GameObjects.Container, dragX: number, dragY: number) => {
        if (obj === box && !box.getData('placed')) box.setPosition(dragX, dragY);
      }
    );

    // dragend
    this.input.on(
      'dragend',
      (_ptr: Phaser.Input.Pointer, obj: Phaser.GameObjects.Container) => {
        if (obj !== box || box.getData('placed')) return;
        const piece = box.getData('piece') as LabelPiece;
        const dx = box.x - piece.target.x;
        const dy = box.y - piece.target.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= SNAP_DIST) {
          box.setPosition(piece.target.x, piece.target.y);
          box.setData('placed', true);
          text.setTint(CORRECT_TINT);
          (bg as any).setStrokeStyle(2, 0x2a9d8f);
          box.disableInteractive();
          this.sfxOK?.play();
          this.events.emit('piece-placed');
        } else {
          this.tweens.add({ targets: box, x: box.x + 6, duration: 60, yoyo: true, repeat: 1 });
          this.sfxNG?.play();
        }
      }
    );

  }

  private showWinDialog(){
    const panel = this.add.rectangle(W/2, H/2, 520, 200, 0xffffff).setStrokeStyle(3, 0x222222);
    const title = this.add.text(W/2, H/2 - 30, 'Tuyệt vời!', {
      fontFamily:'Inter, system-ui, sans-serif', fontSize:'36px', color:'#065f46'
    }).setOrigin(0.5);
    const again = this.add.text(W/2, H/2 + 34, 'Chơi lại', {
      fontFamily:'Inter, system-ui, sans-serif', fontSize:'20px', color:'#1d4ed8', backgroundColor:'#e2e8f0'
    }).setOrigin(0.5).setPadding(10,8,10,8).setInteractive({ useHandCursor:true });

    again.on('pointerdown', ()=> this.scene.restart());

    // thêm nút về menu ngay trong hộp thoại
    const back = this.add.text(W/2, H/2 + 76, 'Về Menu', {
      fontFamily:'Inter, system-ui, sans-serif', fontSize:'18px', color:'#334155'
    }).setOrigin(0.5).setInteractive({ useHandCursor:true });
    back.on('pointerdown', ()=> this.scene.start('GameScene'));
  }
}
