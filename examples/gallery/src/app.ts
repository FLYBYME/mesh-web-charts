/**
 * Mesh Web Charts Interactive Gallery App.
 * Showcases all 6 charts through Layer 2 bridge components with live data and 320px phone frame toggle.
 */

import {
    App, element, needs, Router, signal, text, View, type Node,
} from '@flybyme/mesh-web';
import {
    BarsChart,
    HeatmapChart,
    MeterChart,
    SparklineChart,
    StateTimelineChart,
    TimeSeriesChart,
} from '@flybyme/mesh-web-charts';
import type {
    BarDatum, HeatmapCell, Point, Series, StateTimelineRow,
} from '@flybyme/mesh-web-charts';
import '@flybyme/mesh-web-charts/charts.css';
import './gallery.css';

const GalleryBase = View({
    needs: needs('dom'),
    inject: { router: Router },
});

export class GalleryView extends GalleryBase {
    // 320 px phone frame toggle
    private readonly phoneFrame = signal(false);

    // Live timeSeries state
    private readonly now = Date.now();
    private readonly liveSeries = signal<readonly Series[]>([
        {
            key: 'node1_cpu',
            label: 'Node 1 CPU',
            unit: 'percent',
            points: Array.from({ length: 30 }, (_, i) => [
                Date.now() - (30 - i) * 2000,
                35 + 15 * Math.sin(i / 3) + (i % 2 === 0 ? 5 : -5),
            ]),
        },
        {
            key: 'node2_cpu',
            label: 'Node 2 CPU',
            unit: 'percent',
            points: Array.from({ length: 30 }, (_, i) => [
                Date.now() - (30 - i) * 2000,
                55 + 20 * Math.cos(i / 4) + (i % 3 === 0 ? 8 : -4),
            ]),
        },
    ]);

    // Live timer simulating scrapes (every 1.5s for demonstration)
    private timerId: number | null = null;

    constructor(...args: ConstructorParameters<typeof GalleryBase>) {
        super(...args);

        this.timerId = window.setInterval(() => {
            const current = this.liveSeries();
            const t = Date.now();
            const s1 = current[0]!;
            const s2 = current[1]!;

            const v1 = Math.max(10, Math.min(95, (s1.points[s1.points.length - 1]?.[1] ?? 40) + (Math.random() - 0.48) * 8));
            const v2 = Math.max(10, Math.min(95, (s2.points[s2.points.length - 1]?.[1] ?? 50) + (Math.random() - 0.48) * 10));

            this.liveSeries.set([
                { ...s1, points: [...s1.points, [t, v1]] },
                { ...s2, points: [...s2.points, [t, v2]] },
            ]);
        }, 1500);

        this.cx.onDispose(() => {
            if (this.timerId !== null) {
                clearInterval(this.timerId);
                this.timerId = null;
            }
        });
    }

    render(): Node {
        const now = Date.now();

        // 1. Sparkline data
        const sparkPoints: Point[] = Array.from({ length: 20 }, (_, i) => [
            now - (20 - i) * 10_000,
            120 + 40 * Math.sin(i / 2) + Math.random() * 10,
        ]);

        // 2. Bars data (Disk usage per node)
        const barData: BarDatum[] = [
            { category: 'node-alpha', series: 'Used', value: 420_000_000_000 },
            { category: 'node-alpha', series: 'Free', value: 580_000_000_000 },
            { category: 'node-beta', series: 'Used', value: 780_000_000_000 },
            { category: 'node-beta', series: 'Free', value: 220_000_000_000 },
            { category: 'node-gamma', series: 'Used', value: 210_000_000_000 },
            { category: 'node-gamma', series: 'Free', value: 790_000_000_000 },
        ];

        // 3. Heatmap data (Request latency distribution)
        const buckets = ['0-5ms', '5-15ms', '15-50ms', '50-200ms', '200ms+'];
        const heatmapData: HeatmapCell[] = [];
        for (let step = 0; step < 12; step++) {
            const time = now - (12 - step) * 30_000;
            heatmapData.push(
                { time, bucket: '0-5ms', count: 450 + Math.round(Math.random() * 50) },
                { time, bucket: '5-15ms', count: 180 + Math.round(Math.random() * 30) },
                { time, bucket: '15-50ms', count: 45 + Math.round(Math.random() * 15) },
                { time, bucket: '50-200ms', count: 12 + Math.round(Math.random() * 8) },
                { time, bucket: '200ms+', count: 2 + Math.round(Math.random() * 3) },
            );
        }

        // 4. State timeline data (Pod phase history)
        const timelineData: StateTimelineRow[] = [
            {
                key: 'dns-edge-0',
                label: 'dns-edge-0',
                spans: [
                    { state: 'Running', start: now - 3600_000, end: now },
                ],
            },
            {
                key: 'dns-edge-1',
                label: 'dns-edge-1',
                spans: [
                    { state: 'Running', start: now - 3600_000, end: now - 900_000 },
                    { state: 'Failed', start: now - 900_000, end: now - 600_000 },
                    { state: 'Pending', start: now - 600_000, end: now - 500_000 },
                    { state: 'Running', start: now - 500_000, end: now },
                ],
            },
            {
                key: 'vol-sync-pool',
                label: 'vol-sync-pool',
                spans: [
                    { state: 'RW', start: now - 3600_000, end: now - 1200_000 },
                    { state: 'WO', start: now - 1200_000, end: now - 300_000 },
                    { state: 'RW', start: now - 300_000, end: now },
                ],
            },
        ];

        return element('Stack', {
            props: {
                class: () => this.phoneFrame() ? 'gallery-container gallery-phone-frame' : 'gallery-container',
            },
            children: [
                // Header
                element('Row', {
                    props: { class: 'gallery-header' },
                    children: [
                        element('Stack', {
                            children: [
                                element('Heading', { props: { level: 1, class: 'gallery-title' }, children: [text('Cluster Operational Metrics')] }),
                                element('Text', { props: { class: 'gallery-subtitle' }, children: [text('Real-time D3 charts for surfdns.net infrastructure')] }),
                            ],
                        }),
                        element('Row', {
                            props: { style: 'display:flex; gap:0.5rem;' },
                            children: [
                                element('Button', {
                                    props: {
                                        type: 'button',
                                        class: 'gallery-btn',
                                        'data-active': () => String(this.phoneFrame()),
                                    },
                                    intents: {
                                        activate: { action: this.on(() => this.phoneFrame.set(!this.phoneFrame())) },
                                    },
                                    children: [text(() => this.phoneFrame() ? 'Exit Phone Frame' : '320px Phone Frame')],
                                }),
                            ],
                        }),
                    ],
                }),

                // Stats Row with Sparklines and Meter
                element('Row', {
                    props: { class: 'gallery-stats' },
                    children: [
                        element('Card', {
                            props: { class: 'gallery-card' },
                            children: [
                                element('Heading', { props: { level: 2, class: 'gallery-card-title' }, children: [text('Ingress Requests')] }),
                                this.mount(SparklineChart, {
                                    points: () => sparkPoints,
                                    options: { unit: 'count', showMinMax: true, showLastValue: true },
                                }),
                            ],
                        }),
                        element('Card', {
                            props: { class: 'gallery-card' },
                            children: [
                                element('Heading', { props: { level: 2, class: 'gallery-card-title' }, children: [text('Primary Storage Pool')] }),
                                this.mount(MeterChart, {
                                    value: () => 82.5,
                                    options: {
                                        label: 'NVMe Pool Free Space',
                                        max: 100,
                                        warnThreshold: 80,
                                        badThreshold: 90,
                                        unit: 'percent',
                                    },
                                }),
                            ],
                        }),
                    ],
                }),

                // Live TimeSeries Chart
                element('Card', {
                    props: { class: 'gallery-card' },
                    children: [
                        element('Heading', { props: { level: 2, class: 'gallery-card-title' }, children: [text('Live CPU Scrapes (VictoriaMetrics Stream)')] }),
                        this.mount(TimeSeriesChart, {
                            series: this.liveSeries,
                            options: {
                                title: 'Live Node CPU Utilization',
                                unit: 'percent',
                                window: 60_000,
                                gapAfter: 25_000,
                                thresholds: [
                                    { value: 80, label: 'Warning', tone: 'warn' },
                                    { value: 90, label: 'Critical', tone: 'bad' },
                                ],
                                bands: [
                                    { start: now - 35_000, end: now - 20_000, label: 'Spike Window', tone: 'warn' },
                                ],
                            },
                        }),
                    ],
                }),

                // Grid: Bars and Latency Heatmap
                element('Grid', {
                    props: { class: 'gallery-grid' },
                    children: [
                        element('Card', {
                            props: { class: 'gallery-card' },
                            children: [
                                element('Heading', { props: { level: 2, class: 'gallery-card-title' }, children: [text('Node Storage Usage')] }),
                                this.mount(BarsChart, {
                                    data: () => barData,
                                    options: {
                                        title: 'Per-node Disk Usage',
                                        orientation: 'horizontal',
                                        mode: 'stacked',
                                        unit: 'bytes',
                                    },
                                }),
                            ],
                        }),
                        element('Card', {
                            props: { class: 'gallery-card' },
                            children: [
                                element('Heading', { props: { level: 2, class: 'gallery-card-title' }, children: [text('DNS Query Latency Distribution')] }),
                                this.mount(HeatmapChart, {
                                    data: () => heatmapData,
                                    options: {
                                        title: 'Latency Heatmap',
                                        buckets,
                                    },
                                }),
                            ],
                        }),
                    ],
                }),

                // Pod States Timeline
                element('Card', {
                    props: { class: 'gallery-card' },
                    children: [
                        element('Heading', { props: { level: 2, class: 'gallery-card-title' }, children: [text('Pod Lifecycle State Timeline')] }),
                        this.mount(StateTimelineChart, {
                            data: () => timelineData,
                            options: {
                                title: 'Pod States',
                                stateColours: {
                                    Running: 'var(--chart-good)',
                                    Pending: 'var(--chart-warn)',
                                    Failed: 'var(--chart-bad)',
                                    RW: 'var(--chart-series-1)',
                                    WO: 'var(--chart-series-3)',
                                },
                            },
                        }),
                    ],
                }),
            ],
        });
    }
}

export default class GalleryApp extends App({
    needs: needs('dom'),
    routes: {
        '/': GalleryView,
    },
}) {}
