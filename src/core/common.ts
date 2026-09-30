/**
 * Common utilities, accessibility helpers, and color constants for chart implementations.
 */

export const SERIES_COLOURS = [
    'var(--chart-series-1)',
    'var(--chart-series-2)',
    'var(--chart-series-3)',
    'var(--chart-series-4)',
    'var(--chart-series-5)',
    'var(--chart-series-6)',
    'var(--chart-series-7)',
    'var(--chart-series-8)',
] as const;

export const DASH_PATTERNS = [
    '',        // 0: solid
    '',        // 1: solid
    '',        // 2: solid
    '',        // 3: solid
    '6 3',     // 4: dashed
    '2 2',     // 5: dotted
    '8 3 2 3', // 6: dash-dot
    '12 4',    // 7: long-dash
] as const;

export function getSeriesColour(index: number, customColour?: string): string {
    if (customColour !== undefined && customColour.length > 0) {
        return customColour.startsWith('--') ? `var(${customColour})` : customColour;
    }
    const idx = index % SERIES_COLOURS.length;
    return SERIES_COLOURS[idx] ?? 'var(--chart-series-1)';
}

export function getSeriesDash(index: number, totalSeries: number): string {
    if (totalSeries <= 4) return '';
    const idx = index % DASH_PATTERNS.length;
    return DASH_PATTERNS[idx] ?? '';
}

export function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export class Disposables {
    private readonly cleanups: Array<() => void> = [];

    add(fn: () => void): void {
        this.cleanups.push(fn);
    }

    addEventListener<K extends keyof HTMLElementEventMap>(
        target: EventTarget,
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ): void {
        target.addEventListener(type, listener, options);
        this.cleanups.push(() => target.removeEventListener(type, listener, options));
    }

    dispose(): void {
        while (this.cleanups.length > 0) {
            const cleanup = this.cleanups.pop();
            try {
                cleanup?.();
            } catch (err) {
                console.error('Error during chart disposal cleanup:', err);
            }
        }
    }
}

export function createSvg(width: number, height: number): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('class', 'chart-svg');
    svg.setAttribute('role', 'img');
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    return svg;
}

export function buildAccessibleTable(
    captionText: string,
    headers: readonly string[],
    rows: readonly (readonly (string | number)[])[],
): HTMLTableElement {
    const table = document.createElement('table');
    table.className = 'chart-sr-only';

    const caption = document.createElement('caption');
    caption.textContent = captionText;
    table.appendChild(caption);

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const h of headers) {
        const th = document.createElement('th');
        th.setAttribute('scope', 'col');
        th.textContent = h;
        headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const r of rows) {
        const tr = document.createElement('tr');
        for (let i = 0; i < r.length; i++) {
            const cellVal = r[i];
            const textContent = cellVal !== undefined ? String(cellVal) : '';
            if (i === 0) {
                const th = document.createElement('th');
                th.setAttribute('scope', 'row');
                th.textContent = textContent;
                tr.appendChild(th);
            } else {
                const td = document.createElement('td');
                td.textContent = textContent;
                tr.appendChild(td);
            }
        }
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    return table;
}
