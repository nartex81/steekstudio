(function(root){
  'use strict';
  const symbols='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const hex=rgb=>'#'+rgb.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
  const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
  const distance=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;
  function convert(data,w,h,k,removeBackground,smooth,options={}){
    const pixels=Array.from({length:w*h},(_,i)=>Array.from(data.slice(i*4,i*4+3)));
    const blank=new Uint8Array(w*h),queue=[];
    const background=rgb(options.backgroundColor||'#ffffff'),tolerance=options.tolerance??45;
    const light=i=>data[i*4+3]<128 || distance(pixels[i],background)<=3*tolerance*tolerance;
    for(let i=0;i<w*h;i++)if(data[i*4+3]<128)blank[i]=1;
    if(removeBackground){
      function add(i){if(!blank[i]&&light(i)){blank[i]=1;queue.push(i);}}
      // Transparent pixels seed the flood too, so adjacent opaque white is removed.
      for(let i=0;i<w*h;i++)if(blank[i])queue.push(i);
      for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
      for(let p=0;p<queue.length;p++){const i=queue[p],x=i%w,y=Math.floor(i/w);if(x)add(i-1);if(x<w-1)add(i+1);if(y)add(i-w);if(y<h-1)add(i+w);}
    }
    const histogram=new Map();
    pixels.forEach((p,i)=>{if(blank[i])return;const key=p.map(v=>v>>4).join(',');const item=histogram.get(key)||{sum:[0,0,0],n:0};item.n++;p.forEach((v,j)=>item.sum[j]+=v);histogram.set(key,item);});
    const points=[...histogram.values()].map(p=>({rgb:p.sum.map(v=>v/p.n),n:p.n}));
    if(!points.length)return {width:w,height:h,palette:[],cells:Array(w*h).fill(-1)};
    k=Math.min(k,points.length);points.sort((a,b)=>b.n-a.n);
    let centers=[points[0].rgb];
    while(centers.length<k){let best=null,score=-1;for(const p of points){const d=Math.min(...centers.map(c=>distance(p.rgb,c)))*Math.sqrt(p.n);if(d>score){score=d;best=p.rgb;}}centers.push(best);}
    const nearest=(p,cs)=>{let best=0,d=Infinity;cs.forEach((c,i)=>{const n=distance(p,c);if(n<d){d=n;best=i;}});return best;};
    for(let step=0;step<16;step++){const sums=centers.map(()=>({n:0,sum:[0,0,0]}));for(const p of points){const s=sums[nearest(p.rgb,centers)];s.n+=p.n;p.rgb.forEach((v,j)=>s.sum[j]+=v*p.n);}centers=centers.map((c,i)=>sums[i].n?sums[i].sum.map(v=>v/sums[i].n):c);}
    let cells=pixels.map((p,i)=>blank[i]?-1:nearest(p,centers));
    if(smooth){const before=cells.slice();for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(before[i]===-1)continue;const counts=new Map();for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++){const c=before[i+yy*w+xx];if(c>=0)counts.set(c,(counts.get(c)||0)+1);}for(const [c,n]of counts)if(n>=6)cells[i]=c;}}
    const used=[...new Set(cells.filter(c=>c>=0))].sort((a,b)=>centers[a].reduce((s,v)=>s+v,0)-centers[b].reduce((s,v)=>s+v,0));
    const lookup=new Map(used.map((v,i)=>[v,i]));
    return {width:w,height:h,palette:used.map(i=>hex(centers[i])),cells:cells.map(c=>c<0?-1:lookup.get(c))};
  }
  function validate(p){
    if(!p || ![1,2,3].includes(p.version) || !Number.isInteger(p.width)||!Number.isInteger(p.height)||p.width<1||p.width>200||p.height<1||p.height>400)throw Error('Ongeldige patroonafmetingen.');
    if(!Array.isArray(p.palette)||p.palette.length>24||!p.palette.every(c=>/^#[0-9a-f]{6}$/i.test(c)))throw Error('Ongeldige kleurenlijst.');
    if(!Array.isArray(p.cells)||p.cells.length!==p.width*p.height||!p.cells.every(c=>Number.isInteger(c)&&c>=-1&&c<p.palette.length))throw Error('Ongeldige steekgegevens.');
    if(![11,14,16,18].includes(p.fabric))throw Error('Ongeldige stofkeuze.');
    const stitchTypes=p.version===1?Array(p.cells.length).fill(0):p.stitchTypes;
    if(!Array.isArray(stitchTypes)||stitchTypes.length!==p.cells.length||!stitchTypes.every(t=>Number.isInteger(t)&&t>=0&&t<=2))throw Error('Ongeldige steektypes.');
    const done=p.version<3?Array(p.cells.length).fill(0):p.done;
    if(!Array.isArray(done)||done.length!==p.cells.length||!done.every(v=>v===0||v===1))throw Error('Ongeldige borduurvoortgang.');
    let source=null;
    if(p.source!=null){
      const s=p.source,c=s.crop;
      if(typeof s.data!=='string'||s.data.length>3000000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s.data)||!c||!['x','y','w','h'].every(k=>typeof c[k]==='number'&&Number.isFinite(c[k]))||c.x<0||c.y<0||c.w<=0||c.h<=0||c.x+c.w>1.00001||c.y+c.h>1.00001)throw Error('Ongeldige bronafbeelding.');
      source={data:s.data,crop:{x:c.x,y:c.y,w:c.w,h:c.h}};
    }
    return {version:3,width:p.width,height:p.height,palette:p.palette.slice(),cells:p.cells.slice(),stitchTypes:stitchTypes.slice(),done:done.map((v,i)=>p.cells[i]<0?0:v),fabric:p.fabric,name:typeof p.name==='string'?p.name.slice(0,80):'Mijn patroon',source};
  }
  // 0 = full cross, 1 = rising half (/), 2 = falling half (backslash).
  function segments(type,x,y,size,inset=0){
    const down=[x+inset,y+inset,x+size-inset,y+size-inset];
    const up=[x+inset,y+size-inset,x+size-inset,y+inset];
    return type===1?[up]:type===2?[down]:[down,up];
  }
  function stitchCounts(p){
    const full=p.palette.map(()=>0),half=p.palette.map(()=>0);
    p.cells.forEach((c,i)=>{if(c>=0)(p.stitchTypes[i]===0?full:half)[c]++;});
    return {full,half};
  }
  function region(p,start,seen=new Uint8Array(p.cells.length)){
    const color=p.cells[start],queue=[start];seen[start]=1;
    for(let n=0;n<queue.length;n++){const i=queue[n],x=i%p.width;for(const j of [x?i-1:-1,x<p.width-1?i+1:-1,i-p.width,i+p.width])if(j>=0&&j<p.cells.length&&!seen[j]&&p.cells[j]===color){seen[j]=1;queue.push(j);}}
    return queue;
  }
  function fill(p,start,color,type=0){
    const indices=region(p,start);let changed=0;
    for(const i of indices)if(p.cells[i]!==color||p.stitchTypes[i]!==type){p.cells[i]=color;p.stitchTypes[i]=color<0?0:type;p.done[i]=0;changed++;}return changed;
  }
  function mergeColors(p,from,to){
    if(from===to||from<0||to<0||from>=p.palette.length||to>=p.palette.length)return 0;
    let changed=0;p.cells=p.cells.map((c,i)=>{if(c===from){c=to;p.done[i]=0;changed++;}return c>from?c-1:c;});p.palette.splice(from,1);return changed;
  }
  function cleanup(p,maxSize=1){
    const before=p.cells.slice(),seen=new Uint8Array(before.length),changes=[];
    for(let start=0;start<before.length;start++){
      if(seen[start]||before[start]<0)continue;
      const group=region(p,start,seen);if(group.length>maxSize)continue;
      const neighbors=new Map();for(const i of group){const x=i%p.width;for(const j of [x?i-1:-1,x<p.width-1?i+1:-1,i-p.width,i+p.width])if(j>=0&&j<before.length&&before[j]!==before[start])neighbors.set(before[j],(neighbors.get(before[j])||0)+1);}
      if(neighbors.size){const color=[...neighbors].sort((a,b)=>b[1]-a[1])[0][0];for(const i of group)changes.push([i,color]);}
    }
    for(const [i,c]of changes){p.cells[i]=c;if(c<0)p.stitchTypes[i]=0;p.done[i]=0;}return changes.length;
  }
  function preprocess(data,w,h,texture=0,shadow=0){
    const out=new Uint8ClampedArray(data),amount=Math.max(0,Math.min(1,texture/100));
    if(amount)for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;for(let c=0;c<3;c++){const median=[data[i*4+c],data[(i-1)*4+c],data[(i+1)*4+c],data[(i-w)*4+c],data[(i+w)*4+c]].sort((a,b)=>a-b)[2];out[i*4+c]=data[i*4+c]*(1-amount)+median*amount;}}
    if(shadow){const stride=w+1,integral=new Float64Array((w+1)*(h+1)),radius=Math.max(3,Math.round(Math.min(w,h)/10));
      for(let y=0;y<h;y++){let row=0;for(let x=0;x<w;x++){const i=(y*w+x)*4;row+=(out[i]+out[i+1]+out[i+2])/3;integral[(y+1)*stride+x+1]=integral[y*stride+x+1]+row;}}
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){const x0=Math.max(0,x-radius),x1=Math.min(w,x+radius+1),y0=Math.max(0,y-radius),y1=Math.min(h,y+radius+1),mean=(integral[y1*stride+x1]-integral[y0*stride+x1]-integral[y1*stride+x0]+integral[y0*stride+x0])/((x1-x0)*(y1-y0)),factor=1+Math.max(0,230-mean)/255*(shadow/100)*.65;for(let c=0;c<3;c++)out[(y*w+x)*4+c]*=factor;}
    }return out;
  }
  function lab(color){
    const a=rgb(color).map(v=>{v/=255;return v>.04045?((v+.055)/1.055)**2.4:v/12.92;}),f=t=>t>.008856?Math.cbrt(t):7.787*t+16/116;
    const x=f((a[0]*.4124564+a[1]*.3575761+a[2]*.1804375)/.95047),y=f(a[0]*.2126729+a[1]*.7151522+a[2]*.072175),z=f((a[0]*.0193339+a[1]*.119192+a[2]*.9503041)/1.08883);return[116*y-16,500*(x-y),200*(y-z)];
  }
  function matchDmc(color,colors){const target=lab(color);let best=null,score=Infinity;for(const entry of colors){const d=distance(target,entry.lab||lab(entry.hex));if(d<score){score=d;best=entry;}}return best;}
  function snapDmc(result,colors){const palette=[],lookup=result.palette.map(c=>{const hex=matchDmc(c,colors).hex;let i=palette.indexOf(hex);if(i<0){i=palette.length;palette.push(hex);}return i;});return {...result,palette,cells:result.cells.map(c=>c<0?-1:lookup[c])};}
  const api={convert,validate,hex,rgb,symbols,segments,stitchCounts,region,fill,mergeColors,cleanup,preprocess,lab,matchDmc,snapDmc};if(typeof module!=='undefined')module.exports=api;else root.StitchEngine=api;
})(typeof window==='undefined'?globalThis:window);
