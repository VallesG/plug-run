// Mechanical asset preparation only: crop, pad, resize and WebP encoding.
// Usage: node tools/prepare-contact-expressions.mjs <input-dir> [sharp-module-path]
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),sharp=require(process.argv[3]||'sharp');
// Generated grid cells can contain a disconnected sliver of a neighboring pose.
// Keep the main alpha-connected silhouette, not pixels from the adjacent cell.
function isolateSilhouette(data,width,height){
 const labels=new Int32Array(width*height),queue=new Int32Array(width*height);
 let label=0,best=0,bestSize=0;
 for(let p=0;p<labels.length;p++){
  if(labels[p]||data[p*4+3]<=8)continue;
  label++;let head=0,tail=1;queue[0]=p;labels[p]=label;
  while(head<tail){
   const q=queue[head++],x=q%width,y=Math.floor(q/width);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const nx=x+dx,ny=y+dy;
    if(nx<0||ny<0||nx>=width||ny>=height)continue;
    const n=ny*width+nx;
    if(!labels[n]&&data[n*4+3]>8){labels[n]=label;queue[tail++]=n;}
   }
  }
  if(tail>bestSize){bestSize=tail;best=label;}
 }
 if(bestSize<width*height*.05)throw Error('No primary silhouette in expression cell');
 let removed=0;
 for(let p=0;p<labels.length;p++)if(labels[p]!==best){
  if(data[p*4+3]>8)removed++;
  data[p*4+3]=0;
 }
 return removed;
}
const input=resolve(process.argv[2]||'art-sources/the-window/expressions');
const source=resolve('art-sources/the-window/expressions'),output=resolve('public/art/the-window/expressions');
mkdirSync(source,{recursive:true});mkdirSync(output,{recursive:true});
const sheets=[
 ['crossline',['switch','mags']],['iron-row',['brick','rook']],
 ['afterlight',['vee','sol']],['auntie-ro',['ro']]
];
const manifest={schemaVersion:1,expressions:['neutral','amused','hyped','concerned','unimpressed'],
 frameWidth:320,frameHeight:400,frames:5,quality:82,effort:6,characters:[],sources:[]};
for(const [name,ids] of sheets){
 const encoded=join(input,name+'.b64');
 const png=existsSync(encoded)?Buffer.from(readFileSync(encoded,'utf8').trim(),'base64')
  :readFileSync(join(input,name+'.png'));
 const m=await sharp(png).metadata();
 if(!m.hasAlpha)throw Error(name+' has no alpha');
 const raw=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let transparent=0;for(let i=3;i<raw.data.length;i+=4)if(raw.data[i]===0)transparent++;
 if(transparent<raw.info.width*raw.info.height*.05)throw Error(name+' transparency missing');
 writeFileSync(join(source,name+'.png'),png);
 manifest.sources.push({name,width:m.width,height:m.height,bytes:png.length,
  sha256:createHash('sha256').update(png).digest('hex'),transparentPixels:transparent,
  path:'art-sources/the-window/expressions/'+name+'.png'});
 for(const [row,id] of ids.entries()){
  const frames=[],cells=[];
  for(let col=0;col<5;col++){
   const left=Math.floor(col*m.width/5),right=Math.floor((col+1)*m.width/5);
   const top=Math.floor(row*m.height/ids.length),bottom=Math.floor((row+1)*m.height/ids.length);
   const crop=await sharp(png).extract({left,top,width:right-left,height:bottom-top}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   isolateSilhouette(crop.data,crop.info.width,crop.info.height);
   const clean=await sharp(crop.data,{raw:crop.info}).png().toBuffer();
   const cell=await sharp(clean).trim({threshold:8}).png().toBuffer();
   cells.push({input:cell,...await sharp(cell).metadata()});
  }
  // One scale across the entire character row; changing expression must not
  // make the head jump in size just because a celebratory elbow is wider.
  const scale=Math.min(304/Math.max(...cells.map(c=>c.width)),380/Math.max(...cells.map(c=>c.height)));
  for(const [col,cell] of cells.entries()){
   const scaled=await sharp(cell.input).resize(Math.round(cell.width*scale),Math.round(cell.height*scale)).png().toBuffer();
   const sz=await sharp(scaled).metadata();
   frames.push({input:scaled,left:col*320+Math.floor((320-sz.width)/2),top:390-sz.height});
  }
  const webp=await sharp({create:{width:1600,height:400,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
   .composite(frames).webp({quality:82,alphaQuality:100,effort:6}).toBuffer();
  writeFileSync(join(output,id+'.webp'),webp);
  manifest.characters.push({id,source:'/art/the-window/expressions/'+id+'.webp',
   width:1600,height:400,bytes:webp.length,sourceSheet:name,
   sha256:createHash('sha256').update(webp).digest('hex')});
 }
}
writeFileSync(join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({runtimeBytes:manifest.characters.reduce((n,c)=>n+c.bytes,0),
 sourceBytes:manifest.sources.reduce((n,c)=>n+c.bytes,0),characters:manifest.characters},null,2));
