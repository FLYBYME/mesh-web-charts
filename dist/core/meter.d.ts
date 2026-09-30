/**
 * Framework-free linear meter chart implementation.
 */
import type { ChartInstance, MeterOptions } from '../types.js';
export declare function meter(host: HTMLElement, options: MeterOptions): ChartInstance<number> & {
    update(val: number, newMax?: number): void;
};
//# sourceMappingURL=meter.d.ts.map