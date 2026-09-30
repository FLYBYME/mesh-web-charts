# `@flybyme/mesh-web-charts` Implementation Report

## 1. Overview & Architecture

We built `@flybyme/mesh-web-charts`, a high-performance, mobile-ready, accessible charting library drawn with D3 for `mesh-web` applications (specifically designed for VictoriaMetrics metrics on surfdns.net operator pages).

The package strictly adheres to all architectural constraints:
- **Zero JSX/TSX**: Implemented purely using TypeScript and standard functional DOM / description trees.
- **Strict typing**: No `as any`, no `as never`, no `@ts-ignore`; `strict` and `noUncheckedIndexedAccess` enabled and enforced throughout.
- **Modular D3 imports**: Only modular ES imports (`d3-scale`, `d3-shape`, `d3-array`, `d3-axis`, `d3-selection`, `d3-zoom`, `d3-time`, `d3-time-format`, `d3-format`, `d3-interpolate`, `d3-color`), never the monolithic bundle.
- **Two-Layer Architecture**:
  1. **Layer 1: The Core (Framework-free)**: Plain DOM and D3 inside an SVG container. Manages SVG identity, data joins, RAF-batched updates, gesture tracking, keyboard navigation, and disposal.
  2. **Layer 2: The Mesh-Web Bridge**: Thin mesh-web components declaring `needs('dom')` and mounting onto `cx.dom.surface`. Signal reads occur inside nested reactive `effect()` calls so the surface is created once and never rebuilt, eliminating flicker and preserving state (avoiding "THE TRAP").

---

## 2. Exact Breakdown of What Was Built

### Core Charts (`src/core/`)
1. **`timeSeries` (`src/core/timeSeries.ts`)**:
   - Multi-series line, area, and stacked area charts.
   - Dual-axis support (left and right y-axes for metrics with different dimensions).
   - Time x-axis with automatic tick sizing across viewports.
   - Shaded horizontal threshold lines with status labels and vertical incident/event bands.
   - Gap detection: broken lines across null values or timestamps exceeding `gapAfter` (never false interpolation).
   - Live stream mode: `append()` pushes points smoothly into the sliding window; batched via `requestAnimationFrame`.
   - LTTB decimation: automatically downsamples dense datasets exceeding pixel resolution.
   - Interactions: Pointer Events for drag panning, pinch zoom, `touch-action: pan-y` (preserving page scroll), wheel zooming only when `Ctrl`/`Cmd` is held, click-to-resume Live tracking button.
   - Full keyboard navigation (arrow keys move crosshair point-by-point, `+`/`-` zoom, `0` resets, `Escape` hides tooltip).
   - Dual visual encoding: dash patterns differentiate lines when > 4 series are rendered.
   - Screen reader accessible visually hidden table representation (`table: true`).

2. **`sparkline` (`src/core/sparkline.ts`)**:
   - Ultra-compact trendline for stat tiles and list rows.
   - Zero axes; highlighted terminal value point with optional min/max extent markers.

3. **`bars` (`src/core/bars.ts`)**:
   - Grouped and stacked bar charts in both vertical and horizontal orientations (ideal for long host/node/disk names).
   - Interactive hover tooltips and interactive series legend toggles.

4. **`meter` (`src/core/meter.ts`)**:
   - Linear capacity gauge with configurable warning and critical thresholds.
   - Accessible ARIA meter semantics (`role="meter"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-valuetext`).
   - Text status labels ("Normal", "Warning", "Critical") alongside value formatting so state is never conveyed by color alone.

5. **`heatmap` (`src/core/heatmap.ts`)**:
   - 2D density matrix with time on the x-axis and discrete bucket categories on the y-axis (optimized for latency distributions).
   - Continuous color scale via `d3-interpolate` with an integrated step legend.

6. **`stateTimeline` (`src/core/stateTimeline.ts`)**:
   - Discrete status spans over time across multiple resource rows (e.g. pod phases: Pending/Running/Failed; volume copy modes: RW/WO/ERR).
   - Semantic tokens for state colors, hover crosshair tooltips, and accessible data table summary.

### Adapters & Utilities (`src/adapters.ts`, `src/lttb.ts`, `src/units.ts`)
- `fromPromMatrix`: Pure adapter converting VictoriaMetrics/Prometheus `query_range` matrix responses to `Series[]`. Correctly parses string floats, handles `NaN`, `+Inf`, `-Inf`, converts Prometheus second timestamps to millisecond timestamps, and formats series labels.
- `fromPromVector`: Pure adapter converting Prometheus instant vector query responses into keyed data arrays.
- `lttb`: Largest-Triangle-Three-Buckets downsampling implementation preserving visual peaks and valleys.
- `units`: Unified formatting engine using `d3-format` supporting bytes (IEC binary units: KiB, MiB, GiB, TiB), bytes/s, percentage (%), seconds/duration, and standard metric counts.

### Bridge Components (`src/bridge.ts`)
- `TimeSeriesChart`, `SparklineChart`, `BarsChart`, `MeterChart`, `HeatmapChart`, `StateTimelineChart`:
  - Declarative mesh-web components mounted via `cx.dom.surface`.
  - Signal properties are observed inside `this.cx.effect(...)` without causing `surface()` to re-render, ensuring the underlying SVG element, D3 scales, and active DOM event listeners are preserved across signal updates.

### Design System & Accessibility (`src/charts.css`)
- Custom properties utilizing `light-dark()` with system colors as fallback defaults (`Canvas`, `CanvasText`).
- Contrast ratios exceeding 4.5:1 in both light and dark color schemes.
- Minimum touch targets of 44x44px for interactive legend toggles.
- Docked tooltips on narrow screens avoiding viewport overflow.
- Passed `axe-core` accessibility audit across all chart types in both light and dark color schemes with **zero violations**.

### Interactive Gallery App (`examples/gallery/`)
- Fully-featured interactive demo app showcasing all 6 charts in real time.
- Simulates live VictoriaMetrics streaming every 1.5 seconds.
- Includes a 320 px phone frame toggle demonstrating mobile responsiveness without horizontal overflow.

---

## 3. Performance Numbers

### Target
- **Benchmark configuration**: 20 series $\times$ 360 points (7,200 points baseline, representing 1 hour of data scraped every 10 seconds), appending 1 point per series at 1 Hz with a sliding window.
- **Goal**: Under 4 ms of scripting time per append on desktop.

### Measured Result
- **Test file**: `test/benchmark.browser.test.ts` (run in headless Chromium browser runner)
- **Workload**: 20 series $\times$ 360 points (7,200 points initial), sliding 1-hour window, 30 append iterations.
- **Measured execution time**:
  - Total scripting time: **92.00 ms** across 30 append iterations.
  - Mean scripting time per append: **3.067 ms / append**.
- **Outcome**: **Passed comfortably below the 4.0 ms target**.

---

## 4. Test Output (`npm test`)

Running `npm test` executes:
1. `tsc -p tsconfig.check.json` (strict typecheck)
2. `vitest run --config vitest.browser.config.ts` (all unit and browser tests in Chromium)

### Test Results Summary:
```
 Test Files  9 passed (9)
      Tests  37 passed (37)
```

### Detailed Suite Breakdown:
1. **`test/adapters.test.ts`** (8 tests passed)
   - Parses Prometheus query_range matrix responses correctly
   - Handles NaN and Inf values appropriately
   - Converts Prometheus seconds timestamps to milliseconds
   - Generates default labels from metric tags
   - Uses custom label formatter when provided
   - Parses instant vector queries to vector items
   - Handles empty matrix results
   - Handles vector query with no results
2. **`test/lttb.test.ts`** (5 tests passed)
   - Returns points unchanged when count is <= threshold
   - Downsamples array of points to target threshold
   - Preserves first and last points exactly
   - Handles null values correctly
   - Handles small threshold values
3. **`test/units.test.ts`** (7 tests passed)
   - Formats byte values correctly (B, KiB, MiB, GiB, TiB)
   - Formats byte rates correctly (B/s, KiB/s, MiB/s, GiB/s)
   - Formats percentages with % symbol
   - Formats durations in seconds (s, ms, us)
   - Formats plain numbers and counts with SI prefixes
   - Handles null values with empty string or dash
   - Handles zero values cleanly
4. **`test/core.browser.test.ts`** (6 tests passed)
   - mounts timeSeries chart and renders axes and series paths
   - handles gaps in series data without connecting across missing periods
   - renders sparkline with last value indicator
   - renders grouped and stacked bars with horizontal orientation
   - renders meter gauge with thresholds and status label
   - renders state timeline with colored spans
5. **`test/interaction.browser.test.ts`** (5 tests passed)
   - shows crosshair on pointer hover and drags to pan
   - handles touch pinch zoom with multiple pointer events
   - toggles series visibility when legend buttons are pressed
   - navigates crosshair and zooms using keyboard keys
   - resumes live tracking when Live pill button is clicked
6. **`test/bridge.browser.test.ts`** (2 tests passed)
   - mounts TimeSeriesChart bridge component and preserves SVG identity on reactive updates
   - renders SparklineChart, MeterChart, BarsChart, and HeatmapChart via bridge
7. **`test/a11y.browser.test.ts`** (2 tests passed)
   - passes axe audit in light colour scheme across all chart types (0 violations)
   - passes axe audit in dark colour scheme across all chart types (0 violations)
8. **`test/benchmark.browser.test.ts`** (1 test passed)
   - stays under upper bound for 20 series x 360 points with live appends (3.067 ms / append)
9. **`examples/gallery/test/gallery.browser.test.ts`** (1 test passed)
   - mounts all charts and toggles 320px phone frame

---

## 5. Local Git Commit Log

```
881ec63 Add interactive gallery example app and browser test
1c1d15f Add browser test suites, a11y audits, interaction tests, and performance benchmark
832fbaa Implement core charts and mesh-web bridge components
cc2bd03 Implement CSS design tokens, types, units, LTTB downsampling, and Prometheus adapters
373dbc9 Initialize @flybyme/mesh-web-charts package and test harness
```

---

## 6. Framework & Kit Feedback

During implementation, several observations were made regarding `mesh-web` and `mesh-web-kit`:

1. **`cx.dom.surface` lifecycle & reactive boundaries**:
   - The `surface()` capability is effective for third-party libraries (like D3) that manipulate raw DOM.
   - However, because passing a dynamic signal or accessing a signal inside the surface factory will trigger recreation of the host DOM element, authors must be mindful to wrap signal subscriptions in `this.cx.effect(...)` inside the component body. A helper like `cx.dom.canvas(setup)` or documentation highlighting this pattern in `mesh-web/docs/app-model.md` would help other developers avoid re-instantiating WebGL or SVG contexts.
2. **Primitive Component Vocabulary in Applications**:
   - The DOM driver in `mesh-web` strictly expects abstract primitives (`Stack`, `Row`, `Card`, `Grid`, `Heading`, `Text`, `Button`), throwing an unknown component error if HTML tags (e.g. `div`, `header`, `section`) are used in `element(...)`.
   - A descriptive hint in the error message noting that `Stack`/`Row` should be used instead of `div`/`section` would improve the developer experience.
3. **SVG Capabilities in `mesh-web`**:
   - Currently, `mesh-web` description trees have no built-in SVG primitives (`svg`, `path`, `rect`, `text`), which makes `cx.dom.surface` the required path for any vector graphics. For charting libraries, this is an advantage because D3's data join and transition system operates with high performance directly on DOM nodes without virtual DOM diff overhead.

---

## 7. Next Steps

With `@flybyme/mesh-web-charts` complete, tested, and built in `dist/`:
- **surfdns.net Integration**:
  1. Import `TimeSeriesChart`, `BarsChart`, `MeterChart`, `HeatmapChart`, and `StateTimelineChart` into the surfdns operator pages (e.g., node dashboard, pod monitoring, volume rebuild progress).
  2. Wire VictoriaMetrics Prometheus endpoints (`/api/v1/query_range` and `/api/v1/query`) into `fromPromMatrix` and `fromPromVector`.
  3. Stream 10 s scrape intervals directly into `chart.append()` for real-time visualization without page rebuilds.
