/**
 * Framework-free sparkline chart implementation.
 */
import { line as d3Line } from 'd3-shape';
import { scaleLinear } from 'd3-scale';
import { formatValue } from '../units.js';
import { buildAccessibleTable, createSvg, Disposables, getSeriesColour } from './common.js';
export function sparkline(host, options = {}) {
    const disposables = new Disposables();
    host.innerHTML = '';
    host.classList.add('chart-host', 'chart-sparkline-host');
    const width = options.width ?? 100;
    const height = options.height ?? 24;
    const strokeWidth = options.strokeWidth ?? 1.5;
    const colour = getSeriesColour(0, options.colour);
    const unit = options.unit;
    const svg = createSvg(width, height);
    svg.setAttribute('style', `width: ${width}px; height: ${height}px;`);
    host.appendChild(svg);
    // Group for path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', colour);
    path.setAttribute('stroke-width', String(strokeWidth));
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
    // Circle for last value
    const lastCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    lastCircle.setAttribute('r', '2.5');
    lastCircle.setAttribute('fill', colour);
    lastCircle.style.display = 'none';
    svg.appendChild(lastCircle);
    // Min and max circles
    const minCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    minCircle.setAttribute('r', '2');
    minCircle.setAttribute('fill', 'var(--chart-bad)');
    minCircle.style.display = 'none';
    svg.appendChild(minCircle);
    const maxCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    maxCircle.setAttribute('r', '2');
    maxCircle.setAttribute('fill', 'var(--chart-good)');
    maxCircle.style.display = 'none';
    svg.appendChild(maxCircle);
    let tableEl = null;
    let currentData = [];
    const pad = 3;
    function render(data) {
        currentData = data;
        const validPoints = data.filter((p) => p[1] !== null && Number.isFinite(p[1]));
        if (validPoints.length === 0) {
            path.setAttribute('d', '');
            lastCircle.style.display = 'none';
            minCircle.style.display = 'none';
            maxCircle.style.display = 'none';
            svg.setAttribute('aria-label', `${options.label ?? 'Sparkline'}: no data`);
            return;
        }
        const times = validPoints.map((p) => p[0]);
        const values = validPoints.map((p) => p[1]);
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const minVal = Math.min(...values);
        const maxVal = Math.max(...values);
        const xScale = scaleLinear()
            .domain([minTime, maxTime === minTime ? minTime + 1 : maxTime])
            .range([pad, width - pad]);
        const yScale = scaleLinear()
            .domain([minVal, maxVal === minVal ? minVal + 1 : maxVal])
            .range([height - pad, pad]);
        const lineGenerator = d3Line()
            .defined((d) => d[1] !== null && Number.isFinite(d[1]))
            .x((d) => xScale(d[0]))
            .y((d) => yScale(d[1] ?? 0));
        const d = lineGenerator(data) ?? '';
        path.setAttribute('d', d);
        // Last point
        const lastPt = validPoints[validPoints.length - 1];
        if (lastPt !== undefined && (options.showLastValue !== false)) {
            lastCircle.setAttribute('cx', String(xScale(lastPt[0])));
            lastCircle.setAttribute('cy', String(yScale(lastPt[1])));
            lastCircle.style.display = '';
        }
        else {
            lastCircle.style.display = 'none';
        }
        // Min/max indicators
        if (options.showMinMax === true && validPoints.length > 2) {
            let minPt = validPoints[0];
            let maxPt = validPoints[0];
            for (const pt of validPoints) {
                if (minPt !== undefined && pt[1] < minPt[1])
                    minPt = pt;
                if (maxPt !== undefined && pt[1] > maxPt[1])
                    maxPt = pt;
            }
            if (minPt !== undefined) {
                minCircle.setAttribute('cx', String(xScale(minPt[0])));
                minCircle.setAttribute('cy', String(yScale(minPt[1])));
                minCircle.style.display = '';
            }
            if (maxPt !== undefined) {
                maxCircle.setAttribute('cx', String(xScale(maxPt[0])));
                maxCircle.setAttribute('cy', String(yScale(maxPt[1])));
                maxCircle.style.display = '';
            }
        }
        else {
            minCircle.style.display = 'none';
            maxCircle.style.display = 'none';
        }
        // Accessibility
        const lastStr = lastPt !== undefined ? formatValue(lastPt[1], unit) : '—';
        const minStr = formatValue(minVal, unit);
        const maxStr = formatValue(maxVal, unit);
        const label = options.label ?? 'Trend';
        svg.setAttribute('aria-label', `${label}: current ${lastStr}, min ${minStr}, max ${maxStr}`);
        if (options.table === true) {
            if (tableEl !== null)
                tableEl.remove();
            const rows = validPoints.map((p) => [new Date(p[0]).toLocaleTimeString(), formatValue(p[1], unit)]);
            tableEl = buildAccessibleTable(`${label} data`, ['Time', 'Value'], rows);
            host.appendChild(tableEl);
        }
    }
    return {
        update(data) {
            render(data);
        },
        resize() {
            render(currentData);
        },
        dispose() {
            disposables.dispose();
            host.innerHTML = '';
        },
    };
}
//# sourceMappingURL=sparkline.js.map