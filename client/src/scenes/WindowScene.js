import Phaser from 'phaser';
import { expressionArt, expressionIndex } from '../logic/contactExpressions.js';
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
    for (const id of ['ro','switch','mags','brick','rook','vee','sol']) {
      const art=expressionArt(id);
      if(!this.textures.exists(art.key))this.load.spritesheet(art.key,art.source,
        {frameWidth:art.frameWidth,frameHeight:art.frameHeight});
    }
    this.load.image('window_bodega', '/art/the-window/bodega-night.webp');
    this.load.spritesheet('window_ro', '/art/the-window/auntie-ro.webp', { frameWidth: WINDOW_ART.ro.frameWidth, frameHeight: WINDOW_ART.ro.frameHeight });
    this.load.spritesheet('window_switch', '/art/the-window/switch.webp', { frameWidth: WINDOW_ART.switch.frameWidth, frameHeight: WINDOW_ART.switch.frameHeight });
    this.load.image('window_cast', '/art/the-window/cast.webp');
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
    const front=WINDOW_ART.bodega.foreground;
    if(bodega&&!bodega.has('counter-foreground')){
      bodega.add('counter-foreground',0,front.x,front.y,front.width,front.height);
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
    const art=expressionArt('ro'),expressive=this.textures.exists(art.key);
    const shadow=this.add.ellipse(x+5,y+size*0.42,size*0.72,size*0.16,COLORS.ink,0.7).setDepth(3.8);
    if(!expressive&&!this.textures.exists('window_ro')){
      const fallback=this.add.graphics({x,y}).setDepth(4);
      fallback.fillStyle(COLORS.teal,1).fillRoundedRect(-size*0.2,-size*0.05,size*0.4,size*0.48,size*0.08);
      fallback.fillStyle(0x8b5a43,1).fillCircle(0,-size*0.16,size*0.16);
      this.keep(shadow,fallback);
      return fallback;
    }
    const emotion=expression===1?'unimpressed':expression===2?'amused':'neutral';
    const sprite=this.add.image(x,y,expressive?art.key:'window_ro',
      expressive?expressionIndex(emotion):Math.max(0,Math.min(2,expression)))
      .setDepth(4).setScale(size/(expressive?art.frameHeight:WINDOW_ART.ro.frameHeight));
    this.keep(shadow,sprite);
    return sprite;
  }

  drawRoBehindCounter(a,scale,expression=0) {
    const size=176*scale;
    const front=WINDOW_ART.bodega.foreground;
    const counterY=a.panelTop+(front.y/WINDOW_ART.bodega.portrait.height)*a.panelH;
    const ro=this.drawRo(a.cx,counterY-size*0.47,scale,expression);
    if(this.textures.exists('window_bodega')){
      const frontH=a.panelH*(front.height/WINDOW_ART.bodega.portrait.height);
      const frontY=a.panelTop+(front.y/WINDOW_ART.bodega.portrait.height)*a.panelH+frontH/2;
      this.keep(this.add.image(a.cx,frontY,'window_bodega','counter-foreground')
        .setDepth(4.5).setDisplaySize(a.panelW,frontH));
    }
    return ro;
  }

  drawContactPortrait(contactID,x,bottom,width,height,flip=false,expression='neutral') {
    const art=expressionArt(contactID);
    const source=art&&this.textures.exists(art.key)?[art.key,expressionIndex(expression)]
      :contactID==='switch'?['window_switch',0]:['window_cast',contactID];
    if(!this.textures.exists(source[0])) {
      const size=Math.min(width,height);
      const fallback=this.add.circle(x,bottom-size/2,size*0.3,COLORS.teal,0.9).setDepth(10);
      const initial=this.add.text(x,bottom-size/2,contactID[0].toUpperCase(),{fontFamily:'Arial, sans-serif',fontSize:size*0.32+'px',color:'#0b1012'}).setOrigin(0.5).setDepth(11);
      this.keep(fallback,initial);return fallback;
    }
    const image=this.add.image(x,bottom,source[0],source[1]).setOrigin(0.5,1).setDepth(10);
    const frame=image.frame;
    const frameW=frame?.realWidth || frame?.width || (source[0]==='window_switch'?WINDOW_ART.switch.frameWidth:WINDOW_ART.cast.frames[contactID].width);
    const frameH=frame?.realHeight || frame?.height || (source[0]==='window_switch'?WINDOW_ART.switch.frameHeight:WINDOW_ART.cast.height);
    image.setScale(Math.min(width/frameW,height/frameH)).setFlipX(flip);
    this.keep(image);
    return image;
  }

  drawGangPortrait(gangID,x,bottom,width,height) {
    const gang=windowGang(gangID);
    return this.drawContactPortrait(gang.primary.toLowerCase(),x,bottom,width,height);
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
    const roScale=Math.min(1.25,a.portrait/125);
    if(a.panelW/a.panelH<0.92) this.drawRoBehindCounter(a,roScale,this._introIndex===1?1:0);
    else this.drawRo(a.cx,a.panelTop+a.headerH+Math.max(105,a.portrait*0.72),roScale,this._introIndex===1?1:0);
    const box=this.addDialogue(WINDOW_INTRO[this._introIndex]);
    const last=this._introIndex===WINDOW_INTRO.length-1;
    const actionW=Math.min(164,box.w-28);
    const actionX=a.cx+box.w/2-actionW/2-14;
    this.addButton(actionX,box.y+box.h/2-28,actionW,last?'MEET THE CREWS  >>':'KEEP LISTENING  >>',
      ()=>last?this.showGangChoice():this.showIntro(this._introIndex+1));
  }

  showGangChoice() {
    this.clearView();
    const a=windowLayout(this.scale.width,this.scale.height);
    const titleY=a.panelTop+a.headerH+18;
    const heading=this.add.rectangle(a.cx,titleY,a.contentW,44,0x0d1417,0.96)
      .setStrokeStyle(1,COLORS.gold,0.55).setDepth(7);
    const title=this.add.text(a.cx,titleY,'WHO HAS YOUR BACK?',{
      fontFamily:'Arial, sans-serif',fontSize:Math.max(18,Math.min(24,a.contentW*0.055))+'px',
      fontStyle:'bold',color:'#fff0c7',align:'center'
    }).setOrigin(0.5).setDepth(8);
    this.keep(heading,title);

    const cardsTop=titleY+34;
    const availableH=a.panelBottom-a.pad-cardsTop-58;
    const cardH=Math.max(68,Math.min(118,(availableH-16)/3));
    WINDOW_GANGS.forEach((gang,i)=>{
      const y=cardsTop+cardH/2+i*(cardH+8);
      this.addPanel(a.cx,y,a.contentW,cardH,gang.color);
      const portraitH=cardH-12;
      const portraitW=Math.min(80,a.contentW*0.23);
      const cardLeft=a.cx-a.contentW/2;
      const portraitX=cardLeft+8+portraitW/2;
      this.drawGangPortrait(gang.id,portraitX,y+cardH/2-6,portraitW,portraitH);
      const textX=cardLeft+portraitW+18;
      const name=this.add.text(textX,y-cardH/2+11,gang.name.toUpperCase(),{
        fontFamily:'Arial, sans-serif',fontSize:'17px',fontStyle:'bold',color:gang.css,letterSpacing:1
      }).setOrigin(0,0).setDepth(9);
      const contacts=this.add.text(name.x,y-cardH/2+34,gang.primary+' · '+gang.jobs,{
        fontFamily:'Arial, sans-serif',fontSize:'10px',color:'#b4bebf'
      }).setOrigin(0,0).setDepth(9);
      const pitch=this.add.text(name.x,y-cardH/2+51,cardH<100?gang.motto:gang.pitch,{
        fontFamily:'Georgia, serif',fontSize:'12px',color:'#e9dfc7',
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
    const h=Math.min(430,a.panelH-a.headerH-92);
    const top=a.panelTop+a.headerH+16;
    this.addPanel(a.cx,top+h/2,a.contentW,h,gang.color);
    const joined=this.add.text(a.cx,top+18,'YOU RUN WITH '+gang.name.toUpperCase(),{
      fontFamily:'Arial, sans-serif',fontSize:a.contentW<300?'18px':'22px',fontStyle:'bold',color:gang.css,
      align:'center',wordWrap:{width:a.contentW-24}
    }).setOrigin(0.5,0).setDepth(11);
    const artH=Math.min(180,h*0.44);
    const artW=Math.min(170,(a.contentW-28)/2);
    const artBottom=top+60+artH;
    // Bottom-aligned, mirrored partners form a back-to-back crew silhouette.
    const primary=this.drawContactPortrait(gang.primary.toLowerCase(),a.cx-artW/2,artBottom,artW,artH,true,'hyped');
    const secondary=this.drawContactPortrait(gang.jobs.toLowerCase(),a.cx+artW/2,artBottom,artW,artH,false,'hyped');
    if(primary?.displayWidth) primary.x=a.cx-primary.displayWidth*0.4;
    if(secondary?.displayWidth) secondary.x=a.cx+secondary.displayWidth*0.4;
    const line=this.add.text(a.cx,artBottom+16,
      gang.primary+' is your main contact.\n'+gang.jobs+' will bring the jobs.',{
        fontFamily:'Arial, sans-serif',fontSize:'12px',color:'#e9dfc7',
        align:'center',lineSpacing:5
      }).setOrigin(0.5,0).setDepth(11);
    const welcome=this.add.text(a.cx,top+h-20,
      gang.id==='crossline'
        ? '“Name’s Switch. Tonight, the streets are talking about you.”'
        : '“You picked your people. Now give them something to talk about.”',{
        fontFamily:'Georgia, serif',fontSize:a.contentW<300?'12px':'14px',fontStyle:'italic',color:'#f1dfb0',
        align:'center',wordWrap:{width:a.contentW-32}
      }).setOrigin(0.5,1).setDepth(11);
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
    const roScale=a.panelW/a.panelH<0.92
      ? Math.min(1.08,Math.max(0.88,a.panelW/300))
      : Math.min(0.92,a.portrait/155);
    let portraitY=a.panelTop+a.headerH+Math.max(82,a.portrait*0.55);
    if(a.panelW/a.panelH<0.92){
      const front=WINDOW_ART.bodega.foreground;
      const counterY=a.panelTop+(front.y/WINDOW_ART.bodega.portrait.height)*a.panelH;
      portraitY=counterY-176*roScale*0.47;
      this.drawRoBehindCounter(a,roScale,2);
    }else{
      this.drawRo(a.cx,portraitY,roScale,2);
    }
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
