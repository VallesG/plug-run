// LANDING / MENUSCENE
// LANDING / MENUSCENE (rexUI)
import Phaser from 'phaser';

// Palette constants so we can theme later
const PALETTE = {
  bg: 0x0b0f16,
  panel: 0x101522,
  stroke: 0x2f3650,
  glow: 0x60a5fa,
  title: '#cbd1ff',
  sub: '#8aa0ff',
  chip: 0x2563eb
};

// Simple helper
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export class MenuScene extends Phaser.Scene {
  constructor(){ super('MENU'); }

  init(){
    this.cards = [];
    this.selected = 0;
    try {
      const saved = (typeof localStorage !== 'undefined') ? localStorage.getItem('lastMode') : null;
      if (saved){ this.selected =  Math.max(0, Math.min(4, parseInt(saved, 10) || 0)); }
    } catch {}

    this.dragging = false;
    this.dragStartX = 0;
    this.dragLastX = 0;
    this.dragPixels = 0; // total dx during a swipe
  }

  create(){
    // Background: subtle moving parallax bands
    const W = this.scale.width, H = this.scale.height;
    const bg = this.add.rectangle(W/2, H/2, W, H, PALETTE.bg, 1).setDepth(0);
    // moving bands
    const bands = this.add.group();
    const makeBand = (y, w, alpha)=>{
      const g = this.add.graphics().setDepth(0);
      g.fillStyle(0x0e1624, alpha).fillRect(0, 0, w, 18);
      const c = this.add.container(-w/2, y, [g]);
      c.w = w; return c;
    };
    for (let i=0;i<6;i++){
      const y = (H/6) * (i + 0.5);
      const w = W * (1.2 + 0.6 * Math.random());
      const a = 0.08 + 0.06 * Math.random();
      bands.add(makeBand(y, w, a));
    }
    this.time.addEvent({ loop:true, delay: 16, callback:()=>{
      bands.getChildren().forEach((b, idx)=>{
        b.x += (0.25 + 0.15*idx);
        if (b.x > W + b.w/2) b.x = -b.w/2;
      });
    }});

    // Top logo text
    this.logo = this.add.text(W/2, 36, 'PLUG RUN LA', {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial',
      fontSize: Math.max(22, Math.floor(H * 0.04)) + 'px',
      color: PALETTE.title,
      fontStyle: 'bold'
    }).setOrigin(0.5, 0).setDepth(5);

    // Cards data
    const modes = [
      { key:'learn', title:'Learn the Streets', sub:'Quick tutorial. Zero pressure.' },
      { key:'run',   title:'Run the Block',     sub:'Chain stash-house escapes. Build your rep.' },
      { key:'daily', title:'Daily Drop',        sub:'One shared route. Beat today\'s time.' },
      { key:'pvp',   title:'Street Wars',       sub:'PVP arena. Bring your loadout.' },
      { key:'talk',  title:'The Block Talk',    sub:'Leaderboards and stats.' }
    ];

    // Carousel root container to keep z-order tidy
    this.carousel = this.add.container(0, 0).setDepth(3);

    modes.forEach((m, idx)=>{
      const card = this.makeCard(m.title, m.sub); // rexUI-based card
      card.modeKey = m.key;
      card.index = idx;
      this.carousel.add(card);
      this.cards.push(card);
    });

    // Controls: swipe + arrows/A-D + Enter/Space
    this.input.on('pointerdown', (p)=>{
      this.dragging = true; this.dragStartX = p.x; this.dragLastX = p.x; this.dragPixels = 0;
      this._tapCandidate = null;
    });
    this.input.on('pointermove', (p)=>{
      if (!this.dragging) return;
      const dx = p.x - this.dragLastX; this.dragLastX = p.x; this.dragPixels += dx;
      // translate into fractional shift for tactile drag
      const spacing = this.cardSpacing();
      const shift = -(this.dragPixels / spacing);
      this.layoutCards(shift);
    });
    const endDrag = ()=>{
      if (!this.dragging) return;
      const total = this.dragLastX - this.dragStartX;
      this.dragging = false;
      if (this._tapDirectUsed){ this._tapDirectUsed = false; return; }
      if (total > 48) { this.selectPrev(); return; }
      if (total < -48) { this.selectNext(); return; }
      // Treat as a tap: launch tapped card if any; otherwise launch selected
      const tapped = this._tapCandidate;
      if (tapped){
        const idx = this.cards.indexOf(tapped);
        if (idx !== -1){
          // Single-tap launches the tapped card directly (also selects it)
          if (idx !== this.selected) this.setSelected(idx);
          this.launchCard(tapped);
          return;
        }
      }
      // No tap target? just snap back to layout
      this.layoutCards(0, true);
    };
    this.input.on('pointerup', endDrag);
    this.input.on('pointerupoutside', endDrag);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D,ENTER,SPACE,ESC');

    // Bottom-right settings/profile
    this.settingsBtn = this.makeIconButton('⚙', () => console.info('[Menu] Settings (stub)'));
    this.profileBtn  = this.makeIconButton('👤', () => console.info('[Menu] Profile (stub)'));
    // Bottom-left daily chip
    this.dailyChip = this.makeChip('Daily bonus +25', 0x16a34a);

    this.reposition();
    this.scale.on('resize', () => this.reposition());

    // Initial layout to selected index
    this.layoutCards(0, false);
  }

  // MENU: UI helpers -------------------------------------------------
  // MENUSCENE (rexUI): card built with rexUI label + sizers
  makeCard(title, sub){
    const W = this.scale.width, H = this.scale.height;
    const cw = Math.min(520, Math.floor(W * 0.82));
    const ch = Math.min(240, Math.floor(H * 0.34));

    // Background using rexUI rounded rectangle with per-card color
    const CARD_COLORS = [0x1E293B, 0x0ea5e9, 0x22c55e, 0xf59e0b, 0x6366f1, 0xef4444, 0x14b8a6, 0x8b5cf6];
    const color = CARD_COLORS[(Math.random()*CARD_COLORS.length)|0];
    const bg = this.rexUI.add.roundRectangle(0, 0, 0, 0, 10, color, 0.92)
      .setStrokeStyle(2, PALETTE.stroke);

    // Build a vertical sizer for stacked big title (word-per-line) + spacer + subtitle
    const vbox = this.rexUI.add.sizer({ orientation: 1, space: { top: 10, bottom: 12, item: 6 } });
    const titleBox = this.rexUI.add.sizer({ orientation: 1, space: { item: 2 } });
    const words = String(title).toUpperCase().split(/\s+/g).filter(Boolean);
    const titleSize = Math.max(20, Math.floor(Math.min(ch * 0.22, cw * 0.16)));
    words.forEach(w=>{
      const line = this.add.text(0, 0, w, {
        color: '#ffffff',
        fontFamily: 'ui-monospace, Menlo, Consolas, Monaco, monospace',
        fontStyle: 'bold',
        fontSize: titleSize + 'px',
        align: 'center',
        wordWrap: { width: Math.floor(cw*0.9) }
      }).setOrigin(0.5,0.5);
      titleBox.add(line, { proportion: 0, expand: false, align: 'center' });
    });

    const spacer = this.rexUI.add.space();
    const subTxt = this.add.text(0, 0, sub, {
      color: '#E5E7EB',
      fontSize: Math.max(12, Math.floor(ch*0.12)) + 'px',
      align: 'center',
      wordWrap: { width: Math.floor(cw*0.9) }
    }).setOrigin(0.5,0.5);

    vbox.add(titleBox, { proportion: 0, expand: false, align: 'center' });
    vbox.add(spacer,   { proportion: 1, expand: true });
    vbox.add(subTxt,   { proportion: 0, expand: false, align: 'center' });

    // Compose into rexUI label for interaction + background sizing
    const label = this.rexUI.add.label({
      width: cw,
      height: ch,
      background: bg,
      text: vbox,
      align: 'center',
      space: { left: 16, right: 16, top: 12, bottom: 12 }
    });
    label.layout();

    const cont = this.add.container(0, 0, [label]).setSize(cw, ch).setDepth(3);
    cont.setInteractive(new Phaser.Geom.Rectangle(-cw/2, -ch/2, cw, ch), Phaser.Geom.Rectangle.Contains);

    // Subtle glow under focused card
    const glow = this.add.ellipse(0, 0, cw * 1.2, ch * 1.4, PALETTE.glow, 0.18)
      .setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    cont.addAt(glow, 0);

    // Tap candidate: mark on pointerdown; also handle direct tap/click on release
    cont.on('pointerdown', ()=>{ this._tapCandidate = cont; });
    const directTap = ()=>{
      const moved = Math.abs((this.dragLastX||0) - (this.dragStartX||0));
      if (moved < 12){
        const idx = this.cards.indexOf(cont);
        if (idx !== -1){
          if (idx !== this.selected) this.setSelected(idx);
          this._tapDirectUsed = true;
          this.launchCard(cont);
        }
      }
    };
    cont.on('pointerup', directTap);
    cont._label?.setInteractive?.();
    cont._label?.on?.('pointerup', directTap);

    cont._glow = glow; cont._bg = bg; cont._label = label; cont._sub = subTxt;
    return cont;
  }

  makeIconButton(label, onClick){
    const r = Math.max(22, Math.floor(this.scale.height * 0.034));
    const bg = this.rexUI.add.roundRectangle(0, 0, r*2, r*2, r, PALETTE.panel, 0.92)
      .setStrokeStyle(2, PALETTE.stroke);
    const t = this.add.text(0, 0, label, { fontSize: Math.max(14, Math.floor(r*1.1)) + 'px', color: PALETTE.title }).setOrigin(0.5);
    const btn = this.add.container(0, 0, [bg, t]).setSize(r*2, r*2).setDepth(6);
    btn.setInteractive(new Phaser.Geom.Rectangle(-r, -r, r*2, r*2), Phaser.Geom.Rectangle.Contains)
      .on('pointerup', onClick);
    return btn;
  }

  makeChip(text, color){
    const c = this.add.container(0, 0).setDepth(6);
    const w = Math.max(120, Math.floor(this.scale.width * 0.28));
    const h = Math.max(26, Math.floor(this.scale.height * 0.036));
    const bg = this.add.rectangle(0, 0, w, h, color || 0x2563eb, 0.18).setStrokeStyle(1, color || 0x2563eb);
    const t  = this.add.text(0, 0, text, { color:'#cbd1ff', fontSize: Math.max(12, Math.floor(h*0.55)) + 'px' }).setOrigin(0.5);
    c.add([bg, t]);
    return c;
  }

  cardSpacing(){ return Math.min(520, Math.floor(this.scale.width * 0.82)) + Math.max(28, Math.floor(this.scale.width * 0.06)); }

  layoutCards(shift = 0, tweenBack = false){
    // shift: fractional movement towards next (+) / prev (-)
    const cx = this.scale.width / 2; const cy = this.scale.height * 0.54;
    const spacing = this.cardSpacing();

    const focusIdx = this.selected + shift;
    this.cards.forEach((card, i)=>{
      const x = cx + (i - focusIdx) * spacing;
      const y = cy;
      const d  = Math.abs(i - focusIdx);
      const scl = clamp(1.06 - 0.12 * d, 0.86, 1.08);
      const ang = clamp((i - focusIdx) * -6, -10, 10);
      const alpha = clamp(1.0 - 0.18 * Math.max(0, d - 0.2), 0.62, 1.0);

      if (tweenBack){
        this.tweens.add({ targets: card, x, y, scaleX: scl, scaleY: scl, angle: ang, alpha, duration: 240, ease: 'Cubic.easeOut' });
      } else {
        card.setPosition(x, y).setScale(scl).setAngle(ang).setAlpha(alpha);
      }

      const focused = (Math.round(focusIdx) === i && d < 0.6);
      card._glow?.setVisible(focused);
      card._bg?.setStrokeStyle( focused ? 3 : 2, focused ? 0x60a5fa : 0x2f3650 );
    });
  }

  setSelected(idx){
    this.selected = clamp(idx, 0, this.cards.length - 1);
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('lastMode', String(this.selected)); } catch {}
    this.layoutCards(0, true);
  }
  selectNext(){ this.setSelected(this.selected + 1); }
  selectPrev(){ this.setSelected(this.selected - 1); }

  launchCard(card){
    const k = card.modeKey;
    if (k === 'run'){
      // Fade and enter PVP (which is actually our PVE run)
      const cam = this.cameras.main;
      cam.fadeOut(250, 0,0,0);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, ()=>{
        this.scene.transition({ target: 'PVP', duration: 250, moveBelow: true, data: { mode: 'pve' } });
      });
    } else if (k === 'learn'){
      const cam = this.cameras.main;
      cam.fadeOut(250, 0,0,0);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, ()=>{
        this.scene.transition({ target: 'TUTORIAL_MINI', duration: 250, moveBelow: true });
      });
    } else {
      console.info('[Menu] Coming soon:', k);
      this.toast('Coming soon');
    }
  }

  // MENUSCENE (rexUI): toast helper using rexUI
  toast(msg){
    const toast = this.rexUI.add.toast({
      x: this.scale.width/2,
      y: this.scale.height*0.88,
      background: this.rexUI.add.roundRectangle(0,0,0,0,8, PALETTE.panel, 0.92).setStrokeStyle(2, PALETTE.stroke),
      text: this.add.text(0,0,msg,{ color: PALETTE.title, fontSize: Math.max(14, Math.floor(this.scale.height*0.028))+'px' }),
      space: { left: 12, right: 12, top: 8, bottom: 8 },
      duration: { in: 180, hold: 900, out: 200 }
    });
    toast.show();
  }

  update(){
    // keyboard navigation
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left) || Phaser.Input.Keyboard.JustDown(this.keys.A)){ this.selectPrev(); }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.right) || Phaser.Input.Keyboard.JustDown(this.keys.D)){ this.selectNext(); }
    if (Phaser.Input.Keyboard.JustDown(this.keys.ENTER) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE)){
      this.launchCard(this.cards[this.selected]);
    }
  }

  reposition(){
    const W = this.scale.width, H = this.scale.height;
    this.logo?.setPosition(W/2, Math.max(16, Math.floor(H*0.04)));
    // Bottom corners
    const pad = Math.max(8, Math.floor(Math.min(W,H) * 0.02));
    this.settingsBtn?.setPosition(W - pad - 24, H - pad - 24);
    this.profileBtn?.setPosition(W - pad - 24 - 48, H - pad - 24);
    this.dailyChip?.setPosition(pad + 80, H - pad - 24);
    // Refresh layout
    this.layoutCards(0, false);
  }
}
