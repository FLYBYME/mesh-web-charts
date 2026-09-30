import { describe, expect, it } from 'vitest';
import { defaultSeriesLabel, fromPromMatrix, fromPromVector } from '../src/adapters.js';

describe('adapters', () => {
    describe('defaultSeriesLabel', () => {
        it('formats __name__ with other labels', () => {
            const label = defaultSeriesLabel({
                __name__: 'node_cpu_seconds_total',
                cpu: '0',
                mode: 'idle',
            });
            expect(label).toBe('node_cpu_seconds_total{cpu="0", mode="idle"}');
        });

        it('formats sorted key=value when no __name__', () => {
            const label = defaultSeriesLabel({
                instance: 'host1',
                job: 'node',
            });
            expect(label).toBe('instance="host1", job="node"');
        });

        it('returns "value" for empty metric', () => {
            expect(defaultSeriesLabel({})).toBe('value');
        });
    });

    describe('fromPromMatrix', () => {
        it('converts VictoriaMetrics / Prometheus matrix response to Series[]', () => {
            const response = {
                status: 'success',
                data: {
                    resultType: 'matrix',
                    result: [
                        {
                            metric: { __name__: 'http_requests', handler: '/api' },
                            values: [
                                [1700000000, '10.5'],
                                [1700000010, '20.0'],
                                [1700000020, 'NaN'],
                                [1700000030, '+Inf'],
                                [1700000040, '-Inf'],
                            ],
                        },
                    ],
                },
            };

            const series = fromPromMatrix(response);
            expect(series.length).toBe(1);
            const first = series[0]!;
            expect(first.key).toBe('http_requests_0');
            expect(first.label).toBe('http_requests{handler="/api"}');
            expect(first.points).toEqual([
                [1700000000000, 10.5],
                [1700000010000, 20.0],
                [1700000020000, null],
                [1700000030000, null],
                [1700000040000, null],
            ]);
        });

        it('supports custom label and key extractors', () => {
            const response = {
                status: 'success',
                data: {
                    resultType: 'matrix',
                    result: [
                        {
                            metric: { instance: 'srv1' },
                            values: [[1700000000, '42']],
                        },
                    ],
                },
            };

            const series = fromPromMatrix(response, {
                label: (m) => `Server ${m['instance']}`,
                key: (m) => `key_${m['instance']}`,
            });
            expect(series.length).toBe(1);
            expect(series[0]?.label).toBe('Server srv1');
            expect(series[0]?.key).toBe('key_srv1');
        });

        it('handles empty or error response gracefully', () => {
            expect(fromPromMatrix(null)).toEqual([]);
            expect(fromPromMatrix({})).toEqual([]);
            expect(fromPromMatrix({ status: 'error', error: 'query timeout' })).toEqual([]);
            expect(fromPromMatrix({ status: 'success', data: { resultType: 'matrix', result: [] } })).toEqual([]);
        });
    });

    describe('fromPromVector', () => {
        it('converts instant vector response', () => {
            const response = {
                status: 'success',
                data: {
                    resultType: 'vector',
                    result: [
                        {
                            metric: { instance: 'srv1', device: 'sda' },
                            value: [1700000000, '85.2'],
                        },
                        {
                            metric: { instance: 'srv2', device: 'sda' },
                            value: [1700000000, 'NaN'],
                        },
                    ],
                },
            };

            const result = fromPromVector(response);
            expect(result.length).toBe(2);
            expect(result[0]).toEqual({
                metric: { instance: 'srv1', device: 'sda' },
                time: 1700000000000,
                value: 85.2,
            });
            expect(result[1]).toEqual({
                metric: { instance: 'srv2', device: 'sda' },
                time: 1700000000000,
                value: null,
            });
        });

        it('handles invalid or empty response safely', () => {
            expect(fromPromVector(null)).toEqual([]);
            expect(fromPromVector({ status: 'error' })).toEqual([]);
            expect(fromPromVector({ status: 'success', data: { resultType: 'vector', result: [] } })).toEqual([]);
        });
    });
});
