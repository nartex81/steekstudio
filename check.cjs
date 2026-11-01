const assert=require('node:assert/strict');
const E=require('./dist/engine.js');
const rgba=p=>Uint8ClampedArray.from(p.flatMap(c=>[...c,255]));
const p=E.convert(rgba([[255,255,255],[255,0,0],[255,255,255],[0,0,255]]),2,2,2,true,false);
assert.deepEqual(p.cells.filter(x=>x<0),[-1,-1]);assert.equal(p.palette.length,2);
assert.equal(new Set(p.cells.filter(x=>x>=0)).size,2);
const framed=Array.from({length:25},(_,i)=>i===12?[255,255,255]:[0,0,0]);
assert.notEqual(E.convert(rgba(framed),5,5,2,true,false).cells[12],-1,'enclosed white details must stay');
const empty=E.convert(rgba([[255,255,255]]),1,1,10,true,true);assert.deepEqual(empty.palette,[]);assert.deepEqual(empty.cells,[-1]);
const valid={version:1,...p,fabric:14,name:'Vos'};
const upgraded=E.validate(valid);assert.equal(upgraded.version,2);assert.deepEqual(upgraded.stitchTypes,[0,0,0,0]);
assert.deepEqual(E.validate(JSON.parse(JSON.stringify(upgraded))),upgraded);
const mixed={version:2,width:4,height:1,palette:['#000000'],cells:[0,0,0,-1],stitchTypes:[0,1,2,1],fabric:14,name:'Gemengd'};
assert.deepEqual(E.stitchCounts(mixed),{full:[1],half:[2]});
assert.deepEqual(E.validate(JSON.parse(JSON.stringify(mixed))),mixed);
assert.deepEqual(E.segments(0,0,0,10),[[0,0,10,10],[0,10,10,0]]);
assert.deepEqual(E.segments(1,0,0,10),[[0,10,10,0]]);
assert.deepEqual(E.segments(2,0,0,10),[[0,0,10,10]]);
assert.throws(()=>E.validate({...mixed,stitchTypes:[0,1]}));
assert.throws(()=>E.validate({...mixed,stitchTypes:[0,1,2,3]}));
assert.throws(()=>E.validate({...mixed,stitchTypes:undefined}));
assert.throws(()=>E.validate({...valid,cells:[999]}));assert.throws(()=>E.validate({...valid,palette:['<script>']}));assert.throws(()=>E.validate({...valid,width:Infinity}));
// Run the real editor/export code against a tiny DOM substitute.
const vm=require('node:vm'),fs=require('node:fs');
const noop=()=>{},paint=new Proxy({},{get:()=>noop,set:()=>true}),elements=new Map();
function element(id){if(!elements.has(id))elements.set(id,{value:id==='stitchType'?'1':id==='exportMode'?'symbols':'14',checked:true,style:{},clientWidth:600,getContext:()=>paint,addEventListener:noop,setAttribute:noop,replaceChildren:noop,append:noop,close:noop,classList:{toggle:noop},getBoundingClientRect:()=>({left:0,top:0,width:600,height:600})});return elements.get(id);}
const sandbox={StitchEngine:E,document:{getElementById:element,querySelectorAll:()=>[],createElement:()=>element(Symbol())},window:{addEventListener:noop,print:noop},localStorage:{getItem:()=>null,setItem:noop},Image:class{},setTimeout,clearTimeout,console};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('./dist/app.js'),'utf8'),sandbox);
sandbox.fixture=JSON.parse(JSON.stringify(mixed));vm.runInContext('project=fixture',sandbox);
for(const mode of ['color','symbols','mono']){
  const svg=vm.runInContext(`chartSVG({mode:'${mode}',legend:true})`,sandbox);
  assert.equal((svg.match(/data-stitch="half"/g)||[]).length,2);
  assert.ok(svg.includes('1 hele · 2 halve'));
  assert.ok(svg.includes('M45.5 42.5L56.5 31.5'),'rising half direction');
  assert.ok(svg.includes('M59.5 31.5L70.5 42.5'),'falling half direction');
}
vm.runInContext("snapshot();editCell(0);refresh()",sandbox);assert.equal(sandbox.fixture.stitchTypes[0],1);
element('undo').onclick();assert.equal(vm.runInContext('project.stitchTypes[0]',sandbox),0);
vm.runInContext("tool='erase';lastCell=-1;editCell(1)",sandbox);assert.equal(vm.runInContext('project.stitchTypes[1]',sandbox),0);assert.equal(vm.runInContext('project.cells[1]',sandbox),-1);
vm.runInContext('project=fixture',sandbox);element('printBtn').onclick();assert.ok(element('printArea').innerHTML.includes('data-stitch="half"'));
console.log('OK: conversion, legacy migration, half-stitch directions, counts, project round-trip, edit/undo/erase and SVG/print exports');
