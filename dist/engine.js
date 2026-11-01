(function(root){
  'use strict';
  const symbols='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const hex=rgb=>'#'+rgb.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
  const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
  const distance=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;
  function convert(data,w,h,k,removeBackground,smooth){
    const pixels=Array.from({length:w*h},(_,i)=>Array.from(data.slice(i*4,i*4+3)));
    const blank=new Uint8Array(w*h),queue=[];
    const light=i=>data[i*4+3]<128 || Math.min(...pixels[i])>210 && Math.max(...pixels[i])-Math.min(...pixels[i])<30;
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
    if(!p || p.version!==1 || !Number.isInteger(p.width)||!Number.isInteger(p.height)||p.width<1||p.width>200||p.height<1||p.height>400)throw Error('Ongeldige patroonafmetingen.');
    if(!Array.isArray(p.palette)||p.palette.length>24||!p.palette.every(c=>/^#[0-9a-f]{6}$/i.test(c)))throw Error('Ongeldige kleurenlijst.');
    if(!Array.isArray(p.cells)||p.cells.length!==p.width*p.height||!p.cells.every(c=>Number.isInteger(c)&&c>=-1&&c<p.palette.length))throw Error('Ongeldige steekgegevens.');
    if(![11,14,16,18].includes(p.fabric))throw Error('Ongeldige stofkeuze.');
    return {version:1,width:p.width,height:p.height,palette:p.palette.slice(),cells:p.cells.slice(),fabric:p.fabric,name:typeof p.name==='string'?p.name.slice(0,80):'Mijn patroon'};
  }
  const api={convert,validate,hex,rgb,symbols};if(typeof module!=='undefined')module.exports=api;else root.StitchEngine=api;
})(typeof window==='undefined'?globalThis:window);
