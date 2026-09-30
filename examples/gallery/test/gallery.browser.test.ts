/**
 * Browser tests for the Gallery example app.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from '@vitest/browser/context';
import { App, mountSite, needs, Router, View, type MountedApp, type Node } from '@flybyme/mesh-web';
import { byText, frame, makeDom, unmount } from '../../../test/harness.js';
import GalleryApp, { GalleryView } from '../src/app.js';

let site: MountedApp | undefined;
let root: HTMLElement | undefined;

afterEach(() => {
    site?.dispose();
    site = undefined;
    root?.remove();
    root = undefined;
});

describe('gallery example app', () => {
    it('mounts all charts and toggles 320px phone frame', async () => {
        history.replaceState(null, '', '/');
        root = document.createElement('div');
        document.body.appendChild(root);

        site = mountSite(GalleryApp, {
            root,
            granted: {
                dom: makeDom(),
            },
        });

        await frame();
        await frame();

        // Check header title
        expect(root.querySelector('.gallery-title')?.textContent).toContain('Cluster Operational Metrics');

        // Check that sparkline, meter, timeSeries, bars, heatmap, and stateTimeline are mounted
        expect(root.querySelector('.chart-sparkline-host')).not.toBeNull();
        expect(root.querySelector('.chart-meter-fill')).not.toBeNull();
        expect(root.querySelector('.chart-series-group')).not.toBeNull();
        expect(root.querySelector('.chart-bar')).not.toBeNull();
        expect(root.querySelector('.chart-cell')).not.toBeNull();
        expect(root.querySelector('.chart-timeline-span')).not.toBeNull();

        // Check phone frame button
        const phoneBtn = byText(root, 'button', '320px Phone Frame');
        expect(phoneBtn).not.toBeNull();

        // Click to enter 320px phone frame
        await userEvent.click(phoneBtn);
        await frame();

        const container = root.querySelector('.gallery-container');
        expect(container?.classList.contains('gallery-phone-frame')).toBe(true);
        expect(phoneBtn.textContent).toBe('Exit Phone Frame');

        // Click to exit phone frame
        await userEvent.click(phoneBtn);
        await frame();

        expect(container?.classList.contains('gallery-phone-frame')).toBe(false);
        expect(phoneBtn.textContent).toBe('320px Phone Frame');
    });
});
