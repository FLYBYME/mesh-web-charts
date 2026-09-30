/**
 * Framework-free heatmap chart implementation (time on X, buckets on Y, colour by count).
 */

import { scaleBand, scaleLinear } from 'd3-scale';
import { interpolateRgb } from 'd3-interpolate';
import { axisBottom, axisLeft } from 'd3-axis';
import { select } from 'd3-selection';
import type { ChartInstance, HeatmapCell, HeatmapOptions } from '../types.js';
import { formatCount } from '../units.js';
import { buildAccessibleTable, createSvg, Disposables } from './common.js';

export function heatmap(host: HTMLElement, options: HeatmapOptions = {}): ChartInstance<readonly HeatmapCell[]> {
    const disposables = new Disposables();
    host.innerHTML = '';
    host.classList.add('chart-host');

    const wrapper = document.createElement('div');
    wrapper.className = 'chart-wrapper';
    wrapper.tabIndex = 0;
    host.appendChild(wrapper);

    const tooltip = document.createElement('div');
    tooltip.className = 'chart-tooltip';
    tooltip.hidden = true;
    wrapper.appendChild(tooltip);

    let tableEl: HTMLTableElement | null = null;
    let currentData: readonly HeatmapCell[] = [];
    const chartHeight = options.height ?? 260;
    let svg: SVGSVGElement | null = null;

    function render(data: readonly HeatmapCell[]): void {
        currentData = data;
        const hostWidth = host.clientWidth > 0 ? host.clientWidth : 400;

        // Unique times sorted ascending
        const times = [...new Set(data.map((d) => d.time))].sort((a, b) => a - b);

        // Unique buckets
        const buckets = options.buckets !== undefined && options.buckets.length > 0
            ? [...options.buckets]
            : [...new Set(data.map((d) => d.bucket))];

        const leftMargin = 60;
        const bottomMargin = 40;
        const topMargin = 20;
        const rightMargin = 20;

        const innerWidth = Math.max(50, hostWidth - leftMargin - rightMargin);
        const innerHeight = Math.max(50, chartHeight - topMargin - bottomMargin);

        if (svg === null) {
            svg = createSvg(hostWidth, chartHeight);
            wrapper.appendChild(svg);
        } else {
            svg.setAttribute('width', String(hostWidth));
            svg.setAttribute('height', String(chartHeight));
            svg.setAttribute('viewBox', `0 0 ${hostWidth} ${chartHeight}`);
        }

        const sel = select(svg);
        sel.selectAll('*').remove();

        const g = sel.append('g').attr('transform', `translate(${leftMargin},${topMargin})`);

        if (times.length === 0 || buckets.length === 0) {
            svg.setAttribute('aria-label', `${options.title ?? 'Heatmap'}: no data`);
            tooltip.hidden = true;
            return;
        }

        // Color scale
        const maxCount = Math.max(1, ...data.map((d) => d.count));
        const colorInterpolator = interpolateRgb('#9ec5fe', '#0a58ca');
        const colorScale = (count: number): string => {
            const t = Math.min(1, Math.max(0, count / maxCount));
            return colorInterpolator(t);
        };

        // Scales
        const timeLabels = times.map((t) => String(t));
        const xScale = scaleBand<string>().domain(timeLabels).range([0, innerWidth]).padding(0.05);
        const yScale = scaleBand<string>().domain(buckets).range([innerHeight, 0]).padding(0.05);

        // Draw cells
        for (const cell of data) {
            const timeKey = String(cell.time);
            const x = xScale(timeKey);
            const y = yScale(cell.bucket);
            if (x === undefined || y === undefined) continue;

            const rect = g.append('rect')
                .attr('class', 'chart-cell')
                .attr('x', x)
                .attr('y', y)
                .attr('width', xScale.bandwidth())
                .attr('height', yScale.bandwidth())
                .attr('fill', cell.count > 0 ? colorScale(cell.count) : 'color-mix(in srgb, CanvasText 4%, Canvas)')
                .attr('stroke', 'var(--chart-edge)')
                .attr('stroke-width', '0.5')
                .style('cursor', 'pointer');

            attachCellEvents(rect.node()!, cell);
        }

        // X Axis
        const tickStep = Math.max(1, Math.floor(times.length / (innerWidth / 80)));
        const tickValues = timeLabels.filter((_, idx) => idx % tickStep === 0);

        g.append('g')
            .attr('class', 'chart-axis')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(
                axisBottom(xScale)
                    .tickValues(tickValues)
                    .tickFormat((t) => new Date(Number(t)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })),
            );

        // Y Axis
        g.append('g')
            .attr('class', 'chart-axis')
            .call(axisLeft(yScale));

        // Accessibility
        const title = options.title ?? 'Latency Heatmap';
        svg.setAttribute('aria-label', `${title}: ${times.length} time points across ${buckets.length} latency buckets, peak count ${maxCount}`);

        if (options.table !== false) {
            if (tableEl !== null) tableEl.remove();
            const headers = ['Time', ...buckets];
            const rows = times.map((t) => {
                const timeStr = new Date(t).toLocaleTimeString([], { hour12: false });
                const rowVals: (string | number)[] = [timeStr];
                for (const b of buckets) {
                    const found = data.find((d) => d.time === t && d.bucket === b);
                    rowVals.push(found !== undefined ? formatCount(found.count) : '0');
                }
                return rowVals;
            });
            tableEl = buildAccessibleTable(`${title} data`, headers, rows);
            host.appendChild(tableEl);
        }
    }

    function attachCellEvents(rect: SVGRectElement, cell: HeatmapCell): void {
        rect.addEventListener('pointerenter', (e: PointerEvent) => {
            showTooltip(e, cell);
        });
        rect.addEventListener('pointerleave', () => {
            tooltip.hidden = true;
        });
    }

    function showTooltip(e: PointerEvent, cell: HeatmapCell): void {
        const wrapperBox = wrapper.getBoundingClientRect();
        const x = e.clientX - wrapperBox.left;
        const y = e.clientY - wrapperBox.top;

        const timeStr = new Date(cell.time).toLocaleTimeString([], { hour12: false });
        tooltip.innerHTML = `
            <div class="chart-tooltip-time">${timeStr}</div>
            <div class="chart-tooltip-row">
                <span class="chart-tooltip-label">Bucket</span>
                <span class="chart-tooltip-value">${cell.bucket}</span>
            </div>
            <div class="chart-tooltip-row">
                <span class="chart-tooltip-label">Count</span>
                <span class="chart-tooltip-value">${formatCount(cell.count)}</span>
            </div>
        `;
        tooltip.hidden = false;

        const tw = tooltip.offsetWidth;
        const th = tooltip.offsetHeight;
        const w = wrapper.clientWidth;

        let left = x + 10;
        let top = y - th - 10;

        if (left + tw > w - 10) left = x - tw - 10;
        if (top < 10) top = y + 15;
        if (left < 10) left = 10;

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }

    const resizeObserver = new ResizeObserver(() => {
        render(currentData);
    });
    resizeObserver.observe(host);
    disposables.add(() => resizeObserver.disconnect());

    return {
        update(data: readonly HeatmapCell[]): void {
            render(data);
        },
        resize(): void {
            render(currentData);
        },
        dispose(): void {
            disposables.dispose();
            host.innerHTML = '';
        },
    };
}
