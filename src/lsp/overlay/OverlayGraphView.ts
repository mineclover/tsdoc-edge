/**
 * Effective canonical graph read model for one dirty file overlay.
 * @packageDocumentation
 */

import type { CanonicalProjectGraph } from '../../indexer/contracts';
import { CanonicalGraphLspView } from '../canonical-graph-view';
import { applyGraphDelta, type GraphDelta } from './GraphDelta';

/** Canonical graph view with one in-memory GraphDelta applied. */
export class OverlayGraphView {
  readonly effectiveGraph: CanonicalProjectGraph;
  readonly view: CanonicalGraphLspView;

  constructor(
    readonly baseGraph: CanonicalProjectGraph,
    readonly delta: GraphDelta
  ) {
    this.effectiveGraph = applyGraphDelta(baseGraph, delta);
    this.view = new CanonicalGraphLspView(this.effectiveGraph);
  }
}
