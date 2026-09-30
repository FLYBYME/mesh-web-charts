/**
 * Largest-Triangle-Three-Buckets (LTTB) downsampling algorithm.
 *
 * Reduces the number of points in a time series while preserving visual peaks,
 * troughs, and trends.
 */
export function lttb(data, threshold) {
    const dataLen = data.length;
    if (threshold >= dataLen || threshold <= 0) {
        return [...data];
    }
    if (threshold === 1) {
        const first = data[0];
        return first !== undefined ? [first] : [];
    }
    if (threshold === 2) {
        const first = data[0];
        const last = data[dataLen - 1];
        return first !== undefined && last !== undefined ? [first, last] : [...data];
    }
    const sampled = [];
    const bucketSize = (dataLen - 2) / (threshold - 2);
    let a = 0; // Initially the first point in data
    const firstPoint = data[a];
    if (firstPoint === undefined)
        return [];
    sampled.push(firstPoint);
    for (let i = 0; i < threshold - 2; i++) {
        // Calculate point average for next bucket (c)
        let avgX = 0;
        let avgY = 0;
        let avgCount = 0;
        const nextBucketStart = Math.floor((i + 1) * bucketSize) + 1;
        const nextBucketEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, dataLen);
        for (let j = nextBucketStart; j < nextBucketEnd; j++) {
            const pt = data[j];
            if (pt !== undefined) {
                avgX += pt[0];
                if (pt[1] !== null && Number.isFinite(pt[1])) {
                    avgY += pt[1];
                    avgCount++;
                }
            }
        }
        if (avgCount > 0) {
            avgY /= avgCount;
        }
        const span = nextBucketEnd - nextBucketStart;
        if (span > 0) {
            avgX /= span;
        }
        // Get the range for this bucket
        const currentBucketStart = Math.floor(i * bucketSize) + 1;
        const currentBucketEnd = Math.floor((i + 1) * bucketSize) + 1;
        // Point a
        const ptA = data[a];
        if (ptA === undefined)
            break;
        const pointAX = ptA[0];
        const pointAY = ptA[1] ?? 0;
        let maxArea = -1;
        let maxAreaIndex = currentBucketStart;
        for (let j = currentBucketStart; j < currentBucketEnd; j++) {
            const ptB = data[j];
            if (ptB === undefined)
                continue;
            const ptBX = ptB[0];
            const ptBY = ptB[1] ?? 0;
            // Calculate triangle area over points a, this point (b) and next bucket average (c)
            const area = Math.abs((pointAX - avgX) * (ptBY - pointAY) -
                (pointAX - ptBX) * (avgY - pointAY)) * 0.5;
            if (area > maxArea) {
                maxArea = area;
                maxAreaIndex = j;
            }
        }
        const selected = data[maxAreaIndex];
        if (selected !== undefined) {
            sampled.push(selected);
            a = maxAreaIndex; // Next a is this selected point
        }
    }
    const lastPoint = data[dataLen - 1];
    if (lastPoint !== undefined) {
        sampled.push(lastPoint);
    }
    return sampled;
}
//# sourceMappingURL=lttb.js.map