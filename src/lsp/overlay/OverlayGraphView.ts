/**
 * Effective canonical graph read model for one dirty file overlay.
 * @packageDocumentation
 */

import { EffectiveCodeGraphView } from './EffectiveCodeGraphView';
import type { CodeGraphRevision, GraphDelta } from './GraphDelta';

/** Compatibility name for a one-file EffectiveCodeGraphView. */
export class OverlayGraphView extends EffectiveCodeGraphView {
  constructor(
    baseRevision: CodeGraphRevision,
    readonly delta: GraphDelta
  ) {
    super(baseRevision, [delta]);
  }
}
