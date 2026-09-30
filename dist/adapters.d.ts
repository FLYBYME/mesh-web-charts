/**
 * Adapters for VictoriaMetrics / Prometheus API responses.
 */
import type { Series } from './types.js';
export interface PromMatrixResultItem {
    readonly metric: Readonly<Record<string, string>>;
    readonly values: ReadonlyArray<readonly [number, string]>;
}
export interface PromMatrixResponse {
    readonly status: string;
    readonly data?: {
        readonly resultType: string;
        readonly result?: readonly PromMatrixResultItem[];
    };
    readonly errorType?: string;
    readonly error?: string;
}
export interface PromVectorResultItem {
    readonly metric: Readonly<Record<string, string>>;
    readonly value: readonly [number, string];
}
export interface PromVectorResponse {
    readonly status: string;
    readonly data?: {
        readonly resultType: string;
        readonly result?: readonly PromVectorResultItem[];
    };
    readonly errorType?: string;
    readonly error?: string;
}
export interface PromMatrixOptions {
    readonly label?: (metric: Readonly<Record<string, string>>) => string;
    readonly key?: (metric: Readonly<Record<string, string>>, index: number) => string;
}
export interface PromVectorDatum {
    readonly metric: Readonly<Record<string, string>>;
    readonly time: number;
    readonly value: number | null;
}
export declare function defaultSeriesLabel(metric: Readonly<Record<string, string>>): string;
export declare function fromPromMatrix(response: unknown, options?: PromMatrixOptions): Series[];
export declare function fromPromVector(response: unknown): PromVectorDatum[];
//# sourceMappingURL=adapters.d.ts.map