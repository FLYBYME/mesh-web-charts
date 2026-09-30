/**
 * Layer 2: The Mesh-Web Bridge.
 * Thin Component wrappers that mount framework-free chart cores onto mesh-web surface nodes.
 *
 * NOTE: Sites using these components must declare `needs('dom')` in their App specification.
 */

import { Component, effect, needs, props, type Node } from '@flybyme/mesh-web';
import type {
    BarDatum, BarsOptions, HeatmapCell, HeatmapOptions, MeterOptions,
    Point, Series, SparklineOptions, StateTimelineOptions, StateTimelineRow, TimeSeriesOptions,
} from './types.js';
import { bars } from './core/bars.js';
import { heatmap } from './core/heatmap.js';
import { meter } from './core/meter.js';
import { sparkline } from './core/sparkline.js';
import { stateTimeline } from './core/stateTimeline.js';
import { timeSeries } from './core/timeSeries.js';

export class TimeSeriesChart extends Component({
    needs: needs('dom'),
    props: props<{
        readonly series: () => readonly Series[];
        readonly options?: TimeSeriesOptions;
        readonly label?: string;
    }>(),
}) {
    render(): Node {
        // Read static options once outside setup/effects
        const opts = this.props.options;
        return this.cx.dom.surface({
            class: 'chart-host',
            setup: (el) => {
                // Instantiated once
                const chart = timeSeries(el, opts);
                // Reactive data updates inside an inner effect so setup is never re-run by the framework
                const stop = effect(() => {
                    chart.update(this.props.series());
                });
                return () => {
                    stop();
                    chart.dispose();
                };
            },
        });
    }
}

export class SparklineChart extends Component({
    needs: needs('dom'),
    props: props<{
        readonly points: () => readonly Point[];
        readonly options?: SparklineOptions;
    }>(),
}) {
    render(): Node {
        const opts = this.props.options;
        return this.cx.dom.surface({
            class: 'chart-host chart-sparkline-host',
            setup: (el) => {
                const chart = sparkline(el, opts);
                const stop = effect(() => {
                    chart.update(this.props.points());
                });
                return () => {
                    stop();
                    chart.dispose();
                };
            },
        });
    }
}

export class BarsChart extends Component({
    needs: needs('dom'),
    props: props<{
        readonly data: () => readonly BarDatum[];
        readonly options?: BarsOptions;
    }>(),
}) {
    render(): Node {
        const opts = this.props.options;
        return this.cx.dom.surface({
            class: 'chart-host',
            setup: (el) => {
                const chart = bars(el, opts);
                const stop = effect(() => {
                    chart.update(this.props.data());
                });
                return () => {
                    stop();
                    chart.dispose();
                };
            },
        });
    }
}

export class MeterChart extends Component({
    needs: needs('dom'),
    props: props<{
        readonly value: () => number;
        readonly options: MeterOptions;
    }>(),
}) {
    render(): Node {
        const opts = this.props.options;
        return this.cx.dom.surface({
            class: 'chart-host',
            setup: (el) => {
                const chart = meter(el, opts);
                const stop = effect(() => {
                    chart.update(this.props.value());
                });
                return () => {
                    stop();
                    chart.dispose();
                };
            },
        });
    }
}

export class HeatmapChart extends Component({
    needs: needs('dom'),
    props: props<{
        readonly data: () => readonly HeatmapCell[];
        readonly options?: HeatmapOptions;
    }>(),
}) {
    render(): Node {
        const opts = this.props.options;
        return this.cx.dom.surface({
            class: 'chart-host',
            setup: (el) => {
                const chart = heatmap(el, opts);
                const stop = effect(() => {
                    chart.update(this.props.data());
                });
                return () => {
                    stop();
                    chart.dispose();
                };
            },
        });
    }
}

export class StateTimelineChart extends Component({
    needs: needs('dom'),
    props: props<{
        readonly data: () => readonly StateTimelineRow[];
        readonly options?: StateTimelineOptions;
    }>(),
}) {
    render(): Node {
        const opts = this.props.options;
        return this.cx.dom.surface({
            class: 'chart-host',
            setup: (el) => {
                const chart = stateTimeline(el, opts);
                const stop = effect(() => {
                    chart.update(this.props.data());
                });
                return () => {
                    stop();
                    chart.dispose();
                };
            },
        });
    }
}

// Aliases
export const Sparkline = SparklineChart;
export const Bars = BarsChart;
export const Meter = MeterChart;
export const Heatmap = HeatmapChart;
export const StateTimeline = StateTimelineChart;
