/**
 * Unit formatting utilities using d3-format.
 */

import { format } from 'd3-format';
import type { Unit } from './types.js';

const siFormat = format('~s');

export function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes)) return '—';
    const abs = Math.abs(bytes);
    const sign = bytes < 0 ? '-' : '';
    if (abs < 1024) return `${sign}${abs.toFixed(0)} B`;
    const k = 1024;
    const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
    const i = Math.min(Math.floor(Math.log(abs) / Math.log(k)), sizes.length - 1);
    const divisor = Math.pow(k, i);
    const val = abs / divisor;
    const formatted = val >= 100 ? val.toFixed(0) : val >= 10 ? val.toFixed(1) : val.toFixed(2);
    const unit = sizes[i] ?? 'B';
    return `${sign}${formatted} ${unit}`;
}

export function formatBytesPerSec(bytes: number): string {
    const formatted = formatBytes(bytes);
    if (formatted === '—') return formatted;
    return `${formatted}/s`;
}

export function formatPercent(value: number): string {
    if (!Number.isFinite(value)) return '—';
    const formatted = Math.abs(value) >= 100 || Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
    return `${formatted} %`;
}

export function formatSeconds(sec: number): string {
    if (!Number.isFinite(sec)) return '—';
    const abs = Math.abs(sec);
    const sign = sec < 0 ? '-' : '';
    if (abs === 0) return '0 s';
    if (abs < 0.001) return `${sign}${(abs * 1_000_000).toFixed(0)} µs`;
    if (abs < 1) return `${sign}${(abs * 1000).toFixed(1)} ms`;
    if (abs < 60) return `${sign}${abs < 10 ? abs.toFixed(2) : abs.toFixed(1)} s`;
    if (abs < 3600) {
        const m = Math.floor(abs / 60);
        const s = Math.round(abs % 60);
        return `${sign}${m}m ${s}s`;
    }
    const h = abs / 3600;
    return `${sign}${h.toFixed(1)} h`;
}

export function formatCount(value: number): string {
    if (!Number.isFinite(value)) return '—';
    if (Math.abs(value) < 1000) {
        return Number.isInteger(value) ? String(value) : value.toFixed(1);
    }
    return siFormat(value);
}

export function formatValue(value: number | null, unit?: Unit): string {
    if (value === null || !Number.isFinite(value)) return '—';
    if (typeof unit === 'function') {
        return unit(value);
    }
    switch (unit) {
        case 'bytes':
            return formatBytes(value);
        case 'bytes/s':
            return formatBytesPerSec(value);
        case 'percent':
            return formatPercent(value);
        case 'seconds':
            return formatSeconds(value);
        case 'count':
            return formatCount(value);
        default:
            return formatCount(value);
    }
}
