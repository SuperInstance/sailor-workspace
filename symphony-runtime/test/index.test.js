'use strict';

const { describe, it } = require('mocha');
const { expect } = require('chai');
const rt = require('../src/index');

describe('SymphonyRuntime', () => {
  it('exports all modules', () => {
    const classes = [
      'SymphonyRuntime', 'BeatNormalizer', 'ResonanceMatcher',
      'ABox', 'ABoxManager', 'LaLink', 'LaLinkEngine',
      'Headspace', 'CompositeHeadspace', 'HeadspaceManager',
      'SymmetryDissonanceLoop', 'CompositionRules',
    ];
    for (const cls of classes) {
      expect(rt[cls]).to.be.a('function');
    }
  });

  it('exports all constants', () => {
    expect(rt.FREQUENCY_BANDS.SUB_BASS).to.exist;
    expect(rt.RESONANCE_STATES.ACTIVE).to.equal('active');
    expect(rt.LINK_RELATIONS.RESONATES).to.equal('resonates');
    expect(rt.FUSION_MECHANISMS.ADVERSARIAL_GATE).to.equal('adversarial_gate');
  });

  it('creates a fully initialized runtime', () => {
    const runtime = new rt.SymphonyRuntime({ defaultLatencyMs: 300 });
    expect(runtime.status().started).to.be.false;

    runtime.init({ latencyMs: 300, contextDepth: 1.0 });
    const status = runtime.status();
    expect(status.started).to.be.true;
    expect(status.nu).to.be.closeTo(1.833, 0.1); // 1000/300 * (1 - 0.5*0.9) = 1.833 Hz
    expect(status.aBoxCount).to.equal(0);
  });

  it('measures uptime in cognitive beats', () => {
    const runtime = new rt.SymphonyRuntime({ defaultLatencyMs: 1000 });
    runtime.init({ latencyMs: 1000, contextDepth: 1.0 });
    expect(runtime.uptimeBeats()).to.be.at.least(0);
    // 1 beat per second, so uptime_beats should be roughly elapsed_seconds
  });

  it('supports end-to-end workflow', () => {
    const runtime = new rt.SymphonyRuntime({ defaultLatencyMs: 300 });
    runtime.init({ latencyMs: 300, contextDepth: 1.0 });

    // Create a-boxes
    const boxA = runtime.aBoxManager.create({ content: 'pattern detected' });
    const boxB = runtime.aBoxManager.create({ content: 'follow-up analysis' });

    // Register shells
    runtime.laLinkEngine.registerShell('chronicler', { timbre: 'mid', track: 1, frequency: 1 });

    // Link boxes
    const link = runtime.laLinkEngine.link({
      source: boxA.id,
      target: boxB.id,
      relation: rt.LINK_RELATIONS.EXTENDS,
    });
    expect(link.relation).to.equal('extends');

    // Create headspace
    const hs = runtime.headspaceManager.createHeadspace({
      shells: [{ id: 's1', name: 'analyst' }, { id: 's2', name: 'reviewer' }],
      sovereignChannel: 'main',
    });
    expect(hs.isValid()).to.be.true;

    // Check composition rules
    const c = runtime.compositionRules;
    expect(c.c1_minimumHeadspaceSize(hs).valid).to.be.true;
    expect(c.c6_trackLimit(1).valid).to.be.true;
  });
});
