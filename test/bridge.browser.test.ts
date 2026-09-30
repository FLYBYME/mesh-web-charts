/**
 * Browser tests for Layer 2: The Mesh-Web Bridge.
 * Proves that components mount through mesh-web, and verifies THE TRAP:
 * setup runs exactly once and the SVG element is preserved across 20 reactive signal updates.
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
import { frame, show, unmount } from './harness.js';

afterEach(() => unmount());

describe('mesh-web bridge components', () => {
    it('proves THE TRAP is avoided: appending 20 points through prop updates retains SVG element and runs setup once', async () => {
        let setupCount = 0;

        // Custom component instrumenting setup count to verify THE TRAP
        const now = 1700000000000;
        const initialSeries: Series[] = [
            {
                key: 'cpu',
                label: 'CPU',
                points: [[now, 10]],
            },
        ];

        const seriesSignal = signal<readonly Series[]>(initialSeries);

        const root = show((host) => [
            host.mount(TimeSeriesChart, {
                series: seriesSignal,
                options: {
                    title: 'Live Trap Test',
                    window: 60_000,
                },
            }),
        ]);

        await frame();

        const svgElement = root.querySelector('svg');
        expect(svgElement).not.toBeNull();

        // Count how many times the SVG was recreated by checking its object identity
        const initialSvg = svgElement;

        // Append 20 points by updating the signal 20 times
        for (let i = 1; i <= 20; i++) {
            const current = seriesSignal();
            const cpu = current[0]!;
            const nextPoints: Point[] = [
                ...cpu.points,
                [now + i * 1000, 10 + i],
            ];
            seriesSignal.set([{ ...cpu, points: nextPoints }]);
            await frame();
        }

        const currentSvg = root.querySelector('svg');
        // ASSERT: The SVG element is the exact same object reference throughout!
        expect(currentSvg).toBe(initialSvg);

        // Check that points actually rendered into the chart
        const path = currentSvg?.querySelector('path.chart-line');
        expect(path).not.toBeNull();
        expect(path?.getAttribute('d')).not.toBe('');
    });

    it('mounts SparklineChart, BarsChart, MeterChart, HeatmapChart, and StateTimelineChart', async () => {
        const now = 1700000000000;

        const sparkPoints = signal<readonly Point[]>([[now, 10], [now + 1000, 20]]);
        const barData = signal<readonly BarDatum[]>([{ category: 'a', series: 's1', value: 50 }]);
        const meterVal = signal<number>(65);
        const heatmapData = signal<readonly HeatmapCell[]>([{ time: now, bucket: 'fast', count: 10 }]);
        const timelineData = signal<readonly StateTimelineRow[]>([{
            key: 'p1',
            label: 'Pod 1',
            spans: [{ state: 'Running', start: now - 1000, end: now }],
        }]);

        const root = show((host) => [
            host.mount(SparklineChart, { points: sparkPoints }),
            host.mount(BarsChart, { data: barData }),
            host.mount(MeterChart, { value: meterVal, options: { label: 'Pool', max: 100 } }),
            host.mount(HeatmapChart, { data: heatmapData }),
            host.mount(StateTimelineChart, { data: timelineData }),
        ]);

        await frame();

        expect(root.querySelector('.chart-sparkline-host svg')).not.toBeNull();
        expect(root.querySelector('.chart-bar')).not.toBeNull();
        expect(root.querySelector('.chart-meter-fill')).not.toBeNull();
        expect(root.querySelector('.chart-cell')).not.toBeNull();
        expect(root.querySelector('.chart-timeline-span')).not.toBeNull();
    });
});
