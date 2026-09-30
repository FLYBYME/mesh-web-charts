/**
 * Common utilities, accessibility helpers, and color constants for chart implementations.
 */
export declare const SERIES_COLOURS: readonly ["var(--chart-series-1)", "var(--chart-series-2)", "var(--chart-series-3)", "var(--chart-series-4)", "var(--chart-series-5)", "var(--chart-series-6)", "var(--chart-series-7)", "var(--chart-series-8)"];
export declare const DASH_PATTERNS: readonly ["", "", "", "", "6 3", "2 2", "8 3 2 3", "12 4"];
export declare function getSeriesColour(index: number, customColour?: string): string;
export declare function getSeriesDash(index: number, totalSeries: number): string;
export declare function prefersReducedMotion(): boolean;
export declare class Disposables {
    private readonly cleanups;
    add(fn: () => void): void;
    addEventListener<K extends keyof HTMLElementEventMap>(target: EventTarget, type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    dispose(): void;
}
export declare function createSvg(width: number, height: number): SVGSVGElement;
export declare function buildAccessibleTable(captionText: string, headers: readonly string[], rows: readonly (readonly (string | number)[])[]): HTMLTableElement;
//# sourceMappingURL=common.d.ts.map