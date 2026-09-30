/**
 * Largest-Triangle-Three-Buckets (LTTB) downsampling algorithm.
 *
 * Reduces the number of points in a time series while preserving visual peaks,
 * troughs, and trends.
 */
import type { Point } from './types.js';
export declare function lttb(data: readonly Point[], threshold: number): Point[];
//# sourceMappingURL=lttb.d.ts.map