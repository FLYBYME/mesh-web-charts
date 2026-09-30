/**
 * Framework-free state timeline chart implementation.
 * Displays horizontal bands of discrete states over time for multiple entities.
 */

import { scaleBand, scaleTime } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { select } from 'd3-selection';
import type { ChartInstance, StateSpan, StateTimelineOptions, StateTimelineRow } from '../types.js';
import { formatSeconds } from '../units.js';
import { buildAccessibleTable, createSvg, Disposables, getSeriesColour } from './common.js';

export function stateTimeline(
    host: HTMLElement,
    options: StateTimelineOptions = {},
): ChartInstance<readonly StateTimelineRow[]> {
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

    const legendContainer = document.createElement('div');
    legendContainer.className = 'chart-legend';
    host.appendChild(legendContainer);

    let tableEl: HTMLTableElement | null = null;
    let currentData: readonly StateTimelineRow[] = [];
    let svg: SVGSVGElement | null = null;

    function render(data: readonly StateTimelineRow[]): void {
        currentData = data;
        const hostWidth = host.clientWidth > 0 ? host.clientWidth : 400;

        const rowCount = Math.max(1, data.length);
        const rowHeight = 36;
        const topMargin = 20;
        const bottomMargin = 40;
        const leftMargin = Math.min(140, Math.max(60, Math.max(0, ...data.map((r) => r.label.length)) * 7 + 10));
        const rightMargin = 20;

        const calculatedHeight = topMargin + bottomMargin + rowCount * rowHeight;
        const chartHeight = options.height ?? calculatedHeight;

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

        if (data.length === 0) {
            svg.setAttribute('aria-label', `${options.title ?? 'State Timeline'}: no data`);
            tooltip.hidden = true;
            legendContainer.innerHTML = '';
            return;
        }

        // Collect time extent
        let minTime = Number.POSITIVE_INFINITY;
        let maxTime = Number.NEGATIVE_INFINITY;
        const statesSet = new Set<string>();

        for (const row of data) {
            for (const span of row.spans) {
                if (span.start < minTime) minTime = span.start;
                if (span.end > maxTime) maxTime = span.end;
                statesSet.add(span.state);
            }
        }

        if (!Number.isFinite(minTime) || !Number.isFinite(maxTime) || minTime >= maxTime) {
            const now = Date.now();
            minTime = now - 3600_000;
            maxTime = now;
        }

        const allStates = [...statesSet];

        // State colors mapping
        const stateColours = new Map<string, string>();
        allStates.forEach((st, idx) => {
            if (options.stateColours && options.stateColours[st]) {
                stateColours.set(st, options.stateColours[st]!);
            } else {
                stateColours.set(st, getSeriesColour(idx));
            }
        });

        // Scales
        const xScale = scaleTime()
            .domain([new Date(minTime), new Date(maxTime)])
            .range([0, innerWidth]);

        const rowLabels = data.map((r) => r.label);
        const yScale = scaleBand<string>()
            .domain(rowLabels)
            .range([0, innerHeight])
            .padding(0.2);

        // Draw background rows
        for (const row of data) {
            const y = yScale(row.label) ?? 0;
            g.append('rect')
                .attr('class', 'chart-timeline-track')
                .attr('x', 0)
                .attr('y', y)
                .attr('width', innerWidth)
                .attr('height', yScale.bandwidth())
                .attr('fill', 'color-mix(in srgb, CanvasText 4%, Canvas)')
                .attr('rx', 4);

            // Draw spans for this row
            for (const span of row.spans) {
                const spanStart = Math.max(minTime, span.start);
                const spanEnd = Math.min(maxTime, span.end);
                if (spanEnd <= spanStart) continue;

                const x1 = xScale(new Date(spanStart));
                const x2 = xScale(new Date(spanEnd));
                const w = Math.max(2, x2 - x1);
                const colour = span.colour ?? stateColours.get(span.state) ?? 'var(--chart-series-1)';

                const spanRect = g.append('rect')
                    .attr('class', 'chart-timeline-span')
                    .attr('x', x1)
                    .attr('y', y)
                    .attr('width', w)
                    .attr('height', yScale.bandwidth())
                    .attr('fill', colour)
                    .attr('rx', 3)
                    .style('cursor', 'pointer');

                attachSpanEvents(spanRect.node()!, row.label, span);
            }
        }

        // X Axis
        g.append('g')
            .attr('class', 'chart-axis')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(
                axisBottom(xScale)
                    .ticks(Math.max(2, Math.floor(innerWidth / 90)))
                    .tickFormat((d) => (d as Date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })),
            );

        // Y Axis
        g.append('g')
            .attr('class', 'chart-axis')
            .call(axisLeft(yScale));

        renderLegend(allStates, stateColours);

        // Accessibility
        const title = options.title ?? 'State Timeline';
        svg.setAttribute('aria-label', `${title}: ${data.length} items over ${formatSeconds((maxTime - minTime) / 1000)}`);

        if (options.table !== false) {
            if (tableEl !== null) tableEl.remove();
            const headers = ['Item', 'Total Spans', 'States'];
            const rows = data.map((r) => {
                const uniqueStates = [...new Set(r.spans.map((s) => s.state))].join(', ');
                return [r.label, r.spans.length, uniqueStates || 'none'];
            });
            tableEl = buildAccessibleTable(`${title} summary`, headers, rows);
            host.appendChild(tableEl);
        }
    }

    function attachSpanEvents(rect: SVGRectElement, rowLabel: string, span: StateSpan): void {
        rect.addEventListener('pointerenter', (e: PointerEvent) => {
            showTooltip(e, rowLabel, span);
        });
        rect.addEventListener('pointerleave', () => {
            tooltip.hidden = true;
        });
    }

    function showTooltip(e: PointerEvent, rowLabel: string, span: StateSpan): void {
        const wrapperBox = wrapper.getBoundingClientRect();
        const x = e.clientX - wrapperBox.left;
        const y = e.clientY - wrapperBox.top;

        const startStr = new Date(span.start).toLocaleTimeString([], { hour12: false });
        const endStr = new Date(span.end).toLocaleTimeString([], { hour12: false });
        const durStr = formatSeconds((span.end - span.start) / 1000);

        tooltip.innerHTML = `
            <div class="chart-tooltip-time">${rowLabel}</div>
            <div class="chart-tooltip-row">
                <span class="chart-tooltip-label">State</span>
                <span class="chart-tooltip-value">${span.state}</span>
            </div>
            <div class="chart-tooltip-row">
                <span class="chart-tooltip-label">Range</span>
                <span class="chart-tooltip-value">${startStr} – ${endStr}</span>
            </div>
            <div class="chart-tooltip-row">
                <span class="chart-tooltip-label">Duration</span>
                <span class="chart-tooltip-value">${durStr}</span>
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

    function renderLegend(states: readonly string[], colours: Map<string, string>): void {
        legendContainer.innerHTML = '';
        states.forEach((st) => {
            const item = document.createElement('div');
            item.className = 'chart-legend-item';
            item.style.cursor = 'default';

            const swatch = document.createElement('span');
            swatch.className = 'chart-legend-swatch';
            swatch.style.background = colours.get(st) ?? 'var(--chart-series-1)';

            const label = document.createElement('span');
            label.textContent = st;

            item.appendChild(swatch);
            item.appendChild(label);
            legendContainer.appendChild(item);
        });
    }

    const resizeObserver = new ResizeObserver(() => {
        render(currentData);
    });
    resizeObserver.observe(host);
    disposables.add(() => resizeObserver.disconnect());

    return {
        update(data: readonly StateTimelineRow[]): void {
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
