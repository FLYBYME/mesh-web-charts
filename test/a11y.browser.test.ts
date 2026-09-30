/**
 * Accessibility audit with axe-core on all chart types in both light and dark colour schemes.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { signal } from '@flybyme/mesh-web';
import {
    BarsChart,
    HeatmapChart,
    MeterChart,
    SparklineChart,
    StateTimelineChart,
    TimeSeriesChart,
} from '../src/bridge.js';
import type {
    BarDatum, HeatmapCell, Point, Series, StateTimelineRow,
} from '../src/types.js';
import { audit } from './a11y.js';
import { frame, show, unmount } from './harness.js';

afterEach(() => {
    unmount();
    document.documentElement.style.colorScheme = '';
    document.body.style.background = '';
    document.body.style.color = '';
});

const now = 1700000000000;

const timeSeriesData: Series[] = [
    {
        key: 'cpu_node1',
        label: 'Node 1 CPU',
        points: [
            [now - 30_000, 10],
            [now - 20_000, 20],
            [now - 10_000, 15],
            [now, 25],
        ],
    },
    {
        key: 'cpu_node2',
        label: 'Node 2 CPU',
        points: [
            [now - 30_000, 30],
            [now - 20_000, 25],
            [now - 10_000, 40],
            [now, 35],
        ],
    },
];

const sparkPoints: Point[] = [
    [now - 3000, 10],
    [now - 2000, 25],
    [now - 1000, 15],
    [now, 30],
];

const barData: BarDatum[] = [
    { category: 'us-east-1', series: 'read', value: 120 },
    { category: 'us-east-1', series: 'write', value: 45 },
    { category: 'eu-west-1', series: 'read', value: 90 },
    { category: 'eu-west-1', series: 'write', value: 30 },
];

const heatmapData: HeatmapCell[] = [
    { time: now - 10_000, bucket: 'p50', count: 120 },
    { time: now - 10_000, bucket: 'p99', count: 12 },
    { time: now, bucket: 'p50', count: 150 },
    { time: now, bucket: 'p99', count: 8 },
];

const timelineData: StateTimelineRow[] = [
    {
        key: 'pod-1',
        label: 'Worker 1',
        spans: [
            { state: 'Running', start: now - 20_000, end: now },
        ],
    },
];

describe('accessibility audits with axe-core', () => {
    it('passes audit in light colour scheme across all chart types', async () => {
        document.documentElement.style.colorScheme = 'light';
        document.body.style.background = 'Canvas';
        document.body.style.color = 'CanvasText';

        const root = show((host) => [
            host.mount(TimeSeriesChart, {
                series: signal(timeSeriesData),
                options: { title: 'CPU Usage', table: true },
            }),
            host.mount(SparklineChart, {
                points: signal(sparkPoints),
                options: { label: 'Request Rate' },
            }),
            host.mount(BarsChart, {
                data: signal(barData),
                options: { title: 'IOPS', table: true },
            }),
            host.mount(MeterChart, {
                value: signal(72),
                options: { label: 'Disk Pool Free', max: 100, warnThreshold: 80, badThreshold: 90, unit: 'percent' },
            }),
            host.mount(HeatmapChart, {
                data: signal(heatmapData),
                options: { title: 'Latency Heatmap', table: true },
            }),
            host.mount(StateTimelineChart, {
                data: signal(timelineData),
                options: { title: 'Pod States', table: true },
            }),
        ]);

        await frame();
        const violations = await audit(root);
        expect(violations).toEqual([]);
    });

    it('passes audit in dark colour scheme across all chart types', async () => {
        document.documentElement.style.colorScheme = 'dark';
        document.body.style.background = 'Canvas';
        document.body.style.color = 'CanvasText';

        const root = show((host) => [
            host.mount(TimeSeriesChart, {
                series: signal(timeSeriesData),
                options: { title: 'CPU Usage (Dark)', table: true },
            }),
            host.mount(SparklineChart, {
                points: signal(sparkPoints),
                options: { label: 'Request Rate (Dark)' },
            }),
            host.mount(BarsChart, {
                data: signal(barData),
                options: { title: 'IOPS (Dark)', table: true },
            }),
            host.mount(MeterChart, {
                value: signal(85),
                options: { label: 'Disk Pool Free (Dark)', max: 100, warnThreshold: 80, badThreshold: 90, unit: 'percent' },
            }),
            host.mount(HeatmapChart, {
                data: signal(heatmapData),
                options: { title: 'Latency Heatmap (Dark)', table: true },
            }),
            host.mount(StateTimelineChart, {
                data: signal(timelineData),
                options: { title: 'Pod States (Dark)', table: true },
            }),
        ]);

        await frame();
        const violations = await audit(root);
        expect(violations).toEqual([]);
    });
});
