const assert=require('node:assert/strict'),E=require('./dist/engine.js'),D=require('./dist/dmc-data.js'),vm=require('node:vm'),fs=require('node:fs');
const rgba=p=>Uint8ClampedArray.from(p.flatMap(c=>[...c,255]));
const p=E.convert(rgba([[255,255,255],[255,0,0],[255,255,255],[0,0,255]]),2,2,2,true,false);
assert.equal(p.cells.filter(x=>x<0).length,2);assert.equal(p.palette.length,2);
const framed=Array.from({length:25},(_,i)=>i===12?[255,255,255]:[0,0,0]);assert.notEqual(E.convert(rgba(framed),5,5,2,true,false).cells[12],-1);
const gray=E.convert(rgba([[150,150,150],[220,0,0],[150,150,150]]),3,1,2,true,false,{backgroundColor:'#969696',tolerance:10});assert.deepEqual(gray.cells,[-1,0,-1]);
const empty=E.convert(rgba([[255,255,255]]),1,1,10,true,true);assert.deepEqual(empty.cells,[-1]);
const legacy={version:1,...p,fabric:14,name:'Vos'},upgraded=E.validate(legacy);assert.equal(upgraded.version,3);assert.deepEqual(upgraded.stitchTypes,[0,0,0,0]);assert.deepEqual(upgraded.done,[0,0,0,0]);
const mixed=E.validate({version:2,width:4,height:1,palette:['#000000'],cells:[0,0,0,-1],stitchTypes:[0,1,2,1],fabric:14,name:'Gemengd'});assert.deepEqual(E.stitchCounts(mixed),{full:[1],half:[2]});mixed.done[1]=1;assert.deepEqual(E.validate(JSON.parse(JSON.stringify(mixed))),mixed);
assert.deepEqual(E.segments(1,0,0,10),[[0,10,10,0]]);assert.deepEqual(E.segments(2,0,0,10),[[0,0,10,10]]);
for(const patch of [{stitchTypes:[0]},{done:[0]},{done:[0,1,2,0]},{cells:[999]},{source:{data:'javascript:alert(1)',crop:{x:0,y:0,w:1,h:1}}}])assert.throws(()=>E.validate({...mixed,...patch}));
const fixture=(cells,palette=['#000000','#ff0000'],width=3)=>E.validate({version:2,width,height:cells.length/width,cells,palette,stitchTypes:cells.map(()=>1),fabric:14,name:'Test'});
let f=fixture([0,0,1,0,1,1,1,1,0]);assert.equal(E.fill(f,0,1,2),3);assert.equal(f.cells[8],0,'fill must not cross disconnected regions');assert.equal(f.stitchTypes[0],2);f.done[8]=1;assert.equal(E.mergeColors(f,0,1),1);assert.equal(f.palette.length,1);assert.equal(f.cells[8],0);assert.equal(f.done[8],0);
f=fixture([0,0,0,0,1,0,0,0,0]);f.done[4]=1;assert.equal(E.cleanup(f,1),1);assert.equal(f.cells[4],0);assert.equal(f.done[4],0);
const texture=rgba(Array.from({length:9},(_,i)=>i===4?[0,0,0]:[120,120,120]));assert.equal(E.preprocess(texture,3,3,100,0)[16],120);assert.ok(E.preprocess(rgba(Array(9).fill([100,100,100])),3,3,0,100)[0]>100);
assert.equal(D.colors.length,489);assert.equal(E.matchDmc('#000000',D.colors).code,'310');assert.equal(E.matchDmc('#ffffff',D.colors).code,'B5200');const snapped=E.snapDmc({palette:['#000000','#010101'],cells:[0,1,-1]},D.colors);assert.equal(snapped.palette.length,1);assert.deepEqual(snapped.cells,[0,0,-1]);
// Exercise the actual editor and export paths without browser dependencies.
const noop=()=>{},paint=new Proxy({},{get:()=>noop,set:()=>true}),elements=new Map();
function element(id){if(!elements.has(id)){const options=[];elements.set(id,{value:id==='stitchType'?'1':id==='exportMode'?'symbols':'14',checked:id==='showProgress',style:{},clientWidth:600,options,getContext:()=>paint,addEventListener:noop,setAttribute:noop,removeAttribute:noop,replaceChildren:()=>options.splice(0),append:x=>options.push(x),close:noop,classList:{toggle:noop,contains:()=>false},getBoundingClientRect:()=>({left:0,top:0,width:600,height:600})});}return elements.get(id);}
const sandbox={StitchEngine:E,DMC_DATA:D,document:{getElementById:element,querySelectorAll:()=>[],createElement:()=>element(Symbol())},window:{addEventListener:noop,print:noop},localStorage:{getItem:()=>null,setItem:noop},Image:class{},setTimeout,clearTimeout,console};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('./dist/app.js'),'utf8'),sandbox);sandbox.fixture=mixed;vm.runInContext('project=fixture',sandbox);
for(const mode of ['color','symbols','mono']){const svg=vm.runInContext(`chartSVG({mode:'${mode}',legend:true})`,sandbox);assert.equal((svg.match(/data-stitch="half"/g)||[]).length,2);assert.ok(svg.includes('DMC ≈ 310'));assert.ok(svg.includes('1 hele · 2 halve'));assert.ok(!svg.includes('data-progress'));}
element('exportProgress').checked=true;assert.equal((vm.runInContext('chartSVG()',sandbox).match(/data-progress="done"/g)||[]).length,1,'one marker per completed stitch');
mixed.done[0]=1;assert.equal((vm.runInContext('chartSVG()',sandbox).match(/data-progress="done"/g)||[]).length,2,'full and half stitches both export progress');
vm.runInContext("snapshot();editCell(0);refresh()",sandbox);assert.equal(mixed.stitchTypes[0],1);assert.equal(mixed.done[0],0);element('undo').onclick();assert.equal(vm.runInContext('project.stitchTypes[0]',sandbox),0);assert.equal(vm.runInContext('project.done[0]',sandbox),1);
vm.runInContext("tool='done';lastCell=-1;finishValue=0;editCell(1)",sandbox);assert.equal(vm.runInContext('project.done[1]',sandbox),0);
element('printBtn').onclick();assert.ok(element('printArea').innerHTML.includes('DMC ≈ 310'));
console.log('OK: conversion and custom background, photo filters, DMC matching, connected fill/merge/cleanup, v1/v2 migration, v3 progress round-trip, half stitches, undo and SVG/print exports');
