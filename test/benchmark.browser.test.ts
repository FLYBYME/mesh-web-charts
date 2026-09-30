/**
 * Performance benchmark test for timeSeries chart.
 * Target: 20 series x 360 points (an hour at 10 s) appending 1 point per series
 * stays under 4 ms of scripting per append on desktop.
 * Asserts a generous upper bound (< 15 ms) to catch regressions.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { timeSeries } from '../src/core/timeSeries.js';
import type { LivePoint, Series } from '../src/types.js';
import { frame } from './harness.js';

describe('performance benchmark', () => {
    let container: HTMLDivElement | null = null;

    afterEach(() => {
        if (container !== null) {
            container.remove();
            container = null;
        }
    });

    it('stays under upper bound for 20 series x 360 points with live appends', async () => {
        container = document.createElement('div');
        container.style.width = '800px';
        container.style.height = '350px';
        document.body.appendChild(container);

        // Generate 20 series with 360 points each (1 hour at 10 s scrapes)
        const seriesCount = 20;
        const pointsPerSeries = 360;
        const now = 1700000000000;
        const initialSeries: Series[] = [];

        for (let s = 0; s < seriesCount; s++) {
            const points: [number, number][] = [];
            for (let i = 0; i < pointsPerSeries; i++) {
                const t = now - (pointsPerSeries - i) * 10_000;
                const val = 50 + 20 * Math.sin(i / 10 + s) + Math.random() * 5;
                points.push([t, val]);
            }
            initialSeries.push({
                key: `metric_series_${s}`,
                label: `Node ${s} Metric`,
                points,
            });
        }

        const chart = timeSeries(container, {
            title: 'High Load Live Test',
            window: 3600_000,
            gapAfter: 30_000,
        });

        chart.update(initialSeries);
        await frame();

        // Perform 30 live appends, measuring total scripting time
        const appendIterations = 30;
        let nextTime = now;

        const startPerf = performance.now();

        for (let a = 0; a < appendIterations; a++) {
            nextTime += 10_000;
            const livePoints: LivePoint[] = [];
            for (let s = 0; s < seriesCount; s++) {
                const val = 50 + 20 * Math.sin(a / 10 + s);
                livePoints.push({
                    key: `metric_series_${s}`,
                    point: [nextTime, val],
                });
            }
            chart.append(livePoints);
        }

        // Wait for requestAnimationFrame batch to flush
        await frame();
        await frame();

        const totalElapsed = performance.now() - startPerf;
        const avgPerAppend = totalElapsed / appendIterations;

        // Log for report
        console.log(`[BENCHMARK] 20 series x 360 points: ${appendIterations} appends took ${totalElapsed.toFixed(2)} ms total (${avgPerAppend.toFixed(3)} ms / append)`);

        // Assert generous upper bound of 15 ms per append on test runner (target is < 4 ms on desktop)
        expect(avgPerAppend).toBeLessThan(15);

        chart.dispose();
    });
});
