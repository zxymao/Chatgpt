import {readFile,writeFile} from 'node:fs/promises';
const url=name=>new URL(name,import.meta.url);
let html=await readFile(url('src/template.html'),'utf8');
for(const [marker,path] of [['STYLES','src/style.css'],['PROJECT2','src/project2.js'],['ENGINE','src/engine.js'],['APP','src/app.js']]){
  let source=await readFile(url(path),'utf8');
  if(marker!=='STYLES')source=source.replace(/<\/script/gi,'<\\/script');
  html=html.replace(`/* ${marker} */`,()=>source);
}
if(process.argv.includes('--check')){
  if(await readFile(url('index.html'),'utf8')!==html)throw Error('index.html is stale: run node build.mjs');
  console.log('Standalone game matches source');
}else{
  await writeFile(url('index.html'),html);
  console.log('Built offline game/index.html');
}
