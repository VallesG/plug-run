// Deterministic visual assignments only. The grid is never edited.
// A prop may replace a solid rectangular wall component, never a floor tile
// or a bounding box containing a traversable hole.
export function planInterior(grid, seed = 0) {
  const rows=grid.length, cols=grid[0]?.length||0;
  const seen=new Set(), props=[], used=new Set();
  const wall=(x,y)=>x>0&&y>0&&x<cols-1&&y<rows-1&&grid[y]?.[x]===1;
  for(let y=1;y<rows-1;y++) for(let x=1;x<cols-1;x++) {
    const key=y*cols+x;
    if(!wall(x,y)||seen.has(key))continue;
    const cells=[[x,y]];seen.add(key);
    for(let i=0;i<cells.length;i++){
      const [cx,cy]=cells[i];
      for(const [nx,ny] of [[cx-1,cy],[cx+1,cy],[cx,cy-1],[cx,cy+1]]){
        const k=ny*cols+nx;
        if(wall(nx,ny)&&!seen.has(k)){seen.add(k);cells.push([nx,ny]);}
      }
    }
    // Border-connected clusters remain architecture, not half a sofa.
    if(cells.some(([cx,cy])=>[[cx-1,cy],[cx+1,cy],[cx,cy-1],[cx,cy+1]].some(
      ([nx,ny])=>(nx===0||ny===0||nx===cols-1||ny===rows-1)&&grid[ny]?.[nx]===1)))continue;
    const xs=cells.map(c=>c[0]),ys=cells.map(c=>c[1]);
    const left=Math.min(...xs),top=Math.min(...ys);
    const w=Math.max(...xs)-left+1,h=Math.max(...ys)-top+1;
    if(cells.length!==w*h)continue;
    let type=null;
    if((w===1&&h>=3&&h<=5)||(h===1&&w>=3&&w<=5))type='sofa';
    else if(w===2&&h===2)type='table';
    else if((w===2&&h===1)||(w===1&&h===2))type='cabinet';
    else if(w===1&&h===1)type=used.has('chair')?'plant':'chair';
    if(!type||used.has(type))continue;
    used.add(type);
    props.push({type,x:left,y:top,w,h,cells,
      variant:((Math.imul(left+1,73856093)^Math.imul(top+1,19349663)^(seed|0))>>>0)%3});
  }
  return props;
}
