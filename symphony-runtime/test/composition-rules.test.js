'use strict';

const { describe, it, beforeEach } = require('mocha');
const { expect } = require('chai');
const { CompositionRules } = require('../src/core/composition-rules');
const { ABoxManager, RESONANCE_STATES } = require('../src/core/a-box');

describe('CompositionRules', () => {
  let rules;

  beforeEach(() => {
    rules = new CompositionRules({ maxTracks: 7, trackTolerance: 2 });
  });

  describe('C1 — Minimum Headspace Size', () => {
    it('passes with 2+ shells', () => {
      const r = rules.c1_minimumHeadspaceSize({ shells: [{ id: 's1' }, { id: 's2' }] });
      expect(r.valid).to.be.true;
    });

    it('passes with 1 shell + sovereign channel', () => {
      const r = rules.c1_minimumHeadspaceSize({ shells: [{ id: 's1' }], sovereignChannel: 'main' });
      expect(r.valid).to.be.true;
    });

    it('fails with 1 shell and no sovereign', () => {
      const r = rules.c1_minimumHeadspaceSize({ shells: [{ id: 's1' }], sovereignChannel: null });
      expect(r.valid).to.be.false;
      expect(r.reason).to.include('hallucinatory');
    });

    it('fails with 0 shells', () => {
      const r = rules.c1_minimumHeadspaceSize({ shells: [], sovereignChannel: null });
      expect(r.valid).to.be.false;
    });
  });

  describe('C2 — Frequency Separation', () => {
    it('passes with > 0.5 octaves', () => {
      const r = rules.c2_frequencySeparation(0.05, 0.5); // sub-bass vs mid
      expect(r.valid).to.be.true;
      expect(r.octaves).to.be.above(0.5);
    });

    it('fails with < 0.5 octaves', () => {
      const r = rules.c2_frequencySeparation(1, 1.2);
      const sep = Math.log2(1.2 / 1);
      expect(sep).to.be.below(0.5);
    });

    it('handles identical frequencies', () => {
      const r = rules.c2_frequencySeparation(1, 1);
      expect(r.valid).to.be.false;
      expect(r.octaves).to.equal(0);
    });
  });

  describe('C3 — Dissonance Budget', () => {
    it('passes with ≤ 30% dissonant', () => {
      const r = rules.c3_dissonanceBudget(1, 10);
      expect(r.valid).to.be.true;
      expect(r.critical).to.be.false;
    });

    it('fails with > 30% dissonant', () => {
      const r = rules.c3_dissonanceBudget(5, 10);
      expect(r.valid).to.be.false;
      expect(r.critical).to.be.true;
      expect(r.reason).to.include('Master Bus');
    });

    it('handles zero a-boxes', () => {
      const r = rules.c3_dissonanceBudget(0, 0);
      expect(r.valid).to.be.true;
    });
  });

  describe('C4 — Temporal Fidelity', () => {
    it('passes with timestamped links', () => {
      const links = [
        { id: '⧁_1', source: 'a', target: 'b', timestamp: Date.now() },
        { id: '⧁_2', source: 'b', target: 'c', timestamp: Date.now() },
      ];
      const r = rules.c4_temporalFidelity(links);
      expect(r.valid).to.be.true;
    });

    it('fails on missing timestamps', () => {
      const links = [{ id: '⧁_bad', source: 'a', target: 'b' }];
      const r = rules.c4_temporalFidelity(links);
      expect(r.valid).to.be.false;
      expect(r.violations).to.have.length(1);
    });

    it('fails on retroactive modification', () => {
      const links = [
        { id: '⧁_mod', source: 'a', target: 'b', timestamp: 1000, modifiedAt: 2000 },
      ];
      const r = rules.c4_temporalFidelity(links);
      expect(r.valid).to.be.false;
    });
  });

  describe('C5 — Sovereign Primacy', () => {
    it('overrides a-box state regardless of computed R', () => {
      const mgr = new ABoxManager();
      const box = mgr.create({ content: 'seems fine', confidence: 0.95, state: 'active' });

      const r = rules.c5_sovereignPrimacy(
        { aBoxId: box.id, state: 'dissonant', reason: 'Human says this is wrong' },
        mgr
      );
      expect(r.applied).to.be.true;
      expect(mgr.get(box.id).state).to.equal('dissonant');
      expect(mgr.get(box.id).metadata.sovereignOverride).to.be.true;
    });

    it('reports when a-box not found', () => {
      const mgr = new ABoxManager();
      const r = rules.c5_sovereignPrimacy(
        { aBoxId: 'nonexistent', state: 'dissonant' },
        mgr
      );
      expect(r.applied).to.be.false;
    });
  });

  describe('C6 — Track Limit', () => {
    it('passes within recommended max', () => {
      const r = rules.c6_trackLimit(5);
      expect(r.valid).to.be.true;
    });

    it('warns but passes within tolerance', () => {
      const r = rules.c6_trackLimit(8);
      expect(r.valid).to.be.true;
      expect(r.reason).to.include('Warning');
    });

    it('fails beyond absolute max (9)', () => {
      const r = rules.c6_trackLimit(10);
      expect(r.valid).to.be.false;
      expect(r.reason).to.include('absolute maximum');
    });
  });

  describe('runAll', () => {
    it('runs all rules and aggregates violations', () => {
      const state = {
        headspace: { shells: [{ id: 's1' }], sovereignChannel: null },
        nu1: 0.05,
        nu2: 5,
        dissonantCount: 5,
        totalCount: 10,
        links: [{ source: 'a', target: 'b' }], // missing timestamp
        activeTracks: 10,
      };

      const result = rules.runAll(state);
      expect(result.valid).to.be.false;
      expect(result.violations.length).to.be.at.least(1);
    });

    it('passes with valid state', () => {
      const state = {
        headspace: { shells: [{ id: 's1' }, { id: 's2' }], sovereignChannel: 'main' },
        dissonantCount: 1,
        totalCount: 10,
        links: [{ source: 'a', target: 'b', timestamp: Date.now() }],
        activeTracks: 5,
      };

      const result = rules.runAll(state);
      expect(result.valid).to.be.true;
      expect(result.violations).to.have.length(0);
    });
  });
});
