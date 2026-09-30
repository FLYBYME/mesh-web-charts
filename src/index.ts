/**
 * @flybyme/mesh-web-charts
 * Advanced, mobile-ready charting package for mesh-web sites, drawn with D3.
 */

// Core charts (Layer 1 - framework-free)
export {
    timeSeries,
    sparkline,
    bars,
    meter,
    heatmap,
    stateTimeline,
    getSeriesColour,
    getSeriesDash,
    SERIES_COLOURS,
} from './core/index.js';

// Mesh-Web bridge components (Layer 2)
export {
    TimeSeriesChart,
    SparklineChart,
    Sparkline,
    BarsChart,
    Bars,
    MeterChart,
    Meter,
    HeatmapChart,
    Heatmap,
    StateTimelineChart,
    StateTimeline,
} from './bridge.js';

// Adapters & algorithms
export {
    fromPromMatrix,
    fromPromVector,
    defaultSeriesLabel,
    type PromMatrixOptions,
    type PromMatrixResponse,
    type PromMatrixResultItem,
    type PromVectorDatum,
    type PromVectorResponse,
    type PromVectorResultItem,
} from './adapters.js';

export { lttb } from './lttb.js';

// Units & formatting
export {
    formatBytes,
    formatBytesPerSec,
    formatCount,
    formatPercent,
    formatSeconds,
    formatValue,
} from './units.js';

// Types
export type {
    Band,
    BarDatum,
    BarsOptions,
    ChartInstance,
    HeatmapCell,
    HeatmapOptions,
    LivePoint,
    MeterOptions,
    Point,
    Series,
    SparklineOptions,
    StateSpan,
    StateTimelineOptions,
    StateTimelineRow,
    Threshold,
    TimeSeriesInstance,
    TimeSeriesOptions,
    Tone,
    Unit,
    UnitFormatter,
    UnitType,
} from './types.js';
