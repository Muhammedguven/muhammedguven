import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {mediaIdentity} from './catalog.mjs';
export async function fetchText(url) {
  let error;
  for(let attempt=0;attempt<3;attempt++){
    try{
      const r=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'Mozilla/5.0'}});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      return await r.text();
    }catch(e){error=e;if(attempt<2)await new Promise(r=>setTimeout(r,700*(attempt+1)));}
  }
  throw error;
}
export async function saveMedia(slug,item,localSource) {
  const url=new URL(item.sourceUrl);
  if(url.protocol!=='https:'||!/(^|\.)(mzstatic\.com|googleusercontent\.com|ggpht\.com)$/.test(url.hostname))throw new Error('Unexpected media host');
  const hash=createHash('sha256').update(mediaIdentity(item.sourceUrl)).digest('hex').slice(0,16);
  const output=`assets/store/${slug}/${item.kind}-${hash}.webp`;
  try{await fs.access(output);return {...item,path:output};}catch{}
  let buffer;
  if(localSource)buffer=await fs.readFile(localSource);
  else{
    const response=await fetch(item.sourceUrl,{signal:AbortSignal.timeout(25000)});
    if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw new Error('Invalid media response');
    const contentLength=Number(response.headers.get('content-length'));
    if(contentLength>12000000)throw new Error('Image too large');
    buffer=Buffer.from(await response.arrayBuffer());
    if(buffer.length>12000000)throw new Error('Image too large');
  }
  const size=item.kind==='icon'?{width:192,height:192}:item.kind==='banner'?{width:1024,height:500}:{width:800,height:1200};
  const encoded=await sharp(buffer,{limitInputPixels:64000000}).rotate().resize({...size,fit:'inside',withoutEnlargement:true}).webp({quality:80,effort:4}).toBuffer();
  await fs.mkdir(path.dirname(output),{recursive:true});
  await fs.writeFile(output+'.tmp',encoded);await fs.rename(output+'.tmp',output);
  return {...item,path:output};
}
export async function mapLimit(items,limit,fn){
  const results=new Array(items.length);let next=0;
  await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(next<items.length){const i=next++;results[i]=await fn(items[i],i);}}));
  return results;
}
