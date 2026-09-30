/**
 * Adapters for VictoriaMetrics / Prometheus API responses.
 */

import type { Point, Series } from './types.js';

export interface PromMatrixResultItem {
    readonly metric: Readonly<Record<string, string>>;
    readonly values: ReadonlyArray<readonly [number /* sec */, string]>;
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
    readonly value: readonly [number /* sec */, string];
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
    readonly time: number; // ms
    readonly value: number | null;
}

function parsePromValue(valStr: string): number | null {
    if (valStr === 'NaN' || valStr === '+Inf' || valStr === '-Inf' || valStr === 'Inf') {
        return null;
    }
    const num = Number(valStr);
    return Number.isFinite(num) ? num : null;
}

export function defaultSeriesLabel(metric: Readonly<Record<string, string>>): string {
    const keys = Object.keys(metric).sort();
    if (keys.length === 0) return 'value';
    // If __name__ exists along with other labels, e.g. cpu_usage{cpu="0"}
    const name = metric['__name__'];
    const otherKeys = keys.filter((k) => k !== '__name__');
    if (name !== undefined && otherKeys.length > 0) {
        const inner = otherKeys.map((k) => `${k}="${metric[k]}"`).join(', ');
        return `${name}{${inner}}`;
    }
    return keys.map((k) => `${k}="${metric[k]}"`).join(', ');
}

export function fromPromMatrix(
    response: unknown,
    options: PromMatrixOptions = {},
): Series[] {
    if (typeof response !== 'object' || response === null) {
        return [];
    }
    const res = response as Partial<PromMatrixResponse>;
    if (res.status !== 'success' || !res.data || res.data.resultType !== 'matrix' || !Array.isArray(res.data.result)) {
        return [];
    }

    const labelFn = options.label ?? defaultSeriesLabel;
    const keyFn = options.key;

    return res.data.result.map((item, idx) => {
        const metric = item.metric ?? {};
        const label = labelFn(metric);
        const key = keyFn !== undefined ? keyFn(metric, idx) : (metric['__name__'] ? `${metric['__name__']}_${idx}` : `series_${idx}`);

        const rawValues: unknown = item.values;
        const valuePairs: readonly (readonly [number, string])[] = Array.isArray(rawValues)
            ? rawValues.filter((pair: unknown): pair is readonly [number, string] =>
                Array.isArray(pair) &&
                pair.length >= 2 &&
                typeof pair[0] === 'number' &&
                typeof pair[1] === 'string',
            )
            : [];

        const points: Point[] = valuePairs.map(([sec, valStr]) => {
            const time = Math.round(sec * 1000);
            const value = parsePromValue(valStr);
            return [time, value] as const;
        });

        return {
            key,
            label,
            points,
        };
    });
}

export function fromPromVector(response: unknown): PromVectorDatum[] {
    if (typeof response !== 'object' || response === null) {
        return [];
    }
    const res = response as Partial<PromVectorResponse>;
    if (res.status !== 'success' || !res.data || res.data.resultType !== 'vector' || !Array.isArray(res.data.result)) {
        return [];
    }

    return res.data.result.map((item) => {
        const metric = item.metric ?? {};
        const rawValue: unknown = item.value;
        const validPair = Array.isArray(rawValue) &&
            rawValue.length >= 2 &&
            typeof rawValue[0] === 'number' &&
            typeof rawValue[1] === 'string';
        const sec = validPair ? rawValue[0] : 0;
        const valStr = validPair ? rawValue[1] : '0';
        const time = Math.round(sec * 1000);
        const value = parsePromValue(valStr);
        return {
            metric,
            time,
            value,
        };
    });
}
