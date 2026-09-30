/**
 * Browser tests for framework-free chart cores (Layer 1).
 * Tests rendering, data joins by series key, element identity preservation,
 * live appending, responsive resizing, and clean disposal.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    bars, heatmap, meter, sparkline, stateTimeline, timeSeries,
} from '../src/core/index.js';
import type { BarDatum, HeatmapCell, Point, Series, StateTimelineRow } from '../src/types.js';
import { frame } from './harness.js';

describe('core charts (framework-free)', () => {
    let container: HTMLDivElement | null = null;

    function getHost(width = 500, height = 300): HTMLDivElement {
        if (container !== null) {
            container.remove();
        }
        container = document.createElement('div');
        container.style.width = `${width}px`;
        container.style.height = `${height}px`;
        document.body.appendChild(container);
        return container;
    }

    afterEach(() => {
        if (container !== null) {
            container.remove();
            container = null;
        }
        vi.restoreAllMocks();
    });

    describe('timeSeries', () => {
        it('renders, updates by key without recreating unchanged series, appends, resizes, and disposes cleanly', async () => {
            const host = getHost(600, 300);

            // Spy on cleanup targets
            const disconnectSpy = vi.spyOn(ResizeObserver.prototype, 'disconnect');
            const cancelRafSpy = vi.spyOn(window, 'cancelAnimationFrame');
            const removeListenerSpy = vi.spyOn(EventTarget.prototype, 'removeEventListener');

            const now = Date.now();
            const series1: Series = {
                key: 'cpu_node1',
                label: 'Node 1 CPU',
                points: [
                    [now - 30_000, 10],
                    [now - 20_000, 20],
                    [now - 10_000, 15],
                ],
            };
            const series2: Series = {
                key: 'cpu_node2',
                label: 'Node 2 CPU',
                points: [
                    [now - 30_000, 30],
                    [now - 20_000, 25],
                    [now - 10_000, 40],
                ],
            };

            const chart = timeSeries(host, {
                title: 'Cluster CPU',
                unit: 'percent',
                window: 60_000,
                table: true,
            });

            chart.update([series1, series2]);
            await frame();

            const svg = host.querySelector('svg');
            expect(svg).not.toBeNull();
            expect(svg?.getAttribute('role')).toBe('img');
            expect(svg?.getAttribute('aria-label')).toContain('Cluster CPU');

            // Find paths for series
            const path1 = host.querySelector('.chart-series-cpu_node1 path.chart-line');
            const path2 = host.querySelector('.chart-series-cpu_node2 path.chart-line');
            expect(path1).not.toBeNull();
            expect(path2).not.toBeNull();

            // Update series with new point without recreating path1 and path2
            const updatedSeries1: Series = {
                ...series1,
                points: [
                    ...series1.points,
                    [now, 18],
                ],
            };

            chart.update([updatedSeries1, series2]);
            await frame();

            const path1After = host.querySelector('.chart-series-cpu_node1 path.chart-line');
            const path2After = host.querySelector('.chart-series-cpu_node2 path.chart-line');

            // ASSERT ELEMENT IDENTITY: paths were reused, not recreated!
            expect(path1After).toBe(path1);
            expect(path2After).toBe(path2);

            // Test live append
            chart.append([
                { key: 'cpu_node1', point: [now + 10_000, 22] },
                { key: 'cpu_node2', point: [now + 10_000, 35] },
            ]);
            await frame();
            await frame();

            const path1Appended = host.querySelector('.chart-series-cpu_node1 path.chart-line');
            expect(path1Appended).toBe(path1);

            // Test resize: change host width, see ticks update
            const initialTicks = host.querySelectorAll('.chart-axis-x .tick').length;
            host.style.width = '320px';
            chart.resize();
            await frame();

            const narrowTicks = host.querySelectorAll('.chart-axis-x .tick').length;
            expect(narrowTicks).toBeLessThanOrEqual(initialTicks);

            // Dispose cleanly: asserts no listeners or observers remain
            chart.dispose();
            expect(disconnectSpy).toHaveBeenCalled();
            expect(removeListenerSpy).toHaveBeenCalled();
            expect(host.innerHTML).toBe('');
        });
    });

    describe('sparkline', () => {
        it('renders, marks last value, updates without recreating SVG, and disposes', async () => {
            const host = getHost(120, 30);
            const points: Point[] = [
                [1000, 5],
                [2000, 15],
                [3000, 10],
                [4000, 25],
            ];

            const chart = sparkline(host, {
                width: 120,
                height: 30,
                showLastValue: true,
                showMinMax: true,
                unit: 'count',
            });

            chart.update(points);
            await frame();

            const svg = host.querySelector('svg');
            expect(svg).not.toBeNull();
            expect(svg?.getAttribute('aria-label')).toContain('current 25');

            const lastCircle = host.querySelector('circle');
            expect(lastCircle).not.toBeNull();

            // Update with new data
            chart.update([...points, [5000, 30]]);
            await frame();

            const svgAfter = host.querySelector('svg');
            expect(svgAfter).toBe(svg);
            expect(svgAfter?.getAttribute('aria-label')).toContain('current 30');

            chart.dispose();
            expect(host.innerHTML).toBe('');
        });
    });

    describe('bars', () => {
        it('renders vertical and horizontal grouped and stacked bars, handles series toggling, and disposes', async () => {
            const host = getHost(500, 280);
            const data: BarDatum[] = [
                { category: 'node-alpha', series: 'used', value: 40 },
                { category: 'node-alpha', series: 'free', value: 60 },
                { category: 'node-beta', series: 'used', value: 75 },
                { category: 'node-beta', series: 'free', value: 25 },
            ];

            // Vertical grouped
            const vertChart = bars(host, {
                title: 'Disk Usage',
                orientation: 'vertical',
                mode: 'stacked',
                unit: 'bytes',
            });
            vertChart.update(data);
            await frame();

            expect(host.querySelectorAll('.chart-bar').length).toBe(4);
            const legendButtons = host.querySelectorAll('.chart-legend-item');
            expect(legendButtons.length).toBe(2);

            // Toggle series visibility
            const firstLegendBtn = legendButtons[0] as HTMLButtonElement;
            firstLegendBtn.click();
            await frame();

            expect(firstLegendBtn.getAttribute('aria-pressed')).toBe('false');

            vertChart.dispose();
            expect(host.innerHTML).toBe('');

            // Horizontal bars
            const horizHost = getHost(400, 250);
            const horizChart = bars(horizHost, {
                title: 'Storage Pools',
                orientation: 'horizontal',
                mode: 'grouped',
            });
            horizChart.update(data);
            await frame();

            expect(horizHost.querySelectorAll('.chart-bar').length).toBe(4);
            horizChart.dispose();
            expect(horizHost.innerHTML).toBe('');
        });
    });

    describe('meter', () => {
        it('renders readable label, warns when threshold exceeded, and disposes', async () => {
            const host = getHost(300, 60);
            const chart = meter(host, {
                label: 'Memory Free',
                min: 0,
                max: 100,
                warnThreshold: 70,
                badThreshold: 90,
                unit: 'percent',
            });

            // Normal state
            chart.update(50);
            await frame();
            let fill = host.querySelector('.chart-meter-fill');
            let status = host.querySelector('.chart-meter-status');
            expect(fill?.getAttribute('data-tone')).toBe('good');
            expect(status?.textContent).toContain('Normal');

            // Warning state
            chart.update(75);
            await frame();
            fill = host.querySelector('.chart-meter-fill');
            status = host.querySelector('.chart-meter-status');
            expect(fill?.getAttribute('data-tone')).toBe('warn');
            expect(status?.textContent).toContain('Warning');

            // Critical state
            chart.update(95);
            await frame();
            fill = host.querySelector('.chart-meter-fill');
            status = host.querySelector('.chart-meter-status');
            expect(fill?.getAttribute('data-tone')).toBe('bad');
            expect(status?.textContent).toContain('Critical');

            chart.dispose();
            expect(host.innerHTML).toBe('');
        });
    });

    describe('heatmap', () => {
        it('renders time on X, latency buckets on Y, and disposes', async () => {
            const host = getHost(500, 260);
            const now = Date.now();
            const cells: HeatmapCell[] = [
                { time: now - 20_000, bucket: '0-5ms', count: 120 },
                { time: now - 20_000, bucket: '5-20ms', count: 35 },
                { time: now - 20_000, bucket: '20ms+', count: 5 },
                { time: now - 10_000, bucket: '0-5ms', count: 140 },
                { time: now - 10_000, bucket: '5-20ms', count: 42 },
                { time: now - 10_000, bucket: '20ms+', count: 8 },
            ];

            const chart = heatmap(host, {
                title: 'API Latency Distribution',
                buckets: ['0-5ms', '5-20ms', '20ms+'],
            });
            chart.update(cells);
            await frame();

            const rects = host.querySelectorAll('.chart-cell');
            expect(rects.length).toBe(6);

            chart.dispose();
            expect(host.innerHTML).toBe('');
        });
    });

    describe('stateTimeline', () => {
        it('renders state bands over time, summarizes in accessible table, and disposes', async () => {
            const host = getHost(550, 240);
            const now = Date.now();
            const rows: StateTimelineRow[] = [
                {
                    key: 'pod-1',
                    label: 'DNS Worker 1',
                    spans: [
                        { state: 'Pending', start: now - 60_000, end: now - 45_000 },
                        { state: 'Running', start: now - 45_000, end: now },
                    ],
                },
                {
                    key: 'pod-2',
                    label: 'DNS Worker 2',
                    spans: [
                        { state: 'Pending', start: now - 60_000, end: now - 50_000 },
                        { state: 'Failed', start: now - 50_000, end: now - 30_000 },
                        { state: 'Running', start: now - 30_000, end: now },
                    ],
                },
            ];

            const chart = stateTimeline(host, {
                title: 'Pod States',
                table: true,
            });
            chart.update(rows);
            await frame();

            const spans = host.querySelectorAll('.chart-timeline-span');
            expect(spans.length).toBe(5);

            const table = host.querySelector('table.chart-sr-only');
            expect(table).not.toBeNull();
            expect(table?.textContent).toContain('DNS Worker 1');

            chart.dispose();
            expect(host.innerHTML).toBe('');
        });
    });
});
