import Phaser from 'phaser';
import {
  WINDOW_GANGS, WINDOW_INTRO, windowGang, windowLayout
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

  init(data = {}) {
    this._firstVisit = Boolean(data.firstVisit);
    this._view = [];
    this._introIndex = 0;
  }

  create() {
    this.state = recordWindowVisit(getCurrentRouteID());
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

  drawBodega() {
    const a = windowLayout(this.scale.width, this.scale.height);
    this.add.rectangle(a.cx, a.cy, a.w, a.h, COLORS.night).setDepth(0);
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(COLORS.wall, 1);
    g.fillRect(a.cx-a.panelW/2, a.panelTop, a.panelW, a.panelH);
    g.lineStyle(3, COLORS.ink, 1);
    g.strokeRect(a.cx-a.panelW/2, a.panelTop, a.panelW, a.panelH);

    const backTop = a.panelTop + a.headerH;
    const shelfH = Math.max(70, a.panelH * 0.18);
    g.fillStyle(0x101719, 1);
    g.fillRect(a.cx-a.panelW/2+10, backTop+8, a.panelW-20, shelfH);
    g.lineStyle(4, COLORS.shelf, 1);
    for (let row=1; row<3; row++) {
      const y = backTop+8+shelfH*row/3;
      g.lineBetween(a.cx-a.panelW/2+14,y,a.cx+a.panelW/2-14,y);
    }
    const bottleColors=[0x6f8053,0x9c663f,0x486f7b,0xb19550];
    for(let i=0;i<18;i++){
      const x=a.cx-a.panelW/2+20+(i%9)*(a.panelW-48)/8;
      const y=backTop+22+Math.floor(i/9)*shelfH/3;
      g.fillStyle(bottleColors[i%bottleColors.length],0.72);
      g.fillRect(x,y,8+(i%3)*2,18+(i%4)*3);
    }

    const counterY = a.panelBottom - Math.max(92, a.panelH*0.16);
    g.fillStyle(COLORS.ink,0.55);
    g.fillRect(a.cx-a.panelW/2+18,counterY+8,a.panelW-36,70);
    g.fillStyle(COLORS.counter,1);
    g.fillRect(a.cx-a.panelW/2+14,counterY,a.panelW-28,68);
    g.lineStyle(3,COLORS.ink,1);
    g.strokeRect(a.cx-a.panelW/2+14,counterY,a.panelW-28,68);
    for(let x=a.cx-a.panelW/2+30;x<a.cx+a.panelW/2-20;x+=28){
      g.lineBetween(x,counterY+10,x,counterY+60);
    }

    const signW=Math.min(220,a.panelW-40);
    g.fillStyle(0x0d1517,1);
    g.fillRoundedRect(a.cx-signW/2,a.panelTop+12,signW,44,4);
    g.lineStyle(2,COLORS.gold,1);
    g.strokeRoundedRect(a.cx-signW/2,a.panelTop+12,signW,44,4);
    this.add.text(a.cx,a.panelTop+34,'THE WINDOW',{
      fontFamily:'Georgia, serif',fontSize:'22px',fontStyle:'bold',
      color:'#f1dfb0',letterSpacing:3,stroke:'#080b0d',strokeThickness:3
    }).setOrigin(0.5).setDepth(2);
    this.add.text(a.cx,a.panelTop+61,'GROCERIES · COFFEE · WORD ON THE STREET',{
      fontFamily:'monospace',fontSize:'8px',color:'#829193',letterSpacing:1
    }).setOrigin(0.5).setDepth(2);
  }

  drawRo(x, y, scale = 1) {
    const g = this.add.graphics({ x, y }).setDepth(10);
    g.fillStyle(COLORS.ink,0.55); g.fillEllipse(5,49,92*scale,24*scale);
    g.fillStyle(0x263438,1); g.fillRoundedRect(-38*scale,-2*scale,76*scale,70*scale,12*scale);
    g.fillStyle(COLORS.teal,1); g.fillRoundedRect(-30*scale,2*scale,60*scale,55*scale,10*scale);
    g.lineStyle(3*scale,COLORS.ink,1); g.strokeRoundedRect(-30*scale,2*scale,60*scale,55*scale,10*scale);
    g.fillStyle(0x8b5a43,1); g.fillCircle(0,-25*scale,29*scale);
    g.lineStyle(3*scale,COLORS.ink,1); g.strokeCircle(0,-25*scale,29*scale);
    g.fillStyle(0x202426,1);
    g.fillEllipse(-14*scale,-48*scale,19*scale,28*scale);
    g.fillEllipse(4*scale,-53*scale,22*scale,30*scale);
    g.fillEllipse(20*scale,-43*scale,16*scale,25*scale);
    g.lineStyle(3*scale,0xb9b4a8,1);
    g.lineBetween(-18*scale,-52*scale,-8*scale,-61*scale);
    g.lineBetween(7*scale,-58*scale,13*scale,-67*scale);
    g.lineStyle(2*scale,0x1a2022,1);
    g.strokeCircle(-10*scale,-27*scale,8*scale);
    g.strokeCircle(10*scale,-27*scale,8*scale);
    g.lineBetween(-2*scale,-27*scale,2*scale,-27*scale);
    g.fillStyle(0x171b1c,1);
    g.fillCircle(-10*scale,-27*scale,2*scale);
    g.fillCircle(10*scale,-27*scale,2*scale);
    g.lineStyle(2*scale,0x4b2d27,1);
    g.beginPath(); g.arc(0,-14*scale,8*scale,0.15,Math.PI-0.15); g.strokePath();
    const key=this.add.text(x+23*scale,y+31*scale,'◆',{fontSize:12*scale+'px',color:'#e2b45f'})
      .setOrigin(0.5).setDepth(11);
    this.keep(g,key);
    return g;
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
    this.drawRo(a.cx,a.panelTop+a.headerH+Math.max(105,a.portrait*0.72),Math.min(1.25,a.portrait/125));
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
      const badge=this.add.rectangle(a.cx-a.contentW/2+28,y,34,cardH-18,gang.color,0.85)
        .setStrokeStyle(2,COLORS.ink).setDepth(8);
      const initial=this.add.text(badge.x,badge.y,gang.name[0],{
        fontFamily:'Georgia, serif',fontSize:'22px',fontStyle:'bold',color:'#0b1012'
      }).setOrigin(0.5).setDepth(9);
      const name=this.add.text(a.cx-a.contentW/2+54,y-cardH/2+13,gang.name.toUpperCase(),{
        fontFamily:'monospace',fontSize:'13px',fontStyle:'bold',color:gang.css,letterSpacing:1
      }).setOrigin(0,0).setDepth(9);
      const contacts=this.add.text(name.x,y-cardH/2+32,gang.primary+' · '+gang.jobs,{
        fontFamily:'monospace',fontSize:'9px',color:'#b4bebf'
      }).setOrigin(0,0).setDepth(9);
      const pitch=this.add.text(name.x,y-cardH/2+48,gang.pitch,{
        fontFamily:'Georgia, serif',fontSize:'11px',color:'#e9dfc7',
        wordWrap:{width:a.contentW-112},lineSpacing:2
      }).setOrigin(0,0).setDepth(9);
      const hit=this.add.rectangle(a.cx,y,a.contentW,cardH,gang.color,0.001).setDepth(12)
        .setInteractive({cursor:'pointer'})
        .on('pointerover',()=>hit.setFillStyle(gang.color,0.12))
        .on('pointerout',()=>hit.setFillStyle(gang.color,0.001))
        .on('pointerup',()=>this.confirmGang(gang.id));
      this.keep(badge,initial,name,contacts,pitch,hit);
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
    this.drawRo(a.cx,portraitY,Math.min(0.92,a.portrait/155));
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
