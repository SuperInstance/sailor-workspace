
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
    const m=p.match(/^%(\d+)$/) || p.match(/^%([a-zA-Z_]+)$/);
    if(m && def.args && argIdx<def.args.length){
      const arg=def.args[argIdx];
      argIdx++;
      if(arg.type==='number'){
        const inp=document.createElement('input');
        inp.type='number';
        inp.value=inst.fields[arg.key]!==undefined?inst.fields[arg.key]:arg.def;
        inp.step='any';
        inp.addEventListener('mousedown',e=>e.stopPropagation());
        inp.addEventListener('change',()=>{
          inst.fields[arg.key]=parseFloat(inp.value)||0;
        });
        body.appendChild(inp);
      }else if(arg.type==='text'){
        const inp=document.createElement('input');
        inp.type='text';
        inp.value=inst.fields[arg.key]!==undefined?inst.fields[arg.key]:arg.def;
        inp.style.width='70px';
        inp.addEventListener('mousedown',e=>e.stopPropagation());
        inp.addEventListener('change',()=>{
          inst.fields[arg.key]=inp.value;
        });
        body.appendChild(inp);
      }else if(arg.type==='dropdown'){
        const sel=document.createElement('select');
        (arg.opts||[]).forEach(o=>{
          const opt=document.createElement('option');
          opt.value=o.v;
          opt.textContent=o.l;
          sel.appendChild(opt);
        });
        const cur=inst.fields[arg.key]!==undefined?inst.fields[arg.key]:arg.def;
        sel.value=cur;
        sel.addEventListener('mousedown',e=>e.stopPropagation());
        sel.addEventListener('change',()=>{
          inst.fields[arg.key]=sel.value;
        });
        body.appendChild(sel);
      }
    }else{
      const sp=document.createElement('span');
      sp.textContent=p;
      body.appendChild(sp);
    }
  }
  el.appendChild(body);

  // bump
  const bump=document.createElement('div');
  bump.className='bump';
  el.appendChild(bump);

  el.addEventListener('mousedown',function(e){
    if(e.button!==0) return;
    if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT') return;
    startDrag(e,inst);
  });

  return el;
}

// ────────────────────────────────────────
//  PALETTE RENDERING
// ────────────────────────────────────────
function buildPalette(){
  paletteEl.innerHTML='';
  CATEGORIES.forEach(cat=>{
    const sec=document.createElement('div');
    sec.className='cat';
    sec.dataset.cat=cat.id;

    const hdr=document.createElement('div');
    hdr.className='cat-header';
    hdr.innerHTML=`<span class="dot" style="background:${cat.color}"></span><span class="arrow" id="arrow-${cat.id}">▶</span> ${cat.label}`;
    hdr.addEventListener('click',()=>{
      const body=sec.querySelector('.cat-body');
      const arrow=hdr.querySelector('.arrow');
      body.classList.toggle('open');
      arrow.classList.toggle('open');
    });
    sec.appendChild(hdr);

    const bodyDiv=document.createElement('div');
    bodyDiv.className='cat-body';
    cat.blocks.forEach(bDef=>{
      const fields={};
      (bDef.args||[]).forEach(a=>{ fields[a.key]=a.def; });
      const inst={
        id: uid(),
        def: bDef,
        fields: fields,
        x:0, y:0,
        parentId:null,
        childId:null,
        el:null
      };
      inst.el=buildBlockEl(inst,true);
      bodyDiv.appendChild(inst.el);
    });
    sec.appendChild(bodyDiv);
    paletteEl.appendChild(sec);
  });
}

// ────────────────────────────────────────
//  WORKSPACE BLOCK CREATION
// ────────────────────────────────────────
function createWorkspaceBlock(bDef, x, y, fields){
  const f = fields || {};
  (bDef.args||[]).forEach(a=>{
    if(f[a.key]===undefined) f[a.key]=a.def;
  });
  const inst={
    id: uid(),
    def: bDef,
    fields: f,
    x: x,
    y: y,
    parentId: null,
    childId: null,
    el: null
  };
  inst.el=buildBlockEl(inst,false);
  instances.push(inst);
  updateEmptyHint();
  return inst;
}

function removeBlock(inst){
  // detach children first
  let child=getChild(inst);
  if(child) removeBlock(child);
  // detach from parent
  const parent=getParent(inst);
  if(parent){ parent.childId=null; }
  inst.parentId=null;
  inst.childId=null;
  const idx=instances.indexOf(inst);
  if(idx>=0) instances.splice(idx,1);
  if(inst.el && inst.el.parentNode) inst.el.parentNode.removeChild(inst.el);
  updateEmptyHint();
}

function removeStack(root){
  const blocks=getStackBlocks(root);
  blocks.forEach(b=>removeBlock(b));
}

function clearAll(){
  // Remove all instances
  [...instances].forEach(i=>{
    if(i.el&&i.el.parentNode) i.el.parentNode.removeChild(i.el);
  });
  instances.length=0;
  updateEmptyHint();
  outputEl.textContent='';
  outputStatus.textContent='cleared';
}

function updateEmptyHint(){
  if(instances.length===0){
    emptyHint.style.display='block';
  }else{
    emptyHint.style.display='none';
  }
}

// ────────────────────────────────────────
//  RENDER STACK
// ────────────────────────────────────────
function renderStack(root){
  const blocks=getStackBlocks(root);
  let y=root.y;
  for(const b of blocks){
    b.el.style.left=b.x+'px';
    b.el.style.top=y+'px';
    workspaceEl.appendChild(b.el);
    if(b.childId!==null){
      y += getBlockHeight(b) - NOTCH_H; // interlock
    }
  }
}

function renderAll(){
  // Find all roots (no parent)
  const roots=instances.filter(i=>i.parentId===null);
  // Also include orphans that have children
  const allRoots=[];
  const seen=new Set();
  for(const r of roots){
    if(!seen.has(r.id)){
      getStackBlocks(r).forEach(b=>seen.add(b.id));
      allRoots.push(r);
    }
  }
  // Remove all block elements from DOM
  instances.forEach(i=>{ if(i.el&&i.el.parentNode) i.el.parentNode.removeChild(i.el); });
  allRoots.forEach(r=>renderStack(r));
}

function refreshPositions(){
  const roots=instances.filter(i=>i.parentId===null);
  for(const r of roots){
    const blocks=getStackBlocks(r);
    let y=r.y;
    for(const b of blocks){
      b.el.style.left=b.x+'px';
      b.el.style.top=y+'px';
      if(b.childId!==null){
        y += getBlockHeight(b) - NOTCH_H;
      }
    }
  }
}

// ────────────────────────────────────────
//  SNAP DETECTION
// ────────────────────────────────────────
/**
 * Find the best snap target for a block (the root being dragged).
 * The drag root's bottom edge can snap to another block's top,
 * or another block's bottom can snap to the drag root's top.
 * Returns { block, side:'top'|'bottom' } or null.
 */
function findSnap(dragRoot){
  const dragVisualH = getStackVisualHeight(dragRoot);
  // BOTTOM of dragged stack (last block's bump bottom)
  const stackBottomY = dragRoot.y + dragVisualH;
  // TOP of dragged stack (first block's visual top)
  const stackTopY = dragRoot.y;

  let best=null;
  let bestDist=Infinity;

  const otherRoots = instances.filter(i=>i.parentId===null && i.id!==dragRoot.id);
  for(const root of otherRoots){
    const otherVisualH = getStackVisualHeight(root);
    const otherTopY = root.y;
    const otherBottomY = root.y + otherVisualH;

    const dragCenterX = dragRoot.x + getBlockWidth(dragRoot)/2;
    const otherCenterX = root.x + getBlockWidth(root)/2;
    const xDiff = Math.abs(dragCenterX - otherCenterX);

    if(xDiff < SNAP_DIST * 1.5){
      // Snap drag bottom to other top (drag stack goes above other stack)
      const dist = Math.abs(stackBottomY - otherTopY);
      if(dist < SNAP_DIST && dist < bestDist){
        bestDist=dist;
        best={block:root, side:'top', alignX:dragCenterX, otherCenterX};
      }
      // Snap other bottom to drag top (drag stack goes below other stack)
      const dist2 = Math.abs(otherBottomY - stackTopY);
      if(dist2 < SNAP_DIST && dist2 < bestDist){
        bestDist=dist2;
        best={block:root, side:'bottom', alignX:dragCenterX, otherCenterX};
      }
    }
  }
  return best;
}

// ────────────────────────────────────────
//  DRAG SYSTEM
// ────────────────────────────────────────
function startDrag(e, inst){
  // If this block is on the palette (template), clone it
  const el=inst.el;
  const isPalette = el.classList.contains('palette-block');
  let dragInst;

  if(isPalette){
    // Create a new workspace instance
    const def=inst.def;
    const fields={};
    (def.args||[]).forEach(a=>{ fields[a.key]=a.def; });
    // Read current fields from the palette block
    const inputs=el.querySelectorAll('input,select');
    let inputIdx=0;
    (def.args||[]).forEach(a=>{
      if(inputIdx<inputs.length){
        const inp=inputs[inputIdx];
        fields[a.key]=inp.type==='number'?parseFloat(inp.value)||0:inp.value;
        inputIdx++;
      }
    });
    const wsRect=workspaceEl.getBoundingClientRect();
    const mx=e.clientX - wsRect.left;
    const my=e.clientY - wsRect.top;
    dragInst=createWorkspaceBlock(def, snapToGrid(mx-60), snapToGrid(my-20), fields);
    // We need to render this block immediately
    dragInst.el.style.left=dragInst.x+'px';
    dragInst.el.style.top=dragInst.y+'px';
    workspaceEl.appendChild(dragInst.el);
    dragInst.el.classList.add('dragging');
    drag={
      inst: dragInst,
      el: dragInst.el,
      startMX: e.clientX,
      startMY: e.clientY,
      offsetX: e.clientX - wsRect.left - dragInst.x,
      offsetY: e.clientY - wsRect.top - dragInst.y,
      isClone: true,
      origStack: null,
      snapTarget: null
    };
  }else{
    // Dragging an existing workspace block
    // Get the root of this block's stack
    const root=getRoot(inst);
    const blocks=getStackBlocks(root);

    // Compute the drag offset from mouse to the root block's top-left
    const rootRect=root.el.getBoundingClientRect();
    const wsRect=workspaceEl.getBoundingClientRect();

    // Store the whole stack
    drag={
      inst: root,
      el: root.el,
      startMX: e.clientX,
      startMY: e.clientY,
      offsetX: e.clientX - rootRect.left,
      offsetY: e.clientY - rootRect.top,
      isClone: false,
      origStack: blocks,
      snapTarget: null
    };
  }

  // Prevent text selection during drag
  e.preventDefault();

  // Attach document listeners
  document.addEventListener('mousemove',onDrag);
  document.addEventListener('mouseup',endDrag);
}

function onDrag(e){
  if(!drag) return;
  const wsRect=workspaceEl.getBoundingClientRect();
  const newX = e.clientX - wsRect.left - drag.offsetX;
  const newY = e.clientY - wsRect.top - drag.offsetY;

  // Snap to grid
  const snappedX = snapToGrid(newX);
  const snappedY = snapToGrid(newY);

  const inst=drag.inst;
  const blocks=getStackBlocks(inst);
  inst.x=snappedX;
  inst.y=snappedY;

  // Reposition all blocks in the stack
  let y=snappedY;
  for(const b of blocks){
    b.x=snappedX;
    b.el.style.left=b.x+'px';
    b.el.style.top=y+'px';
    b.el.classList.add('dragging');
    if(b.childId!==null){
      y += getBlockHeight(b) - NOTCH_H;
    }
  }

  // Check for snap
  const snap=findSnap(inst);
  if(snap){
    // Highlight target
    const targetRoot=snap.block;
    const targetBlocks=getStackBlocks(targetRoot);
    targetBlocks.forEach(b=>b.el.classList.add('snap-indicator'));
    drag.snapTarget=snap;
  }else{
    // Remove snap indicators
    if(drag.snapTarget){
      const tb=getStackBlocks(drag.snapTarget.block);
      tb.forEach(b=>b.el.classList.remove('snap-indicator'));
      drag.snapTarget=null;
    }
  }

  // Show drag cursor on workspace
  workspaceEl.classList.add('workspace-drag-over');
  workspaceEl.style.setProperty('--mouse-x',(e.clientX-wsRect.left)+'px');
  workspaceEl.style.setProperty('--mouse-y',(e.clientY-wsRect.top)+'px');
}

/** Compute the total visual height of an entire stack from root.y to the last block's bump bottom */
function getStackVisualHeight(root){
  const blocks=getStackBlocks(root);
  if(blocks.length===0) return 0;
  let h=0;
  for(const b of blocks){
    h += getBlockHeight(b);
  }
  // Add bump extension of last block, minus interlocks
  h += NOTCH_H;
  h -= NOTCH_H * (blocks.length - 1);
  return h;
}

function endDrag(e){
  if(!drag) return;

  document.removeEventListener('mousemove',onDrag);
  document.removeEventListener('mouseup',endDrag);

  const inst=drag.inst;
  const blocks=getStackBlocks(inst);

  // Remove drag styling
  blocks.forEach(b=>{
    b.el.classList.remove('dragging');
  });

  workspaceEl.classList.remove('workspace-drag-over');

  // Clear snap indicators
  if(drag.snapTarget){
    const tb=getStackBlocks(drag.snapTarget.block);
    tb.forEach(b=>b.el.classList.remove('snap-indicator'));
  }

  // Check if dropped in palette area (delete)
  const palRect=paletteEl.getBoundingClientRect();
  if(e.clientX >= palRect.left && e.clientX <= palRect.right &&
     e.clientY >= palRect.top && e.clientY <= palRect.bottom){
    // Delete the entire stack
    removeStack(inst);
    renderAll();
    drag=null;
    return;
  }

  // Check for snap
  if(drag.snapTarget){
    const target=drag.snapTarget;
    const targetRoot=target.block;

    if(target.side==='top'){
      // Drag stack goes ABOVE the target
      const lastBlock=getStackBlocks(inst).pop();
      const targetParent=getParent(targetRoot);

      if(targetParent){
        targetParent.childId=inst.id;
        inst.parentId=targetParent.id;
        targetRoot.parentId=lastBlock.id;
        lastBlock.childId=targetRoot.id;
      }else{
        targetRoot.parentId=lastBlock.id;
        lastBlock.childId=targetRoot.id;
        inst.parentId=null;
      }

      const dragBlocks=getStackBlocks(inst);
      let dragBottomY=inst.y;
      for(const b of dragBlocks){
        dragBottomY+=getBlockHeight(b);
        if(b.childId!==null) dragBottomY-=NOTCH_H;
      }

      // targetRoot's notch bottom (where body starts after margin) aligns with drag's bump bottom
      targetRoot.y = dragBottomY;
      targetRoot.x = snapToGrid(inst.x);
      inst.x = snapToGrid(inst.x);
      renderAll();
    }else if(target.side==='bottom'){
      // Drag stack goes BELOW the target
      const targetBlocks=getStackBlocks(targetRoot);
      const targetLast=targetBlocks[targetBlocks.length-1];

      // Compute where the block after targetLast should go
      let y=targetRoot.y;
      for(const b of targetBlocks){
        if(b.childId!==null){
          y+=getBlockHeight(b)-NOTCH_H;
        }
      }
      // y is now targetLast's position; compute the position for the block below
      const dragStartY = y + getBlockHeight(targetLast) - NOTCH_H;

      targetLast.childId=inst.id;
      inst.parentId=targetLast.id;
      inst.x=snapToGrid(targetRoot.x);
      inst.y=dragStartY;
      renderAll();
    }

    drag=null;
    return;
  }

  // No snap: just ensure grid-snapped position
  inst.x=snapToGrid(inst.x);
  inst.y=snapToGrid(inst.y);
  blocks.forEach(b=>{
    b.x=inst.x;
  });
  refreshPositions();

  drag=null;
}

// ────────────────────────────────────────
//  EXECUTION ENGINE
// ────────────────────────────────────────
async function executeAll(){
  if(executionRunning) return;
  executionRunning=true;
  executionAborted=false;

  outputEl.textContent='';
  setRunningUI(true);

  // Reset sprite
  sprite.x=240; sprite.y=160; sprite.direction=90;
  sprite.visible=true;
  hideSpeech();
  drawSprite();

  const roots=instances.filter(i=>i.parentId===null);
  if(roots.length===0){
    appendOutput('info','No blocks on workspace.');
    setRunningUI(false,'done (idle)');
    executionRunning=false;
    return;
  }

  try {
    for(let ri=0; ri<roots.length; ri++){
      if(executionAborted) break;
      const root=roots[ri];
      const blocks=getStackBlocks(root);
      const stackName=blocks[0].def.label.replace(/%\d+/g,'[...]');
      if(ri>0) appendOutput('','');
      appendOutput('','── Stack '+(ri+1)+': "'+stackName+'" ──');

      // If the first block is "when clicked", it auto-triggers on Run
      // For all stacks, execute blocks in order
      let i=0;
      while(i<blocks.length && !executionAborted){
        const b=blocks[i];
        const label=b.def.label;
        let desc=label;
        let argIdx=0;
        (b.def.args||[]).forEach(a=>{
          const val=b.fields[a.key]!==undefined?b.fields[a.key]:a.def;
          desc=desc.replace('%'+(argIdx+1),val);
          argIdx++;
        });
        appendOutput('info','▶ '+desc);

        await executeBlockAction(b);

        // If it's a control block like 'repeat', the child stack is handled internally
        if(b.def.id==='repeat' || b.def.id==='if_then'){
          // These blocks handle children in their own execution
          // Skip to next sibling after this block's children
          const child=getChild(b);
          if(child){
            // Child chain was already executed by the repeat/if_then handler
            // Find the last child to advance past it
            let lastChild=child;
            while(getChild(lastChild)) lastChild=getChild(lastChild);
            // Advance i past all children
            while(i<blocks.length && blocks[i].id!==lastChild.id) i++;
          }
        }

        i++;
        // Small yield to keep UI responsive
        if(i%3===0) await new Promise(r=>setTimeout(r,0));
      }
    }

    if(executionAborted){
      appendOutput('warn','⏸ Execution stopped');
      outputStatus.textContent='stopped';
    } else {
      outputStatus.textContent='done ✓';
      appendOutput('done','✓ Completed');
    }
  } catch(err){
    appendOutput('error','✗ Error: '+escapeHtml(err.message));
    outputStatus.textContent='error';
    console.error('Execution error:',err);
  }

  executionRunning=false;
  setRunningUI(false); // preserve existing status text
}

/** Execute a single block's action */
async function executeBlockAction(inst){
  const def=inst.def;
  const f=inst.fields;

  switch(def.id){
    // ── Motion ──
    case 'move_steps': {
      const steps=parseFloat(f['%1'])||0;
      // Scratch: 0°=up, 90°=right
      const rad=(90-sprite.direction)*Math.PI/180;
      sprite.x+=Math.cos(rad)*steps;
      sprite.y-=Math.sin(rad)*steps;
      // Clamp to stage
      sprite.x=Math.max(10,Math.min(470,sprite.x));
      sprite.y=Math.max(10,Math.min(310,sprite.y));
      drawSprite();
      await new Promise(r=>setTimeout(r,100));
      break;
    }
    case 'turn_cw': {
      sprite.direction=(sprite.direction+(parseFloat(f['%1'])||0))%360;
      drawSprite();
      await new Promise(r=>setTimeout(r,50));
      break;
    }
    case 'turn_ccw': {
      sprite.direction=(sprite.direction-(parseFloat(f['%1'])||0))%360;
      if(sprite.direction<0) sprite.direction+=360;
      drawSprite();
      await new Promise(r=>setTimeout(r,50));
      break;
    }
    case 'goto_xy': {
      sprite.x=Math.max(10,Math.min(470,parseFloat(f['%1'])||0));
      sprite.y=Math.max(10,Math.min(310,parseFloat(f['%2'])||0));
      drawSprite();
      await new Promise(r=>setTimeout(r,50));
      break;
    }
    case 'jump': {
      const origY=sprite.y;
      sprite.y-=40; drawSprite();
      await new Promise(r=>setTimeout(r,150));
      sprite.y=origY; drawSprite();
      await new Promise(r=>setTimeout(r,80));
      break;
    }

    // ── Looks ──
    case 'say': {
      const text=f['%1']||'Hello!';
      const secs=parseFloat(f['%2'])||2;
      showSpeech(text,false,secs*1000);
      await new Promise(r=>setTimeout(r,secs*1000));
      hideSpeech();
      break;
    }
    case 'think': {
      const text=f['%1']||'Hmm...';
      const secs=parseFloat(f['%2'])||2;
      showSpeech(text,true,secs*1000);
      await new Promise(r=>setTimeout(r,secs*1000));
      hideSpeech();
      break;
    }
    case 'show': {
      if(!sprite.visible){
        sprite.visible=true;
        drawSprite();
      }
      break;
    }
    case 'hide': {
      if(sprite.visible){
        sprite.visible=false;
        drawSprite();
      }
      break;
    }

    // ── Control ──
    case 'when_clicked': {
      // No-op; this is a hat marker, children execute naturally
      break;
    }
    case 'wait': {
      const secs=parseFloat(f['%1'])||1;
      const until=Date.now()+secs*1000;
      while(Date.now()<until && !executionAborted){
        await new Promise(r=>setTimeout(r,50));
      }
      break;
    }
    case 'repeat': {
      const n=parseInt(f['%1'])||1;
      const child=getChild(inst);
      if(!child) break;
      const childBlocks=getStackBlocks(child);
      for(let rpt=0; rpt<n && !executionAborted; rpt++){
        appendOutput('info','  ↺ iteration '+(rpt+1)+'/'+n);
        for(const cb of childBlocks){
          if(executionAborted) break;
          appendOutput('info','  ├▶ '+cb.def.label.replace(/%\d+/g,m=>{
            const ai=parseInt(m.slice(1))-1;
            const a=(cb.def.args||[])[ai];
            if(!a) return m;
            return String(cb.fields[a.key]!==undefined?cb.fields[a.key]:a.def);
          }));
          await executeBlockAction(cb);
        }
      }
      break;
    }
    case 'if_then': {
      const cond=f['%1']||'true';
      let conditionMet=false;
      switch(cond){
        case 'true': conditionMet=true; break;
        case 'false': conditionMet=false; break;
        case 'edge':
          conditionMet=(sprite.x<=15||sprite.x>=465||sprite.y<=15||sprite.y>=305);
          break;
        case 'color':
          conditionMet=false; break;
        default: conditionMet=(cond==='true');
      }
      if(conditionMet){
        const child=getChild(inst);
        if(child){
          const childBlocks=getStackBlocks(child);
          for(const cb of childBlocks){
            if(executionAborted) break;
            appendOutput('info','  └▶ '+cb.def.label.replace(/%\d+/g,m=>{
              const ai=parseInt(m.slice(1))-1;
              const a=(cb.def.args||[])[ai];
              if(!a) return m;
              return String(cb.fields[a.key]!==undefined?cb.fields[a.key]:a.def);
            }));
            await executeBlockAction(cb);
          }
        }
      } else {
        appendOutput('info','  └ condition false, skipped');
      }
      break;
    }

    // ── Sound ──
    case 'play_sound': {
      const sound=f['%1']||'meow';
      appendOutput('info','  ♪ playing "'+escapeHtml(sound)+'"');
      // Visual flash feedback
      if(stageCanvas){
        stageCanvas.style.transition='box-shadow .1s';
        stageCanvas.style.boxShadow='0 0 30px rgba(207,99,207,.5)';
        await new Promise(r=>setTimeout(r,300));
        stageCanvas.style.boxShadow='';
      }
      break;
    }
    case 'stop_sound': {
      appendOutput('info','  ♪ sounds stopped');
      if(stageCanvas) stageCanvas.style.boxShadow='';
      break;
    }
    case 'play_drum': {
      const drum=f['%1']||'snare';
      const beats=parseFloat(f['%2'])||0.25;
      appendOutput('info','  � playing '+escapeHtml(drum)+' for '+beats+' beats');
      // Visual flash
      if(stageCanvas){
        stageCanvas.style.transition='box-shadow .1s';
        stageCanvas.style.boxShadow='0 0 20px rgba(255,255,255,.3)';
        await new Promise(r=>setTimeout(r,beats*500));
        stageCanvas.style.boxShadow='';
      }
      break;
    }
  }
}

function stopExecution(){
  if(executionRunning){
    executionAborted=true;
    hideSpeech();
  }
}

function appendOutput(cls,text){
  const line=document.createElement('div');
  line.className='output-line'+(cls?' '+cls:'');
  if(text){
    line.innerHTML='<span class="ts">▸</span> '+escapeHtml(String(text));
  }
  outputEl.appendChild(line);
  outputEl.scrollTop=outputEl.scrollHeight;
}

function escapeHtml(s){
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ────────────────────────────────────────
//  KEYBOARD SHORTCUTS
// ────────────────────────────────────────
document.addEventListener('keydown',e=>{
  if(e.key==='r'||e.key==='R'){
    if(!e.ctrlKey&&!e.metaKey) {
      if(executionRunning) stopExecution();
      else executeAll();
    }
  }
  if(e.key===' '){
    e.preventDefault();
    if(!e.ctrlKey&&!e.metaKey) {
      if(executionRunning) stopExecution();
      else executeAll();
    }
  }
  if(e.key==='Escape'){
    if(executionRunning) stopExecution();
  }
  if(e.key==='Delete'||e.key==='Backspace'){
    // Delete selected block if any (we don't have selection, so skip)
  }
});

// ────────────────────────────────────────
//  INIT
// ────────────────────────────────────────
buildPalette();

// Open first category by default
const firstCat=paletteEl.querySelector('.cat');
if(firstCat){
  firstCat.querySelector('.cat-body').classList.add('open');
  firstCat.querySelector('.arrow').classList.add('open');
}

const btnRun  = document.getElementById('btn-run');
const btnStop = document.getElementById('btn-stop');

function setRunningUI(running, statusText){
  btnRun.style.display=running?'none':'';
  btnStop.style.display=running?'':'none';
  if(statusText!==undefined) outputStatus.textContent=statusText;
  else if(running) outputStatus.textContent='running...';
}

btnRun.addEventListener('click',()=>{ executeAll(); });
btnStop.addEventListener('click',()=>{ stopExecution(); });

document.getElementById('btn-clear').addEventListener('click',()=>{
  if(executionRunning) stopExecution();
  clearAll();
  renderAll();
  sprite.x=240; sprite.y=160; sprite.direction=90;
  sprite.visible=true;
  hideSpeech();
  drawSprite();
  setRunningUI(false);
});

// Stage click → run "when clicked" stacks
const stageEl = document.getElementById('stage');
if(stageEl){
  stageEl.addEventListener('click',(e)=>{
    if(e.target.tagName==='CANVAS' || e.target===stageEl){
      // Find all "when clicked" hat blocks
      const roots=instances.filter(i=>i.parentId===null);
      const clickedRoots=roots.filter(r=>r.def.id==='when_clicked');
      if(clickedRoots.length>0 && !executionRunning){
        executeAll();
      }
    }
  });
}

// Initial sprite draw
if(stageCtx) drawSprite();

updateEmptyHint();
appendOutput('info','Block Studio ready. Drag blocks from the palette to begin.');

})();
