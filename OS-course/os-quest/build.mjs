import {readFile,writeFile} from 'node:fs/promises';
const base=new URL('./src/',import.meta.url);
let html=await readFile(new URL('template.html',base),'utf8');
for(const [key,file] of [['STYLES','style.css'],['WORLD_STYLES','world.css'],['DATA','questions.js'],['POETRY','poetry.js'],['POETRY_UI','poetry-ui.js'],['POETRY_STYLES','poetry.css'],['WORLD','world.js'],['ENGINE','engine.js'],['WORLD_UI','world-ui.js'],['APP','app.js']]){
  const content=await readFile(new URL(file,base),'utf8');
  if(content.toLowerCase().includes('</script'))throw new Error(`Unsafe script delimiter: ${file}`);
  html=html.replace(`/* ${key} */`,()=>content);
}
const atlas=await readFile(new URL('./assets/npc-cast.png',import.meta.url));
html=html.replace('/* NPC_ATLAS */',()=>`data:image/png;base64,${atlas.toString('base64')}`);
const poetAtlases=await Promise.all(['poets-tang-a.png','poets-tang-song.png','poets-song.png'].map(async file=>'data:image/png;base64,'+(await readFile(new URL('./assets/'+file,import.meta.url))).toString('base64')));
html=html.replace('/* POET_ATLASES */',()=>JSON.stringify(poetAtlases));
await writeFile(new URL('./index.html',import.meta.url),html);
console.log('Built self-contained index.html (no runtime dependencies).');
