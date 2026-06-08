'use strict';

const { describe, it, beforeEach } = require('mocha');
const { expect } = require('chai');
const { SymmetryDissonanceLoop } = require('../src/core/symmetry-loop');
const { ABoxManager, RESONANCE_STATES } = require('../src/core/a-box');
const { LaLinkEngine, LINK_RELATIONS } = require('../src/core/la-link');

describe('SymmetryDissonanceLoop', () => {
  let loop;
  let aBoxManager;
  let laLinkEngine;

  beforeEach(() => {
    loop = new SymmetryDissonanceLoop({ dampingFactor: 0.7 });
    aBoxManager = new ABoxManager();
    laLinkEngine = new LaLinkEngine();
  });

  it('detects symmetry breaks from dissonant la-links', () => {
    const boxA = aBoxManager.create({ content: 'initial thought', metadata: { shellId: 's1' } });
    const boxB = aBoxManager.create({ content: 'conflicting thought', metadata: { shellId: 's2' } });

    laLinkEngine.link({
      source: boxA.id,
      target: boxB.id,
      relation: LINK_RELATIONS.DISSONATES,
      metadata: { resonance: 0.2 },
    });

    // Phase 1: detect
    const phase1 = loop._detect({ laLinkEngine, aBoxManager });
    expect(phase1.detected).to.be.true;
    expect(phase1.symmetryBreaks).to.have.length(1);
  });

  it('isolates dissonant shells', () => {
    const boxA = aBoxManager.create({ content: 'thought', metadata: { shellId: 's1' } });
    const boxB = aBoxManager.create({ content: 'dissonant thought', metadata: { shellId: 's2' } });

    laLinkEngine.link({
      source: boxA.id,
      target: boxB.id,
      relation: LINK_RELATIONS.DISSONATES,
      metadata: { resonance: 0.2 },
    });

    const phase1 = loop._detect({ laLinkEngine, aBoxManager });
    const phase2 = loop._isolate(phase1, { laLinkEngine, aBoxManager });

    expect(phase2.isolated).to.be.true;
    expect(phase2.dissonantBoxIds).to.include(boxA.id);
    expect(phase2.dissonantBoxIds).to.include(boxB.id);

    // Boxes should be marked dissonant
    expect(aBoxManager.get(boxA.id).state).to.equal(RESONANCE_STATES.DISSONANT);
  });

  it('runs full cycle without errors', async () => {
    const boxA = aBoxManager.create({ content: 'stable thought', metadata: { shellId: 's1' } });
    const boxB = aBoxManager.create({ content: 'unstable thought', metadata: { shellId: 's2' } });

    laLinkEngine.link({
      source: boxA.id,
      target: boxB.id,
      relation: LINK_RELATIONS.DISSONATES,
      metadata: { resonance: 0.2 },
    });

    const result = await loop.runCycle({
      laLinkEngine,
      aBoxManager,
      shells: [{ id: 's1', frequency: 0.5 }, { id: 's2', frequency: 2 }],
    });

    expect(result).to.include.keys('phase1', 'phase2', 'phase3', 'phase4', 'durationMs');
    expect(result.durationMs).to.be.at.least(0);
  });

  it('returns resolved=true when no symmetry breaks', async () => {
    const boxA = aBoxManager.create({ content: 'only thought', metadata: { shellId: 's1' } });

    laLinkEngine.link({
      source: boxA.id,
      target: boxA.id,
      relation: LINK_RELATIONS.RESONATES,
      metadata: { resonance: 0.95 },
    });

    const result = await loop.runCycle({
      laLinkEngine,
      aBoxManager,
      shells: [{ id: 's1', frequency: 1 }],
    });

    expect(result.resolved).to.be.true;
    expect(result.phase1.symmetryBreaks).to.have.length(0);
  });

  it('tracks correction history', async () => {
    const boxA = aBoxManager.create({ content: 'thought', metadata: { shellId: 's1' } });
    const boxB = aBoxManager.create({ content: 'dissonant', metadata: { shellId: 's2' } });

    laLinkEngine.link({
      source: boxA.id,
      target: boxB.id,
      relation: LINK_RELATIONS.DISSONATES,
      metadata: { resonance: 0.1 },
    });

    await loop.runCycle({
      laLinkEngine, aBoxManager,
      shells: [{ id: 's1', frequency: 0.5 }, { id: 's2', frequency: 2 }],
    });

    expect(loop.getHistory()).to.have.length(1);
    expect(loop.getHistory()[0]).to.include.keys('breaksDetected', 'corrections', 'resolved');
  });

  it('respects damping factor for lookback window', () => {
    // Underdamped: shorter lookback
    const fastLoop = new SymmetryDissonanceLoop({ dampingFactor: 0.3 });
    const slowLoop = new SymmetryDissonanceLoop({ dampingFactor: 1.5 });

    // _getLookbackMs returns baseMs * dampingFactor
    const fastLookback = fastLoop._getLookbackMs();
    const slowLookback = slowLoop._getLookbackMs();
    expect(fastLookback).to.be.lessThan(slowLookback);
  });
});
