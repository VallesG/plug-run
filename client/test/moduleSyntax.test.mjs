// Parse source as ES modules even though package.json has no "type": "module".
// Native node --check on a .js file does not provide the same guarantee.
// This checks syntax/binding collisions; Vite remains responsible for resolving
// imports and validating the browser dependency graph.
import { readdirSync, readFileSync, writeFileSync, mkdtempSync, unlinkSync, rmdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const clientRoot=fileURLToPath(new URL('../',import.meta.url));
const sources=[];
function collect(directory) {
  for(const entry of readdirSync(directory,{withFileTypes:true})){
    const path=join(directory,entry.name);
    if(entry.isDirectory())collect(path);
    else if(entry.isFile()&&/\.(?:js|mjs)$/.test(entry.name))
      sources.push({path,source:readFileSync(path,'utf8')});
  }
}
collect(join(clientRoot,'src'));
// Vite's separate art previews also contain modules outside the production
// entry graph. Check those too so review tools receive the same protection.
for(const name of ['block-map-preview.html','interior-style-preview.html','gang-skins-preview.html','city-map-preview.html','contact-preview.html']){
  const path=join(clientRoot,name);
  if(!existsSync(path))continue;
  const html=readFileSync(path,'utf8');
  for(const match of html.matchAll(/<script\s+type=["']module["'][^>]*>([\s\S]*?)<\/script>/g)){
    sources.push({path:path+' (inline module)',source:match[1]});
  }
}
const scratch=mkdtempSync(join(tmpdir(),'plug-run-esm-'));
const probe=join(scratch,'syntax.mjs');
let failed=0;
try {
  for(const file of sources){
    writeFileSync(probe,file.source,'utf8');
    const result=spawnSync(process.execPath,['--check',probe],{encoding:'utf8',windowsHide:true});
    if(result.error||result.status!==0){
      failed++;
      console.error('\nES module check failed: '+file.path);
      console.error(result.error?.message||result.stderr||result.stdout);
    }
  }
} finally {
  // Delete only the one scratch file we created, then its empty directory.
  if(existsSync(probe))unlinkSync(probe);
  rmdirSync(scratch);
}
console.log('ES module syntax: '+sources.length+' checked, '+failed+' failed');
if(failed)process.exitCode=1;
