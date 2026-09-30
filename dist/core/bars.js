/**
 * Framework-free grouped and stacked bar chart (vertical & horizontal).
 */
import { scaleBand, scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { select } from 'd3-selection';
import { formatValue } from '../units.js';
import { buildAccessibleTable, createSvg, DASH_PATTERNS, Disposables, getSeriesColour, } from './common.js';
export function bars(host, options = {}) {
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
    legendContainer.setAttribute('role', 'toolbar');
    legendContainer.setAttribute('aria-label', 'Toggle series visibility');
    host.appendChild(legendContainer);
    let tableEl = null;
    let currentData = [];
    const hiddenSeries = new Set();
    const orientation = options.orientation ?? 'vertical';
    const isHorizontal = orientation === 'horizontal';
    const mode = options.mode ?? 'grouped';
    const chartHeight = options.height ?? (isHorizontal ? 300 : 260);
    let svg = null;
    function render(data) {
        currentData = data;
        const hostWidth = host.clientWidth > 0 ? host.clientWidth : 400;
        // Extract unique categories and series
        const categories = [...new Set(data.map((d) => d.category))];
        const allSeries = [...new Set(data.map((d) => d.series))];
        const visibleSeries = allSeries.filter((s) => !hiddenSeries.has(s));
        // Margins: more left margin for horizontal charts with category names
        const maxCatLen = Math.max(0, ...categories.map((c) => c.length));
        const leftMargin = isHorizontal ? Math.min(140, Math.max(60, maxCatLen * 7 + 10)) : 45;
        const bottomMargin = isHorizontal ? 30 : (hostWidth < 400 ? 55 : 35);
        const topMargin = 20;
        const rightMargin = 20;
        const innerWidth = Math.max(50, hostWidth - leftMargin - rightMargin);
        const innerHeight = Math.max(50, chartHeight - topMargin - bottomMargin);
        if (svg === null) {
            svg = createSvg(hostWidth, chartHeight);
            wrapper.appendChild(svg);
        }
        else {
            svg.setAttribute('width', String(hostWidth));
            svg.setAttribute('height', String(chartHeight));
            svg.setAttribute('viewBox', `0 0 ${hostWidth} ${chartHeight}`);
        }
        const sel = select(svg);
        sel.selectAll('*').remove();
        const g = sel.append('g').attr('transform', `translate(${leftMargin},${topMargin})`);
        if (categories.length === 0 || visibleSeries.length === 0) {
            svg.setAttribute('aria-label', `${options.title ?? 'Bar chart'}: no data`);
            tooltip.hidden = true;
            renderLegend(allSeries);
            return;
        }
        // Color mapping for series
        const seriesColours = new Map();
        allSeries.forEach((s, idx) => {
            const datum = data.find((d) => d.series === s);
            seriesColours.set(s, getSeriesColour(idx, datum?.colour));
        });
        // Scales
        if (isHorizontal) {
            // Horizontal: Y is category, X is value
            const yScale = scaleBand().domain(categories).range([0, innerHeight]).padding(0.2);
            let xMax = 0;
            if (mode === 'stacked') {
                for (const cat of categories) {
                    const sum = data
                        .filter((d) => d.category === cat && visibleSeries.includes(d.series))
                        .reduce((acc, d) => acc + Math.max(0, d.value), 0);
                    if (sum > xMax)
                        xMax = sum;
                }
            }
            else {
                for (const d of data) {
                    if (visibleSeries.includes(d.series) && d.value > xMax)
                        xMax = d.value;
                }
            }
            if (xMax <= 0)
                xMax = 1;
            const xScale = scaleLinear().domain([0, xMax * 1.05]).nice().range([0, innerWidth]);
            // Draw grid lines
            g.append('g')
                .attr('class', 'chart-grid')
                .call(axisBottom(xScale)
                .tickSize(innerHeight)
                .tickFormat(() => ''));
            // Draw bars
            if (mode === 'grouped') {
                const subScale = scaleBand()
                    .domain(visibleSeries)
                    .range([0, yScale.bandwidth()])
                    .padding(0.1);
                for (const cat of categories) {
                    const catY = yScale(cat) ?? 0;
                    for (const s of visibleSeries) {
                        const d = data.find((item) => item.category === cat && item.series === s);
                        if (d === undefined)
                            continue;
                        const barY = catY + (subScale(s) ?? 0);
                        const barW = Math.max(0, xScale(d.value));
                        const colour = seriesColours.get(s) ?? 'var(--chart-series-1)';
                        const rect = g.append('rect')
                            .attr('class', 'chart-bar')
                            .attr('x', 0)
                            .attr('y', barY)
                            .attr('width', barW)
                            .attr('height', subScale.bandwidth())
                            .attr('fill', colour)
                            .attr('rx', 2)
                            .style('cursor', 'pointer');
                        attachBarEvents(rect.node(), d);
                    }
                }
            }
            else {
                // Stacked horizontal
                for (const cat of categories) {
                    const catY = yScale(cat) ?? 0;
                    let currentX = 0;
                    for (const s of visibleSeries) {
                        const d = data.find((item) => item.category === cat && item.series === s);
                        if (d === undefined || d.value <= 0)
                            continue;
                        const barW = xScale(d.value);
                        const colour = seriesColours.get(s) ?? 'var(--chart-series-1)';
                        const rect = g.append('rect')
                            .attr('class', 'chart-bar')
                            .attr('x', currentX)
                            .attr('y', catY)
                            .attr('width', barW)
                            .attr('height', yScale.bandwidth())
                            .attr('fill', colour)
                            .style('cursor', 'pointer');
                        attachBarEvents(rect.node(), d);
                        currentX += barW;
                    }
                }
            }
            // Axes
            g.append('g')
                .attr('class', 'chart-axis')
                .attr('transform', `translate(0,${innerHeight})`)
                .call(axisBottom(xScale).ticks(Math.max(2, Math.floor(innerWidth / 70))).tickFormat((v) => formatValue(Number(v), options.unit)));
            g.append('g')
                .attr('class', 'chart-axis')
                .call(axisLeft(yScale));
        }
        else {
            // Vertical: X is category, Y is value
            const xScale = scaleBand().domain(categories).range([0, innerWidth]).padding(0.2);
            let yMax = 0;
            if (mode === 'stacked') {
                for (const cat of categories) {
                    const sum = data
                        .filter((d) => d.category === cat && visibleSeries.includes(d.series))
                        .reduce((acc, d) => acc + Math.max(0, d.value), 0);
                    if (sum > yMax)
                        yMax = sum;
                }
            }
            else {
                for (const d of data) {
                    if (visibleSeries.includes(d.series) && d.value > yMax)
                        yMax = d.value;
                }
            }
            if (yMax <= 0)
                yMax = 1;
            const yScale = scaleLinear().domain([0, yMax * 1.05]).nice().range([innerHeight, 0]);
            // Draw grid lines
            g.append('g')
                .attr('class', 'chart-grid')
                .call(axisLeft(yScale)
                .tickSize(-innerWidth)
                .tickFormat(() => ''));
            // Draw bars
            if (mode === 'grouped') {
                const subScale = scaleBand()
                    .domain(visibleSeries)
                    .range([0, xScale.bandwidth()])
                    .padding(0.1);
                for (const cat of categories) {
                    const catX = xScale(cat) ?? 0;
                    for (const s of visibleSeries) {
                        const d = data.find((item) => item.category === cat && item.series === s);
                        if (d === undefined)
                            continue;
                        const barX = catX + (subScale(s) ?? 0);
                        const barY = yScale(d.value);
                        const barH = innerHeight - barY;
                        const colour = seriesColours.get(s) ?? 'var(--chart-series-1)';
                        const rect = g.append('rect')
                            .attr('class', 'chart-bar')
                            .attr('x', barX)
                            .attr('y', barY)
                            .attr('width', subScale.bandwidth())
                            .attr('height', barH)
                            .attr('fill', colour)
                            .attr('rx', 2)
                            .style('cursor', 'pointer');
                        attachBarEvents(rect.node(), d);
                    }
                }
            }
            else {
                // Stacked vertical
                for (const cat of categories) {
                    const catX = xScale(cat) ?? 0;
                    let currentY = innerHeight;
                    for (const s of visibleSeries) {
                        const d = data.find((item) => item.category === cat && item.series === s);
                        if (d === undefined || d.value <= 0)
                            continue;
                        const barH = innerHeight - yScale(d.value);
                        currentY -= barH;
                        const colour = seriesColours.get(s) ?? 'var(--chart-series-1)';
                        const rect = g.append('rect')
                            .attr('class', 'chart-bar')
                            .attr('x', catX)
                            .attr('y', currentY)
                            .attr('width', xScale.bandwidth())
                            .attr('height', barH)
                            .attr('fill', colour)
                            .style('cursor', 'pointer');
                        attachBarEvents(rect.node(), d);
                    }
                }
            }
            // Axes
            const xAxisG = g.append('g')
                .attr('class', 'chart-axis')
                .attr('transform', `translate(0,${innerHeight})`)
                .call(axisBottom(xScale));
            if (hostWidth < 450) {
                xAxisG.selectAll('text')
                    .style('text-anchor', 'end')
                    .attr('dx', '-.8em')
                    .attr('dy', '.15em')
                    .attr('transform', 'rotate(-35)');
            }
            g.append('g')
                .attr('class', 'chart-axis')
                .call(axisLeft(yScale).ticks(Math.max(2, Math.floor(innerHeight / 40))).tickFormat((v) => formatValue(Number(v), options.unit)));
        }
        renderLegend(allSeries);
        // Accessibility
        const title = options.title ?? 'Bar chart';
        svg.setAttribute('aria-label', `${title}: ${categories.length} categories, ${visibleSeries.length} series`);
        if (options.table !== false) {
            if (tableEl !== null)
                tableEl.remove();
            const headers = ['Category', ...allSeries];
            const rows = categories.map((cat) => {
                const rowVals = [cat];
                for (const s of allSeries) {
                    const found = data.find((d) => d.category === cat && d.series === s);
                    rowVals.push(found !== undefined ? formatValue(found.value, options.unit) : '—');
                }
                return rowVals;
            });
            tableEl = buildAccessibleTable(`${title} data`, headers, rows);
            host.appendChild(tableEl);
        }
    }
    function attachBarEvents(rect, datum) {
        rect.addEventListener('pointerenter', (e) => {
            showTooltip(e, datum);
        });
        rect.addEventListener('pointerleave', () => {
            tooltip.hidden = true;
        });
        rect.addEventListener('focus', (e) => {
            const bbox = rect.getBoundingClientRect();
            const wrapperBox = wrapper.getBoundingClientRect();
            showTooltipCoords(bbox.left + bbox.width / 2 - wrapperBox.left, bbox.top - wrapperBox.top, datum);
        });
        rect.addEventListener('blur', () => {
            tooltip.hidden = true;
        });
    }
    function showTooltip(e, d) {
        const wrapperBox = wrapper.getBoundingClientRect();
        const x = e.clientX - wrapperBox.left;
        const y = e.clientY - wrapperBox.top;
        showTooltipCoords(x, y, d);
    }
    function showTooltipCoords(x, y, d) {
        const valStr = formatValue(d.value, options.unit);
        tooltip.innerHTML = `
            <div class="chart-tooltip-time">${d.category}</div>
            <div class="chart-tooltip-row">
                <span class="chart-tooltip-label">${d.series}</span>
                <span class="chart-tooltip-value">${valStr}</span>
            </div>
        `;
        tooltip.hidden = false;
        const tw = tooltip.offsetWidth;
        const th = tooltip.offsetHeight;
        const w = wrapper.clientWidth;
        let left = x + 10;
        let top = y - th - 10;
        if (left + tw > w - 10)
            left = x - tw - 10;
        if (top < 10)
            top = y + 15;
        if (left < 10)
            left = 10;
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }
    const legendButtons = new Map();
    function renderLegend(seriesList) {
        if (seriesList.length <= 1) {
            legendContainer.style.display = 'none';
            legendButtons.clear();
            legendContainer.innerHTML = '';
            return;
        }
        legendContainer.style.display = 'flex';
        const currentKeys = seriesList.join(',');
        const existingKeys = [...legendButtons.keys()].join(',');
        if (currentKeys === existingKeys) {
            for (const s of seriesList) {
                const btn = legendButtons.get(s);
                if (btn !== undefined) {
                    btn.setAttribute('aria-pressed', String(!hiddenSeries.has(s)));
                }
            }
            return;
        }
        legendContainer.innerHTML = '';
        legendButtons.clear();
        seriesList.forEach((s, idx) => {
            const btn = document.createElement('button');
            btn.className = 'chart-legend-item';
            btn.setAttribute('type', 'button');
            const isVisible = !hiddenSeries.has(s);
            btn.setAttribute('aria-pressed', String(isVisible));
            const swatch = document.createElement('span');
            swatch.className = 'chart-legend-swatch';
            const colour = getSeriesColour(idx);
            swatch.style.background = colour;
            const dash = DASH_PATTERNS[idx % DASH_PATTERNS.length];
            if (dash && seriesList.length > 4) {
                swatch.style.borderBottom = `2px dashed ${colour}`;
            }
            const label = document.createElement('span');
            label.textContent = s;
            btn.appendChild(swatch);
            btn.appendChild(label);
            btn.addEventListener('click', () => {
                if (hiddenSeries.has(s)) {
                    hiddenSeries.delete(s);
                }
                else {
                    hiddenSeries.add(s);
                }
                render(currentData);
            });
            legendButtons.set(s, btn);
            legendContainer.appendChild(btn);
        });
    }
    const resizeObserver = new ResizeObserver(() => {
        render(currentData);
    });
    resizeObserver.observe(host);
    disposables.add(() => resizeObserver.disconnect());
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
//# sourceMappingURL=bars.js.map