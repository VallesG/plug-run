// TUTORIAL SCENE (V2) — no UI plugins; uses PvpScene map gen + art
import Phaser from 'phaser';

const T = { FLOOR: 0, WALL: 1 };
const TUT_SEED_V2 = 0xA3C57A22;

function makeRng(seed){ let t = seed>>>0; return function(){ t+=0x6D2B79F5; let r=Math.imul(t ^ t>>>15, 1|t); r ^= r + Math.imul(r ^ r>>>7, 61|r); return ((r ^ r>>>14)>>>0)/4294967296; }; }
function manhattan(a,b){ return Math.abs(a.x-b.x)+Math.abs(a.y-b.y); }

// Copy of PvpScene arena generator (trimmed to essentials)
function generateArenaMap(cols, rows, { rng } = {}){
  const rnd = (typeof rng==='function') ? rng : Math.random;
  const g = Array.from({ length: rows }, () => Array(cols).fill(T.FLOOR));
  for (let x=0;x<cols;x++){ g[0][x]=T.WALL; g[rows-1][x]=T.WALL; }
  for (let y=0;y<rows;y++){ g[y][0]=T.WALL; g[y][cols-1]=T.WALL; }
  const SHAPES = [ [[0,0]],[[0,0],[1,0]],[[0,0],[1,0],[2,0],[3,0]], [[0,0],[0,1],[1,0],[1,1]], [[0,0],[1,0],[0,1],[0,2]], [[0,0],[1,0],[2,0],[1,1]], [[0,0],[1,0],[1,1],[2,1]], [[0,0],[2,0],[1,0],[1,-1],[1,1]], [[0,0],[0,1],[0,2],[1,2]], [[0,0],[1,0],[2,0],[2,1]], ];
  const rotate=(cells,rot)=>{ let pts=cells.map(([x,y])=>({x,y})); for(let r=0;r<rot;r++) pts=pts.map(p=>({x:-p.y,y:p.x})); const minx=Math.min(...pts.map(p=>p.x)), miny=Math.min(...pts.map(p=>p.y)); return pts.map(p=>({x:p.x-minx,y:p.y-miny})); };
  const maybeFlipX=(cells,doFlip)=>{ if(!doFlip) return cells.map(p=>({x:p.x,y:p.y})); const maxx=Math.max(...cells.map(p=>p.x)); return cells.map(p=>({x:maxx-p.x,y:p.y})); };
  const occ=Array.from({length:rows},()=>Array(cols).fill(0)); const PAD_MIN=0,PAD_MAX=2,GAP=1;
  const canPlace=(atX,atY,cells)=>{ const allowBorderTouch=rnd()<0.40; const pad=allowBorderTouch?PAD_MIN:PAD_MAX; for(const p of cells){ const x=atX+p.x,y=atY+p.y; if(x<=0||y<=0||x>=cols-1||y>=rows-1) return false; if(x<pad||y<pad||x>cols-1-pad||y>rows-1-pad) return false; if(g[y][x]===T.WALL||occ[y][x]) return false; for(let yy=y-GAP;yy<=y+GAP;yy++) for(let xx=x-GAP;xx<=x+GAP;xx++){ if(yy>=0&&yy<rows&&xx>=0&&xx<cols&&occ[yy][xx]) return false; } } return true; };
  const stamp=(atX,atY,cells)=>{ for(const p of cells){ const x=atX+p.x,y=atY+p.y; g[y][x]=T.WALL; occ[y][x]=1; } };
  const target=Math.floor((cols*rows)/36); let placed=0, tries=0, maxTries=target*40;
  while(placed<target&&tries<maxTries){ tries++; const baseX=1+(rnd()*(cols-2)|0); const baseY=1+(rnd()*(rows-2)|0); let shape=SHAPES[(rnd()*SHAPES.length)|0]; shape=rotate(shape,(rnd()*4)|0); shape=maybeFlipX(shape,rnd()<0.5); const offX=(rnd()*3|0)-1; const offY=(rnd()*3|0)-1; if(canPlace(baseX+offX,baseY+offY,shape)){ stamp(baseX+offX,baseY+offY,shape); placed++; } }
  const allFloors=[]; for(let y=1;y<rows-1;y++) for(let x=1;x<cols-1;x++) if(g[y][x]===T.FLOOR) allFloors.push({x,y});
  const pickFar=(avoid,minD)=>{ for(let k=0;k<400;k++){ const c=allFloors[(rnd()*allFloors.length)|0]; if(avoid.every(pt=>manhattan(c,pt)>=minD)) return c; } let best=allFloors[0],bestScore=-1; for(const c of allFloors){ const d=Math.min(...avoid.map(pt=>manhattan(c,pt))); if(d>bestScore){ bestScore=d; best=c; } } return best; };
  const POCKET_R=2; const safeForPocket=(c)=> c.x>POCKET_R && c.y>POCKET_R && c.x<cols-1-POCKET_R && c.y<rows-1-POCKET_R;
  function addPocket(cx,cy){ for(let dy=-(POCKET_R-1);dy<=POCKET_R-1;dy++){ for(let dx=-(POCKET_R-1);dx<=POCKET_R-1;dx++){ const x=cx+dx,y=cy+dy; if(y>=0&&y<rows&&x>=0&&x<cols) g[y][x]=T.FLOOR; } } for(let dy=-POCKET_R;dy<=POCKET_R;dy++){ for(let dx=-POCKET_R;dx<=POCKET_R;dx++){ const x=cx+dx,y=cy+dy; if(x<=0||y<=0||x>=cols-1||y>=rows-1) continue; if(Math.max(Math.abs(dx),Math.abs(dy))===POCKET_R) g[y][x]=T.WALL; } } const dirs=[[1,0],[-1,0],[0,1],[0,-1]]; let picks; if(rnd()<0.7) picks=[[0,1],[2,3]][(rnd()*2)|0]; else picks=[[0,2],[0,3],[1,2],[1,3]][(rnd()*4)|0]; for(const i of picks){ const [dx,dy]=dirs[i]; const x=cx+dx*POCKET_R, y=cy+dy*POCKET_R; g[y][x]=T.FLOOR; const ox=cx+dx*(POCKET_R+1), oy=cy+dy*(POCKET_R+1); if(ox>0&&ox<cols-1&&oy>0&&oy<rows-1) g[oy][ox]=T.FLOOR; } g[cy][cx]=T.FLOOR; }
  const runner=pickFar([], Math.floor((cols+rows)/6)); const plug=pickFar([runner], Math.floor((cols+rows)/4));
  const stashCands=allFloors.filter(c=> safeForPocket(c) && (manhattan(c, runner)+3 < manhattan(c, plug)) );
  const extractCands=allFloors.filter(c=> safeForPocket(c) && (manhattan(c, plug)+3 < manhattan(c, runner)) );
  const pickFrom=(arr, avoid, minD)=>{ const src = arr.length ? arr.filter(c=> avoid.every(pt=>manhattan(c,pt)>=minD)) : []; if (src.length) return src[(Math.random()*src.length)|0]; return pickFar(avoid, minD); };
  let stash=pickFrom(stashCands,[runner,plug], Math.floor((cols+rows)/10));
  let extract=pickFrom(extractCands,[runner,plug,stash], Math.floor((cols+rows)/9));
  if (!safeForPocket(stash)){ const safe=allFloors.filter(safeForPocket); if(safe.length) stash=safe[(rnd()*safe.length)|0]; }
  if (!safeForPocket(extract)){ const safe=allFloors.filter(safeForPocket); if(safe.length) extract=safe[(rnd()*safe.length)|0]; }
  addPocket(stash.x,stash.y); addPocket(extract.x,extract.y);
  g[runner.y][runner.x]=T.FLOOR; g[plug.y][plug.x]=T.FLOOR; g[stash.y][stash.x]=T.FLOOR; g[extract.y][extract.x]=T.FLOOR;
  // Egress driveway
  const sides=['N','E','S','W']; const side=sides[(rnd()*4)|0]; const gapW=Math.max(3, Math.floor(cols/10));
  let entry={x:1,y:1};
  if(side==='N'){ const mid=1+(rnd()*(cols-2)|0); const x0=Math.max(1, mid-Math.floor(gapW/2)); for(let x=x0;x<x0+gapW && x<cols-1;x++){ g[0][x]=T.FLOOR; if(rows>1) g[1][x]=T.FLOOR; } entry={x:Math.min(cols-2, Math.max(1, mid)), y:1}; }
  else if(side==='S'){ const mid=1+(rnd()*(cols-2)|0); const x0=Math.max(1, mid-Math.floor(gapW/2)); for(let x=x0;x<x0+gapW && x<cols-1;x++){ g[rows-1][x]=T.FLOOR; if(rows>1) g[rows-2][x]=T.FLOOR; } entry={x:Math.min(cols-2, Math.max(1, mid)), y:rows-2}; }
  else if(side==='E'){ const mid=1+(rnd()*(rows-2)|0); const y0=Math.max(1, mid-Math.floor(gapW/2)); for(let y=y0;y<y0+gapW && y<rows-1;y++){ g[y][cols-1]=T.FLOOR; if(cols>1) g[y][cols-2]=T.FLOOR; } entry={x:cols-2,y:Math.min(rows-2, Math.max(1, mid))}; }
  else { const mid=1+(rnd()*(rows-2)|0); const y0=Math.max(1, mid-Math.floor(gapW/2)); for(let y=y0;y<y0+gapW && y<rows-1;y++){ g[y][0]=T.FLOOR; if(cols>1) g[y][1]=T.FLOOR; } entry={x:1,y:Math.min(rows-2, Math.max(1, mid))}; }
  const egress={ side, entry, width: gapW };
  return { grid:g, spawns:{runner,plug}, objectives:{stash,extract}, egress };
}

// Minimal themes (copied from PvpScene)
const THEMES=[
  { key:'house_wood', bg:0x080A10, floorTint:0xffffff, wallFillTint:0xffffff, wallEdgeTint:0xf97316, furnTint:0xffffff, carTint:0xffffff, floorSet:'wood' },
  { key:'loft_concrete', bg:0x0b0f16, floorTint:0xb8bec9, wallFillTint:0x232a33, wallEdgeTint:0x8a8f98, furnTint:0xdde3ea, carTint:0xcbd1ff, floorSet:'checker', checkerColors:[0xE5E7EB,0xF3F4F6] },
  { key:'green_villa', bg:0x0a0d0a, floorTint:0xcdb697, wallFillTint:0x1f241a, wallEdgeTint:0x2faa66, furnTint:0xf5eedc, carTint:0x2fb3ff, floorSet:'checker' },
  { key:'studio_white', bg:0x0b0f16, floorTint:0xF3F4F6, wallFillTint:0x1f2632, wallEdgeTint:0x9AA6B2, furnTint:0xffffff, carTint:0x93c5fd, floorSet:'checker', checkerColors:[0xF9FAFB,0xE5E7EB] },
  { key:'sand_wood', bg:0x0b0f12, floorTint:0xE9D5B4, wallFillTint:0x1f201e, wallEdgeTint:0xC8A97E, furnTint:0xFFF4E0, carTint:0x60a5fa, floorSet:'wood' }
];

export class TutorialV2Scene extends Phaser.Scene{
  constructor(){ super('TUTORIAL2'); }

  preload(){
    this.load.image('wall_fill','/tiles/kenney/walls/fill.png');
    this.load.image('wall_edge','/tiles/kenney/walls/edge.png');
    ['wood_96','wood_97','wood_98','wood_99','wood_100','wood_101'].forEach(k=> this.load.image(k, `/tiles/kenney/${k}.png`));
    ['check_11','check_12','check_13','check_14'].forEach(k=> this.load.image(k, `/tiles/checker/${k}.png`));
  }

  init(){ this.seed=TUT_SEED_V2; this.cosSeed=(this.seed^0x9E3779B9)|0; this.tipObj=null; this.tipTween=null; }

  // Helpers
  toWorldX(cx){ return this.pad.x + cx*this.cell + this.cell/2; }
  toWorldY(cy){ return this.pad.y + cy*this.cell + this.cell/2; }
  toCell(x,y){ return { x: Math.floor((x - this.pad.x)/this.cell), y: Math.floor((y - this.pad.y)/this.cell) }; }
  inBoundsCell(cx,cy){ return cx>=0 && cy>=0 && cx<this.cols && cy<this.rows; }
  isWallAtWorld(wx, wy){ const c=this.toCell(wx,wy); if(!this.inBoundsCell(c.x,c.y)) return true; return this.grid[c.y][c.x]===T.WALL; }

  create(){
    this.cell = Math.max(18, Math.floor(Math.min(this.scale.width/26, this.scale.height/18)));
    this.cols = Math.floor(this.scale.width / this.cell);
    this.rows = Math.floor(this.scale.height / this.cell);
    this.pad  = { x:0, y:0 };

    const arena = generateArenaMap(this.cols, this.rows, { rng: makeRng(this.seed) });
    this.grid=arena.grid; this.egress=arena.egress; this.stashCell=arena.objectives.stash; this.extractCell=arena.objectives.extract; this.spawnRunnerCell=arena.spawns.runner; this.spawnPlugCell=arena.spawns.plug;

    const tRng = makeRng(this.cosSeed); this.theme = THEMES[(tRng()*THEMES.length)|0]; this.floorKeySingle = (this.theme.floorSet==='checker') ? ['check_11','check_12','check_13','check_14'][(tRng()*4)|0] : null;
    this.drawArena();

    // Runner
    this.runner = this.add.container(this.toWorldX(this.spawnRunnerCell.x), this.toWorldY(this.spawnRunnerCell.y)).setDepth(8);
    const rShadow = this.add.ellipse(0, this.cell*0.48, this.cell*0.90, this.cell*0.30, 0x000000, 0.34).setScale(1,0.8);
    const rBody = this.add.circle(0,0, Math.floor(this.cell*0.36), 0x10b981, 1); this.runner.add([rShadow,rBody]);

    // Camera
    const cam=this.cameras.main; const W=this.cols*this.cell,H=this.rows*this.cell; cam.setBounds(0,0,W,H); cam.startFollow(this.runner, true, 0.12,0.12); cam.setZoom(2.5); cam.setRoundPixels(true); cam.setBackgroundColor(this.theme?.bg ?? 0x0b0f16); cam.setDeadzone(Math.floor(this.scale.width*0.16), Math.floor(this.scale.height*0.16));

    // Controls
    this.cursors = this.input.keyboard.createCursorKeys(); this.input.keyboard.addKeys('W,A,S,D,SHIFT,SPACE');
    this.pointer=null; this.input.on('pointerdown', p=>{ this.pointer=p; this._firedOnce=false; }); this.input.on('pointerup', ()=> this.pointer=null);

    // Objectives
    const w=this.cell*0.82,h=this.cell*0.52; const pkgA=this.makeDuffel(this.toWorldX(this.stashCell.x), this.toWorldY(this.stashCell.y), w,h); const pkgB=this.makeDuffel(this.toWorldX(this.extractCell.x), this.toWorldY(this.extractCell.y), w,h); const rb=(makeRng((this.seed^0xC0FFEE)|0)()<0.5); if(rb){ this.stash=pkgA; this.bunkStash=pkgB; } else { this.stash=pkgB; this.bunkStash=pkgA; }
    const ex=this.toWorldX(this.egress.entry.x), ey=this.toWorldY(this.egress.entry.y); this.extractPad=this.add.rectangle(ex,ey,this.cell*0.9,this.cell*0.9,0x0ea5e9,0.08).setStrokeStyle(2,0x22c55e).setDepth(3);
    this.defendZone=this.add.circle(ex,ey,this.cell*1.2,0x22c55e,0.06).setStrokeStyle(2,0x22c55e).setDepth(2).setVisible(false);

    this.makeSkipButton(); this.playBtn=null;
    this.goto('MOVE', true); this.showTip('Move with your stick or WASD');

    this.lastPos={x:this.runner.x,y:this.runner.y}; this.bullets=[];
  }

  drawArena(){
    const {cell,cols,rows}=this; const pad={x:0,y:0}; const floors=this.add.group(), walls=this.add.group(); const WOOD=['wood_96','wood_97','wood_98','wood_99','wood_100','wood_101']; const CHECK=['check_11','check_12','check_13','check_14']; const useChecker=(this.theme?.floorSet==='checker'); const checkerColors=(Array.isArray(this.theme?.checkerColors)&&this.theme.checkerColors.length>=2)?this.theme.checkerColors:null;
    for(let y=-1;y<=rows;y++) for(let x=-1;x<=cols;x++){ const cx=pad.x+x*cell+cell/2, cy=pad.y+y*cell+cell/2; if(useChecker&&checkerColors){ const color=(((x+y)&1)===0)?checkerColors[0]:checkerColors[1]; floors.add(this.add.rectangle(cx,cy,cell,cell,color,1).setDepth(1)); } else { let key; if(useChecker){ key=this.floorKeySingle||CHECK[0]; } else { const idx=((((x%3)+3)%3)+3*((((y%2)+2)%2)))%WOOD.length; key=WOOD[idx]; } const f=this.add.image(cx,cy,key).setDepth(1).setTint(this.theme?.floorTint??0xffffff); f.setDisplaySize(cell,cell); floors.add(f); } }
    const isWall=(cx,cy)=> (cy>=0&&cy<rows&&cx>=0&&cx<cols&&this.grid[cy][cx]===T.WALL);
    for(let y=0;y<rows;y++) for(let x=0;x<cols;x++){ if(!isWall(x,y)) continue; const wx=x*cell+cell/2, wy=y*cell+cell/2; const base=this.add.image(wx,wy,'wall_fill').setDepth(3).setTint(this.theme?.wallFillTint??0xffffff); base.setDisplaySize(cell,cell); walls.add(base); const n=isWall(x,y-1),e=isWall(x+1,y),s=isWall(x,y+1),w=isWall(x-1,y); const add=(ang)=>{ const ed=this.add.image(wx,wy,'wall_edge').setDepth(4).setTint(this.theme?.wallEdgeTint??0xffffff); ed.setDisplaySize(cell,cell).setAngle(ang); walls.add(ed); }; if(!n) add(0); if(!e) add(90); if(!s) add(180); if(!w) add(270); }
  }

  makeDuffel(x,y,w,h){ const c=this.add.container(x,y).setDepth(10); const sensor=this.add.rectangle(0,0,w,h,0x000000,0.0001); const g=this.add.graphics(); const tan=0xC8A97E,tanDark=0xA9885F,tape=0x8B7355,gloss=0xE7D3B5; const rad=Math.max(4,Math.floor(this.cell*0.14)); g.fillStyle(tan,1); g.lineStyle(Math.max(2,Math.floor(this.cell*0.05)),tanDark,1); g.fillRoundedRect(-w/2,-h/2,w,h,rad); g.strokeRoundedRect(-w/2,-h/2,w,h,rad); const stripeH=Math.max(4,Math.floor(h*0.28)); g.fillStyle(tape,1); g.fillRect(-w/2+4,-stripeH/2,w-8,stripeH); g.fillStyle(gloss,0.10); g.fillRoundedRect(-w/2+6,-h/2+6,w*0.35,h*0.30,rad*0.6); const mark=this.add.text(-w*0.18,-h*0.06,'$',{fontSize:`${Math.max(10,Math.floor(this.cell*0.30))}px`,color:'#2b2b2b'}).setAlpha(0.25).setOrigin(0.5); c.add([sensor,g,mark]); return c; }
  addCarry(){ if(this.carry){ this.runner.remove(this.carry,true); this.carry=null; } const w=this.cell*0.45,h=this.cell*0.30; const c=this.add.container(0,-this.cell*0.25); const g=this.add.graphics(); const tan=0xC8A97E,tanDark=0xA9885F,tape=0x8B7355,gloss=0xE7D3B5,rad=Math.max(3,Math.floor(this.cell*0.10)); g.fillStyle(tan,1).lineStyle(Math.max(2,Math.floor(this.cell*0.05)),tanDark,1); g.fillRoundedRect(-w/2,-h/2,w,h,rad); g.strokeRoundedRect(-w/2,-h/2,w,h,rad); g.fillStyle(tape,1); const sh=Math.max(3,Math.floor(h*0.40)); g.fillRect(-w/2+3,-sh/2,w-6,sh); g.fillStyle(gloss,0.12); g.fillRoundedRect(-w/2+4,-h/2+4,w*0.36,h*0.34,rad*0.6); const aura=this.add.ellipse(0,0,w*1.4,h*1.8,0x86efac,0.28).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.20); c.add([aura,g]); this.tweens.add({targets:aura,alpha:0.45,duration:850,yoyo:true,repeat:-1,ease:'Sine.easeInOut'}); this.runner.add(c); this.carry=c; }

  showTip(text, hold=1200){ if(this.tipTween){ this.tweens.remove(this.tipTween); this.tipTween=null; } if(!this.tipObj){ this.tipObj=this.add.text(this.scale.width/2, 24, text, { color:'#cbd1ff', fontSize: Math.max(14, Math.floor(this.scale.height*0.028))+'px' }).setOrigin(0.5,0).setScrollFactor(0).setDepth(50); } else { this.tipObj.setText(text); } this.tipObj.setAlpha(0); this.tipTween=this.tweens.add({ targets:this.tipObj, alpha:1, duration:180, ease:'Cubic.easeOut', onComplete:()=>{ this.time.delayedCall(hold, ()=>{ this.tipTween=this.tweens.add({ targets:this.tipObj, alpha:0, duration:220, onComplete:()=>{ this.tipTween=null; } }); }); } }); }
  ping(x,y,color=0x60a5fa){ const g=this.add.graphics().setDepth(12); const r0=this.cell*0.7; g.lineStyle(3,color,0.9).strokeCircle(x,y,r0); g.lineStyle(1,color,0.45).strokeCircle(x,y,r0+6); this.tweens.add({ targets:g, alpha:0, duration:900, ease:'Sine.easeOut', onComplete:()=>g.destroy() }); }
  makeSkipButton(){ const w=90,h=36; const cont=this.add.container(this.scale.width-16-w/2, this.scale.height-16-h/2).setScrollFactor(0).setDepth(60); const bg=this.add.graphics(); bg.fillStyle(0x101522,0.92).fillRoundedRect(-w/2,-h/2,w,h,10); bg.lineStyle(2,0x2f3650,1).strokeRoundedRect(-w/2,-h/2,w,h,10); const t=this.add.text(0,0,'Skip',{ color:'#cbd1ff', fontSize: Math.max(14,Math.floor(h*0.55))+'px' }).setOrigin(0.5); cont.add([bg,t]); cont.setSize(w,h); cont.setInteractive(new Phaser.Geom.Rectangle(-w/2,-h/2,w,h), Phaser.Geom.Rectangle.Contains).on('pointerup', ()=> this.exitToMenu()); this.skipBtn=cont; }
  makePlayButton(){ if(this.playBtn) return; const w=110,h=36; const cont=this.add.container(16+w/2, this.scale.height-16-h/2).setScrollFactor(0).setDepth(60); const bg=this.add.graphics(); bg.fillStyle(0x16a34a,0.85).fillRoundedRect(-w/2,-h/2,w,h,10); bg.lineStyle(2,0x14532d,1).strokeRoundedRect(-w/2,-h/2,w,h,10); const t=this.add.text(0,0,'Play',{ color:'#eafff5', fontSize: Math.max(14,Math.floor(h*0.55))+'px', fontStyle:'bold' }).setOrigin(0.5); cont.add([bg,t]); cont.setSize(w,h); cont.setInteractive(new Phaser.Geom.Rectangle(-w/2,-h/2,w,h), Phaser.Geom.Rectangle.Contains).on('pointerup', ()=> this.scene.transition({ target:'PVP', duration:250, moveBelow:true, data:{ mode:'pve' } })); this.playBtn=cont; }
  relayout(){ this.skipBtn?.setPosition(this.scale.width-16-this.skipBtn.width/2, this.scale.height-16-this.skipBtn.height/2); if(this.playBtn) this.playBtn.setPosition(16+this.playBtn.width/2, this.scale.height-16-this.playBtn.height/2); }
  exitToMenu(){ this.tweenZoomTo(1.0, 350, ()=> this.scene.transition({ target:'MENU', duration: 200, moveBelow:true })); }

  goto(step, first=false){ this.state=step; const cam=this.cameras.main; const targets={ MOVE:2.5, AIM:2.2, STASH:1.8, POWER:1.5, EXTRACT:1.3, DEFEND:1.1, DONE:1.0 }; if(!first) this.tweenZoomTo(targets[step]||cam.zoom, 800); if(step==='STASH'){ this.ping(this.stash.x,this.stash.y,0x86efac); this.ping(this.bunkStash.x,this.bunkStash.y,0x86efac); this.showTip('Grab a package (they look the same)'); } if(step==='AIM'){ this.showTip('Aim and fire (click/tap)'); } if(step==='POWER'){ this.showTip('Dash (double-tap/Shift) or Phase (Space)'); } if(step==='EXTRACT'){ this.ping(this.extractPad.x,this.extractPad.y,0x22c55e); this.showTip('Head to the exit'); } if(step==='DEFEND'){ this.showTip('Hold the zone or land 3 hits'); setTimeout(()=> this.tweenZoomTo(1.0, 900), 900); } if(step==='DONE'){ this.showTip("You're ready"); this.makePlayButton(); } }
  tweenZoomTo(z,duration=800,onComplete){ const cam=this.cameras.main; this.tweens.add({ targets:cam, zoom:z, duration, ease:'Cubic.easeOut', onComplete }); }

  update(_,delta){ const dt=delta/1000; this.handleMovement(dt); if(this.state==='MOVE'){ const moved=Math.hypot(this.runner.x-this.lastPos.x,this.runner.y-this.lastPos.y); if(moved>this.cell*2){ this.goto('AIM'); } } else if(this.state==='AIM'){ if(this._firedOnce){ this.goto('STASH'); } } else if(this.state==='STASH'){ if(!this.hasPackage){ if(this.overlaps(this.runner,this.stash)){ this.hasPackage=true; this.addCarry(); if(this.bunkStash){ this.bunkStash.destroy(); this.bunkStash=null; } this.goto('POWER'); } else if(this.bunkStash && this.overlaps(this.runner,this.bunkStash)){ this.showTip('BUNK!'); const d=this.bunkStash; this.bunkStash=null; this.tweens.add({ targets:d, alpha:0, scale:0.86, duration:800, ease:'Cubic.easeOut', onComplete:()=>d.destroy() }); this.goto('POWER'); } } } else if(this.state==='POWER'){ if(this._didDash || this._didPhase){ this._didDash=false; this._didPhase=false; this.goto('EXTRACT'); } } else if(this.state==='EXTRACT'){ if(this.overlapsPoint(this.runner,this.extractPad.x,this.extractPad.y)){ this.beginDefense(); this.goto('DEFEND'); } } else if(this.state==='DEFEND'){ this.updatePlug(dt); this.updateBullets(dt); if(this.defendWin){ this.goto('DONE'); } } this.lastPos={x:this.runner.x,y:this.runner.y}; }

  handleMovement(dt){ if(!this.runner) return; const speed=this.cell*7.0; let ax=0,ay=0; const k=this.input.keyboard; if(k.addKey('A').isDown||this.cursors.left.isDown) ax-=1; if(k.addKey('D').isDown||this.cursors.right.isDown) ax+=1; if(k.addKey('W').isDown||this.cursors.up.isDown) ay-=1; if(k.addKey('S').isDown||this.cursors.down.isDown) ay+=1; if(this.pointer){ const dx=this.pointer.x-this.runner.x, dy=this.pointer.y-this.runner.y; const L=Math.hypot(dx,dy)||1; ax+=dx/L; ay+=dy/L; } const len=Math.hypot(ax,ay); if(len>1e-3){ ax/=len; ay/=len; } const now=performance.now(); const tapDir=(ax||ay)?{x:Math.sign(ax),y:Math.sign(ay)}:null; if(tapDir){ if(!this._lastTap||now-this._lastTap.t>340||this._lastTap.dir.x!==tapDir.x||this._lastTap.dir.y!==tapDir.y){ this._lastTap={t:now,dir:tapDir}; } else { this._dashUntil=now+220; this._didDash=true; this._lastTap=null; } } if(k.addKey('SHIFT').isDown){ this._dashUntil=now+220; this._didDash=true; } const phasing=k.addKey('SPACE').isDown; if(phasing) this._didPhase=true; const dashMul=(now<(this._dashUntil||0))?2.2:1.0; let nx=this.runner.x+ax*speed*dashMul*dt, ny=this.runner.y+ay*speed*dashMul*dt; if(!phasing){ const r=this.cell*0.36; const pts=[{x:nx-r,y:ny-r},{x:nx+r,y:ny-r},{x:nx-r,y:ny+r},{x:nx+r,y:ny+r}]; if(pts.some(p=>this.isWallAtWorld(p.x,p.y))){ nx=this.runner.x; ny=this.runner.y; } } this.runner.x=nx; this.runner.y=ny; if(this.pointer && this.input.activePointer.isDown && !this._shotHeld){ this.tryFire(); this._shotHeld=true; } if(!this.input.activePointer.isDown) this._shotHeld=false; }

  overlaps(a,b){ if(!a||!b) return false; const ra=new Phaser.Geom.Rectangle(a.x-12,a.y-12,24,24); const rb=new Phaser.Geom.Rectangle(b.x-12,b.y-12,24,24); return Phaser.Geom.Intersects.RectangleToRectangle(ra,rb); }
  overlapsPoint(a,px,py){ const ra=new Phaser.Geom.Rectangle(a.x-12,a.y-12,24,24); return Phaser.Geom.Rectangle.Contains(ra,px,py); }

  tryFire(){ this._firedOnce=true; const aim=this.pointer?{x:this.pointer.x-this.runner.x,y:this.pointer.y-this.runner.y}:{x:1,y:0}; const L=Math.hypot(aim.x,aim.y)||1; const vx=(aim.x/L)*this.cell*10, vy=(aim.y/L)*this.cell*10; const b=this.add.circle(this.runner.x,this.runner.y,Math.max(3,Math.floor(this.cell*0.12)),0xffd166,1).setDepth(9); b.vx=vx; b.vy=vy; b.life=1.6; this.bullets.push(b); }
  updateBullets(dt){ for(let i=this.bullets.length-1;i>=0;i--){ const b=this.bullets[i]; b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt; if(b.life<=0){ b.destroy(); this.bullets.splice(i,1); continue; } if(this.plug && Phaser.Math.Distance.Between(b.x,b.y,this.plug.x,this.plug.y)<this.cell*0.5){ b.destroy(); this.bullets.splice(i,1); this.plugHP--; this.showTip(`${3-this.plugHP}/3 hits`, 600); if(this.plugHP<=0){ this.defendWin=true; } } } }

  beginDefense(){ this.defendWin=false; this.defendTimer=0; this.plugHP=3; this.hasGun=true; this.defendZone.setVisible(true); this.plug=this.add.container(this.toWorldX(this.spawnPlugCell.x), this.toWorldY(this.spawnPlugCell.y)).setDepth(8); const sh=this.add.ellipse(0,this.cell*0.44,this.cell*0.86,this.cell*0.28,0x000,0.3).setScale(1,0.8); const body=this.add.circle(0,0,Math.floor(this.cell*0.34),0xbf1f2f,1); this.plug.add([sh,body]); }
  updatePlug(dt){ if(!this.plug) return; const tx=this.defendZone.x, ty=this.defendZone.y; const dx=tx-this.plug.x, dy=ty-this.plug.y; const L=Math.hypot(dx,dy)||1; const nx=dx/L, ny=dy/L; const speed=this.cell*2.5; this.plug.x+=nx*speed*dt; this.plug.y+=ny*speed*dt; const nearRunner=(Math.hypot(this.runner.x-tx, this.runner.y-ty)<this.cell*2.0); if(nearRunner){ this.defendTimer+=dt; if(this.defendTimer>=8){ this.defendWin=true; } } }
}

