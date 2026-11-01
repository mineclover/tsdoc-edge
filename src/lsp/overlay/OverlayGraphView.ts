/**
 * Effective canonical graph read model for one dirty file overlay.
 *
 * @packageDocumentation
 * @doc [[LspAndCoverageSurfaceSpecification]]
 * @doc [[LSP Integration]]
 * @context Single-file convenience specialization of `EffectiveCodeGraphView` for one dirty buffer delta
 * @functionality Wraps a single `GraphDelta` and persisted `CodeGraphRevision` into an `EffectiveCodeGraphView`
 */

import { EffectiveCodeGraphView } from './EffectiveCodeGraphView';
import type { CodeGraphRevision, GraphDelta } from './GraphDelta';

/**
 * Compatibility name for a one-file `EffectiveCodeGraphView`.
 *
 * @doc [[LspAndCoverageSurfaceSpecification]]
 * @doc [[LSP Integration]]
 * @public
 */
export class OverlayGraphView extends EffectiveCodeGraphView {
  constructor(
    baseRevision: CodeGraphRevision,
    readonly delta: GraphDelta
  ) {
    super(baseRevision, [delta]);
  }
}
