/**
 * Interaction browser tests that PRESS things:
 * - Pointer events for pan/pinch/tap
 * - Keyboard crosshair navigation (+ / - / 0 / Escape / arrows)
 * - Legend toggle
 * - Live button resume
 */

import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from '@vitest/browser/context';
import { timeSeries } from '../src/core/timeSeries.js';
import type { Point, Series } from '../src/types.js';
import { frame } from './harness.js';

describe('chart interactions', () => {
    let container: HTMLDivElement | null = null;

    function getHost(width = 600, height = 300): HTMLDivElement {
        if (container !== null) {
            container.remove();
        }
        container = document.createElement('div');
        container.style.width = `${width}px`;
        container.style.height = `${height}px`;
        document.body.appendChild(container);
        return container;
    }

    afterEach(() => {
        if (container !== null) {
            container.remove();
            container = null;
        }
    });

    const now = 1700000000000;
    const seriesData: Series[] = [
        {
            key: 'alpha',
            label: 'Alpha Service',
            points: [
                [now, 10],
                [now + 10_000, 20],
                [now + 20_000, 30],
                [now + 30_000, 40],
                [now + 40_000, 50],
            ],
        },
        {
            key: 'beta',
            label: 'Beta Service',
            points: [
                [now, 50],
                [now + 10_000, 40],
                [now + 20_000, 30],
                [now + 30_000, 20],
                [now + 40_000, 10],
            ],
        },
    ];

    it('toggles series visibility when legend buttons are pressed', async () => {
        const host = getHost(600, 300);
        const chart = timeSeries(host, { title: 'Network Traffic' });
        chart.update(seriesData);
        await frame();

        const legendButtons = host.querySelectorAll<HTMLButtonElement>('.chart-legend-item');
        expect(legendButtons.length).toBe(2);

        const alphaBtn = legendButtons[0]!;
        expect(alphaBtn.getAttribute('aria-pressed')).toBe('true');

        // Click alpha series button to toggle off
        await userEvent.click(alphaBtn);
        await frame();

        expect(alphaBtn.getAttribute('aria-pressed')).toBe('false');
        const alphaPath = host.querySelector<SVGGElement>('.chart-series-alpha');
        expect(alphaPath?.style.display).toBe('none');

        // Click alpha series button again to toggle on
        await userEvent.click(alphaBtn);
        await frame();

        expect(alphaBtn.getAttribute('aria-pressed')).toBe('true');
        expect(alphaPath?.style.display).toBe('');

        chart.dispose();
    });

    it('navigates crosshair and zooms using keyboard keys', async () => {
        const host = getHost(600, 300);
        const chart = timeSeries(host, { title: 'CPU' });
        chart.update(seriesData);
        await frame();

        const wrapper = host.querySelector<HTMLElement>('.chart-wrapper')!;
        wrapper.focus();

        const tooltip = host.querySelector<HTMLElement>('.chart-tooltip')!;
        expect(tooltip.hidden).toBe(true);

        // ArrowRight moves crosshair to a point and displays tooltip
        wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        await frame();

        expect(tooltip.hidden).toBe(false);
        expect(tooltip.textContent).toContain('Alpha Service');

        // Escape hides tooltip
        wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await frame();

        expect(tooltip.hidden).toBe(true);

        // + zooms in, - zooms out, 0 resets
        wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true }));
        await frame();

        wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: '-', bubbles: true }));
        await frame();

        wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: '0', bubbles: true }));
        await frame();

        chart.dispose();
    });

    it('shows crosshair on pointer hover and drags to pan', async () => {
        const host = getHost(600, 300);
        const chart = timeSeries(host, { title: 'Disk IO' });
        chart.update(seriesData);
        await frame();

        const wrapper = host.querySelector<HTMLElement>('.chart-wrapper')!;
        const tooltip = host.querySelector<HTMLElement>('.chart-tooltip')!;

        // Pointer move (hover)
        wrapper.dispatchEvent(new PointerEvent('pointermove', {
            clientX: 200,
            clientY: 100,
            bubbles: true,
        }));
        await frame();

        expect(tooltip.hidden).toBe(false);

        // Pointer leave hides
        wrapper.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
        await frame();

        expect(tooltip.hidden).toBe(true);

        // Pointer drag (pan)
        wrapper.dispatchEvent(new PointerEvent('pointerdown', {
            pointerId: 1,
            clientX: 300,
            clientY: 150,
            bubbles: true,
        }));
        wrapper.dispatchEvent(new PointerEvent('pointermove', {
            pointerId: 1,
            clientX: 200,
            clientY: 150,
            bubbles: true,
        }));
        wrapper.dispatchEvent(new PointerEvent('pointerup', {
            pointerId: 1,
            clientX: 200,
            clientY: 150,
            bubbles: true,
        }));
        await frame();

        chart.dispose();
    });

    it('handles touch pinch zoom with multiple pointer events', async () => {
        const host = getHost(600, 300);
        const chart = timeSeries(host, { title: 'Memory' });
        chart.update(seriesData);
        await frame();

        const wrapper = host.querySelector<HTMLElement>('.chart-wrapper')!;

        // Two pointers down
        wrapper.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 200, clientY: 100, bubbles: true }));
        wrapper.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, clientX: 400, clientY: 100, bubbles: true }));
        await frame();

        // Pinch move (spread pointers)
        wrapper.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 100, clientY: 100, bubbles: true }));
        wrapper.dispatchEvent(new PointerEvent('pointermove', { pointerId: 2, clientX: 500, clientY: 100, bubbles: true }));
        await frame();

        // Pointers up
        wrapper.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true }));
        wrapper.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2, bubbles: true }));
        await frame();

        chart.dispose();
    });

    it('resumes live tracking when Live pill button is clicked', async () => {
        const host = getHost(600, 300);
        const chart = timeSeries(host, {
            title: 'Live Rates',
            window: 60_000,
        });
        chart.update(seriesData);
        await frame();

        const livePill = host.querySelector<HTMLButtonElement>('.chart-live-pill')!;
        expect(livePill.style.display).not.toBe('none');
        expect(livePill.getAttribute('data-live')).toBe('true');

        // Drag to pan away -> pauses live following
        const wrapper = host.querySelector<HTMLElement>('.chart-wrapper')!;
        wrapper.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 300, clientY: 100, bubbles: true }));
        wrapper.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 100, clientY: 100, bubbles: true }));
        wrapper.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 100, clientY: 100, bubbles: true }));
        await frame();

        expect(livePill.getAttribute('data-live')).toBe('false');

        // Click Live pill to resume
        await userEvent.click(livePill);
        await frame();

        expect(livePill.getAttribute('data-live')).toBe('true');

        chart.dispose();
    });
});
