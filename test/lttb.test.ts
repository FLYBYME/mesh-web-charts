import { describe, expect, it } from 'vitest';
import { lttb } from '../src/lttb.js';
import type { Point } from '../src/types.js';

describe('lttb downsampling', () => {
    it('returns empty array when given empty array', () => {
        expect(lttb([], 10)).toEqual([]);
    });

    it('returns copy when threshold is greater than or equal to data length', () => {
        const data: Point[] = [
            [100, 1],
            [200, 2],
            [300, 3],
        ];
        expect(lttb(data, 5)).toEqual(data);
        expect(lttb(data, 3)).toEqual(data);
    });

    it('handles threshold <= 2', () => {
        const data: Point[] = [
            [100, 1],
            [200, 50],
            [300, 2],
        ];
        expect(lttb(data, 1)).toEqual([[100, 1]]);
        expect(lttb(data, 2)).toEqual([[100, 1], [300, 2]]);
    });

    it('downsamples large array to threshold while keeping first and last points', () => {
        const count = 1000;
        const data: Point[] = [];
        for (let i = 0; i < count; i++) {
            // Sine wave with a huge spike at 500
            const val = i === 500 ? 100 : Math.sin(i / 10);
            data.push([i * 1000, val]);
        }

        const sampled = lttb(data, 50);
        expect(sampled.length).toBe(50);
        expect(sampled[0]).toEqual(data[0]);
        expect(sampled[sampled.length - 1]).toEqual(data[data.length - 1]);

        // The huge spike at i = 500 should be preserved because of maximum triangle area
        const hasSpike = sampled.some((pt) => pt[1] === 100);
        expect(hasSpike).toBe(true);
    });

    it('handles data with null and non-finite values safely', () => {
        const data: Point[] = [
            [100, 10],
            [200, null],
            [300, 50],
            [400, null],
            [500, 20],
            [600, 5],
        ];
        const sampled = lttb(data, 4);
        expect(sampled.length).toBe(4);
        expect(sampled[0]).toEqual(data[0]);
        expect(sampled[sampled.length - 1]).toEqual(data[data.length - 1]);
    });
});
