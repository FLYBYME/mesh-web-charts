/**
 * Framework-free linear meter chart implementation.
 */
import { formatPercent, formatValue } from '../units.js';
import { Disposables } from './common.js';
export function meter(host, options) {
    const disposables = new Disposables();
    host.innerHTML = '';
    host.classList.add('chart-host');
    const container = document.createElement('div');
    container.className = 'chart-meter-container';
    host.appendChild(container);
    // Header with label and readable values
    const header = document.createElement('div');
    header.className = 'chart-meter-header';
    const titleEl = document.createElement('span');
    titleEl.className = 'chart-meter-title';
    titleEl.textContent = options.label;
    header.appendChild(titleEl);
    const textEl = document.createElement('span');
    textEl.className = 'chart-meter-text';
    header.appendChild(textEl);
    container.appendChild(header);
    // Track and fill
    const track = document.createElement('div');
    track.className = 'chart-meter-track';
    track.setAttribute('role', 'meter');
    track.setAttribute('aria-label', options.label);
    const fill = document.createElement('div');
    fill.className = 'chart-meter-fill';
    track.appendChild(fill);
    container.appendChild(track);
    // Status description in text (so status is not communicated by colour alone)
    const statusEl = document.createElement('div');
    statusEl.className = 'chart-meter-status';
    container.appendChild(statusEl);
    let currentValue = 0;
    let currentMax = options.max > (options.min ?? 0) ? options.max : 100;
    const minVal = options.min ?? 0;
    function render(val, maxVal) {
        currentValue = val;
        if (maxVal !== undefined && maxVal > minVal) {
            currentMax = maxVal;
        }
        const clamped = Math.max(minVal, Math.min(val, currentMax));
        const span = currentMax - minVal;
        const pct = span > 0 ? ((clamped - minVal) / span) * 100 : 0;
        // Determine status and tone based on thresholds
        // Note: Thresholds can be given as percentage (e.g. 80) or absolute value
        let tone = 'good';
        let statusText = 'Normal';
        const warnVal = options.warnThreshold !== undefined
            ? (options.warnThreshold <= 100 && options.warnThreshold > 1 ? options.warnThreshold : (options.warnThreshold / currentMax) * 100)
            : undefined;
        const badVal = options.badThreshold !== undefined
            ? (options.badThreshold <= 100 && options.badThreshold > 1 ? options.badThreshold : (options.badThreshold / currentMax) * 100)
            : undefined;
        if (badVal !== undefined && pct >= badVal) {
            tone = 'bad';
            statusText = `Critical: ${formatPercent(pct)} exceeds critical threshold (${formatPercent(badVal)})`;
        }
        else if (warnVal !== undefined && pct >= warnVal) {
            tone = 'warn';
            statusText = `Warning: ${formatPercent(pct)} exceeds warning threshold (${formatPercent(warnVal)})`;
        }
        fill.style.width = `${pct.toFixed(1)}%`;
        fill.setAttribute('data-tone', tone);
        // Readable values text
        const valStr = formatValue(val, options.unit);
        const maxStr = formatValue(currentMax, options.unit);
        const pctStr = formatPercent(pct);
        const showPct = options.showPercentage !== false;
        textEl.textContent = showPct ? `${valStr} / ${maxStr} (${pctStr})` : `${valStr} / ${maxStr}`;
        statusEl.textContent = statusText;
        // ARIA attributes on track
        track.setAttribute('aria-valuenow', String(clamped));
        track.setAttribute('aria-valuemin', String(minVal));
        track.setAttribute('aria-valuemax', String(currentMax));
        track.setAttribute('aria-valuetext', `${options.label}: ${valStr} of ${maxStr} (${pctStr}), status: ${statusText}`);
    }
    render(options.min ?? 0);
    return {
        update(val, newMax) {
            render(val, newMax);
        },
        resize() {
            render(currentValue, currentMax);
        },
        dispose() {
            disposables.dispose();
            host.innerHTML = '';
        },
    };
}
//# sourceMappingURL=meter.js.map