'use strict';

const { describe, it, before } = require('mocha');
const { expect } = require('chai');
const { ResonanceMatcher } = require('../src/core/resonance-matcher');

describe('ResonanceMatcher', () => {
  let rm;

  before(() => { rm = new ResonanceMatcher({ nuMax: 100 }); });

  it('computes resonance metric R ∈ [0,1]', () => {
    const r = rm.calculateResonance(1, 1); // identical = perfect
    expect(r).to.equal(1);

    const rFar = rm.calculateResonance(1, 100); // near-max distance
    expect(rFar).to.be.closeTo(0.01, 0.001);

    const rMax = rm.calculateResonance(1, 101); // beyond max
    expect(rMax).to.equal(0);
  });

  it('detects locked resonance (R > 0.8)', () => {
    expect(rm.isLocked(1, 1.5)).to.be.true;  // delta 0.5 → R=0.995
    expect(rm.isLocked(1, 90)).to.be.false;  // delta 89 → R=0.11
  });

  it('detects need for correction (R < 0.3)', () => {
    expect(rm.needsCorrection(1, 50)).to.be.false;  // delta 49 → R=0.51
    expect(rm.needsCorrection(1, 80)).to.be.true;   // delta 79 → R=0.21 < 0.3
  });

  it('calculates target frequency from L0 and L7 boxes', () => {
    const l0 = { content: 'the sky is blue and the grass is green' };
    const l7 = { content: 'the sky is blue and the grass is green' };
    const nuStar = rm.calculateTargetFrequency(l0, l7);
    expect(nuStar).to.be.a('number');
    expect(nuStar).to.be.greaterThan(0);

    // Divergent content should produce different frequency
    const l7Diff = { content: 'quantum computing and neural networks' };
    const nuStarDiff = rm.calculateTargetFrequency(l0, l7Diff);
    // Different target frequency for divergent content
    expect(nuStarDiff).to.not.equal(nuStar);
  });

  it('records and retrieves resonance trends', () => {
    rm.recordReading(1, 1, 0.95);
    rm.recordReading(1, 2, 0.90);
    rm.recordReading(1, 3, 0.85);
    rm.recordReading(1, 4, 0.80);

    // More recent readings should be included
    const trend = rm.getTrend(3);
    expect(trend.avgResonance).to.be.within(0, 1);
    expect(['improving', 'degrading', 'stable']).to.include(trend.direction);
  });

  it('computes harmonic mean of frequencies', () => {
    const hm = ResonanceMatcher.harmonicMean(2, 8);
    expect(hm).to.be.closeTo(3.2, 0.01);

    expect(ResonanceMatcher.harmonicMean(0, 5)).to.equal(0);
  });
});
