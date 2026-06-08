'use strict';

const { describe, it, before, beforeEach } = require('mocha');
const { expect } = require('chai');
const { ABox, ABoxManager, RESONANCE_STATES } = require('../src/core/a-box');

describe('ABox', () => {
  it('creates with auto-generated id', () => {
    const box = new ABox({ content: 'test insight' });
    expect(box.id).to.match(/^▣_/);
  });

  it('computes content hash deterministically', () => {
    const box1 = new ABox({ content: 'hello world' });
    const box2 = new ABox({ content: 'hello world' });
    expect(box1.contentHash).to.equal(box2.contentHash);
  });

  it('defaults to active resonance state', () => {
    const box = new ABox({ content: 'test' });
    expect(box.state).to.equal(RESONANCE_STATES.ACTIVE);
  });

  it('calculates amplitude = confidence * cognitiveMass', () => {
    const box = new ABox({ content: 'test', confidence: 0.7, cognitiveMass: 2.0 });
    expect(box.amplitude).to.equal(1.4);
  });

  it('transitions to valid states', () => {
    const box = new ABox({ content: 'test' });
    box.transitionTo(RESONANCE_STATES.RESOLVED);
    expect(box.state).to.equal('resolved');
  });

  it('throws on invalid state transition', () => {
    const box = new ABox({ content: 'test' });
    expect(() => box.transitionTo('invalid_state')).to.throw();
  });

  it('generates emission format', () => {
    const box = new ABox({ content: 'test', confidence: 0.8 });
    const em = box.toEmission();
    expect(em).to.include.keys('id', 'content', 'timestamp', 'resonance');
  });

  it('parses from emission format', () => {
    const em = { id: '▣_test', content: 'parsed', resonance: 0.75, state: 'resolved' };
    const box = ABox.fromEmission(em);
    expect(box.id).to.equal('▣_test');
    expect(box.confidence).to.equal(0.75);
    expect(box.state).to.equal('resolved');
  });

  it('computes decayed amplitude', () => {
    const box = new ABox({ content: 'test', confidence: 1, cognitiveMass: 1, timestamp: 0 });
    const decayed = box.decayedAmplitude(2, 0.5);
    expect(decayed).to.be.closeTo(0.3678, 0.01); // exp(-0.5*2) = e^-1 ≈ 0.3679
  });
});

describe('ABoxManager', () => {
  let mgr;

  beforeEach(() => { mgr = new ABoxManager(); });

  it('creates and retrieves boxes', () => {
    const box = mgr.create({ content: 'insight' });
    expect(mgr.get(box.id)).to.equal(box);
  });

  it('finds boxes by state', () => {
    mgr.create({ content: 'a', state: 'active' });
    mgr.create({ content: 'b', state: 'dissonant' });
    mgr.create({ content: 'c', state: 'active' });

    expect(mgr.findByState('active')).to.have.length(2);
  });

  it('calculates dissonance ratio', () => {
    expect(mgr.dissonanceRatio()).to.equal(0);
    mgr.create({ content: 'a', state: 'dissonant' });
    mgr.create({ content: 'b', state: 'active' });
    expect(mgr.dissonanceRatio()).to.equal(0.5);
  });

  it('detects critical dissonance (> 30%)', () => {
    mgr.create({ content: 'a', state: 'dissonant' });
    mgr.create({ content: 'b', state: 'dissonant' });
    mgr.create({ content: 'c', state: 'active' });
    expect(mgr.isCriticalDissonance()).to.be.true;
  });

  it('removes boxes', () => {
    const box = mgr.create({ content: 'test' });
    expect(mgr.remove(box.id)).to.be.true;
    expect(mgr.get(box.id)).to.be.undefined;
  });

  it('lists all boxes', () => {
    mgr.create({ content: 'a' });
    mgr.create({ content: 'b' });
    expect(mgr.all()).to.have.length(2);
  });
});
