/**
 * Every test here runs in a real browser and presses what it tests. mesh-web's preset resolves
 * `@flybyme/mesh-web` to one copy — the charts' components and the page must share one `Router`, one
 * renderer — and runs a real Chrome.
 */

import { fileURLToPath } from 'node:url';
import { definePartBrowserConfig } from '@flybyme/mesh-web/testing/config';

export default definePartBrowserConfig({
    resolve: {
        // The gallery and tests import the package by name, and its stylesheet by subpath, as a site does;
        // both resolve to this repository's source. Exact matches, so one does not swallow the other.
        alias: [
            { find: /^@flybyme\/mesh-web-charts$/, replacement: fileURLToPath(new URL('./src/index.ts', import.meta.url)) },
            { find: /^@flybyme\/mesh-web-charts\/charts\.css$/, replacement: fileURLToPath(new URL('./src/charts.css', import.meta.url)) },
        ],
    },
    test: {
        include: ['test/**/*.test.ts', 'examples/*/test/**/*.test.ts'],
    },
});
