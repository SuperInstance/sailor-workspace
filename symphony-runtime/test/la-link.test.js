'use strict';

const { describe, it, before, beforeEach } = require('mocha');
const { expect } = require('chai');
const { LaLink, LaLinkEngine, LINK_RELATIONS } = require('../src/core/la-link');

describe('LaLink', () => {
  it('requires source and target', () => {
    expect(() => new LaLink({})).to.throw(/requires source/);
    expect(() => new LaLink({ source: 'a' })).to.throw(/requires target/);
  });

  it('requires valid relation', () => {
    expect(() => new LaLink({ source: 'a', target: 'b', relation: 'invalid' })).to.throw();
  });

  it('creates with valid params', () => {
    const link = new LaLink({
      source: '▣_src',
      target: '▣_tgt',
      relation: LINK_RELATIONS.RESONATES,
    });
    expect(link.id).to.match(/^⧁_/);
    expect(link.relation).to.equal('resonates');
  });

  it('serializes to JSON', () => {
    const link = new LaLink({ source: 'a', target: 'b', relation: 'resonates' });
    const json = link.toJSON();
    expect(json).to.include.keys('id', 'source', 'target', 'relation', 'timestamp');
  });
});

describe('LaLinkEngine', () => {
  let engine;

  beforeEach(() => { engine = new LaLinkEngine(); });

  it('registers shells', () => {
    engine.registerShell('architect', { timbre: 'deep', track: 1, frequency: 0.05 });
    expect(engine._shellRegistry.has('architect')).to.be.true;
  });

  it('creates la-links between box references', () => {
    const link = engine.link({
      source: '▣_a',
      target: '▣_b',
      relation: LINK_RELATIONS.EXTENDS,
    });
    expect(link.source).to.equal('▣_a');
    expect(engine.size).to.equal(1);
  });

  it('launches shells via la-link operator', () => {
    engine.registerShell('specialist', { timbre: 'mid', track: 2, frequency: 0.5 });
    const result = engine.launchShell('▣_trigger', 'specialist', {
      relation: 'extends',
      payload: { task: 'analyze' },
    });
    expect(result.link.relation).to.equal('extends');
    expect(result.shellRef.shellId).to.equal('specialist');
    expect(engine.size).to.equal(1);
  });

  it('throws on launching unregistered shell', () => {
    expect(() => engine.launchShell('▣_x', 'ghost')).to.throw(/not registered/);
  });

  it('finds links from a source', () => {
    engine.link({ source: 'a', target: 'b', relation: 'resonates' });
    engine.link({ source: 'a', target: 'c', relation: 'extends' });
    const fromA = engine.findFrom('a');
    expect(fromA).to.have.length(2);
  });

  it('finds links to a target', () => {
    engine.link({ source: 'a', target: 'z', relation: 'resonates' });
    engine.link({ source: 'b', target: 'z', relation: 'extends' });
    expect(engine.findTo('z')).to.have.length(2);
  });

  it('finds links by relation type', () => {
    engine.link({ source: 'a', target: 'b', relation: 'resonates' });
    engine.link({ source: 'c', target: 'd', relation: 'resonates' });
    engine.link({ source: 'e', target: 'f', relation: 'contradicts' });
    expect(engine.findByRelation('resonates')).to.have.length(2);
  });

  it('traverses link graph with BFS', () => {
    engine.link({ source: 'a', target: 'b', relation: 'extends' });
    engine.link({ source: 'b', target: 'c', relation: 'extends' });
    engine.link({ source: 'c', target: 'd', relation: 'extends' });

    const results = engine.traverse('a');
    expect(results).to.have.length(3);
    expect(results[0].node).to.equal('b');
    expect(results[2].node).to.equal('d');
  });

  it('finds symmetry breaks (recent dissonant links)', () => {
    engine.link({
      source: 'a', target: 'b', relation: 'dissonates',
      metadata: { resonance: 0.2 },
    });
    const breaks = engine.findSymmetryBreaks(60000);
    expect(breaks).to.have.length(1);
    expect(breaks[0].relation).to.equal('dissonates');
  });

  it('lists all links', () => {
    engine.link({ source: 'a', target: 'b', relation: 'resonates' });
    expect(engine.all()).to.have.length(1);
  });
});
