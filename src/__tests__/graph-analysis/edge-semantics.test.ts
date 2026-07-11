import {
  CONTAINMENT_GRAPH_EDGE_KINDS,
  DEPENDENCY_GRAPH_EDGE_KINDS,
  graphEdgeSemantic,
  PROJECTABLE_GRAPH_EDGE_KINDS,
} from '../../graph-analysis';

describe('relation semantic registry', () => {
  it('separates legacy projection support from dependency traversal', () => {
    expect(PROJECTABLE_GRAPH_EDGE_KINDS).toEqual([
      'accesses',
      'calls',
      'extends',
      'implements',
      'instantiates',
      'type_ref',
    ]);
    expect(DEPENDENCY_GRAPH_EDGE_KINDS).toEqual(
      expect.arrayContaining(['calls', 'imports', 'tests', 'type_ref'])
    );
    expect(DEPENDENCY_GRAPH_EDGE_KINDS).not.toContain('contains');
    expect(DEPENDENCY_GRAPH_EDGE_KINDS).not.toContain('exports');
  });

  it('describes containment without treating it as change-impact dependency', () => {
    expect(CONTAINMENT_GRAPH_EDGE_KINDS).toEqual(['contains']);
    expect(graphEdgeSemantic('contains')).toMatchObject({
      family: 'ownership',
      sourceRole: 'container',
      targetRole: 'member',
      queryPolicies: {
        dependency: false,
        impact: 'none',
        containment: true,
      },
    });
  });

  it('keeps unknown provider kinds queryable but semantically inert', () => {
    expect(graphEdgeSemantic('future-provider-edge')).toMatchObject({
      category: 'raw',
      queryPolicies: {
        dependency: false,
        impact: 'none',
        containment: false,
      },
    });
  });
});
