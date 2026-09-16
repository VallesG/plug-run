// Pure responsive geometry for The Board. No imports.
export function boardLayout(width,height){
  const w=Math.max(280,Number.isFinite(width)?width:390);
  const h=Math.max(480,Number.isFinite(height)?height:844);
  const cx=w/2;
  const edge=Math.max(12,Math.floor(Math.min(w,h)*0.03));
  const panelW=Math.min(520,w-edge*2);
  const left=cx-panelW/2;
  const right=cx+panelW/2;
  const tableTop=Math.max(194,Math.min(218,h*0.255));
  const tableBottom=h-66;
  const headerH=38;
  const pagerH=38;
  const rowH=38;
  const bodyTop=tableTop+headerH;
  const bodyBottom=tableBottom-pagerH;
  const pageSize=Math.max(3,Math.floor((bodyBottom-bodyTop)/rowH));
  return {
    w,h,cx,edge,panelW,left,right,
    titleY:44,taglineY:78,tabY:126,summaryY:177,
    tableTop,tableBottom,headerH,pagerH,rowH,bodyTop,bodyBottom,pageSize,
    rankX:left+16,
    nameX:left+61,
    stashX:right-73,
    repX:right-14,
    backY:h-30
  };
}

export function boardPage(entries,page,pageSize){
  const list=Array.isArray(entries)?entries:[];
  const size=Math.max(1,Math.floor(pageSize)||1);
  const pages=Math.max(1,Math.ceil(list.length/size));
  const index=Math.max(0,Math.min(pages-1,Math.floor(page)||0));
  return {
    page:index,
    pages,
    start:index*size,
    entries:list.slice(index*size,index*size+size)
  };
}
