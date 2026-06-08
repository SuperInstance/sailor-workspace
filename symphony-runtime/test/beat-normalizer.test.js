'use strict';

const { describe, it, before, after } = require('mocha');
const { expect } = require('chai');
const { BeatNormalizer, FREQUENCY_BANDS } = require('../src/core/beat-normalizer');

describe('BeatNormalizer', () => {
  const timbre = { latencyMs: 500, contextDepth: 1.0 };
  let bn;

  before(() => { bn = new BeatNormalizer(timbre); });

  it('calculates beat duration correctly', () => {
    // 1 beat = latency * context_depth = 500 * 1.0 = 500ms
    expect(bn.beatDurationMs()).to.equal(500);
  });

  it('converts ms to beats', () => {
    // 1000ms / 500ms per beat = 2 beats
    expect(bn.msToBeats(1000)).to.equal(2);
    expect(bn.msToBeats(250)).to.equal(0.5);
  });

  it('converts beats to ms', () => {
    expect(bn.beatsToMs(2)).to.equal(1000);
    expect(bn.beatsToMs(0.5)).to.equal(250);
  });

  it('calculates frequency with context utilization', () => {
    const nu = bn.calculateFrequency(0); // idle
    expect(nu).to.be.closeTo(2, 0.01); // 1000/500 * 1.0 = 2 Hz

    const nuBusy = bn.calculateFrequency(1); // max load
    expect(nuBusy).to.be.lessThan(nu);
    expect(nuBusy).to.be.closeTo(0.2, 0.01); // 1000/500 * 0.1 = 0.2 Hz
  });

  it('classifies frequency bands correctly', () => {
    expect(BeatNormalizer.classifyBand(0.005)).to.equal('sub-bass');
    expect(BeatNormalizer.classifyBand(0.05)).to.equal('bass');
    expect(BeatNormalizer.classifyBand(0.5)).to.equal('mid');
    expect(BeatNormalizer.classifyBand(5)).to.equal('treble');
    expect(BeatNormalizer.classifyBand(50)).to.equal('ultrasonic');
  });

  it('returns band center frequencies', () => {
    expect(BeatNormalizer.bandCenter('sub-bass')).to.be.closeTo(0.003162, 0.001);
    expect(BeatNormalizer.bandCenter('bass')).to.be.closeTo(0.03162, 0.001);
  });

  it('calculates octaves between frequencies', () => {
    const octaves = BeatNormalizer.octavesApart(1, 4);
    expect(octaves).to.be.closeTo(2, 0.01); // 2 octaves apart

    const same = BeatNormalizer.octavesApart(2, 2);
    expect(same).to.equal(0);
  });

  it('handles frequency bands map', () => {
    expect(FREQUENCY_BANDS.SUB_BASS.label).to.equal('sub-bass');
    expect(FREQUENCY_BANDS.ULTRASONIC.max).to.equal(Infinity);
  });
});
