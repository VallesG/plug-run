// Original, reusable code-native crew marks. Same geometry drives SVG and Phaser.
// No fonts, raster downloads, storage, RNG, ownership or reward writes.
export const CREW_SIGILS = Object.freeze({
  crossline: Object.freeze({name:'Crossline', color:0x43b5c7, css:'#43b5c7', ink:0x19383b,
    paths:[
      {points:[[18,20],[36,20],[36,36],[64,64],[64,80],[82,80]],width:8},
      {points:[[82,20],[64,20],[64,36],[36,64],[36,80],[18,80]],width:8},
      {points:[[50,39],[61,50],[50,61],[39,50]],closed:true,fill:true,width:3}
    ],circles:[]}),
  'iron-row': Object.freeze({name:'Iron Row',color:0xd2c66a,css:'#d2c66a',ink:0x383e27,
    paths:[
      {points:[[50,8],[86,29],[86,71],[50,92],[14,71],[14,29]],closed:true,width:7},
      {points:[[29,35],[43,35]],width:5},{points:[[36,35],[36,66]],width:6},{points:[[29,66],[43,66]],width:5},
      {points:[[53,67],[53,35],[64,35],[71,40],[71,48],[65,53],[53,53]],width:5},
      {points:[[63,53],[73,67]],width:5}
    ],circles:[]}),
  afterlight: Object.freeze({name:'Afterlight',color:0x9b78d0,css:'#9b78d0',ink:0x302641,
    paths:[
      {points:[[49,9],[57,31],[73,39],[57,46],[49,64],[41,46],[27,39],[41,31]],closed:true,fill:true,width:2},
      {points:[[17,81],[78,81]],width:5},{points:[[27,91],[66,91]],width:3}
    ],circles:[{x:49,y:49,r:30,width:5},{x:56,y:49,r:22,width:2}]})
});
export function crewSigil(gangID) { return Object.prototype.hasOwnProperty.call(CREW_SIGILS,gangID) ? CREW_SIGILS[gangID] : null; }
/** Geometry-only SVG for stickers, flags and later cosmetics; viewBox stays 100. */
export function crewSigilSVG(gangID) {
  const mark=crewSigil(gangID); if(!mark)return null;
  const paths=mark.paths.map(p=>'<path d="M '+p.points.map(q=>q.join(' ')).join(' L ')+(p.closed?' Z':'')
    +'" fill="'+(p.fill?'currentColor':'none')+'" stroke="currentColor" stroke-width="'+p.width+'"/>').join('');
  const circles=mark.circles.map(c=>'<circle cx="'+c.x+'" cy="'+c.y+'" r="'+c.r
    +'" fill="none" stroke="currentColor" stroke-width="'+c.width+'"/>').join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="'+mark.name
    +' crew sigil" style="color:'+mark.css+'" stroke-linecap="square" stroke-linejoin="miter">'+circles+paths+'</svg>\n';
}
