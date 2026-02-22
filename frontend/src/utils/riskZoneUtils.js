/**
 * riskZoneUtils.js
 * Pure utility functions for animated risk zone computation.
 * No React or Leaflet imports — fully testable in isolation.
 */

const EARTH_RADIUS_M = 6371000;

/**
 * Compute the display radius (in meters) for a risk zone.
 * Base radius grows with signal density and is amplified by severity.
 *
 * @param {number} signalCount - Number of signals contributing to this event
 * @param {number} severity    - Event severity (1-10)
 * @returns {number} Radius in meters
 */
export function computeRadius(signalCount, severity) {
    const BASE = 300;          // minimum radius, meters
    const DENSITY_SCALE = 15;  // meters added per signal
    const SEV_BOOST = severity >= 7 ? 1.4 : 1.0; // amplify high-severity zones
    const raw = BASE + (signalCount || 0) * DENSITY_SCALE;
    return Math.min(raw * SEV_BOOST, 1200); // cap at 1200 m
}

/**
 * Generate a polygon ring (array of [lat, lng] pairs) approximating a circle.
 * Converts a meter radius to degrees at the given latitude for accuracy.
 *
 * @param {[number, number]} center   - [lat, lng] center point
 * @param {number}           radiusM  - Radius in meters
 * @param {number}           numPts   - Number of polygon vertices (default 32)
 * @returns {[number, number][]} Closed ring — first and last point are equal
 */
export function generatePolygonRing(center, radiusM, numPts = 32) {
    const [lat, lng] = center;
    // Convert radius from meters to degrees
    const dLat = (radiusM / EARTH_RADIUS_M) * (180 / Math.PI);
    const dLng = dLat / Math.cos((lat * Math.PI) / 180);

    const ring = [];
    for (let i = 0; i <= numPts; i++) {
        const angle = (2 * Math.PI * i) / numPts;
        ring.push([
            lat + dLat * Math.sin(angle),
            lng + dLng * Math.cos(angle),
        ]);
    }
    return ring;
}

/**
 * Linear interpolation between two numbers.
 *
 * @param {number} a - Start value
 * @param {number} b - End (target) value
 * @param {number} t - Interpolation factor [0, 1]
 * @returns {number}
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Compute the drift vector from a previous centroid to the current one,
 * and build the arrowhead geometry for a directional arrow marker.
 *
 * @param {[number, number]} from      - Previous [lat, lng]
 * @param {[number, number]} to        - Current  [lat, lng]
 * @param {number}           scale     - Multiplier for arrow shaft length (default 4)
 * @returns {{ tip: [number,number], shaft: [[number,number],[number,number]], head: [number,number][] } | null}
 *   Returns null if drift is below the noise threshold.
 */
export function computeArrow(from, to, scale = 4) {
    const dLat = to[0] - from[0];
    const dLng = to[1] - from[1];

    // Ignore sub-noise drift (< ~5 m)
    const mag = Math.sqrt(dLat * dLat + dLng * dLng);
    if (mag < 0.00005) return null;

    // Shaft end-point — amplify the drift vector so it's visible
    const tipLat = to[0] + dLat * scale;
    const tipLng = to[1] + dLng * scale;

    // Arrowhead: small equilateral triangle perpendicular to direction
    const perpLat = -dLng / mag;
    const perpLng = dLat / mag;
    const headSize = mag * scale * 0.35;

    const head = [
        [tipLat, tipLng],
        [tipLat - dLat / mag * headSize + perpLat * headSize * 0.5,
        tipLng - dLng / mag * headSize + perpLng * headSize * 0.5],
        [tipLat - dLat / mag * headSize - perpLat * headSize * 0.5,
        tipLng - dLng / mag * headSize - perpLng * headSize * 0.5],
    ];

    return {
        shaft: [to, [tipLat, tipLng]],
        tip: [tipLat, tipLng],
        head,
    };
}

/**
 * Compute velocity from the last two points in a centroid trail.
 *
 * @param {{ latitude: number, longitude: number, recorded_at: number }[]} trail
 * @returns {{ speedKmh: number, bearing: number, label: string } | null}
 */
export function computeVelocity(trail) {
    if (!trail || trail.length < 2) return null;

    const prev = trail[trail.length - 2];
    const curr = trail[trail.length - 1];

    const dtMs = curr.recorded_at - prev.recorded_at;
    if (dtMs <= 0) return null;

    // Haversine distance in metres
    const R = 6371000;
    const φ1 = (prev.latitude * Math.PI) / 180;
    const φ2 = (curr.latitude * Math.PI) / 180;
    const Δφ = ((curr.latitude - prev.latitude) * Math.PI) / 180;
    const Δλ = ((curr.longitude - prev.longitude) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) ** 2 +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const distM = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const speedKmh = (distM / (dtMs / 1000)) * 3.6;

    // Ignore sub-noise motion (< 0.01 km/h  ≈ 0.003 m/s  ≈ standing still)
    if (speedKmh < 0.01) return null;

    // Bearing (0° = N, clockwise)
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const bearingDeg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

    const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const cardinal = DIRS[Math.round(bearingDeg / 45) % 8];

    return {
        speedKmh: Math.round(speedKmh * 10) / 10,
        bearing: Math.round(bearingDeg),
        label: `${(Math.round(speedKmh * 10) / 10).toFixed(1)} km/h ${cardinal}`,
    };
}
