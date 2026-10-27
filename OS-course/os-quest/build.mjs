import {readFile,writeFile} from 'node:fs/promises';
const base=new URL('./src/',import.meta.url);
let html=await readFile(new URL('template.html',base),'utf8');
for(const [key,file] of [['STYLES','style.css'],['DATA','questions.js'],['ENGINE','engine.js'],['APP','app.js']]){
  const content=await readFile(new URL(file,base),'utf8');
  if(content.toLowerCase().includes('</script'))throw new Error(`Unsafe script delimiter: ${file}`);
  html=html.replace(`/* ${key} */`,()=>content);
}
await writeFile(new URL('./index.html',import.meta.url),html);
console.log('Built self-contained index.html (no runtime dependencies).');
