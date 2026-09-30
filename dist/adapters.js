/**
 * Adapters for VictoriaMetrics / Prometheus API responses.
 */
function parsePromValue(valStr) {
    if (valStr === 'NaN' || valStr === '+Inf' || valStr === '-Inf' || valStr === 'Inf') {
        return null;
    }
    const num = Number(valStr);
    return Number.isFinite(num) ? num : null;
}
export function defaultSeriesLabel(metric) {
    const keys = Object.keys(metric).sort();
    if (keys.length === 0)
        return 'value';
    // If __name__ exists along with other labels, e.g. cpu_usage{cpu="0"}
    const name = metric['__name__'];
    const otherKeys = keys.filter((k) => k !== '__name__');
    if (name !== undefined && otherKeys.length > 0) {
        const inner = otherKeys.map((k) => `${k}="${metric[k]}"`).join(', ');
        return `${name}{${inner}}`;
    }
    return keys.map((k) => `${k}="${metric[k]}"`).join(', ');
}
export function fromPromMatrix(response, options = {}) {
    if (typeof response !== 'object' || response === null) {
        return [];
    }
    const res = response;
    if (res.status !== 'success' || !res.data || res.data.resultType !== 'matrix' || !Array.isArray(res.data.result)) {
        return [];
    }
    const labelFn = options.label ?? defaultSeriesLabel;
    const keyFn = options.key;
    return res.data.result.map((item, idx) => {
        const metric = item.metric ?? {};
        const label = labelFn(metric);
        const key = keyFn !== undefined ? keyFn(metric, idx) : (metric['__name__'] ? `${metric['__name__']}_${idx}` : `series_${idx}`);
        const rawValues = item.values;
        const valuePairs = Array.isArray(rawValues)
            ? rawValues.filter((pair) => Array.isArray(pair) &&
                pair.length >= 2 &&
                typeof pair[0] === 'number' &&
                typeof pair[1] === 'string')
            : [];
        const points = valuePairs.map(([sec, valStr]) => {
            const time = Math.round(sec * 1000);
            const value = parsePromValue(valStr);
            return [time, value];
        });
        return {
            key,
            label,
            points,
        };
    });
}
export function fromPromVector(response) {
    if (typeof response !== 'object' || response === null) {
        return [];
    }
    const res = response;
    if (res.status !== 'success' || !res.data || res.data.resultType !== 'vector' || !Array.isArray(res.data.result)) {
        return [];
    }
    return res.data.result.map((item) => {
        const metric = item.metric ?? {};
        const rawValue = item.value;
        const validPair = Array.isArray(rawValue) &&
            rawValue.length >= 2 &&
            typeof rawValue[0] === 'number' &&
            typeof rawValue[1] === 'string';
        const sec = validPair ? rawValue[0] : 0;
        const valStr = validPair ? rawValue[1] : '0';
        const time = Math.round(sec * 1000);
        const value = parsePromValue(valStr);
        return {
            metric,
            time,
            value,
        };
    });
}
//# sourceMappingURL=adapters.js.map