/**
 * Framework-free timeSeries chart implementation with D3.
 * Supports line, area, stacked area, multi-axis, thresholds, bands,
 * gaps, live append mode, full keyboard/touch/mouse interactions,
 * and high performance keyed updates.
 */
import { scaleLinear, scaleTime } from 'd3-scale';
import { axisBottom, axisLeft, axisRight } from 'd3-axis';
import { area as d3Area, line as d3Line } from 'd3-shape';
import { select } from 'd3-selection';
import { formatValue } from '../units.js';
import { lttb } from '../lttb.js';
import { buildAccessibleTable, createSvg, Disposables, getSeriesColour, getSeriesDash, prefersReducedMotion, } from './common.js';
export function timeSeries(host, options = {}) {
    const disposables = new Disposables();
    host.innerHTML = '';
    host.classList.add('chart-host');
    // Live mode pill indicator
    const livePill = document.createElement('button');
    livePill.className = 'chart-live-pill';
    livePill.setAttribute('type', 'button');
    livePill.innerHTML = '<span class="chart-live-indicator"></span><span class="chart-live-text">Live</span>';
    livePill.style.display = 'none';
    host.appendChild(livePill);
    // Interactive wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'chart-wrapper';
    wrapper.tabIndex = 0;
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', `${options.title ?? 'Time series chart'} plot area. Use arrow keys to navigate points, plus and minus to zoom, 0 to reset.`);
    host.appendChild(wrapper);
    // Floating or docked tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'chart-tooltip';
    tooltip.hidden = true;
    wrapper.appendChild(tooltip);
    // Legend
    const legendContainer = document.createElement('div');
    legendContainer.className = 'chart-legend';
    legendContainer.setAttribute('role', 'toolbar');
    legendContainer.setAttribute('aria-label', 'Toggle series visibility');
    host.appendChild(legendContainer);
    // SVG elements setup
    let svg = null;
    let clipRect = null;
    let bandsG = null;
    let gridG = null;
    let seriesG = null;
    let thresholdsG = null;
    let crosshairG = null;
    let crosshairLine = null;
    let axesG = null;
    let xAxisG = null;
    let yAxisLeftG = null;
    let yAxisRightG = null;
    let plotFocusRect = null;
    let tableEl = null;
    // Internal state
    let seriesData = [];
    const hiddenSeries = new Set();
    const pathCache = new Map();
    let customXDomain = null;
    let isLiveFollowing = options.window !== undefined;
    let keyboardIndex = -1; // for keyboard crosshair navigation
    const chartHeight = options.height ?? 300;
    const isStacked = options.type === 'stacked';
    const isArea = options.type === 'area' || isStacked;
    // Active touch pointers for pan/pinch
    const activePointers = new Map();
    let initialPinchDist = 0;
    let initialPinchDomain = null;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartDomain = null;
    let rafHandle = null;
    // Unique clip id to avoid collisions
    const clipId = `chart-clip-${Math.random().toString(36).slice(2, 9)}`;
    function initSvg(hostWidth) {
        svg = createSvg(hostWidth, chartHeight);
        wrapper.appendChild(svg);
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
        clipPath.setAttribute('id', clipId);
        clipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        clipPath.appendChild(clipRect);
        defs.appendChild(clipPath);
        svg.appendChild(defs);
        const plotContainer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        svg.appendChild(plotContainer);
        // Group with clip path applied for lines, areas, bands, grid
        const clippedG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        clippedG.setAttribute('clip-path', `url(#${clipId})`);
        plotContainer.appendChild(clippedG);
        plotFocusRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        plotFocusRect.setAttribute('class', 'chart-plot-focus');
        plotFocusRect.setAttribute('fill', 'transparent');
        clippedG.appendChild(plotFocusRect);
        bandsG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        bandsG.setAttribute('class', 'chart-bands');
        clippedG.appendChild(bandsG);
        gridG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        gridG.setAttribute('class', 'chart-grid');
        clippedG.appendChild(gridG);
        seriesG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        seriesG.setAttribute('class', 'chart-series-group');
        clippedG.appendChild(seriesG);
        thresholdsG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        thresholdsG.setAttribute('class', 'chart-thresholds');
        clippedG.appendChild(thresholdsG);
        crosshairG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        crosshairG.setAttribute('class', 'chart-crosshair');
        crosshairG.style.display = 'none';
        clippedG.appendChild(crosshairG);
        crosshairLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        crosshairG.appendChild(crosshairLine);
        // Axes (not clipped)
        axesG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        axesG.setAttribute('class', 'chart-axes');
        plotContainer.appendChild(axesG);
        xAxisG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        xAxisG.setAttribute('class', 'chart-axis chart-axis-x');
        axesG.appendChild(xAxisG);
        yAxisLeftG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        yAxisLeftG.setAttribute('class', 'chart-axis chart-axis-y-left');
        axesG.appendChild(yAxisLeftG);
        yAxisRightG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        yAxisRightG.setAttribute('class', 'chart-axis chart-axis-y-right');
        axesG.appendChild(yAxisRightG);
    }
    // Process gaps: insert null points when time delta > gapAfter
    function insertGaps(points, gapAfter) {
        if (gapAfter === undefined || gapAfter <= 0 || points.length <= 1) {
            return [...points];
        }
        const res = [];
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            if (p === undefined)
                continue;
            if (i > 0) {
                const prev = points[i - 1];
                if (prev !== undefined && prev[1] !== null && p[1] !== null && (p[0] - prev[0]) > gapAfter) {
                    res.push([prev[0] + 1, null]);
                }
            }
            res.push(p);
        }
        return res;
    }
    function render() {
        const hostWidth = host.clientWidth > 0 ? host.clientWidth : 400;
        if (svg === null) {
            initSvg(hostWidth);
        }
        else {
            svg.setAttribute('width', String(hostWidth));
            svg.setAttribute('height', String(chartHeight));
            svg.setAttribute('viewBox', `0 0 ${hostWidth} ${chartHeight}`);
        }
        const hasRightAxis = seriesData.some((s) => s.axis === 'right');
        const leftMargin = hostWidth < 360 ? 40 : 55;
        const rightMargin = hasRightAxis ? (hostWidth < 360 ? 40 : 55) : 20;
        const topMargin = 20;
        const bottomMargin = hostWidth < 360 ? 45 : 35;
        const innerWidth = Math.max(50, hostWidth - leftMargin - rightMargin);
        const innerHeight = Math.max(50, chartHeight - topMargin - bottomMargin);
        if (clipRect !== null) {
            clipRect.setAttribute('x', String(leftMargin));
            clipRect.setAttribute('y', String(topMargin));
            clipRect.setAttribute('width', String(innerWidth));
            clipRect.setAttribute('height', String(innerHeight));
        }
        if (plotFocusRect !== null) {
            plotFocusRect.setAttribute('x', String(leftMargin));
            plotFocusRect.setAttribute('y', String(topMargin));
            plotFocusRect.setAttribute('width', String(innerWidth));
            plotFocusRect.setAttribute('height', String(innerHeight));
        }
        // Filter visible series
        const visible = seriesData.filter((s) => !hiddenSeries.has(s.key));
        // Determine X Domain
        let minTime = Number.POSITIVE_INFINITY;
        let maxTime = Number.NEGATIVE_INFINITY;
        for (const s of seriesData) {
            for (const p of s.points) {
                if (p[0] < minTime)
                    minTime = p[0];
                if (p[0] > maxTime)
                    maxTime = p[0];
            }
        }
        if (!Number.isFinite(minTime) || !Number.isFinite(maxTime) || minTime >= maxTime) {
            const now = Date.now();
            minTime = now - 3600_000;
            maxTime = now;
        }
        let xDomainStart = minTime;
        let xDomainEnd = maxTime;
        if (options.window !== undefined && isLiveFollowing) {
            xDomainEnd = maxTime;
            xDomainStart = Math.max(minTime, maxTime - options.window);
        }
        else if (customXDomain !== null) {
            xDomainStart = customXDomain[0];
            xDomainEnd = customXDomain[1];
        }
        const xScale = scaleTime()
            .domain([new Date(xDomainStart), new Date(xDomainEnd)])
            .range([leftMargin, leftMargin + innerWidth]);
        // Y Domains (left and right)
        let leftMin = options.min ?? Number.POSITIVE_INFINITY;
        let leftMax = options.max ?? Number.NEGATIVE_INFINITY;
        let rightMin = options.rightMin ?? Number.POSITIVE_INFINITY;
        let rightMax = options.rightMax ?? Number.NEGATIVE_INFINITY;
        for (const s of visible) {
            const isRight = s.axis === 'right';
            for (const p of s.points) {
                if (p[1] !== null && Number.isFinite(p[1])) {
                    if (isRight) {
                        if (options.rightMin === undefined && p[1] < rightMin)
                            rightMin = p[1];
                        if (options.rightMax === undefined && p[1] > rightMax)
                            rightMax = p[1];
                    }
                    else {
                        if (options.min === undefined && p[1] < leftMin)
                            leftMin = p[1];
                        if (options.max === undefined && p[1] > leftMax)
                            leftMax = p[1];
                    }
                }
            }
        }
        // Thresholds influence Y range
        if (options.thresholds !== undefined) {
            for (const th of options.thresholds) {
                if (th.axis === 'right') {
                    if (options.rightMin === undefined && th.value < rightMin)
                        rightMin = th.value;
                    if (options.rightMax === undefined && th.value > rightMax)
                        rightMax = th.value;
                }
                else {
                    if (options.min === undefined && th.value < leftMin)
                        leftMin = th.value;
                    if (options.max === undefined && th.value > leftMax)
                        leftMax = th.value;
                }
            }
        }
        if (!Number.isFinite(leftMin))
            leftMin = 0;
        if (!Number.isFinite(leftMax) || leftMax <= leftMin)
            leftMax = leftMin + 1;
        if (!Number.isFinite(rightMin))
            rightMin = 0;
        if (!Number.isFinite(rightMax) || rightMax <= rightMin)
            rightMax = rightMin + 1;
        // Give a little headroom (5%)
        const leftHeadroom = (leftMax - leftMin) * 0.05;
        const rightHeadroom = (rightMax - rightMin) * 0.05;
        const yScaleLeft = scaleLinear()
            .domain([options.min ?? (leftMin - leftHeadroom), options.max ?? (leftMax + leftHeadroom)])
            .nice()
            .range([topMargin + innerHeight, topMargin]);
        const yScaleRight = scaleLinear()
            .domain([options.rightMin ?? (rightMin - rightHeadroom), options.rightMax ?? (rightMax + rightHeadroom)])
            .nice()
            .range([topMargin + innerHeight, topMargin]);
        // Draw Bands
        if (bandsG !== null) {
            select(bandsG).selectAll('*').remove();
            if (options.bands !== undefined) {
                for (const band of options.bands) {
                    const bx1 = Math.max(leftMargin, xScale(new Date(band.start)));
                    const bx2 = Math.min(leftMargin + innerWidth, xScale(new Date(band.end)));
                    if (bx2 > bx1) {
                        const bandRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                        bandRect.setAttribute('x', String(bx1));
                        bandRect.setAttribute('y', String(topMargin));
                        bandRect.setAttribute('width', String(bx2 - bx1));
                        bandRect.setAttribute('height', String(innerHeight));
                        if (band.tone === 'bad') {
                            bandRect.setAttribute('fill', 'color-mix(in srgb, var(--chart-bad) 15%, transparent)');
                        }
                        else if (band.tone === 'warn') {
                            bandRect.setAttribute('fill', 'color-mix(in srgb, var(--chart-warn) 15%, transparent)');
                        }
                        else {
                            bandRect.setAttribute('fill', 'color-mix(in srgb, var(--chart-good) 15%, transparent)');
                        }
                        bandsG.appendChild(bandRect);
                    }
                }
            }
        }
        // Draw Grid
        if (gridG !== null) {
            select(gridG).selectAll('*').remove();
            select(gridG)
                .attr('transform', `translate(${leftMargin},0)`)
                .call(axisLeft(yScaleLeft)
                .ticks(Math.max(2, Math.floor(innerHeight / 45)))
                .tickSize(-innerWidth)
                .tickFormat(() => ''));
        }
        // Render Series Paths (keyed join to reuse element identity!)
        if (seriesG !== null) {
            const currentKeys = new Set(seriesData.map((s) => s.key));
            // Remove paths for keys that no longer exist
            for (const [k, p] of pathCache.entries()) {
                if (!currentKeys.has(k)) {
                    p.g.remove();
                    pathCache.delete(k);
                }
            }
            // Draw or update each series
            seriesData.forEach((s, idx) => {
                const isHidden = hiddenSeries.has(s.key);
                let paths = pathCache.get(s.key);
                if (paths === undefined) {
                    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                    g.setAttribute('class', `chart-series chart-series-${s.key}`);
                    let areaPath;
                    if (isArea) {
                        areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                        areaPath.setAttribute('class', 'chart-area');
                        areaPath.setAttribute('fill-opacity', 'var(--chart-area-opacity)');
                        g.appendChild(areaPath);
                    }
                    const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    linePath.setAttribute('class', 'chart-line');
                    linePath.setAttribute('fill', 'none');
                    linePath.setAttribute('stroke-width', '2');
                    linePath.setAttribute('stroke-linecap', 'round');
                    linePath.setAttribute('stroke-linejoin', 'round');
                    g.appendChild(linePath);
                    seriesG.appendChild(g);
                    paths = { g, line: linePath, area: areaPath };
                    pathCache.set(s.key, paths);
                }
                if (isHidden) {
                    paths.g.style.display = 'none';
                    return;
                }
                paths.g.style.display = '';
                const colour = getSeriesColour(idx, s.colour);
                const dash = getSeriesDash(idx, seriesData.length);
                paths.line.setAttribute('stroke', colour);
                if (dash) {
                    paths.line.setAttribute('stroke-dasharray', dash);
                }
                else {
                    paths.line.removeAttribute('stroke-dasharray');
                }
                if (paths.area !== undefined) {
                    paths.area.setAttribute('fill', colour);
                }
                // Downsample with LTTB if points > innerWidth * 2
                let renderPoints = s.points;
                if (renderPoints.length > innerWidth * 2) {
                    renderPoints = lttb(renderPoints, Math.round(innerWidth * 1.5));
                }
                // Handle gaps (missing scrape / step > gapAfter)
                renderPoints = insertGaps(renderPoints, options.gapAfter);
                const currentYScale = s.axis === 'right' ? yScaleRight : yScaleLeft;
                const lineGen = d3Line()
                    .defined((d) => d[1] !== null && Number.isFinite(d[1]))
                    .x((d) => xScale(new Date(d[0])))
                    .y((d) => currentYScale(d[1] ?? 0));
                const lineD = lineGen(renderPoints) ?? '';
                paths.line.setAttribute('d', lineD);
                if (paths.area !== undefined) {
                    const baselineY = currentYScale(0) ?? (topMargin + innerHeight);
                    const areaGen = d3Area()
                        .defined((d) => d[1] !== null && Number.isFinite(d[1]))
                        .x((d) => xScale(new Date(d[0])))
                        .y0(Math.min(topMargin + innerHeight, Math.max(topMargin, baselineY)))
                        .y1((d) => currentYScale(d[1] ?? 0));
                    const areaD = areaGen(renderPoints) ?? '';
                    paths.area.setAttribute('d', areaD);
                }
            });
        }
        // Draw Thresholds
        if (thresholdsG !== null) {
            select(thresholdsG).selectAll('*').remove();
            if (options.thresholds !== undefined) {
                for (const th of options.thresholds) {
                    const currentYScale = th.axis === 'right' ? yScaleRight : yScaleLeft;
                    const y = currentYScale(th.value);
                    if (y >= topMargin && y <= topMargin + innerHeight) {
                        const thG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                        thG.setAttribute('class', 'chart-threshold');
                        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                        line.setAttribute('x1', String(leftMargin));
                        line.setAttribute('x2', String(leftMargin + innerWidth));
                        line.setAttribute('y1', String(y));
                        line.setAttribute('y2', String(y));
                        if (th.tone === 'bad')
                            line.style.stroke = 'var(--chart-bad)';
                        else if (th.tone === 'warn')
                            line.style.stroke = 'var(--chart-warn)';
                        else if (th.tone === 'good')
                            line.style.stroke = 'var(--chart-good)';
                        thG.appendChild(line);
                        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                        txt.setAttribute('x', String(leftMargin + 6));
                        txt.setAttribute('y', String(y - 4));
                        txt.textContent = `${th.label} (${formatValue(th.value, sUnit(sLeftDefault()))})`;
                        thG.appendChild(txt);
                        thresholdsG.appendChild(thG);
                    }
                }
            }
        }
        // Draw Axes
        if (xAxisG !== null) {
            select(xAxisG)
                .attr('transform', `translate(0,${topMargin + innerHeight})`)
                .call(axisBottom(xScale)
                .ticks(Math.max(2, Math.floor(innerWidth / 85)))
                .tickFormat((d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })));
        }
        if (yAxisLeftG !== null) {
            select(yAxisLeftG)
                .attr('transform', `translate(${leftMargin},0)`)
                .call(axisLeft(yScaleLeft)
                .ticks(Math.max(2, Math.floor(innerHeight / 45)))
                .tickFormat((v) => formatValue(Number(v), options.unit)));
        }
        if (yAxisRightG !== null) {
            if (hasRightAxis) {
                yAxisRightG.style.display = '';
                select(yAxisRightG)
                    .attr('transform', `translate(${leftMargin + innerWidth},0)`)
                    .call(axisRight(yScaleRight)
                    .ticks(Math.max(2, Math.floor(innerHeight / 45)))
                    .tickFormat((v) => formatValue(Number(v), options.rightUnit)));
            }
            else {
                yAxisRightG.style.display = 'none';
            }
        }
        // Live badge indicator state
        if (options.window !== undefined) {
            livePill.style.display = 'inline-flex';
            livePill.setAttribute('data-live', String(isLiveFollowing));
            const pillText = livePill.querySelector('.chart-live-text');
            if (pillText !== null) {
                pillText.textContent = isLiveFollowing ? 'Live' : 'Paused';
            }
            livePill.setAttribute('aria-label', isLiveFollowing ? 'Live stream active. Click to pause' : 'Stream paused. Click to resume live');
        }
        else {
            livePill.style.display = 'none';
        }
        renderLegend();
        updateA11y(minTime, maxTime, visible);
    }
    function sLeftDefault() {
        return seriesData.find((s) => s.axis !== 'right');
    }
    function sUnit(s) {
        return s?.unit ?? options.unit;
    }
    const legendButtons = new Map();
    function renderLegend() {
        if (seriesData.length <= 1) {
            legendContainer.style.display = 'none';
            legendButtons.clear();
            legendContainer.innerHTML = '';
            return;
        }
        legendContainer.style.display = 'flex';
        const currentKeys = seriesData.map((s) => s.key).join(',');
        const existingKeys = [...legendButtons.keys()].join(',');
        if (currentKeys === existingKeys) {
            for (const s of seriesData) {
                const btn = legendButtons.get(s.key);
                if (btn !== undefined) {
                    btn.setAttribute('aria-pressed', String(!hiddenSeries.has(s.key)));
                }
            }
            return;
        }
        legendContainer.innerHTML = '';
        legendButtons.clear();
        seriesData.forEach((s, idx) => {
            const btn = document.createElement('button');
            btn.className = 'chart-legend-item';
            const isVisible = !hiddenSeries.has(s.key);
            btn.setAttribute('aria-pressed', String(isVisible));
            btn.setAttribute('type', 'button');
            const swatch = document.createElement('span');
            swatch.className = 'chart-legend-swatch';
            const colour = getSeriesColour(idx, s.colour);
            swatch.style.background = colour;
            const dash = getSeriesDash(idx, seriesData.length);
            if (dash) {
                swatch.style.borderBottom = `2px dashed ${colour}`;
            }
            const label = document.createElement('span');
            label.textContent = s.label;
            btn.appendChild(swatch);
            btn.appendChild(label);
            btn.addEventListener('click', () => {
                if (hiddenSeries.has(s.key)) {
                    hiddenSeries.delete(s.key);
                }
                else {
                    hiddenSeries.add(s.key);
                }
                render();
            });
            legendButtons.set(s.key, btn);
            legendContainer.appendChild(btn);
        });
    }
    function updateA11y(minTime, maxTime, visible) {
        if (svg === null)
            return;
        const title = options.title ?? 'Time series';
        if (visible.length === 0) {
            svg.setAttribute('aria-label', `${title}: no data`);
            return;
        }
        const startStr = new Date(minTime).toLocaleTimeString([], { hour12: false });
        const endStr = new Date(maxTime).toLocaleTimeString([], { hour12: false });
        const summaries = visible.map((s) => {
            const valid = s.points.filter((p) => p[1] !== null && Number.isFinite(p[1]));
            const last = valid[valid.length - 1];
            const valStr = last !== undefined && last[1] !== null ? formatValue(last[1], s.unit ?? options.unit) : '—';
            return `${s.label}: ${valStr}`;
        });
        svg.setAttribute('aria-label', `${title}, ${startStr} to ${endStr}: ${summaries.join(', ')}`);
        if (options.table !== false) {
            if (tableEl !== null)
                tableEl.remove();
            const headers = ['Time', ...visible.map((s) => s.label)];
            // Sample up to 10 representative timestamps across range
            const allTimes = [...new Set(visible.flatMap((s) => s.points.map((p) => p[0])))].sort((a, b) => a - b);
            const step = Math.max(1, Math.floor(allTimes.length / 10));
            const sampledTimes = allTimes.filter((_, i) => i % step === 0);
            const rows = sampledTimes.map((t) => {
                const timeStr = new Date(t).toLocaleTimeString([], { hour12: false });
                const r = [timeStr];
                for (const s of visible) {
                    const pt = s.points.find((p) => p[0] === t);
                    r.push(pt !== undefined && pt[1] !== null ? formatValue(pt[1], s.unit ?? options.unit) : '—');
                }
                return r;
            });
            tableEl = buildAccessibleTable(`${title} data`, headers, rows);
            host.appendChild(tableEl);
        }
    }
    // Interactive crosshair & tooltip
    function showCrosshairAtTime(timeMs) {
        const hostWidth = host.clientWidth > 0 ? host.clientWidth : 400;
        const hasRightAxis = seriesData.some((s) => s.axis === 'right');
        const leftMargin = hostWidth < 360 ? 40 : 55;
        const rightMargin = hasRightAxis ? (hostWidth < 360 ? 40 : 55) : 20;
        const topMargin = 20;
        const bottomMargin = hostWidth < 360 ? 45 : 35;
        const innerWidth = Math.max(50, hostWidth - leftMargin - rightMargin);
        const innerHeight = Math.max(50, chartHeight - topMargin - bottomMargin);
        let xDomainStart = customXDomain !== null ? customXDomain[0] : (seriesData[0]?.points[0]?.[0] ?? Date.now() - 3600_000);
        let xDomainEnd = customXDomain !== null ? customXDomain[1] : (seriesData[0]?.points[seriesData[0].points.length - 1]?.[0] ?? Date.now());
        if (options.window !== undefined && isLiveFollowing) {
            let maxT = 0;
            for (const s of seriesData) {
                const p = s.points[s.points.length - 1];
                if (p && p[0] > maxT)
                    maxT = p[0];
            }
            xDomainEnd = maxT;
            xDomainStart = maxT - options.window;
        }
        const xScale = scaleTime()
            .domain([new Date(xDomainStart), new Date(xDomainEnd)])
            .range([leftMargin, leftMargin + innerWidth]);
        const clampedTime = Math.max(xDomainStart, Math.min(timeMs, xDomainEnd));
        const cx = xScale(new Date(clampedTime));
        if (crosshairG !== null && crosshairLine !== null) {
            crosshairLine.setAttribute('x1', String(cx));
            crosshairLine.setAttribute('x2', String(cx));
            crosshairLine.setAttribute('y1', String(topMargin));
            crosshairLine.setAttribute('y2', String(topMargin + innerHeight));
            crosshairG.style.display = '';
        }
        // Find nearest point for each visible series at this time
        const visible = seriesData.filter((s) => !hiddenSeries.has(s.key));
        const entries = [];
        visible.forEach((s, idx) => {
            if (s.points.length === 0)
                return;
            // Binary search or linear search for closest point
            let closest = s.points[0];
            let minDiff = Number.POSITIVE_INFINITY;
            for (const pt of s.points) {
                const diff = Math.abs(pt[0] - clampedTime);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = pt;
                }
            }
            if (closest !== undefined) {
                const val = closest[1];
                entries.push({
                    label: s.label,
                    value: val,
                    valStr: formatValue(val, s.unit ?? options.unit),
                    colour: getSeriesColour(idx, s.colour),
                });
            }
        });
        // Sort descending by value
        entries.sort((a, b) => (b.value ?? Number.NEGATIVE_INFINITY) - (a.value ?? Number.NEGATIVE_INFINITY));
        const timeStr = new Date(clampedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        const rowsHtml = entries.map((e) => `
            <div class="chart-tooltip-row">
                <span class="chart-tooltip-label">
                    <span class="chart-legend-swatch" style="background:${e.colour}; width:8px; height:8px;"></span>
                    ${e.label}
                </span>
                <span class="chart-tooltip-value">${e.valStr}</span>
            </div>
        `).join('');
        tooltip.innerHTML = `
            <div class="chart-tooltip-time">${timeStr}</div>
            ${rowsHtml}
        `;
        tooltip.hidden = false;
        // Position tooltip
        const isMobileNarrow = hostWidth < 480;
        if (isMobileNarrow) {
            tooltip.classList.add('chart-tooltip-docked');
            tooltip.style.left = '';
            tooltip.style.top = '';
        }
        else {
            tooltip.classList.remove('chart-tooltip-docked');
            const tw = tooltip.offsetWidth;
            const th = tooltip.offsetHeight;
            let left = cx + 15;
            let top = topMargin + 10;
            if (left + tw > hostWidth - 10) {
                left = cx - tw - 15;
            }
            if (left < 10)
                left = 10;
            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
        }
    }
    function hideCrosshair() {
        if (crosshairG !== null)
            crosshairG.style.display = 'none';
        tooltip.hidden = true;
    }
    // Pointer events on wrapper
    function onPointerDown(e) {
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (activePointers.size === 1) {
            isDragging = true;
            dragStartX = e.clientX;
            dragStartDomain = customXDomain ?? getCurrentDomain();
        }
        else if (activePointers.size === 2) {
            isDragging = false;
            const pts = [...activePointers.values()];
            const p1 = pts[0];
            const p2 = pts[1];
            initialPinchDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            initialPinchDomain = customXDomain ?? getCurrentDomain();
        }
    }
    function onPointerMove(e) {
        if (activePointers.has(e.pointerId)) {
            activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        }
        if (activePointers.size === 2 && initialPinchDist > 0 && initialPinchDomain !== null) {
            // Pinch zoom
            const pts = [...activePointers.values()];
            const p1 = pts[0];
            const p2 = pts[1];
            const currentDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            if (currentDist > 0) {
                const ratio = initialPinchDist / currentDist;
                const span = (initialPinchDomain[1] - initialPinchDomain[0]) * ratio;
                const center = (initialPinchDomain[0] + initialPinchDomain[1]) / 2;
                customXDomain = [center - span / 2, center + span / 2];
                isLiveFollowing = false;
                render();
            }
            return;
        }
        if (isDragging && dragStartDomain !== null) {
            const dx = e.clientX - dragStartX;
            const hostWidth = host.clientWidth > 0 ? host.clientWidth : 400;
            const domainSpan = dragStartDomain[1] - dragStartDomain[0];
            const timeDelta = (dx / hostWidth) * domainSpan;
            customXDomain = [dragStartDomain[0] - timeDelta, dragStartDomain[1] - timeDelta];
            isLiveFollowing = false;
            render();
            return;
        }
        // Hover crosshair
        const wrapperBox = wrapper.getBoundingClientRect();
        const mouseX = e.clientX - wrapperBox.left;
        const hostWidth = host.clientWidth > 0 ? host.clientWidth : 400;
        const curDomain = customXDomain ?? getCurrentDomain();
        const t = curDomain[0] + (mouseX / hostWidth) * (curDomain[1] - curDomain[0]);
        showCrosshairAtTime(t);
    }
    function onPointerUp(e) {
        activePointers.delete(e.pointerId);
        if (activePointers.size === 0) {
            isDragging = false;
            dragStartDomain = null;
        }
    }
    function getCurrentDomain() {
        let minTime = Number.POSITIVE_INFINITY;
        let maxTime = Number.NEGATIVE_INFINITY;
        for (const s of seriesData) {
            for (const p of s.points) {
                if (p[0] < minTime)
                    minTime = p[0];
                if (p[0] > maxTime)
                    maxTime = p[0];
            }
        }
        if (!Number.isFinite(minTime) || !Number.isFinite(maxTime) || minTime >= maxTime) {
            const now = Date.now();
            return [now - 3600_000, now];
        }
        if (options.window !== undefined && isLiveFollowing) {
            return [maxTime - options.window, maxTime];
        }
        return [minTime, maxTime];
    }
    function onWheel(e) {
        // Zoom only when ctrlKey or metaKey is held so page scroll is NEVER hijacked!
        if (!e.ctrlKey && !e.metaKey)
            return;
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 0.8 : 1.25;
        const curDomain = customXDomain ?? getCurrentDomain();
        const hostWidth = host.clientWidth > 0 ? host.clientWidth : 400;
        const wrapperBox = wrapper.getBoundingClientRect();
        const mouseX = Math.max(0, Math.min(hostWidth, e.clientX - wrapperBox.left));
        const centerRatio = mouseX / hostWidth;
        const currentSpan = curDomain[1] - curDomain[0];
        const newSpan = currentSpan * zoomFactor;
        const centerTime = curDomain[0] + currentSpan * centerRatio;
        customXDomain = [
            centerTime - newSpan * centerRatio,
            centerTime + newSpan * (1 - centerRatio),
        ];
        isLiveFollowing = false;
        render();
    }
    function onDblClick() {
        // Reset zoom / live mode
        customXDomain = null;
        if (options.window !== undefined) {
            isLiveFollowing = true;
        }
        hideCrosshair();
        render();
    }
    function onKeyDown(e) {
        const curDomain = customXDomain ?? getCurrentDomain();
        const span = curDomain[1] - curDomain[0];
        switch (e.key) {
            case 'ArrowLeft': {
                e.preventDefault();
                const allPoints = seriesData.flatMap((s) => s.points.map((p) => p[0])).sort((a, b) => a - b);
                if (allPoints.length === 0)
                    return;
                keyboardIndex = keyboardIndex <= 0 ? allPoints.length - 1 : keyboardIndex - 1;
                const t = allPoints[keyboardIndex];
                if (t !== undefined)
                    showCrosshairAtTime(t);
                break;
            }
            case 'ArrowRight': {
                e.preventDefault();
                const allPoints = seriesData.flatMap((s) => s.points.map((p) => p[0])).sort((a, b) => a - b);
                if (allPoints.length === 0)
                    return;
                keyboardIndex = keyboardIndex >= allPoints.length - 1 ? 0 : keyboardIndex + 1;
                const t = allPoints[keyboardIndex];
                if (t !== undefined)
                    showCrosshairAtTime(t);
                break;
            }
            case '+':
            case '=': {
                e.preventDefault();
                const center = (curDomain[0] + curDomain[1]) / 2;
                const newSpan = span * 0.8;
                customXDomain = [center - newSpan / 2, center + newSpan / 2];
                isLiveFollowing = false;
                render();
                break;
            }
            case '-':
            case '_': {
                e.preventDefault();
                const center = (curDomain[0] + curDomain[1]) / 2;
                const newSpan = span * 1.25;
                customXDomain = [center - newSpan / 2, center + newSpan / 2];
                isLiveFollowing = false;
                render();
                break;
            }
            case '0': {
                e.preventDefault();
                onDblClick();
                break;
            }
            case 'Escape': {
                e.preventDefault();
                hideCrosshair();
                break;
            }
        }
    }
    // Attach interaction listeners
    disposables.addEventListener(wrapper, 'pointerdown', onPointerDown);
    disposables.addEventListener(wrapper, 'pointermove', onPointerMove);
    disposables.addEventListener(wrapper, 'pointerup', onPointerUp);
    disposables.addEventListener(wrapper, 'pointercancel', onPointerUp);
    disposables.addEventListener(wrapper, 'pointerleave', hideCrosshair);
    disposables.addEventListener(wrapper, 'wheel', onWheel, { passive: false });
    disposables.addEventListener(wrapper, 'dblclick', onDblClick);
    disposables.addEventListener(wrapper, 'keydown', onKeyDown);
    // Live badge click listener
    livePill.addEventListener('click', () => {
        isLiveFollowing = true;
        customXDomain = null;
        render();
    });
    disposables.add(() => livePill.replaceWith(livePill.cloneNode(false)));
    // ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
        render();
    });
    resizeObserver.observe(host);
    disposables.add(() => resizeObserver.disconnect());
    return {
        update(data) {
            seriesData = data.map((s) => ({
                key: s.key,
                label: s.label,
                axis: s.axis,
                unit: s.unit,
                colour: s.colour,
                points: [...s.points].sort((a, b) => a[0] - b[0]),
            }));
            render();
        },
        append(newPoints) {
            if (newPoints.length === 0)
                return;
            // Normalize points input
            if (typeof newPoints[0] === 'object' && newPoints[0] !== null && 'key' in newPoints[0]) {
                const livePoints = newPoints;
                for (const lp of livePoints) {
                    const s = seriesData.find((item) => item.key === lp.key);
                    if (s !== undefined) {
                        s.points.push(lp.point);
                    }
                }
            }
            else if (seriesData.length > 0) {
                // If array of raw Point and single series, append to first series
                const firstSeries = seriesData[0];
                if (firstSeries !== undefined) {
                    const rawPts = newPoints;
                    firstSeries.points.push(...rawPts);
                }
            }
            // Drop points older than window if window is specified
            if (options.window !== undefined) {
                let latestTime = 0;
                for (const s of seriesData) {
                    const last = s.points[s.points.length - 1];
                    if (last && last[0] > latestTime)
                        latestTime = last[0];
                }
                const cutoff = latestTime - options.window * 1.5;
                for (const s of seriesData) {
                    if (s.points.length > 0 && (s.points[0]?.[0] ?? 0) < cutoff) {
                        s.points = s.points.filter((p) => p[0] >= cutoff);
                    }
                }
            }
            // Batch rendering in requestAnimationFrame for high performance
            if (rafHandle === null) {
                rafHandle = requestAnimationFrame(() => {
                    rafHandle = null;
                    render();
                });
            }
        },
        resize() {
            render();
        },
        dispose() {
            if (rafHandle !== null) {
                cancelAnimationFrame(rafHandle);
                rafHandle = null;
            }
            disposables.dispose();
            pathCache.clear();
            host.innerHTML = '';
        },
    };
}
//# sourceMappingURL=timeSeries.js.map