/**
 * Layer 2: The Mesh-Web Bridge.
 * Thin Component wrappers that mount framework-free chart cores onto mesh-web surface nodes.
 *
 * NOTE: Sites using these components must declare `needs('dom')` in their App specification.
 */
import { type Node } from '@flybyme/mesh-web';
import type { BarDatum, BarsOptions, HeatmapCell, HeatmapOptions, MeterOptions, Point, Series, SparklineOptions, StateTimelineOptions, StateTimelineRow, TimeSeriesOptions } from './types.js';
declare const TimeSeriesChart_base: (abstract new (init: import("@flybyme/mesh-web").ComponentInit<{
    readonly needs: readonly ["dom"];
    readonly props: import("@flybyme/mesh-web").PropsDecl<{
        readonly series: () => readonly Series[];
        readonly options?: TimeSeriesOptions;
        readonly label?: string;
    }>;
}>) => import("@flybyme/mesh-web").ComponentBase<{
    readonly needs: readonly ["dom"];
    readonly props: import("@flybyme/mesh-web").PropsDecl<{
        readonly series: () => readonly Series[];
        readonly options?: TimeSeriesOptions;
        readonly label?: string;
    }>;
}>) & {
    readonly kind: "component";
    readonly spec: {
        readonly needs: readonly ["dom"];
        readonly props: import("@flybyme/mesh-web").PropsDecl<{
            readonly series: () => readonly Series[];
            readonly options?: TimeSeriesOptions;
            readonly label?: string;
        }>;
    };
    create<T>(this: new (init: import("@flybyme/mesh-web").ComponentInit<{
        readonly needs: readonly ["dom"];
        readonly props: import("@flybyme/mesh-web").PropsDecl<{
            readonly series: () => readonly Series[];
            readonly options?: TimeSeriesOptions;
            readonly label?: string;
        }>;
    }>) => T, init: import("@flybyme/mesh-web").ComponentInit<{
        readonly needs: readonly ["dom"];
        readonly props: import("@flybyme/mesh-web").PropsDecl<{
            readonly series: () => readonly Series[];
            readonly options?: TimeSeriesOptions;
            readonly label?: string;
        }>;
    }>): T;
};
export declare class TimeSeriesChart extends TimeSeriesChart_base {
    render(): Node;
}
declare const SparklineChart_base: (abstract new (init: import("@flybyme/mesh-web").ComponentInit<{
    readonly needs: readonly ["dom"];
    readonly props: import("@flybyme/mesh-web").PropsDecl<{
        readonly points: () => readonly Point[];
        readonly options?: SparklineOptions;
    }>;
}>) => import("@flybyme/mesh-web").ComponentBase<{
    readonly needs: readonly ["dom"];
    readonly props: import("@flybyme/mesh-web").PropsDecl<{
        readonly points: () => readonly Point[];
        readonly options?: SparklineOptions;
    }>;
}>) & {
    readonly kind: "component";
    readonly spec: {
        readonly needs: readonly ["dom"];
        readonly props: import("@flybyme/mesh-web").PropsDecl<{
            readonly points: () => readonly Point[];
            readonly options?: SparklineOptions;
        }>;
    };
    create<T>(this: new (init: import("@flybyme/mesh-web").ComponentInit<{
        readonly needs: readonly ["dom"];
        readonly props: import("@flybyme/mesh-web").PropsDecl<{
            readonly points: () => readonly Point[];
            readonly options?: SparklineOptions;
        }>;
    }>) => T, init: import("@flybyme/mesh-web").ComponentInit<{
        readonly needs: readonly ["dom"];
        readonly props: import("@flybyme/mesh-web").PropsDecl<{
            readonly points: () => readonly Point[];
            readonly options?: SparklineOptions;
        }>;
    }>): T;
};
export declare class SparklineChart extends SparklineChart_base {
    render(): Node;
}
declare const BarsChart_base: (abstract new (init: import("@flybyme/mesh-web").ComponentInit<{
    readonly needs: readonly ["dom"];
    readonly props: import("@flybyme/mesh-web").PropsDecl<{
        readonly data: () => readonly BarDatum[];
        readonly options?: BarsOptions;
    }>;
}>) => import("@flybyme/mesh-web").ComponentBase<{
    readonly needs: readonly ["dom"];
    readonly props: import("@flybyme/mesh-web").PropsDecl<{
        readonly data: () => readonly BarDatum[];
        readonly options?: BarsOptions;
    }>;
}>) & {
    readonly kind: "component";
    readonly spec: {
        readonly needs: readonly ["dom"];
        readonly props: import("@flybyme/mesh-web").PropsDecl<{
            readonly data: () => readonly BarDatum[];
            readonly options?: BarsOptions;
        }>;
    };
    create<T>(this: new (init: import("@flybyme/mesh-web").ComponentInit<{
        readonly needs: readonly ["dom"];
        readonly props: import("@flybyme/mesh-web").PropsDecl<{
            readonly data: () => readonly BarDatum[];
            readonly options?: BarsOptions;
        }>;
    }>) => T, init: import("@flybyme/mesh-web").ComponentInit<{
        readonly needs: readonly ["dom"];
        readonly props: import("@flybyme/mesh-web").PropsDecl<{
            readonly data: () => readonly BarDatum[];
            readonly options?: BarsOptions;
        }>;
    }>): T;
};
export declare class BarsChart extends BarsChart_base {
    render(): Node;
}
declare const MeterChart_base: (abstract new (init: import("@flybyme/mesh-web").ComponentInit<{
    readonly needs: readonly ["dom"];
    readonly props: import("@flybyme/mesh-web").PropsDecl<{
        readonly value: () => number;
        readonly options: MeterOptions;
    }>;
}>) => import("@flybyme/mesh-web").ComponentBase<{
    readonly needs: readonly ["dom"];
    readonly props: import("@flybyme/mesh-web").PropsDecl<{
        readonly value: () => number;
        readonly options: MeterOptions;
    }>;
}>) & {
    readonly kind: "component";
    readonly spec: {
        readonly needs: readonly ["dom"];
        readonly props: import("@flybyme/mesh-web").PropsDecl<{
            readonly value: () => number;
            readonly options: MeterOptions;
        }>;
    };
    create<T>(this: new (init: import("@flybyme/mesh-web").ComponentInit<{
        readonly needs: readonly ["dom"];
        readonly props: import("@flybyme/mesh-web").PropsDecl<{
            readonly value: () => number;
            readonly options: MeterOptions;
        }>;
    }>) => T, init: import("@flybyme/mesh-web").ComponentInit<{
        readonly needs: readonly ["dom"];
        readonly props: import("@flybyme/mesh-web").PropsDecl<{
            readonly value: () => number;
            readonly options: MeterOptions;
        }>;
    }>): T;
};
export declare class MeterChart extends MeterChart_base {
    render(): Node;
}
declare const HeatmapChart_base: (abstract new (init: import("@flybyme/mesh-web").ComponentInit<{
    readonly needs: readonly ["dom"];
    readonly props: import("@flybyme/mesh-web").PropsDecl<{
        readonly data: () => readonly HeatmapCell[];
        readonly options?: HeatmapOptions;
    }>;
}>) => import("@flybyme/mesh-web").ComponentBase<{
    readonly needs: readonly ["dom"];
    readonly props: import("@flybyme/mesh-web").PropsDecl<{
        readonly data: () => readonly HeatmapCell[];
        readonly options?: HeatmapOptions;
    }>;
}>) & {
    readonly kind: "component";
    readonly spec: {
        readonly needs: readonly ["dom"];
        readonly props: import("@flybyme/mesh-web").PropsDecl<{
            readonly data: () => readonly HeatmapCell[];
            readonly options?: HeatmapOptions;
        }>;
    };
    create<T>(this: new (init: import("@flybyme/mesh-web").ComponentInit<{
        readonly needs: readonly ["dom"];
        readonly props: import("@flybyme/mesh-web").PropsDecl<{
            readonly data: () => readonly HeatmapCell[];
            readonly options?: HeatmapOptions;
        }>;
    }>) => T, init: import("@flybyme/mesh-web").ComponentInit<{
        readonly needs: readonly ["dom"];
        readonly props: import("@flybyme/mesh-web").PropsDecl<{
            readonly data: () => readonly HeatmapCell[];
            readonly options?: HeatmapOptions;
        }>;
    }>): T;
};
export declare class HeatmapChart extends HeatmapChart_base {
    render(): Node;
}
declare const StateTimelineChart_base: (abstract new (init: import("@flybyme/mesh-web").ComponentInit<{
    readonly needs: readonly ["dom"];
    readonly props: import("@flybyme/mesh-web").PropsDecl<{
        readonly data: () => readonly StateTimelineRow[];
        readonly options?: StateTimelineOptions;
    }>;
}>) => import("@flybyme/mesh-web").ComponentBase<{
    readonly needs: readonly ["dom"];
    readonly props: import("@flybyme/mesh-web").PropsDecl<{
        readonly data: () => readonly StateTimelineRow[];
        readonly options?: StateTimelineOptions;
    }>;
}>) & {
    readonly kind: "component";
    readonly spec: {
        readonly needs: readonly ["dom"];
        readonly props: import("@flybyme/mesh-web").PropsDecl<{
            readonly data: () => readonly StateTimelineRow[];
            readonly options?: StateTimelineOptions;
        }>;
    };
    create<T>(this: new (init: import("@flybyme/mesh-web").ComponentInit<{
        readonly needs: readonly ["dom"];
        readonly props: import("@flybyme/mesh-web").PropsDecl<{
            readonly data: () => readonly StateTimelineRow[];
            readonly options?: StateTimelineOptions;
        }>;
    }>) => T, init: import("@flybyme/mesh-web").ComponentInit<{
        readonly needs: readonly ["dom"];
        readonly props: import("@flybyme/mesh-web").PropsDecl<{
            readonly data: () => readonly StateTimelineRow[];
            readonly options?: StateTimelineOptions;
        }>;
    }>): T;
};
export declare class StateTimelineChart extends StateTimelineChart_base {
    render(): Node;
}
export declare const Sparkline: typeof SparklineChart;
export declare const Bars: typeof BarsChart;
export declare const Meter: typeof MeterChart;
export declare const Heatmap: typeof HeatmapChart;
export declare const StateTimeline: typeof StateTimelineChart;
export {};
//# sourceMappingURL=bridge.d.ts.map