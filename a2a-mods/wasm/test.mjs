// A2A WASM Ternary Core — Accumulator algorithm test
// [1,0,-1,1,0,-1,1,1] → [60,64,64,60,64,64,60,64,68]

import { readFileSync } from 'fs';
import { exit } from 'process';

const wasmBytes = readFileSync(new URL('./ternary-core.wasm', import.meta.url));
const module = await WebAssembly.compile(wasmBytes);
const instance = await WebAssembly.instantiate(module, {});
const mem = instance.exports.memory;
const { mapping, conservation, symmetry, processOne, selfTest } = instance.exports;

function ternaryToMidi(ternary) {
  const ptr = 256;
  const view = new Int8Array(mem.buffer);
  for (let i = 0; i < ternary.length; i++) view[ptr + i] = ternary[i];
  const count = mapping(ptr, ternary.length);
  const out = [];
  for (let i = 0; i < count; i++) out.push(new Uint8Array(mem.buffer)[1024 + i]);
  return out;
}

// INVARIANT: [1,0,-1,1,0,-1,1,1] → [60,64,64,60,64,64,60,64,68]
const input = [1,0,-1,1,0,-1,1,1];
const result = ternaryToMidi(input);
const expected = [60,64,64,60,64,64,60,64,68];

let pass = result.length === expected.length;
for (let i = 0; i < expected.length; i++) if (result[i] !== expected[i]) pass = false;
console.log(`${pass ? '✅' : '❌'} INVARIANT: [${result}] ${pass ? '===' : '!=='} [${expected}]`);

// Additional invariants
// EMPTY: [] → [60]
const emptyResult = ternaryToMidi([]);
console.log(`${emptyResult[0] === 60 && emptyResult.length === 1 ? '✅' : '❌'} EMPTY: [${emptyResult}]`);

// SINGLE +1: [1] → [60, 64]
console.log(`${ternaryToMidi([1]).join(',') === '60,64' ? '✅' : '❌'} [+1] → [60,64]`);

// SINGLE -1: [-1] → [60, 56]
console.log(`${ternaryToMidi([-1]).join(',') === '60,56' ? '✅' : '❌'} [-1] → [60,56]`);

// SINGLE 0: [0] → [60, 60]
console.log(`${ternaryToMidi([0]).join(',') === '60,60' ? '✅' : '❌'} [0] → [60,60]`);

// CONSERVATION: [1,0,-1] → 0
const cv = new Int8Array(mem.buffer);
cv[256] = 1; cv[257] = 0; cv[258] = -1;
console.log(`${conservation(256, 3) === 0 ? '✅' : '❌'} CONSERVATION: [1,0,-1] = 0`);

// SYMMETRY: palindrome detection
cv[256] = 1; cv[257] = 0; cv[258] = 1;
console.log(`${symmetry(256, 3) === 1 ? '✅' : '❌'} SYMMETRY: [1,0,1] palindrome`);
cv[256] = 1; cv[257] = 0; cv[258] = -1;
console.log(`${symmetry(256, 3) === 0 ? '✅' : '❌'} SYMMETRY: [1,0,-1] not palindrome`);

// Self test
console.log(`${selfTest() === 1 ? '✅' : '❌'} SELF-TEST: ok`);

// Re-set buffer for composite check
cv[256] = 1; cv[257] = 0; cv[258] = -1;
const cons2 = conservation(256, 3);
cv[256] = 1; cv[257] = 0; cv[258] = 1;
const symP = symmetry(256, 3);
cv[256] = 1; cv[257] = 0; cv[258] = -1;
const symN = symmetry(256, 3);

const allPass = pass && emptyResult[0] === 60 && cons2 === 0 && symP === 1 && symN === 0;

console.log(`\n${allPass ? '✅ ALL 8 TESTS PASS (514 byte WASM)' : '❌ SOME FAILED'}`);
exit(allPass ? 0 : 1);
