import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const charts = (path: string): string => fileURLToPath(new URL(`../../src/${path}`, import.meta.url));

export default defineConfig({
    root: fileURLToPath(new URL('.', import.meta.url)),
    server: { port: 5192, strictPort: true },
    resolve: {
        alias: [
            { find: /^@flybyme\/mesh-web-charts$/, replacement: charts('index.ts') },
            { find: /^@flybyme\/mesh-web-charts\/charts\.css$/, replacement: charts('charts.css') },
        ],
        dedupe: ['@flybyme/mesh-web'],
    },
    optimizeDeps: {
        exclude: ['@flybyme/mesh-web'],
        include: [
            'd3-array',
            'd3-axis',
            'd3-color',
            'd3-format',
            'd3-interpolate',
            'd3-scale',
            'd3-selection',
            'd3-shape',
            'd3-time',
            'd3-time-format',
            'd3-zoom',
        ],
    },
    appType: 'spa',
});
