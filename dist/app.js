'use strict';
const $=id=>document.getElementById(id),E=StitchEngine;
const dmcColors=DMC_DATA.colors.map(c=>({...c,lab:E.lab(c.hex)})),dmcCache=new Map();
let project=null,source=null,sourceData=null,crop={x:0,y:0,w:1,h:1},draftCrop=null,selected=0,view='color',tool='brush',zoom=1,undoStack=[],drawing=false,lastCell=-1,focusCell=0,sourceName='Mijn patroon',timer,previewTimer,previewBusy=false,previewAgain=false,draft=null,finishValue=1;
const canvas=$('pattern'),ctx=canvas.getContext('2d');
const escapeXML=s=>String(s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
function notify(message){$('status').textContent=message;clearTimeout(timer);timer=setTimeout(()=>$('status').textContent='',6000);}
function saveLocal(){if(!project)return;try{localStorage.setItem('steekstudio-project',JSON.stringify(project));$('saveState').textContent='Patroon en voortgang zijn lokaal onthouden.';}catch{$('saveState').textContent='Lokale opslag is vol. Sla je project als bestand op.';}}
function counts(){const a=project.palette.map(()=>0);project.cells.forEach(c=>{if(c>=0)a[c]++;});return a;}
function dmcMatch(color){if(!dmcCache.has(color))dmcCache.set(color,E.matchDmc(color,dmcColors));return dmcCache.get(color);}
function dmcLabel(i){return 'DMC ≈ '+dmcMatch(project.palette[i]).code;}
function countLabel(index){const c=E.stitchCounts(project);return index===undefined?c.full.reduce((a,b)=>a+b,0).toLocaleString('nl-BE')+' hele · '+c.half.reduce((a,b)=>a+b,0).toLocaleString('nl-BE')+' halve steken':c.full[index]+' hele · '+c.half[index]+' halve';}
function setPressed(selector,value,key){document.querySelectorAll(selector).forEach(b=>{const on=b.dataset[key]===value;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});}
function snapshot(){if(!project)return;undoStack.push({cells:project.cells.slice(),palette:project.palette.slice(),stitchTypes:project.stitchTypes.slice(),done:project.done.slice()});if(undoStack.length>30)undoStack.shift();$('undo').disabled=false;}
function updateInfo(){
  const p=project,total=p.cells.filter(c=>c>=0).length,completed=p.cells.reduce((n,c,i)=>n+(c>=0&&p.done[i]?1:0),0);
  $('patternName').textContent=p.name;$('dimensions').textContent=`${p.width} × ${p.height} steken · ${(p.width/p.fabric*2.54).toFixed(1)} × ${(p.height/p.fabric*2.54).toFixed(1)} cm op ${p.fabric} count`;
  $('stitchTotal').textContent=countLabel();$('paletteCount').textContent=p.palette.length;
  $('progressText').textContent=`${completed.toLocaleString('nl-BE')} van ${total.toLocaleString('nl-BE')} afgewerkt (${total?Math.round(completed/total*100):0}%)`;
  $('progressBar').max=Math.max(1,total);$('progressBar').value=completed;
  $('finishColor').disabled=!p.palette.length;$('finishColor').textContent=`Kleur ${E.symbols[selected]||'–'} afvinken`;
  $('clearColor').disabled=!p.palette.length;
  canvas.setAttribute('aria-label',`${p.name}, ${p.width} bij ${p.height} steken. Pijltjes kiezen een vakje; spatie gebruikt het gereedschap, Delete wist.`);
}
function renderPalette(){
  const list=$('palette');list.replaceChildren();
  const previous=$('mergeTo').value;$('mergeTo').replaceChildren();
  project.palette.forEach((color,i)=>{
    const match=dmcMatch(color),row=document.createElement('div');row.className='color-row'+(i===selected?' selected':'');
    const input=document.createElement('input');input.type='color';input.value=color;input.setAttribute('aria-label',`Tint aanpassen voor kleur ${E.symbols[i]}`);
    input.addEventListener('change',()=>{snapshot();project.palette[i]=input.value;project.cells.forEach((c,j)=>{if(c===i)project.done[j]=0;});refresh();});
    const button=document.createElement('button');button.className='color-choice';button.setAttribute('aria-pressed',String(i===selected));button.title=match.name;
    button.innerHTML=`<span class="symbol">${E.symbols[i]}</span><span class="color-meta">${dmcLabel(i)}<small>${color.toUpperCase()} · ${countLabel(i)}</small></span>`;
    button.onclick=()=>{selected=i;renderPalette();updateInfo();};row.append(input,button);list.append(row);
    if(i!==selected){const option=document.createElement('option');option.value=i;option.textContent=`${E.symbols[i]} · ${dmcLabel(i)}`;$('mergeTo').append(option);}
  });
  if([...$('mergeTo').options].some(o=>o.value===previous))$('mergeTo').value=previous;
  $('mergeBtn').disabled=project.palette.length<2;$('mergeFrom').textContent=`Kleur ${E.symbols[selected]||'–'} samenvoegen met`;
}
function luminance(h){const c=E.rgb(h);return .299*c[0]+.587*c[1]+.114*c[2];}
function paintPattern(context,p,s,margin,mode,progress=false){
  context.fillStyle='white';context.fillRect(0,0,p.width*s+margin*2,p.height*s+margin*2);
  for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){
    const i=y*p.width+x,c=p.cells[i],px=x*s+margin,py=y*s+margin;if(c<0)continue;
    const color=p.palette[c],type=p.stitchTypes?.[i]||0;
    if(mode==='stitches'||type!==0){
      context.strokeStyle=color;context.lineWidth=Math.max(1,s*.25);context.lineCap='round';context.beginPath();
      for(const [x1,y1,x2,y2]of E.segments(type,px,py,s,s*.15)){context.moveTo(x1,y1);context.lineTo(x2,y2);}context.stroke();
      if(mode==='symbols'&&type!==0){const tx=type===1?px+s*.25:px+s*.75;context.fillStyle='white';context.fillRect(tx-s*.25,py,s*.5,s*.5);context.fillStyle='#25212b';context.font=`bold ${s*.5}px Arial`;context.textAlign='center';context.textBaseline='middle';context.fillText(E.symbols[c],tx,py+s*.25);}
    }else{
      context.fillStyle=color;context.fillRect(px,py,s,s);
      if(mode==='symbols'){context.fillStyle=luminance(color)>140?'#25212b':'white';context.font=`bold ${s*.7}px Arial`;context.textAlign='center';context.textBaseline='middle';context.fillText(E.symbols[c],px+s*.5,py+s*.55);}
    }
    if(progress&&p.done[i]){context.fillStyle='#ffffffc9';context.fillRect(px,py,s,s);context.strokeStyle='#257146';context.lineWidth=Math.max(1,s*.13);context.beginPath();context.moveTo(px+s*.2,py+s*.5);context.lineTo(px+s*.43,py+s*.75);context.lineTo(px+s*.83,py+s*.2);context.stroke();}
  }
}
function draw(){
  if(!project)return;const p=project,s=10,margin=22;canvas.width=p.width*s+margin*2;canvas.height=p.height*s+margin*2;
  const fit=Math.min(1,Math.max(160,$('canvasArea').clientWidth-80)/canvas.width,560/canvas.height);canvas.style.width=`${Math.round(canvas.width*fit*zoom)}px`;canvas.style.height=`${Math.round(canvas.height*fit*zoom)}px`;
  paintPattern(ctx,p,s,margin,view,$('showProgress').checked);
  if($('grid').checked){ctx.lineCap='butt';for(let x=0;x<=p.width;x++){ctx.strokeStyle=x%10===0?'#716b7c':'#5f586844';ctx.lineWidth=x%10===0?.8:.3;ctx.beginPath();ctx.moveTo(margin+x*s,margin);ctx.lineTo(margin+x*s,margin+p.height*s);ctx.stroke();}for(let y=0;y<=p.height;y++){ctx.strokeStyle=y%10===0?'#716b7c':'#5f586844';ctx.lineWidth=y%10===0?.8:.3;ctx.beginPath();ctx.moveTo(margin,margin+y*s);ctx.lineTo(margin+p.width*s,margin+y*s);ctx.stroke();}}
  ctx.font='8px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#625d6c';for(let x=10;x<=p.width;x+=10)ctx.fillText(x,margin+(x-.5)*s,11);for(let y=10;y<=p.height;y+=10)ctx.fillText(y,10,margin+(y-.5)*s);$('zoomValue').textContent=Math.round(zoom*100)+'%';
}
function refresh(){if(!project)return;selected=Math.min(selected,Math.max(0,project.palette.length-1));draw();renderPalette();updateInfo();saveLocal();}
function loadSource(url,name,initialCrop){return new Promise((resolve,reject)=>{
  const image=new Image();image.onload=()=>{source=image;sourceName=name;crop=initialCrop||{x:0,y:0,w:1,h:1};
    const saved=document.createElement('canvas'),scale=Math.min(1,640/image.naturalWidth,640/image.naturalHeight);saved.width=Math.max(1,Math.round(image.naturalWidth*scale));saved.height=Math.max(1,Math.round(image.naturalHeight*scale));saved.getContext('2d').drawImage(image,0,0,saved.width,saved.height);sourceData=saved.toDataURL('image/png');
    $('sourcePreview').src=url;$('sourcePreview').alt=name;$('cropBtn').disabled=false;$('generate').disabled=false;drawOriginal();resolve();};image.onerror=()=>reject(Error('Deze afbeelding kan niet worden geopend. Kies een PNG, JPG of WebP.'));image.src=url;
});}
function croppedCanvas(maxSize=480){const c=document.createElement('canvas'),w=source.naturalWidth*crop.w,h=source.naturalHeight*crop.h,scale=Math.min(1,maxSize/w,maxSize/h);c.width=Math.max(1,Math.round(w*scale));c.height=Math.max(1,Math.round(h*scale));c.getContext('2d').drawImage(source,crop.x*source.naturalWidth,crop.y*source.naturalHeight,w,h,0,0,c.width,c.height);return c;}
function drawOriginal(){const c=$('originalCanvas'),context=c.getContext('2d');if(!source){c.width=240;c.height=180;context.clearRect(0,0,c.width,c.height);$('originalHint').textContent='Laad de oorspronkelijke afbeelding om te vergelijken.';return;}const original=croppedCanvas();c.width=original.width;c.height=original.height;context.drawImage(original,0,0);$('originalHint').textContent='Je uitsnede, zonder bewerking.';}
function buildPattern(){
  const w=Number($('width').value),h=Math.max(1,Math.round(w*(source.naturalHeight*crop.h)/(source.naturalWidth*crop.w)));
  if(h>400)throw Error('Kies een bredere uitsnede of minder steken (maximaal 400 steken hoog).');
  const big=croppedCanvas(),bigCtx=big.getContext('2d',{willReadFrequently:true}),pixels=bigCtx.getImageData(0,0,big.width,big.height);
  pixels.data.set(E.preprocess(pixels.data,big.width,big.height,+$('texture').value,+$('shadow').value));bigCtx.putImageData(pixels,0,0);
  const small=document.createElement('canvas');small.width=w;small.height=h;const context=small.getContext('2d',{willReadFrequently:true});context.imageSmoothingQuality='high';context.drawImage(big,0,0,w,h);
  let result=E.convert(context.getImageData(0,0,w,h).data,w,h,+$('colors').value,$('background').checked,$('smooth').checked,{backgroundColor:$('backgroundColor').value,tolerance:+$('tolerance').value});
  if($('dmcMode').checked)result=E.snapDmc(result,dmcColors);
  return{version:3,...result,stitchTypes:Array(w*h).fill(+$('stitchType').value),done:Array(w*h).fill(0),fabric:+$('fabric').value,name:sourceName,source:{data:sourceData,crop:{...crop}}};
}
async function updatePreview(){
  if(!source)return;if(previewBusy){previewAgain=true;return;}previewBusy=true;$('previewInfo').textContent='Voorbeeld bijwerken…';
  await new Promise(r=>setTimeout(r,30));
  try{draft=buildPattern();const c=$('draftCanvas'),size=Math.min(6,480/draft.width,400/draft.height);c.width=Math.max(1,Math.ceil(draft.width*size));c.height=Math.max(1,Math.ceil(draft.height*size));paintPattern(c.getContext('2d'),draft,size,0,'color');$('previewInfo').textContent=`${draft.width} × ${draft.height} steken · ${draft.palette.length} kleuren. Nog niet toegepast.`;}catch(e){draft=null;$('previewInfo').textContent=e.message;}
  finally{previewBusy=false;if(previewAgain){previewAgain=false;schedulePreview();}}
}
function schedulePreview(){clearTimeout(previewTimer);previewTimer=setTimeout(updatePreview,280);}
function markPending(){$('pending').hidden=false;drawOriginal();schedulePreview();}
async function readImage(file){try{
  if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Kies een PNG-, JPG- of WebP-afbeelding.');if(file.size>20*1024*1024)throw Error('Deze afbeelding is groter dan 20 MB.');
  const reader=new FileReader();reader.onload=async()=>{try{await loadSource(reader.result,file.name.replace(/\.[^.]+$/,'').slice(0,80));document.querySelectorAll('[data-example]').forEach(b=>b.classList.remove('active'));markPending();openCrop();}catch(e){notify(e.message);}};reader.onerror=()=>notify('Het bestand kon niet worden gelezen.');reader.readAsDataURL(file);
}catch(e){notify(e.message);}}
async function generate(){
  if(!source){notify('Kies eerst een afbeelding.');return;}
  $('generate').disabled=true;$('generate').textContent='Patroon maken…';await new Promise(r=>setTimeout(r,40));
  try{project=buildPattern();undoStack=[];$('undo').disabled=true;$('pending').hidden=true;zoom=1;focusCell=0;refresh();schedulePreview();notify(project.palette.length?'Patroon toegepast. Je kunt verder bewerken.':'Geen steken over. Verlaag de achtergrondtolerantie of schakel weglaten uit.');}
  catch(e){notify(e.message);}finally{$('generate').disabled=false;$('generate').textContent='Voorbeeld toepassen';}
}
$('imageFile').onchange=e=>{readImage(e.target.files[0]);e.target.value='';};
const drop=$('dropzone');['dragover','dragenter'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.add('drag');}));['dragleave','drop'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.remove('drag');}));drop.addEventListener('drop',e=>readImage(e.dataTransfer.files[0]));drop.tabIndex=0;drop.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('imageFile').click();}});
['width','colors','texture','shadow','tolerance'].forEach(id=>$(id).oninput=()=>{$(id+'Out').value=$(id).value;markPending();});['background','smooth','dmcMode','backgroundColor'].forEach(id=>$(id).onchange=markPending);
$('fabric').onchange=()=>{if(project){project.fabric=+$('fabric').value;updateInfo();saveLocal();}schedulePreview();};$('generate').onclick=generate;$('stitchType').onchange=schedulePreview;
$('sampleBackground').onclick=()=>{$('sampleBackground').classList.toggle('active');$('sampleBackground').setAttribute('aria-pressed',String($('sampleBackground').classList.contains('active')));};
$('originalCanvas').onclick=e=>{if(!$('sampleBackground').classList.contains('active')||!source)return;const c=$('originalCanvas'),r=c.getBoundingClientRect(),x=Math.max(0,Math.min(c.width-1,Math.floor((e.clientX-r.left)*c.width/r.width))),y=Math.max(0,Math.min(c.height-1,Math.floor((e.clientY-r.top)*c.height/r.height)));$('backgroundColor').value=E.hex([...c.getContext('2d').getImageData(x,y,1,1).data].slice(0,3));$('background').checked=true;$('sampleBackground').classList.remove('active');$('sampleBackground').setAttribute('aria-pressed','false');markPending();};
const examples=[{url:'voorbeeld-vos.svg',name:'Geometrische vos'},{url:'voorbeeld-bloem.svg',name:'Bloem'},{url:'voorbeeld-hart.svg',name:'Mijn hartenpatroon'}];
async function example(i){try{const a=examples[i];await loadSource(a.url,a.name);document.querySelectorAll('[data-example]').forEach(b=>b.classList.toggle('active',+b.dataset.example===i));markPending();}catch(e){notify(e.message);}}
document.querySelectorAll('[data-example]').forEach(b=>b.onclick=()=>example(+b.dataset.example));
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;setPressed('[data-view]',view,'view');draw();});
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{tool=b.dataset.tool;setPressed('[data-tool]',tool,'tool');});
$('grid').onchange=draw;$('showProgress').onchange=draw;$('zoomIn').onclick=()=>{zoom=Math.min(4,zoom+.25);draw();};$('zoomOut').onclick=()=>{zoom=Math.max(.5,zoom-.25);draw();};window.addEventListener('resize',draw);
function eventCell(e){const r=canvas.getBoundingClientRect(),x=Math.floor(((e.clientX-r.left)*canvas.width/r.width-22)/10),y=Math.floor(((e.clientY-r.top)*canvas.height/r.height-22)/10);return x<0||y<0||x>=project.width||y>=project.height?-1:y*project.width+x;}
function editCell(i){
  if(i<0||i===lastCell)return;lastCell=i;focusCell=i;const c=project.cells[i];
  if(tool==='pick'){if(c>=0){selected=c;$('stitchType').value=project.stitchTypes[i];renderPalette();updateInfo();}return;}
  if(tool==='done'){if(c>=0)project.done[i]=finishValue;draw();return;}
  if(tool==='fill'||tool==='remove'){if(tool==='fill'&&!project.palette.length){notify('Maak eerst een patroon met kleuren.');return;}E.fill(project,i,tool==='remove'?-1:selected,+$('stitchType').value);draw();return;}
  if(tool==='brush'&&!project.palette.length){notify('Maak eerst een patroon met kleuren.');return;}
  const color=tool==='erase'?-1:selected,type=color<0?0:+$('stitchType').value;
  if(project.cells[i]!==color||project.stitchTypes[i]!==type)project.done[i]=0;
  project.cells[i]=color;project.stitchTypes[i]=type;draw();
}
canvas.onpointerdown=e=>{if(!project)return;const i=eventCell(e);if(i<0)return;e.preventDefault();canvas.focus();canvas.setPointerCapture(e.pointerId);drawing=true;lastCell=-1;finishValue=project.done[i]?0:1;if(tool!=='pick')snapshot();editCell(i);};
canvas.onpointermove=e=>{if(!project)return;const i=eventCell(e);if(i>=0)$('position').textContent=`Kolom ${i%project.width+1} · rij ${Math.floor(i/project.width)+1}${project.cells[i]>=0&&project.done[i]?' · afgewerkt':''}`;if(drawing&&!['fill','remove','pick'].includes(tool))editCell(i);};
function endDrawing(){if(drawing){drawing=false;refresh();}}canvas.onpointerup=endDrawing;canvas.onpointercancel=endDrawing;canvas.onlostpointercapture=endDrawing;
canvas.onkeydown=e=>{if(!project)return;const p=project;let x=focusCell%p.width,y=Math.floor(focusCell/p.width);
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')x=Math.max(0,x-1);if(e.key==='ArrowRight')x=Math.min(p.width-1,x+1);if(e.key==='ArrowUp')y=Math.max(0,y-1);if(e.key==='ArrowDown')y=Math.min(p.height-1,y+1);focusCell=y*p.width+x;draw();ctx.strokeStyle='#7541aa';ctx.lineWidth=2;ctx.strokeRect(22+x*10,22+y*10,10,10);$('position').textContent=`Kolom ${x+1} · rij ${y+1}`;}
  if(e.key===' '||e.key==='Delete'){e.preventDefault();snapshot();lastCell=-1;finishValue=project.done[focusCell]?0:1;const prev=tool;if(e.key==='Delete')tool='erase';editCell(focusCell);tool=prev;refresh();}
};
$('undo').onclick=()=>{const prev=undoStack.pop();if(prev){Object.assign(project,prev);refresh();}$('undo').disabled=!undoStack.length;};
$('mergeBtn').onclick=()=>{if(project.palette.length<2)return;snapshot();E.mergeColors(project,selected,+$('mergeTo').value);selected=0;refresh();notify('Kleuren samengevoegd. Ongedaan maakt dit terug.');};
$('cleanupBtn').onclick=()=>{snapshot();const n=E.cleanup(project,+$('speckleSize').value);refresh();notify(`${n} vakjes bijgewerkt. Kleine details kunnen verdwijnen; gebruik zo nodig Ongedaan.`);};
function setColorDone(value){snapshot();project.cells.forEach((c,i)=>{if(c===selected)project.done[i]=value;});refresh();}
$('finishColor').onclick=()=>setColorDone(1);$('clearColor').onclick=()=>setColorDone(0);
function download(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function filename(){return(project.name.replace(/[^a-z0-9_-]/gi,'-').slice(0,60)||'patroon');}
$('saveProject').onclick=()=>{if(project)download(new Blob([JSON.stringify(project)],{type:'application/json'}),filename()+'.steekstudio.json');};
async function restoreProject(p){
  const next=E.validate(p);
  if(next.source)await loadSource(next.source.data,next.name,next.source.crop);
  project=next;undoStack=[];$('undo').disabled=true;$('fabric').value=project.fabric;$('width').value=Math.max(20,project.width);$('widthOut').value=$('width').value;zoom=1;focusCell=0;
  if(project.source){schedulePreview();}
  else{source=null;sourceData=null;draft=null;$('sourcePreview').removeAttribute('src');$('cropBtn').disabled=true;$('generate').disabled=true;drawOriginal();$('previewInfo').textContent='Dit oudere project heeft geen bronafbeelding. Je patroon en steken blijven bewerkbaar.';}
  $('pending').hidden=true;refresh();
}
$('openProject').onclick=()=>$('projectFile').click();$('projectFile').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>6*1024*1024)throw Error('Het projectbestand is te groot (maximaal 6 MB).');const parsed=E.validate(JSON.parse(await file.text()));await restoreProject(parsed);notify('Project en voortgang geopend.');}catch(err){notify('Project niet geopend: '+err.message);}finally{e.target.value='';}};

// Crop selection is normalized, so it works at any preview size.
const cc=$('cropCanvas'),cx=cc.getContext('2d');let cropStart=null;
function cropFields(){for(const [id,key]of [['cropX','x'],['cropY','y'],['cropW','w'],['cropH','h']])$(id).value=Math.round(draftCrop[key]*100);}
function drawCrop(){if(!source||!draftCrop)return;const scale=Math.min(540/source.naturalWidth,370/source.naturalHeight,1);cc.width=Math.round(source.naturalWidth*scale);cc.height=Math.round(source.naturalHeight*scale);cx.drawImage(source,0,0,cc.width,cc.height);cx.fillStyle='#20172988';cx.fillRect(0,0,cc.width,cc.height);cx.save();cx.beginPath();cx.rect(draftCrop.x*cc.width,draftCrop.y*cc.height,draftCrop.w*cc.width,draftCrop.h*cc.height);cx.clip();cx.drawImage(source,0,0,cc.width,cc.height);cx.restore();cx.strokeStyle='#8965ac';cx.lineWidth=3;cx.strokeRect(draftCrop.x*cc.width,draftCrop.y*cc.height,draftCrop.w*cc.width,draftCrop.h*cc.height);}
function openCrop(){if(!source)return;draftCrop={...crop};cropFields();drawCrop();$('cropDialog').showModal();}
function cropPoint(e){const r=cc.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};}
cc.onpointerdown=e=>{cropStart=cropPoint(e);cc.setPointerCapture(e.pointerId);};cc.onpointermove=e=>{if(!cropStart)return;const pt=cropPoint(e);draftCrop={x:Math.min(cropStart.x,pt.x),y:Math.min(cropStart.y,pt.y),w:Math.abs(cropStart.x-pt.x),h:Math.abs(cropStart.y-pt.y)};cropFields();drawCrop();};cc.onpointerup=cc.onpointercancel=()=>{cropStart=null;};$('cropBtn').onclick=openCrop;$('resetCrop').onclick=()=>{draftCrop={x:0,y:0,w:1,h:1};cropFields();drawCrop();};['cropX','cropY','cropW','cropH'].forEach(id=>$(id).oninput=()=>{const x=Math.min(.99,Math.max(0,+$('cropX').value/100)),y=Math.min(.99,Math.max(0,+$('cropY').value/100));draftCrop={x,y,w:Math.max(.01,Math.min(1-x,+$('cropW').value/100)),h:Math.max(.01,Math.min(1-y,+$('cropH').value/100))};drawCrop();});$('applyCrop').onclick=()=>{if(draftCrop.w<.01||draftCrop.h<.01){notify('Kies een grotere uitsnede.');return;}crop={...draftCrop};$('cropDialog').close();markPending();notify('Uitsnede ingesteld. Klik op Voorbeeld toepassen.');};

function svgProgress(i,x,y,s){return $('exportProgress').checked&&project.done[i]?`<path data-progress="done" d="M${x+s*.2} ${y+s*.5}l${s*.23} ${s*.25}l${s*.4} -${s*.55}" fill="none" stroke="#227146" stroke-width="2"/>`:'';}
function chartSVG({x=0,y=0,w=project.width,h=project.height,legend=false,mode=$('exportMode').value}={}){
  const p=project,s=14,m=30,chartW=w*s+2*m,chartH=h*s+2*m,fullW=Math.max(chartW,legend?580:0),fullH=chartH+(legend?140+p.palette.length*22:0);
  const a=[`<svg xmlns="http://www.w3.org/2000/svg" width="${fullW}" height="${fullH}" viewBox="0 0 ${fullW} ${fullH}"><rect width="100%" height="100%" fill="white"/><g font-family="Arial,sans-serif">`];
  for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
    const i=(y+yy)*p.width+x+xx,c=p.cells[i];if(c<0)continue;
    const type=p.stitchTypes[i],px=m+xx*s,py=m+yy*s,color=mode==='mono'?'#ffffff':p.palette[c];
    if(type!==0){
      for(const [x1,y1,x2,y2]of E.segments(type,px,py,s,1.5))a.push(`<path data-stitch="half" d="M${x1} ${y1}L${x2} ${y2}" stroke="${mode==='mono'?'#111':color}" stroke-width="2" stroke-linecap="round"/>`);
      if(mode!=='color'){const tx=type===1?px+3:px+s-3;a.push(`<rect x="${tx-3}" y="${py}" width="6" height="6" fill="white"/><text x="${tx}" y="${py+3}" dominant-baseline="central" text-anchor="middle" font-size="6" fill="#111">${E.symbols[c]}</text>`);}
    }else{
      a.push(`<rect x="${px}" y="${py}" width="${s}" height="${s}" fill="${color}"/>`);
      if(mode!=='color')a.push(`<text x="${px+s/2}" y="${py+s/2}" dominant-baseline="central" text-anchor="middle" font-size="10" fill="${mode==='mono'||luminance(color)>140?'#111':'#fff'}">${E.symbols[c]}</text>`);
    }
    a.push(svgProgress(i,px,py,s));
  }
  for(let xx=0;xx<=w;xx++)a.push(`<path d="M${m+xx*s} ${m}v${h*s}" stroke="${(x+xx)%10===0?'#333':'#bbb'}" stroke-width="${(x+xx)%10===0?1:.4}"/>`);
  for(let yy=0;yy<=h;yy++)a.push(`<path d="M${m} ${m+yy*s}h${w*s}" stroke="${(y+yy)%10===0?'#333':'#bbb'}" stroke-width="${(y+yy)%10===0?1:.4}"/>`);
  for(let xx=0;xx<w;xx++)if((x+xx+1)%10===0||xx===0)a.push(`<text x="${m+(xx+.5)*s}" y="17" font-size="9" text-anchor="middle">${x+xx+1}</text>`);
  for(let yy=0;yy<h;yy++)if((y+yy+1)%10===0||yy===0)a.push(`<text x="24" y="${m+(yy+.5)*s}" dominant-baseline="central" text-anchor="end" font-size="9">${y+yy+1}</text>`);
  if(legend){
    a.push(`<text x="${m}" y="${chartH+20}" font-size="17">${escapeXML(p.name)}</text><text x="${m}" y="${chartH+42}" font-size="12">${p.width} × ${p.height} steken · ${p.fabric} count · ${(p.width/p.fabric*2.54).toFixed(1)} × ${(p.height/p.fabric*2.54).toFixed(1)} cm</text><text x="${m}" y="${chartH+63}" font-size="10">DMC-nummers zijn benaderingen · vergelijk met een echte garenkaart</text><text x="${m}" y="${chartH+81}" font-size="10">Hele steek: gevuld vakje. Halve steek: één diagonaal / of &#92;.</text><a href="https://makebead.com/"><text x="${m}" y="${chartH+100}" font-size="10">Kleurgegevens: MakeBead · CC BY 4.0 · makebead.com</text></a>`);
    p.palette.forEach((c,i)=>a.push(`<rect x="${m}" y="${chartH+119+i*22}" width="15" height="15" fill="${c}" stroke="#777"/><text x="${m+25}" y="${chartH+131+i*22}" font-size="12">${E.symbols[i]}   ${dmcLabel(i)}   ${c.toUpperCase()}   ${countLabel(i)}</text>`));
  }a.push('</g></svg>');return a.join('');
}
$('helpBtn').onclick=()=>$('helpDialog').showModal();$('exportBtn').onclick=()=>{if(project)$('exportDialog').showModal();};$('svgBtn').onclick=()=>download(new Blob([chartSVG({legend:true})],{type:'image/svg+xml'}),filename()+'.svg');$('pngBtn').onclick=()=>{const svg=chartSVG({legend:true}),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),img=new Image();img.onload=()=>{const out=document.createElement('canvas');out.width=img.width;out.height=img.height;out.getContext('2d').drawImage(img,0,0);out.toBlob(blob=>{if(blob)download(blob,filename()+'.png');else notify('PNG kon niet worden gemaakt. Kies SVG.');});URL.revokeObjectURL(url);};img.onerror=()=>{URL.revokeObjectURL(url);notify('PNG kon niet worden gemaakt. Kies SVG.');};img.src=url;};
$('printBtn').onclick=()=>{const p=project,area=$('printArea'),c=counts(),pages=Math.ceil(p.width/40)*Math.ceil(p.height/50);let html=`<div class="print-page"><h1>${escapeXML(p.name)}</h1><p>${p.width} × ${p.height} steken · ${p.fabric} count Aida · ${(p.width/p.fabric*2.54).toFixed(1)} × ${(p.height/p.fabric*2.54).toFixed(1)} cm zonder stofrand</p><p>${countLabel()} · ${pages} patroonbladen. De legenda geldt voor het hele patroon.</p><h2>Kleurenlegenda</h2><div class="print-legend">${p.palette.map((col,i)=>`<div><i style="background:${col}"></i><b>${E.symbols[i]}</b> ${dmcLabel(i)} · ${countLabel(i)}</div>`).join('')}</div><p>DMC-nummers zijn benaderingen. Vergelijk ze met een fysieke garenkaart. Kleurgegevens: <a href="https://makebead.com/">MakeBead</a>, CC BY 4.0.</p><p>Een gevuld vakje is een hele kruissteek; één diagonaal is een halve steek in de getoonde richting (/ of &#92;). De letter geeft de kleur aan. Dikke rasterlijnen staan om de 10 steken. De cijfers geven kolom en rij aan.</p></div>`;let n=0;for(let y=0;y<p.height;y+=50)for(let x=0;x<p.width;x+=40)html+=`<div class="print-page"><h1>${escapeXML(p.name)}</h1><p>Patroonblad ${++n} van ${pages} · kolom ${x+1}–${Math.min(x+40,p.width)} · rij ${y+1}–${Math.min(y+50,p.height)}</p>${chartSVG({x,y,w:Math.min(40,p.width-x),h:Math.min(50,p.height-y)})}</div>`;area.innerHTML=html;$('exportDialog').close();window.print();};

(async function init(){let stored=null;try{stored=localStorage.getItem('steekstudio-project');if(stored){await restoreProject(JSON.parse(stored));$('saveState').textContent='Je patroon en voortgang zijn hersteld.';return;}}catch(e){notify('Het vorige project kon niet worden hersteld. Bewaar je projectbestanden als back-up.');}await example(2);await generate();})();
