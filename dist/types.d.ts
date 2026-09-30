/**
 * Core type declarations for @flybyme/mesh-web-charts.
 */
export type Point = readonly [time: number, value: number | null];
export type UnitType = 'bytes' | 'bytes/s' | 'percent' | 'seconds' | 'count';
export type UnitFormatter = (value: number) => string;
export type Unit = UnitType | UnitFormatter;
export interface Series {
    readonly key: string;
    readonly label: string;
    readonly points: readonly Point[];
    readonly axis?: 'left' | 'right';
    readonly unit?: Unit;
    readonly colour?: string;
}
export type Tone = 'good' | 'warn' | 'bad' | 'neutral';
export interface Threshold {
    readonly value: number;
    readonly label: string;
    readonly tone?: Tone;
    readonly axis?: 'left' | 'right';
}
export interface Band {
    readonly start: number;
    readonly end: number;
    readonly label?: string;
    readonly tone?: Tone;
}
export interface TimeSeriesOptions {
    readonly title?: string;
    readonly type?: 'line' | 'area' | 'stacked';
    readonly height?: number;
    readonly gapAfter?: number;
    readonly window?: number;
    readonly thresholds?: readonly Threshold[];
    readonly bands?: readonly Band[];
    readonly unit?: Unit;
    readonly rightUnit?: Unit;
    readonly table?: boolean;
    readonly interactive?: boolean;
    readonly min?: number;
    readonly max?: number;
    readonly rightMin?: number;
    readonly rightMax?: number;
}
export interface LivePoint {
    readonly key: string;
    readonly point: Point;
}
export interface SparklineOptions {
    readonly width?: number;
    readonly height?: number;
    readonly colour?: string;
    readonly strokeWidth?: number;
    readonly showLastValue?: boolean;
    readonly showMinMax?: boolean;
    readonly unit?: Unit;
    readonly table?: boolean;
    readonly label?: string;
}
export interface BarDatum {
    readonly category: string;
    readonly series: string;
    readonly value: number;
    readonly colour?: string;
}
export interface BarsOptions {
    readonly title?: string;
    readonly orientation?: 'vertical' | 'horizontal';
    readonly mode?: 'grouped' | 'stacked';
    readonly height?: number;
    readonly unit?: Unit;
    readonly table?: boolean;
    readonly label?: string;
}
export interface MeterOptions {
    readonly label: string;
    readonly min?: number;
    readonly max: number;
    readonly warnThreshold?: number;
    readonly badThreshold?: number;
    readonly unit?: Unit;
    readonly showPercentage?: boolean;
}
export interface HeatmapCell {
    readonly time: number;
    readonly bucket: string;
    readonly count: number;
}
export interface HeatmapOptions {
    readonly title?: string;
    readonly height?: number;
    readonly table?: boolean;
    readonly buckets?: readonly string[];
    readonly label?: string;
}
export interface StateSpan {
    readonly state: string;
    readonly start: number;
    readonly end: number;
    readonly colour?: string;
}
export interface StateTimelineRow {
    readonly key: string;
    readonly label: string;
    readonly spans: readonly StateSpan[];
}
export interface StateTimelineOptions {
    readonly title?: string;
    readonly height?: number;
    readonly table?: boolean;
    readonly label?: string;
    readonly stateColours?: Readonly<Record<string, string>>;
}
export interface ChartInstance<TData> {
    update(data: TData): void;
    resize(): void;
    dispose(): void;
}
export interface TimeSeriesInstance extends ChartInstance<readonly Series[]> {
    append(points: readonly LivePoint[] | readonly Point[]): void;
}
//# sourceMappingURL=types.d.ts.map