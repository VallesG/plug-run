import Phaser from 'phaser';
import {
  getGlobalDailyLeaderboard, getGlobalAllTimeLeaderboard,
  getGlobalDailyRank, getGlobalAllTimeRank, formatNumber
} from '../utils/leaderboardManager.js';
import { getUserID } from '../utils/userManager.js';
import { trackLeaderboardView } from '../utils/analytics.js';
import { createPortraitOverlay } from '../utils/portraitMode.js';
import { boardLayout, boardPage } from '../logic/leaderboard.js';

const C={
  bg:0x070b0d,panel:0x111719,card:0x0d1214,ink:0x080b0d,
  cream:'#f1dfb0',muted:'#98a4a4',gold:0xe2b45f,teal:0x4e9b96,
  green:'#86efac',rep:'#ffd166'
};

export default class LeaderboardScene extends Phaser.Scene{
  constructor(){super({key:'LEADERBOARD'});}

  create(){
    this.currentTab='daily';
    this.currentSort='stash';
    this.currentPage=0;
    this._scores=[];
    this._dynamic=[];
    this.layout=boardLayout(this.scale.width,this.scale.height);
    this.drawBackground();
    this.drawChrome();
    createPortraitOverlay(this);

    this._lastW=this.scale.gameSize.width;
    this._lastH=this.scale.gameSize.height;
    this._onResize=gameSize=>{
      if(Math.abs(gameSize.width-this._lastW)<40&&Math.abs(gameSize.height-this._lastH)<40)return;
      clearTimeout(this._resizeTimer);
      this._resizeTimer=setTimeout(()=>this.scene.restart(),200);
    };
    this.scale.on('resize',this._onResize);
    this.events.once('shutdown',()=>{
      clearTimeout(this._resizeTimer);
      this.scale.off('resize',this._onResize);
      this._requestToken=(this._requestToken||0)+1;
    });

    this.refreshContent();
  }

  drawBackground(){
    const a=this.layout;
    this.add.rectangle(a.cx,a.h/2,a.w,a.h,C.bg,1);
    const g=this.add.graphics();
    g.lineStyle(1,0x273134,0.22);
    for(let x=12;x<a.w;x+=24)g.lineBetween(x,0,x,a.h);
    for(let y=14;y<a.h;y+=24)g.lineBetween(0,y,a.w,y);
    g.fillStyle(0x000000,0.16);
    for(let i=0;i<5;i++){
      const edge=(5-i)*Math.min(a.w,a.h)*0.02;
      g.fillRect(0,0,edge,a.h);g.fillRect(a.w-edge,0,edge,a.h);
    }
  }

  drawChrome(){
    const a=this.layout;
    const title=this.add.text(a.cx,a.titleY,'THE BOARD',{
      fontFamily:'Georgia, serif',fontSize:'29px',fontStyle:'bold',
      color:C.cream,letterSpacing:2,stroke:'#080b0d',strokeThickness:3
    }).setOrigin(0.5);
    this.add.rectangle(a.cx,a.titleY+24,154,2,C.gold,0.9);
    this.add.text(a.cx,a.taglineY,'STASH MOVES BLOCKS · REP BUILDS YOUR NAME',{
      fontFamily:'monospace',fontSize:a.panelW<300?'8px':'9px',
      color:'#b9a875',letterSpacing:1
    }).setOrigin(0.5);

    const gap=8;
    const tabW=Math.min(150,(a.panelW-gap)/2);
    this.tabButtons={};this.tabTexts={};
    [
      ['daily','TODAY',a.cx-tabW/2-gap/2],
      ['alltime','ALL-TIME',a.cx+tabW/2+gap/2]
    ].forEach(([key,label,x])=>{
      const shadow=this.add.rectangle(x+3,a.tabY+4,tabW,42,C.ink,0.7);
      const bg=this.add.rectangle(x,a.tabY,tabW,42,C.panel,1)
        .setInteractive({cursor:'pointer'});
      const text=this.add.text(x,a.tabY,label,{
        fontFamily:'monospace',fontSize:'11px',fontStyle:'bold',letterSpacing:1
      }).setOrigin(0.5);
      bg.on('pointerup',()=>this.switchTab(key));
      this.tabButtons[key]=bg;this.tabTexts[key]=text;
    });
    this.applyTabStyle();

    this.summaryTitle=this.add.text(a.left,a.summaryY,'TODAY’S RUNNERS',{
      fontFamily:'Georgia, serif',fontSize:'18px',fontStyle:'bold',color:'#d8e3df'
    }).setOrigin(0,0.5);
    this.rankChip=this.add.text(a.right,a.summaryY,'YOUR RANK  —',{
      fontFamily:'monospace',fontSize:'9px',fontStyle:'bold',color:'#e2b45f',
      backgroundColor:'#151d1f',padding:{x:8,y:5}
    }).setOrigin(1,0.5);

    const backShadow=this.add.rectangle(a.left+55+3,a.backY+4,110,40,C.ink,0.7);
    const back=this.add.rectangle(a.left+55,a.backY,110,40,C.panel,1)
      .setStrokeStyle(2,0x627174).setInteractive({cursor:'pointer'});
    const backText=this.add.text(a.left+55,a.backY,'<<  MENU',{
      fontFamily:'monospace',fontSize:'11px',fontStyle:'bold',color:'#d8e3df'
    }).setOrigin(0.5);
    back.on('pointerover',()=>back.setFillStyle(0x263235,1));
    back.on('pointerout',()=>back.setFillStyle(C.panel,1));
    back.on('pointerup',()=>this.scene.start('MENU'));
  }

  applyTabStyle(){
    for(const key of Object.keys(this.tabButtons||{})){
      const active=key===this.currentTab;
      this.tabButtons[key].setFillStyle(active?0x203033:C.panel,1)
        .setStrokeStyle(2,active?C.gold:0x475356);
      this.tabTexts[key].setColor(active?C.cream:'#8e9a9c');
    }
  }

  switchTab(tab){
    if(tab===this.currentTab)return;
    this.currentTab=tab;
    this.currentPage=0;
    this.applyTabStyle();
    trackLeaderboardView(tab,'runner');
    this.refreshContent();
  }

  switchSort(sort){
    if(sort===this.currentSort)return;
    this.currentSort=sort;
    this.currentPage=0;
    this.refreshContent();
  }

  clearDynamic(){
    for(const object of this._dynamic||[])try{object.destroy();}catch{}
    this._dynamic=[];
  }

  keep(...objects){
    this._dynamic.push(...objects.flat().filter(Boolean));
    return objects[0];
  }

  async refreshContent(){
    const token=(this._requestToken||0)+1;
    this._requestToken=token;
    this.clearDynamic();
    this.summaryTitle.setText(this.currentTab==='daily'?'TODAY’S RUNNERS':'ALL-TIME RUNNERS');
    this.rankChip.setText('YOUR RANK  …');

    const loading=this.add.text(this.layout.cx,(this.layout.tableTop+this.layout.tableBottom)/2,'CHECKING THE BOARD…',{
      fontFamily:'monospace',fontSize:'11px',color:'#8e9a9c',letterSpacing:1
    }).setOrigin(0.5);
    this.keep(loading);

    try{
      const role='runner',sort=this.currentSort;
      const payload=this.currentTab==='daily'
        ? await getGlobalDailyLeaderboard(role,null,20,sort)
        : await getGlobalAllTimeLeaderboard(role,20,sort);
      const rank=this.currentTab==='daily'
        ? await getGlobalDailyRank(role,sort)
        : await getGlobalAllTimeRank(role,sort);
      if(token!==this._requestToken)return;
      this._scores=payload?.entries||[];
      this.myRank=rank||null;
      this.renderBoard();
    }catch(error){
      if(token!==this._requestToken)return;
      console.warn('[Leaderboard] Could not load board',error);
      this._scores=[];
      this.myRank=null;
      this.renderBoard(true);
    }
  }

  renderBoard(offline=false){
    this.clearDynamic();
    const a=this.layout;
    this.rankChip.setText(this.myRank?'YOUR RANK  #'+this.myRank:'YOUR RANK  —');
    const panelShadow=this.add.rectangle(a.cx+4,(a.tableTop+a.tableBottom)/2+5,a.panelW,a.tableBottom-a.tableTop,C.ink,0.75);
    const panel=this.add.rectangle(a.cx,(a.tableTop+a.tableBottom)/2,a.panelW,a.tableBottom-a.tableTop,C.panel,0.97)
      .setStrokeStyle(2,0x536064);
    const header=this.add.rectangle(a.cx,a.tableTop+a.headerH/2,a.panelW-2,a.headerH,0x1a2328,1);
    this.keep(panelShadow,panel,header);

    const headerStyle={fontFamily:'monospace',fontSize:'9px',color:'#7f8b8d',letterSpacing:1};
    const rankH=this.add.text(a.rankX,a.tableTop+a.headerH/2,'RANK',headerStyle).setOrigin(0,0.5);
    const nameH=this.add.text(a.nameX,a.tableTop+a.headerH/2,'RUNNER',headerStyle).setOrigin(0,0.5);
    const stashH=this.add.text(a.stashX,a.tableTop+a.headerH/2,this.currentSort==='stash'?'STASH  ▾':'STASH',{
      ...headerStyle,color:this.currentSort==='stash'?C.green:'#8e9a9c',fontStyle:'bold'
    }).setOrigin(0.5).setInteractive({cursor:'pointer'});
    const repH=this.add.text(a.repX,a.tableTop+a.headerH/2,this.currentSort==='rep'?'REP  ▾':'REP',{
      ...headerStyle,color:this.currentSort==='rep'?C.rep:'#8e9a9c',fontStyle:'bold'
    }).setOrigin(1,0.5).setInteractive({cursor:'pointer'});
    stashH.on('pointerup',()=>this.switchSort('stash'));
    repH.on('pointerup',()=>this.switchSort('rep'));
    this.keep(rankH,nameH,stashH,repH);

    if(!this._scores.length){
      this.renderEmptyState(offline);
      this.renderPager(boardPage([],0,a.pageSize));
      return;
    }

    const page=boardPage(this._scores,this.currentPage,a.pageSize);
    this.currentPage=page.page;
    const userID=getUserID();
    page.entries.forEach((entry,index)=>{
      const rank=page.start+index+1;
      const y=a.bodyTop+a.rowH*(index+0.5);
      const isUser=entry.userId===userID;
      const stripe=index%2===0?0x0d1417:0x11191c;
      const row=this.add.rectangle(a.cx,y,a.panelW-12,a.rowH-4,isUser?0x2a3327:stripe,isUser?0.96:0.82)
        .setStrokeStyle(isUser?1:0,isUser?C.gold:stripe,isUser?0.9:0);
      const medal=rank===1?'#f1ca82':rank===2?'#c8d0d0':rank===3?'#c98258':'#9aa5a7';
      const rankText=this.add.text(a.rankX,y,'#'+rank,{
        fontFamily:'monospace',fontSize:'11px',fontStyle:rank<=3?'bold':'normal',color:medal
      }).setOrigin(0,0.5);
      const raw=String(entry.username||'Runner');
      const max=a.panelW<300?12:18;
      const username=raw.length>max?raw.slice(0,max-1)+'…':raw;
      const name=this.add.text(a.nameX,y,username,{
        fontFamily:'monospace',fontSize:'11px',fontStyle:isUser?'bold':'normal',
        color:isUser?'#f1dfb0':'#d2d9d7'
      }).setOrigin(0,0.5);
      const stash=entry.stash==null?'—':formatNumber(entry.stash);
      const rep=entry.rep==null?'—':Math.abs(entry.rep)>=10000?formatNumber(entry.rep):
        (entry.rep%1===0?String(entry.rep):entry.rep.toFixed(2));
      const stashText=this.add.text(a.stashX,y,stash,{
        fontFamily:'monospace',fontSize:'11px',fontStyle:this.currentSort==='stash'?'bold':'normal',
        color:this.currentSort==='stash'?C.green:'#667274'
      }).setOrigin(0.5);
      const repText=this.add.text(a.repX,y,rep,{
        fontFamily:'monospace',fontSize:'11px',fontStyle:this.currentSort==='rep'?'bold':'normal',
        color:this.currentSort==='rep'?C.rep:'#667274'
      }).setOrigin(1,0.5);
      this.keep(row,rankText,name,stashText,repText);
    });
    this.renderPager(page);
  }

  renderEmptyState(offline){
    const a=this.layout;
    const centerY=(a.bodyTop+a.bodyBottom)/2-5;
    const route=this.add.graphics();
    route.lineStyle(3,C.teal,0.8);
    route.beginPath();
    route.moveTo(a.cx-34,centerY-25);route.lineTo(a.cx-8,centerY-25);
    route.lineTo(a.cx-8,centerY-6);route.lineTo(a.cx+27,centerY-6);route.strokePath();
    route.fillStyle(C.gold,1);route.fillCircle(a.cx+27,centerY-6,5);
    const title=this.add.text(a.cx,centerY+13,offline?'BOARD OFFLINE':'NO RUNS ON THE BOARD YET',{
      fontFamily:'monospace',fontSize:'11px',fontStyle:'bold',color:C.cream,letterSpacing:1
    }).setOrigin(0.5);
    const sub=this.add.text(a.cx,centerY+33,offline?'Try again in a minute.':'Set the first mark for today.',{
      fontFamily:'Georgia, serif',fontSize:'12px',fontStyle:'italic',color:'#8e9a9c'
    }).setOrigin(0.5);
    this.keep(route,title,sub);
  }

  renderPager(page){
    const a=this.layout;
    const y=a.tableBottom-a.pagerH/2;
    const line=this.add.rectangle(a.cx,y-a.pagerH/2,a.panelW-12,1,0x3b4648,0.8);
    const label=page.pages>1
      ? 'PAGE '+(page.page+1)+' / '+page.pages
      : (this._scores.length?'TOP '+this._scores.length+' RUNNERS':'SCORES POST AFTER A RUN');
    const text=this.add.text(a.cx,y,label,{
      fontFamily:'monospace',fontSize:'8px',color:'#778385',letterSpacing:1
    }).setOrigin(0.5);
    this.keep(line,text);
    if(page.pages<=1)return;
    const makeArrow=(x,label,delta)=>{
      const bg=this.add.rectangle(x,y,42,30,C.card,1).setStrokeStyle(1,0x586568)
        .setInteractive({cursor:'pointer'});
      const tx=this.add.text(x,y,label,{fontFamily:'monospace',fontSize:'13px',fontStyle:'bold',color:C.cream}).setOrigin(0.5);
      bg.on('pointerup',()=>{
        const next=Math.max(0,Math.min(page.pages-1,page.page+delta));
        if(next!==page.page){this.currentPage=next;this.renderBoard();}
      });
      this.keep(bg,tx);
    };
    makeArrow(a.left+28,y,'<<',-1);
    makeArrow(a.right-28,y,'>>',1);
  }
}
