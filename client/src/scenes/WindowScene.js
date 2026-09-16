import Phaser from 'phaser';
import {
  WINDOW_GANGS, WINDOW_INTRO, WINDOW_ART, windowGang, windowLayout
} from '../logic/window.js';
import {
  getWindowState, selectWindowGang, recordWindowVisit
} from '../utils/windowProgress.js';
import { getCurrentRouteID } from '../utils/seededRandom.js';
import { createPortraitOverlay } from '../utils/portraitMode.js';

const COLORS = {
  night: 0x070b0d,
  wall: 0x172126,
  shelf: 0x283338,
  counter: 0x394246,
  ink: 0x080b0d,
  cream: 0xf1dfb0,
  paper: 0xe9dfc7,
  teal: 0x4e9b96,
  gold: 0xe2b45f,
  dim: 0x92a0a2
};

export class WindowScene extends Phaser.Scene {
  constructor() { super('WINDOW'); }

  preload() {
    this.load.image('window_bodega', '/art/the-window/bodega-night.png');
    this.load.spritesheet('window_ro', '/art/the-window/auntie-ro.png', { frameWidth: WINDOW_ART.ro.frameWidth, frameHeight: WINDOW_ART.ro.frameHeight });
    this.load.spritesheet('window_switch', '/art/the-window/switch.png', { frameWidth: WINDOW_ART.switch.frameWidth, frameHeight: WINDOW_ART.switch.frameHeight });
    this.load.image('window_cast', '/art/the-window/cast.png');
  }

  init(data = {}) {
    this._firstVisit = Boolean(data.firstVisit);
    this._view = [];
    this._introIndex = 0;
  }

  create() {
    this.state = recordWindowVisit(getCurrentRouteID());
    this.prepareArtFrames();
    this.drawBodega();
    this.events.once('shutdown', () => this.clearView());
    createPortraitOverlay(this);

    this._lastW = this.scale.gameSize.width;
    this._lastH = this.scale.gameSize.height;
    this._onResize = gameSize => {
      if (Math.abs(gameSize.width-this._lastW) < 32 && Math.abs(gameSize.height-this._lastH) < 32) return;
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => this.scene.restart({ firstVisit: this._firstVisit }), 180);
    };
    this.scale.on('resize', this._onResize);
    this.events.once('shutdown', () => {
      clearTimeout(this._resizeTimer);
      this.scale.off('resize', this._onResize);
    });

    if (!this.state.onboardingComplete) this.showIntro(0);
    else this.showHub();
  }

  keep(...objects) {
    this._view.push(...objects.flat().filter(Boolean));
    return objects[0];
  }

  clearView() {
    for (const object of this._view || []) {
      try { object.destroy(); } catch {}
    }
    this._view = [];
  }

  prepareArtFrames() {
    const cast=this.textures.get('window_cast');
    if(cast&&!cast.has('brick')){
      for(const [name,frame] of Object.entries(WINDOW_ART.cast.frames)){
        cast.add(name,0,frame.x,0,frame.width,WINDOW_ART.cast.height);
      }
    }
    const bodega=this.textures.get('window_bodega');
    const crop=WINDOW_ART.bodega.portrait;
    if(bodega&&!bodega.has('counter-portrait')){
      bodega.add('counter-portrait',0,crop.x,crop.y,crop.width,crop.height);
    }
  }

  drawBodega() {
    const a=windowLayout(this.scale.width,this.scale.height);
    this.add.rectangle(a.cx,a.cy,a.w,a.h,COLORS.night).setDepth(0);
    const portrait=a.panelW/a.panelH<0.92;
    if(this.textures.exists('window_bodega')){
      this.add.image(a.cx,a.cy,'window_bodega',portrait?'counter-portrait':'__BASE')
        .setDepth(1).setDisplaySize(a.panelW,a.panelH);
    }else{
      this.add.rectangle(a.cx,a.cy,a.panelW,a.panelH,COLORS.wall,1).setDepth(1);
    }
    this.add.rectangle(a.cx,a.cy,a.panelW,a.panelH,0x061014,0.34).setDepth(2);
    for(let i=0;i<5;i++){
      const h=a.panelH*(0.12+i*0.045);
      this.add.rectangle(a.cx,a.panelBottom-h/2,a.panelW,h,0x020506,0.055).setDepth(2);
    }
    const frame=this.add.graphics().setDepth(3);
    frame.lineStyle(3,COLORS.ink,1);
    frame.strokeRect(a.cx-a.panelW/2,a.panelTop,a.panelW,a.panelH);
    frame.lineStyle(1,COLORS.gold,0.38);
    frame.strokeRect(a.cx-a.panelW/2+6,a.panelTop+6,a.panelW-12,a.panelH-12);
    const signW=Math.min(230,a.panelW-36);
    this.add.rectangle(a.cx+4,a.panelTop+33,signW,48,COLORS.ink,0.72).setDepth(3);
    this.add.rectangle(a.cx,a.panelTop+28,signW,46,0x0c1112,0.94).setStrokeStyle(2,COLORS.gold).setDepth(4);
    this.add.text(a.cx,a.panelTop+25,'THE WINDOW',{
      fontFamily:'Georgia, serif',fontSize:'22px',fontStyle:'bold',color:'#f1dfb0',
      letterSpacing:3,stroke:'#080b0d',strokeThickness:3
    }).setOrigin(0.5).setDepth(5);
    this.add.text(a.cx,a.panelTop+46,'GROCERIES · COFFEE · WORD ON THE STREET',{
      fontFamily:'monospace',fontSize:'7px',color:'#b8b29f',letterSpacing:1
    }).setOrigin(0.5).setDepth(5);
  }

  drawRo(x,y,scale=1,expression=0) {
    const size=176*scale;
    const shadow=this.add.ellipse(x+5,y+size*0.42,size*0.72,size*0.16,COLORS.ink,0.7).setDepth(9);
    if(!this.textures.exists('window_ro')){
      const fallback=this.add.graphics({x,y}).setDepth(10);
      fallback.fillStyle(COLORS.teal,1).fillRoundedRect(-size*0.2,-size*0.05,size*0.4,size*0.48,size*0.08);
      fallback.fillStyle(0x8b5a43,1).fillCircle(0,-size*0.16,size*0.16);
      this.keep(shadow,fallback);
      return fallback;
    }
    const sprite=this.add.image(x,y,'window_ro',Math.max(0,Math.min(2,expression))).setDepth(10).setScale(size/WINDOW_ART.ro.frameHeight);
    this.keep(shadow,sprite);
    return sprite;
  }

  drawGangPortrait(gangID,x,y,height) {
    const source=gangID==='crossline'?['window_switch',0]:['window_cast',gangID==='iron-row'?'brick':'vee'];
    if(!this.textures.exists(source[0])){
      const gang=windowGang(gangID);
      const fallback=this.add.circle(x,y,height*0.3,gang?.color||COLORS.teal,0.9).setDepth(10);
      const initial=this.add.text(x,y,gang?.name?.[0]||'?',{fontFamily:'Georgia, serif',fontSize:height*0.32+'px',fontStyle:'bold',color:'#0b1012'}).setOrigin(0.5).setDepth(11);
      this.keep(fallback,initial);
      return fallback;
    }
    const image=this.add.image(x,y,source[0],source[1]).setDepth(10);
    image.setScale(height/(source[0]==='window_cast'?WINDOW_ART.cast.height:WINDOW_ART.switch.frameHeight));
    this.keep(image);
    return image;
  }

  addButton(x,y,w,label,onClick,accent=COLORS.gold) {
    const shadow=this.add.rectangle(x+4,y+5,w,44,COLORS.ink,0.75).setDepth(20);
    const bg=this.add.rectangle(x,y,w,44,0x172126,1).setStrokeStyle(2,accent).setDepth(21)
      .setInteractive({cursor:'pointer'});
    const text=this.add.text(x,y,label,{
      fontFamily:'monospace',fontSize:(w<90?'9px':'13px'),fontStyle:'bold',
      color:'#f4ecd7',letterSpacing:1,align:'center'
    }).setOrigin(0.5).setDepth(22);
    bg.on('pointerover',()=>bg.setFillStyle(accent,0.3));
    bg.on('pointerout',()=>bg.setFillStyle(0x172126,1));
    bg.on('pointerup',onClick);
    this.keep(shadow,bg,text);
    return bg;
  }

  addPanel(x,y,w,h,stroke=COLORS.teal) {
    const shadow=this.add.rectangle(x+5,y+6,w,h,COLORS.ink,0.7).setDepth(5);
    const panel=this.add.rectangle(x,y,w,h,0x0d1417,0.97).setStrokeStyle(2,stroke).setDepth(6);
    this.keep(shadow,panel);
    return panel;
  }

  addDialogue(text, speaker='AUNTIE RO') {
    const a=windowLayout(this.scale.width,this.scale.height);
    const w=Math.min(a.contentW,480);
    const h=Math.max(126,Math.min(166,a.panelH*0.23));
    const y=a.panelBottom-h/2-a.pad;
    this.addPanel(a.cx,y,w,h,COLORS.gold);
    const name=this.add.text(a.cx-w/2+18,y-h/2+16,speaker,{
      fontFamily:'monospace',fontSize:'11px',fontStyle:'bold',color:'#e2b45f',letterSpacing:2
    }).setOrigin(0,0).setDepth(8);
    const copy=this.add.text(a.cx-w/2+18,y-h/2+42,text,{
      fontFamily:'Georgia, serif',fontSize:Math.max(15,Math.min(20,a.panelW*0.046))+'px',
      color:'#e9dfc7',lineSpacing:5,wordWrap:{width:w-36}
    }).setOrigin(0,0).setDepth(8);
    this.keep(name,copy);
    return {y,h,w};
  }

  showIntro(index) {
    this.clearView();
    this._introIndex=Math.max(0,Math.min(WINDOW_INTRO.length-1,index));
    const a=windowLayout(this.scale.width,this.scale.height);
    this.drawRo(a.cx,a.panelTop+a.headerH+Math.max(105,a.portrait*0.72),Math.min(1.25,a.portrait/125),this._introIndex===1?1:0);
    const box=this.addDialogue(WINDOW_INTRO[this._introIndex]);
    const last=this._introIndex===WINDOW_INTRO.length-1;
    this.addButton(a.cx,box.y+box.h/2-28,Math.min(200,box.w-36),last?'MEET THE CREWS':'KEEP LISTENING',
      ()=>last?this.showGangChoice():this.showIntro(this._introIndex+1));
  }

  showGangChoice() {
    this.clearView();
    const a=windowLayout(this.scale.width,this.scale.height);
    const title=this.add.text(a.cx,a.panelTop+a.headerH+18,'WHO HAS YOUR BACK?',{
      fontFamily:'Georgia, serif',fontSize:'20px',fontStyle:'bold',color:'#f1dfb0',
      stroke:'#080b0d',strokeThickness:3,letterSpacing:1
    }).setOrigin(0.5).setDepth(8);
    const sub=this.add.text(a.cx,title.y+27,'Identity and dialogue only · no gameplay advantage',{
      fontFamily:'monospace',fontSize:'9px',color:'#92a0a2'
    }).setOrigin(0.5).setDepth(8);
    this.keep(title,sub);

    const availableH=a.panelBottom-a.pad-(sub.y+24)-58;
    const cardH=Math.max(68,Math.min(118,(availableH-16)/3));
    WINDOW_GANGS.forEach((gang,i)=>{
      const y=sub.y+32+cardH/2+i*(cardH+8);
      this.addPanel(a.cx,y,a.contentW,cardH,gang.color);
      const portraitH=cardH-8;
      const portraitX=a.cx-a.contentW/2+Math.min(42,portraitH*0.42);
      this.drawGangPortrait(gang.id,portraitX,y+4,portraitH);
      const textX=a.cx-a.contentW/2+Math.min(88,portraitH*0.86);
      const name=this.add.text(textX,y-cardH/2+11,gang.name.toUpperCase(),{
        fontFamily:'monospace',fontSize:'13px',fontStyle:'bold',color:gang.css,letterSpacing:1
      }).setOrigin(0,0).setDepth(9);
      const contacts=this.add.text(name.x,y-cardH/2+32,gang.primary+' · '+gang.jobs,{
        fontFamily:'monospace',fontSize:'9px',color:'#b4bebf'
      }).setOrigin(0,0).setDepth(9);
      const pitch=this.add.text(name.x,y-cardH/2+48,gang.pitch,{
        fontFamily:'Georgia, serif',fontSize:'11px',color:'#e9dfc7',
        wordWrap:{width:a.contentW-(textX-(a.cx-a.contentW/2))-10},lineSpacing:2
      }).setOrigin(0,0).setDepth(9);
      const hit=this.add.rectangle(a.cx,y,a.contentW,cardH,gang.color,0.001).setDepth(12)
        .setInteractive({cursor:'pointer'})
        .on('pointerover',()=>hit.setFillStyle(gang.color,0.12))
        .on('pointerout',()=>hit.setFillStyle(gang.color,0.001))
        .on('pointerup',()=>this.confirmGang(gang.id));
      this.keep(name,contacts,pitch,hit);
    });
    this.addButton(a.cx,a.panelBottom-a.pad-22,Math.min(180,a.contentW),'BACK TO RO',()=>this.showIntro(WINDOW_INTRO.length-1),COLORS.dim);
  }

  confirmGang(gangID) {
    const result=selectWindowGang(gangID);
    if (!result.applied) {
      if (result.reason==='already-chosen') { this.state=result.state; this.showHub(); }
      else this.showNotice('Could not save that choice. Try again.');
      return;
    }
    this.state=result.state;
    const gang=windowGang(gangID);
    this.clearView();
    const a=windowLayout(this.scale.width,this.scale.height);
    const y=a.cy-20;
    this.addPanel(a.cx,y,a.contentW,220,gang.color);
    const joined=this.add.text(a.cx,y-72,'YOU RUN WITH '+gang.name.toUpperCase(),{
      fontFamily:'Georgia, serif',fontSize:'21px',fontStyle:'bold',color:gang.css,
      stroke:'#080b0d',strokeThickness:3,align:'center',wordWrap:{width:a.contentW-30}
    }).setOrigin(0.5).setDepth(8);
    const line=this.add.text(a.cx,y-18,
      gang.primary+' is your main contact.\n'+gang.jobs+' will bring the jobs.',{
        fontFamily:'monospace',fontSize:'12px',color:'#e9dfc7',
        align:'center',lineSpacing:7
      }).setOrigin(0.5).setDepth(8);
    const welcome=this.add.text(a.cx,y+43,
      gang.id==='crossline'
        ? '“Name’s Switch. Tonight, the streets are talking about you.”'
        : '“You picked your people. Now give them something to talk about.”',{
        fontFamily:'Georgia, serif',fontSize:'14px',fontStyle:'italic',color:'#f1dfb0',
        align:'center',wordWrap:{width:a.contentW-38}
      }).setOrigin(0.5).setDepth(8);
    this.keep(joined,line,welcome);
    this.addButton(a.cx,a.panelBottom-a.pad-28,Math.min(220,a.contentW),'ENTER THE STREETS',()=>this.returnToMenu(),gang.color);
  }

  showHub(section='counter') {
    this.clearView();
    this.state=getWindowState();
    const gang=windowGang(this.state.gangID);
    const a=windowLayout(this.scale.width,this.scale.height);
    const top=a.panelTop+a.headerH+14;
    const credit=this.add.text(a.cx+a.panelW/2-18,top,'CREDIT  '+this.state.credits,{
      fontFamily:'monospace',fontSize:'10px',fontStyle:'bold',color:'#e2b45f'
    }).setOrigin(1,0).setDepth(8);
    const gangTag=this.add.text(a.cx-a.panelW/2+18,top,gang.name.toUpperCase(),{
      fontFamily:'monospace',fontSize:'10px',fontStyle:'bold',color:gang.css,letterSpacing:1
    }).setOrigin(0,0).setDepth(8);
    this.keep(credit,gangTag);

    if(section==='counter') this.renderCounter(a,gang);
    else this.renderSection(a,gang,section);

    const labels=[['COUNTER','counter'],['JOBS','jobs'],['YOUR GANG','gang'],['SHELF','shelf']];
    const gap=Math.min(104,(a.contentW-6)/4);
    const start=a.cx-gap*1.5;
    labels.forEach(([label,id],i)=>{
      const x=start+i*gap;
      this.addButton(x,a.panelBottom-a.pad-72,gap-5,label,()=>this.showHub(id),id===section?gang.color:COLORS.dim);
    });
    this.addButton(a.cx,a.panelBottom-a.pad-20,Math.min(190,a.contentW),'BACK TO THE STREET',()=>this.returnToMenu(),COLORS.gold);
  }

  renderCounter(a,gang) {
    const portraitY=a.panelTop+a.headerH+Math.max(82,a.portrait*0.55);
    this.drawRo(a.cx,portraitY,Math.min(0.92,a.portrait/155),2);
    const panelH=Math.min(126,Math.max(100,a.panelH*0.18));
    const y=Math.min(a.panelBottom-a.pad-150,portraitY+104);
    this.addPanel(a.cx,y,a.contentW,panelH,COLORS.gold);
    const text='You’re with '+gang.name+'. '+gang.primary+
      ' keeps you in the loop; '+gang.jobs+
      ' handles the jobs. The board and Shelf are opening soon.';
    const copy=this.add.text(a.cx,y-panelH/2+14,text,{
      fontFamily:'Georgia, serif',fontSize:'13px',color:'#e9dfc7',
      align:'center',lineSpacing:4,wordWrap:{width:a.contentW-30}
    }).setOrigin(0.5,0).setDepth(9);
    const note=this.add.text(a.cx,y+panelH/2-13,'No credit is claimed just for opening this screen.',{
      fontFamily:'monospace',fontSize:'8px',color:'#92a0a2'
    }).setOrigin(0.5).setDepth(9);
    this.keep(copy,note);
  }

  renderSection(a,gang,section) {
    const content={
      jobs:['JOBS BOARD','Daily missions will use verified stash, block, REP and Rival outcomes. No mission rewards are active yet.'],
      gang:['YOUR GANG',gang.name+' · '+gang.motto+'\n\n'+gang.primary+' keeps you in the loop. '+gang.jobs+' brings the work. Switching stays locked until its contest boundary is decided.'],
      shelf:['THE SHELF','Cosmetic colorways, trails, frames, outfits and comic entrances will live here. Nothing sold here will change a race.']
    }[section];
    const y=a.cy-20;
    this.addPanel(a.cx,y,a.contentW,Math.min(310,a.panelH*0.45),gang.color);
    const title=this.add.text(a.cx,y-100,content[0],{
      fontFamily:'Georgia, serif',fontSize:'22px',fontStyle:'bold',color:gang.css,
      stroke:'#080b0d',strokeThickness:3,letterSpacing:1
    }).setOrigin(0.5).setDepth(8);
    const copy=this.add.text(a.cx,y-45,content[1],{
      fontFamily:'Georgia, serif',fontSize:'15px',color:'#e9dfc7',
      align:'center',lineSpacing:7,wordWrap:{width:a.contentW-38}
    }).setOrigin(0.5,0).setDepth(8);
    this.keep(title,copy);
  }

  showNotice(message) {
    const a=windowLayout(this.scale.width,this.scale.height);
    const note=this.add.text(a.cx,a.panelBottom-a.pad-126,message,{
      fontFamily:'monospace',fontSize:'10px',color:'#ef9a86',
      backgroundColor:'#111719',padding:{x:10,y:7}
    }).setOrigin(0.5).setDepth(40);
    this.keep(note);
    this.time.delayedCall(1800,()=>note?.destroy());
  }

  returnToMenu() {
    this.scene.start('MENU');
  }
}
