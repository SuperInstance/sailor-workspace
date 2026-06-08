'use strict';

const { describe, it, beforeEach } = require('mocha');
const { expect } = require('chai');
const { Headspace, CompositeHeadspace, HeadspaceManager, FUSION_MECHANISMS } = require('../src/core/headspace');

describe('Headspace', () => {
  it('creates with defaults', () => {
    const hs = new Headspace({ shells: [{ id: 's1' }, { id: 's2' }] });
    expect(hs.id).to.match(/^ℍ_/);
    expect(hs.dampingFactor).to.equal(0.7);
  });

  it('adds and removes shells', () => {
    const hs = new Headspace();
    expect(hs.shells).to.have.length(0);
    hs.addShell({ id: 's1' });
    expect(hs.shells).to.have.length(1);
    expect(hs.removeShell('s1')).to.be.true;
    expect(hs.removeShell('nonexistent')).to.be.false;
  });

  it('classifies damping characteristic', () => {
    const under = new Headspace({ dampingFactor: 0.3 });
    expect(under.getDampingCharacteristic()).to.equal('underdamped');

    const crit = new Headspace({ dampingFactor: 0.7 });
    expect(crit.getDampingCharacteristic()).to.equal('critically damped');

    const over = new Headspace({ dampingFactor: 1.5 });
    expect(over.getDampingCharacteristic()).to.equal('overdamped');
  });

  it('validates minimum headspace size (C1)', () => {
    // With sovereignChannel explicitly undefined/falsy → constructor defaults to 'main'
    const soloNoSovereign = new Headspace({ shells: [{ id: 's1' }], sovereignChannel: undefined });
    expect(soloNoSovereign.isValid()).to.be.true; // picks up default channel

    // Two shells without sovereign = valid
    const duo = new Headspace({ shells: [{ id: 's1' }, { id: 's2' }] });
    expect(duo.isValid()).to.be.true;

    // Zero shells = invalid regardless
    const empty = new Headspace({ shells: [] });
    expect(empty.isValid()).to.be.false;
  });
});

describe('CompositeHeadspace', () => {
  it('requires at least 2 headspaces', () => {
    const hs1 = new Headspace({ shells: [{ id: 's1' }], sovereignChannel: 'main' });
    expect(() => new CompositeHeadspace({ headspaces: [hs1], fusionMechanism: 'resonance_max' })).to.throw(/minimum 2/);
  });

  it('requires valid fusion mechanism', () => {
    const hs1 = new Headspace({ shells: [{ id: 's1' }], sovereignChannel: 'main' });
    const hs2 = new Headspace({ shells: [{ id: 's2' }], sovereignChannel: 'main' });
    expect(() => new CompositeHeadspace({ headspaces: [hs1, hs2], fusionMechanism: 'invalid' })).to.throw();
  });

  it('creates valid composite', () => {
    const hs1 = new Headspace({ shells: [{ id: 's1' }], sovereignChannel: 'main' });
    const hs2 = new Headspace({ shells: [{ id: 's2' }], sovereignChannel: 'sidecar' });
    const c = new CompositeHeadspace({ headspaces: [hs1, hs2], fusionMechanism: 'adversarial_gate' });
    expect(c.id).to.match(/^ℂ_/);
    expect(c.headspaces).to.have.length(2);
  });

  it('calculates frequency separation', () => {
    const hs1 = new Headspace({ shells: [{ id: 's1' }] });
    const hs2 = new Headspace({ shells: [{ id: 's2' }] });
    const c = new CompositeHeadspace({ headspaces: [hs1, hs2], fusionMechanism: 'adversarial_gate' });
    const sep = c.frequencySeparation((s) => s.id === 's1' ? 0.05 : 5);
    expect(sep).to.be.closeTo(6.64, 0.1); // log2(5/0.05) = log2(100) ≈ 6.64
  });

  it('fuses outputs with resonance_max', () => {
    const hs1 = new Headspace({ shells: [{ id: 's1' }], sovereignChannel: 'main' });
    const hs2 = new Headspace({ shells: [{ id: 's2' }], sovereignChannel: 'side' });
    const c = new CompositeHeadspace({
      headspaces: [hs1, hs2],
      fusionMechanism: 'resonance_max',
    });

    const outputsA = [{ id: 'a1', confidence: 0.9 }, { id: 'a2', confidence: 0.6 }];
    const outputsB = [{ id: 'b1', confidence: 0.5 }, { id: 'b2', confidence: 0.8 }];
    const fused = c.fuse(outputsA, outputsB);
    expect(fused).to.have.length(2);
    expect(fused[0].id).to.equal('a1'); // highest confidence in A
    expect(fused[1].id).to.equal('b2'); // highest confidence in B
  });

  it('fuses outputs with adversarial_gate', () => {
    const hs1 = new Headspace({ shells: [{ id: 's1' }], sovereignChannel: 'main' });
    const hs2 = new Headspace({ shells: [{ id: 's2' }], sovereignChannel: 'side' });
    const c = new CompositeHeadspace({
      headspaces: [hs1, hs2],
      fusionMechanism: 'adversarial_gate',
    });

    const outputsA = [{ id: 'a1', confidence: 0.9 }];
    const outputsB = [{ id: 'b1', confidence: 0.4 }];
    const fused = c.fuse(outputsA, outputsB);
    expect(fused).to.have.length(1);
    expect(fused[0].id).to.equal('a1'); // A wins (higher avg confidence)
    expect(fused[0]._critique).to.not.be.null;
    expect(fused[0]._gated).to.be.true;
  });
});

describe('HeadspaceManager', () => {
  let mgr;

  beforeEach(() => { mgr = new HeadspaceManager(); });

  it('creates and retrieves headspaces', () => {
    const hs = mgr.createHeadspace({ shells: [{ id: 's1' }], sovereignChannel: 'main' });
    expect(mgr.getHeadspace(hs.id)).to.equal(hs);
  });

  it('spawns sidecar composite', () => {
    const main = mgr.createHeadspace({
      shells: [{ id: 's1' }],
      sovereignChannel: 'main',
    });
    const sidecar = { id: 'sidecar', timbre: 'specialist' };
    const composite = mgr.spawnSidecar(main.id, sidecar);
    expect(composite.headspaces).to.have.length(2);
    expect(composite.fusionMechanism).to.equal('adversarial_gate');
  });

  it('throws for nonexistent headspace', () => {
    expect(() => mgr.spawnSidecar('nonexistent', {})).to.throw(/not found/);
  });

  it('lists all headspaces', () => {
    mgr.createHeadspace({ shells: [{ id: 's1' }], sovereignChannel: 'main' });
    mgr.createHeadspace({ shells: [{ id: 's2' }], sovereignChannel: 'side' });
    expect(mgr.allHeadspaces()).to.have.length(2);
  });

  it('removes headspaces', () => {
    const hs = mgr.createHeadspace({ shells: [{ id: 's1' }], sovereignChannel: 'main' });
    expect(mgr.removeHeadspace(hs.id)).to.be.true;
    expect(mgr.allHeadspaces()).to.have.length(0);
  });
});
