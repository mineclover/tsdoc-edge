/**
 * Read projection over a transient code graph composed from one persisted
 * revision and one or more unsaved-file deltas.
 * @packageDocumentation
 */

import { CanonicalGraphLspView } from '../canonical-graph-view';
import {
  type CodeGraphRevision,
  composeGraphDeltas,
  type EffectiveCodeGraph,
  type GraphDelta,
} from './GraphDelta';

/**
 * Explicit wrapper for an effective overlay graph.
 *
 * Consumers query `view`; persistence code must consume the original canonical
 * revision instead of `effectiveGraph`, whose fingerprint is overlay-scoped.
 */
export class EffectiveCodeGraphView {
  readonly viewKind = 'effective-code-graph-view' as const;
  readonly baseRevision: CodeGraphRevision;
  readonly deltas: readonly GraphDelta[];
  readonly effective: EffectiveCodeGraph;
  readonly effectiveGraph: EffectiveCodeGraph['graph'];
  readonly effectiveViewId: string;
  readonly baseRevisionId: string;
  readonly deltaIds: readonly string[];
  readonly view: CanonicalGraphLspView;

  constructor(baseRevision: CodeGraphRevision, deltas: readonly GraphDelta[]) {
    this.baseRevision = Object.freeze({
      revisionId: baseRevision.revisionId,
      graph: baseRevision.graph,
    });
    this.deltas = Object.freeze(
      [...deltas].sort(
        (left, right) =>
          compareText(left.relativeFilePath, right.relativeFilePath) ||
          compareText(left.deltaId, right.deltaId)
      )
    );
    this.effective = composeGraphDeltas(this.baseRevision, this.deltas);
    this.effectiveGraph = this.effective.graph;
    this.effectiveViewId = this.effective.effectiveViewId;
    this.baseRevisionId = this.effective.baseRevisionId;
    this.deltaIds = this.effective.deltaIds;
    this.view = new CanonicalGraphLspView(this.effectiveGraph);
  }
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
