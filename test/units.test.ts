import { describe, expect, it } from 'vitest';
import {
    formatBytes,
    formatBytesPerSec,
    formatCount,
    formatPercent,
    formatSeconds,
    formatValue,
} from '../src/units.js';

describe('unit formatters', () => {
    describe('formatBytes', () => {
        it('formats B, KiB, MiB, GiB, TiB', () => {
            expect(formatBytes(0)).toBe('0 B');
            expect(formatBytes(512)).toBe('512 B');
            expect(formatBytes(1024)).toBe('1.00 KiB');
            expect(formatBytes(1536)).toBe('1.50 KiB');
            expect(formatBytes(1048576)).toBe('1.00 MiB');
            expect(formatBytes(1073741824)).toBe('1.00 GiB');
            expect(formatBytes(1099511627776)).toBe('1.00 TiB');
        });

        it('handles negative bytes and non-finite numbers', () => {
            expect(formatBytes(-1024)).toBe('-1.00 KiB');
            expect(formatBytes(NaN)).toBe('—');
            expect(formatBytes(Infinity)).toBe('—');
        });
    });

    describe('formatBytesPerSec', () => {
        it('appends /s', () => {
            expect(formatBytesPerSec(1024)).toBe('1.00 KiB/s');
            expect(formatBytesPerSec(NaN)).toBe('—');
        });
    });

    describe('formatPercent', () => {
        it('formats percentages', () => {
            expect(formatPercent(0)).toBe('0 %');
            expect(formatPercent(50)).toBe('50 %');
            expect(formatPercent(99.4)).toBe('99.4 %');
            expect(formatPercent(100)).toBe('100 %');
            expect(formatPercent(150.2)).toBe('150 %');
            expect(formatPercent(NaN)).toBe('—');
        });
    });

    describe('formatSeconds', () => {
        it('formats sub-seconds and durations', () => {
            expect(formatSeconds(0)).toBe('0 s');
            expect(formatSeconds(0.0005)).toBe('500 µs');
            expect(formatSeconds(0.025)).toBe('25.0 ms');
            expect(formatSeconds(1.5)).toBe('1.50 s');
            expect(formatSeconds(15.2)).toBe('15.2 s');
            expect(formatSeconds(90)).toBe('1m 30s');
            expect(formatSeconds(3600)).toBe('1.0 h');
            expect(formatSeconds(7200)).toBe('2.0 h');
            expect(formatSeconds(NaN)).toBe('—');
        });
    });

    describe('formatCount', () => {
        it('formats numbers and SI abbreviations', () => {
            expect(formatCount(0)).toBe('0');
            expect(formatCount(42)).toBe('42');
            expect(formatCount(1200)).toBe('1.2k');
            expect(formatCount(1000000)).toBe('1M');
            expect(formatCount(NaN)).toBe('—');
        });
    });

    describe('formatValue', () => {
        it('dispatches to unit types or custom functions', () => {
            expect(formatValue(null)).toBe('—');
            expect(formatValue(1024, 'bytes')).toBe('1.00 KiB');
            expect(formatValue(50, 'percent')).toBe('50 %');
            expect(formatValue(10, 'seconds')).toBe('10.0 s');
            expect(formatValue(1234, 'count')).toBe('1.234k');
            expect(formatValue(42, (v) => `${v} pods`)).toBe('42 pods');
        });
    });
});
