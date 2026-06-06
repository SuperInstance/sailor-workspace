
(function(){
'use strict';

// ────────────────────────────────────────
//  CONSTANTS
// ────────────────────────────────────────
const GRID      = 12;
const NOTCH_H   = 8;
const SNAP_DIST = 24; // snap threshold in px

// ────────────────────────────────────────
//  CATEGORIES & BLOCK DEFINITIONS
// ────────────────────────────────────────
const CATEGORIES = [
  {
    id:'motion', label:'Motion', color:'#4C97FF',
    blocks:[
      { id:'move_steps', label:'move %1 steps',  args:[{type:'number',key:'%1',def:10}], color:'#4C97FF' },
      { id:'turn_cw',    label:'turn ↻ %1 degrees', args:[{type:'number',key:'%1',def:15}], color:'#4C97FF' },
      { id:'turn_ccw',   label:'turn ↺ %1 degrees', args:[{type:'number',key:'%1',def:15}], color:'#4C97FF' },
      { id:'goto_xy',    label:'go to x:%1 y:%2', args:[{type:'number',key:'%1',def:0},{type:'number',key:'%2',def:0}], color:'#4C97FF' },
      { id:'jump',       label:'jump', args:[], color:'#4C97FF' },
    ]
  },
  {
    id:'looks', label:'Looks', color:'#9966FF',
    blocks:[
      { id:'say',     label:'say %1 for %2 secs', args:[{type:'text',key:'%1',def:'Hello!'},{type:'number',key:'%2',def:2}], color:'#9966FF' },
      { id:'think',   label:'think %1 for %2 secs', args:[{type:'text',key:'%1',def:'Hmm...'},{type:'number',key:'%2',def:2}], color:'#9966FF' },
      { id:'show',    label:'show', args:[], color:'#9966FF' },
      { id:'hide',    label:'hide', args:[], color:'#9966FF' },
    ]
  },
  {
    id:'control', label:'Control', color:'#FFAB19',
    blocks:[
      { id:'when_clicked', label:'when clicked', args:[], color:'#FFAB19', hat:true },
      { id:'if_then',      label:'if %1 then',  args:[{type:'dropdown',key:'%1',def:'true',opts:[{l:'true',v:'true'},{l:'false',v:'false'},{l:'touching edge',v:'edge'},{l:'touching color',v:'color'}]}], color:'#FFAB19' },
      { id:'repeat',       label:'repeat %1',   args:[{type:'number',key:'%1',def:10}], color:'#FFAB19' },
      { id:'wait',         label:'wait %1 secs', args:[{type:'number',key:'%1',def:1}], color:'#FFAB19' },
    ]
  },
  {
    id:'sound', label:'Sound', color:'#CF63CF',
    blocks:[
      { id:'play_sound', label:'play sound %1', args:[{type:'dropdown',key:'%1',def:'meow',opts:[{l:'meow',v:'meow'},{l:'chirp',v:'chirp'},{l:'buzz',v:'buzz'},{l:'pop',v:'pop'}]}], color:'#CF63CF' },
      { id:'stop_sound', label:'stop all sounds', args:[], color:'#CF63CF' },
      { id:'play_drum',  label:'play drum %1 for %2 beats', args:[{type:'dropdown',key:'%1',def:'snare',opts:[{l:'snare',v:'snare'},{l:'kick',v:'kick'},{l:'hi-hat',v:'hihat'},{l:'cymbal',v:'cymbal'}]},{type:'number',key:'%2',def:0.25}], color:'#CF63CF' },
    ]
  }
];

// map id->category
const CAT_BY_ID = {};
CATEGORIES.forEach(c=>{ CAT_BY_ID[c.id]=c; });

// map blockId->category
const BLOCK_CAT = {};
CATEGORIES.forEach(c=>{
  c.blocks.forEach(b=>{ BLOCK_CAT[b.id]=c.id; });
});

// ────────────────────────────────────────
//  STATE
// ────────────────────────────────────────
let instances = [];       // all block instances on workspace
let nextId    = 1;
let drag      = null;     // { inst, el, startMX, startMY, offsetX, offsetY, isClone, origStack, snapTarget }
const workspaceEl = document.getElementById('workspace');
const paletteEl   = document.getElementById('palette');
const outputEl    = document.getElementById('output-content');
const outputStatus= document.getElementById('output-status');
const emptyHint   = document.getElementById('empty-hint');
const stageCanvas = document.getElementById('stage-canvas');
const stageCtx    = stageCanvas ? stageCanvas.getContext('2d') : null;
const speechBubble= document.getElementById('speech-bubble');

// ── Sprite State ──
const sprite = {
  x: 240, y: 160,         // center of stage (480x320)
  direction: 90,           // degrees: 0=up, 90=right (Scratch convention)
  visible: true,
  size: 100,               // percent
  costume: 'default'
};

let executionRunning = false;
let executionAborted = false;

// Map stage coords (0..480, 0..320 Y-down) to canvas coords
function drawSprite(){
  if(!stageCtx) return;
  const w=480, h=320;
  stageCtx.clearRect(0,0,w,h);

  // Stage background - subtle checker floor
  const grad=stageCtx.createRadialGradient(240,160,20,240,160,200);
  grad.addColorStop(0,'#2a2a5a');
  grad.addColorStop(1,'#14142e');
  stageCtx.fillStyle=grad;
  stageCtx.fillRect(0,0,w,h);

  // Grid lines
  stageCtx.strokeStyle='rgba(255,255,255,.04)';
  stageCtx.lineWidth=1;
  for(let x=0;x<=w;x+=40){ stageCtx.beginPath();stageCtx.moveTo(x,0);stageCtx.lineTo(x,h);stageCtx.stroke(); }
  for(let y=0;y<=h;y+=40){ stageCtx.beginPath();stageCtx.moveTo(0,y);stageCtx.lineTo(w,y);stageCtx.stroke(); }

  if(!sprite.visible) return;

  const cx=sprite.x, cy=sprite.y;
  const s=sprite.size/100;

  stageCtx.save();
  stageCtx.translate(cx,cy);
  // Scratch: 0=up, 90=right → canvas angle: -(dir-90) or (90-dir) in radians
  // Actually, canvas 0° is right, going clockwise. Scratch 0° is up.
  // So canvas angle = (Scratch dir - 90) * PI/180, but Scratch direction goes clockwise,
  // and canvas positive angle goes clockwise too. So:
  const angle = (sprite.direction - 90) * Math.PI / 180;
  stageCtx.rotate(angle);
  stageCtx.scale(s,s);

  // Draw sprite as a cute arrow/cat-like triangle
  // Body (rounded triangle shape)
  stageCtx.beginPath();
  stageCtx.moveTo(0,-20);   // nose
  stageCtx.lineTo(-16,14);  // left bottom
  stageCtx.lineTo(-8,18);
  stageCtx.lineTo(0,12);    // tail indent
  stageCtx.lineTo(8,18);
  stageCtx.lineTo(16,14);   // right bottom
  stageCtx.closePath();

  // Fill gradient
  const grad2=stageCtx.createLinearGradient(0,-20,0,20);
  grad2.addColorStop(0,'#ff6b6b');
  grad2.addColorStop(0.5,'#ee5a24');
  grad2.addColorStop(1,'#d63031');
  stageCtx.fillStyle=grad2;
  stageCtx.fill();
  stageCtx.strokeStyle='rgba(0,0,0,.3)';
  stageCtx.lineWidth=1.5;
  stageCtx.stroke();

  // Eyes
  stageCtx.fillStyle='#fff';
  stageCtx.beginPath();
  stageCtx.arc(-6,-6,4,0,Math.PI*2);
  stageCtx.arc(6,-6,4,0,Math.PI*2);
  stageCtx.fill();
  stageCtx.fillStyle='#222';
  stageCtx.beginPath();
  stageCtx.arc(-6,-6,2,0,Math.PI*2);
  stageCtx.arc(6,-6,2,0,Math.PI*2);
  stageCtx.fill();

  stageCtx.restore();
}

// Speech bubble
function showSpeech(text, isThink, durationMs){
  if(!speechBubble) return;
  speechBubble.textContent=text;
  speechBubble.className='speech-bubble'+(isThink?' think':'');
  if(isThink) speechBubble.innerHTML=text.replace(/\.\.\./g,'<span class="dots">...</span>');
  speechBubble.style.display='block';
  // Position above sprite
  const stage=document.getElementById('stage');
  if(stage){
    const stageRect=stage.getBoundingClientRect();
    const scaleX=stageRect.width/480;
    const scaleY=stageRect.height/320;
    const bx=sprite.x*scaleX + stageRect.left;
    const by=(sprite.y-60)*scaleY + stageRect.top;
    // Convert to viewport coords then back
    const relX=(sprite.x/480)*100;
    const relY=(sprite.y/320)*100;
    speechBubble.style.left=(sprite.x+20)+'px';
    speechBubble.style.top=Math.max(0,sprite.y-65)+'px';
  }
}
function hideSpeech(){
  if(speechBubble) speechBubble.style.display='none';
}

// ────────────────────────────────────────
//  HELPERS
// ────────────────────────────────────────
function uid(){ return nextId++; }

function snapToGrid(v){ return Math.round(v/GRID)*GRID; }

function getCatColor(catId){
  const c = CAT_BY_ID[catId];
  return c ? c.color : '#6C6CE0';
}

function getBlockDef(blockId){
  for(const c of CATEGORIES){
    for(const b of c.blocks){
      if(b.id===blockId) return b;
    }
  }
  return null;
}

function findInst(id){ return instances.find(i=>i.id===id); }

function getRoot(inst){
  while(inst.parentId!==null){ const p=findInst(inst.parentId); if(!p)break; inst=p; }
  return inst;
}

/** Get the block below inst (direct child) */
function getChild(inst){ return inst.childId!==null ? findInst(inst.childId) : null; }

/** Get the block above inst (direct parent) */
function getParent(inst){ return inst.parentId!==null ? findInst(inst.parentId) : null; }

/** Walk root -> ... -> last */
function getStackBlocks(root){
  const arr=[];
  let cur=root;
  while(cur){ arr.push(cur); cur=getChild(cur); }
  return arr;
}

/** Compute rendered vertical extent of a single block (px) from its CSS `top` position.
 *  Non-hat: shoulders(8) + body + bump(8) = body+16
 *  Hat:       body + bump(8)               = body+8
 */
function getBlockHeight(inst){
  const el=inst.el;
  if(!el) return 40;
  return el.offsetHeight;
}

/** Compute rendered width */
function getBlockWidth(inst){
  const el=inst.el;
  if(!el) return 140;
  return Math.max(80,el.offsetWidth);
}

function computeSnapY(root){
  /* returns the y position of each block in a stack */
  const blocks=getStackBlocks(root);
  let y=root.y;
  const positions=[];
  for(const b of blocks){
    positions.push({inst:b, y:y});
    if(b.childId!==null){
      y += getBlockHeight(b) - NOTCH_H; // remove overlap for notch/bump interlock
    }
  }
  return positions;
}

// ────────────────────────────────────────
//  BUILD BLOCK ELEMENT
// ────────────────────────────────────────
function buildBlockEl(inst,isPalette){
  const def=inst.def;
  const catId=BLOCK_CAT[def.id];
  const color=def.color || getCatColor(catId);
  const el=document.createElement('div');
  el.className=(isPalette?'palette-block':'block-instance');
  if(def.hat) el.classList.add('hat');
  el.style.setProperty('--block-color',color);
  el.dataset.id=inst.id;
  if(!isPalette){
    el.style.left=inst.x+'px';
    el.style.top=inst.y+'px';
  }

  // label parts
  const label=def.label;
  const parts=label.split(/(%\d+|%[a-zA-Z]+)/g);

  // body wrapper
  const body=document.createElement('span');
  body.className='block-body';
  body.style.display='inline-flex';
  body.style.alignItems='center';
  body.style.gap='6px';

  let argIdx=0;
  for(const p of parts){
    if(!p) continue;
    const m=p.match(/^%(\d+)$/) || p.ma