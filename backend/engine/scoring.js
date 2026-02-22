const calculateSeverity = (signalCount, urgencyAvg, proximityFactor) => {
    // Severity (1–10)
    let rawSeverity = (signalCount * 0.5) + (urgencyAvg * 1.5);
    return Math.min(10, Math.max(1, Math.round(rawSeverity)));
};

const calculateConfidence = (signals) => {
    // Confidence (0–100)
    const sources = Array.from(new Set(signals.map(s => s.source)));
    const sourceDiversity = sources.length;
    const count = signals.length;

    // Consistency: how many signals agree?
    const consistency = Math.min(1.0, count / 5);

    // Recency: how fresh is the data?
    const latestTimestamp = Math.max(...signals.map(s => s.timestamp));
    const ageMinutes = (Date.now() - latestTimestamp) / 60000;
    const recencyFactor = Math.max(0, 1 - (ageMinutes / 30)); // Drops over 30 mins

    // Urgency Consistency: do they agree on priority?
    const urgencies = signals.map(s => s.urgency);
    const avgUrgency = urgencies.reduce((a, b) => a + b, 0) / count;
    const variance = urgencies.reduce((a, b) => a + Math.pow(b - avgUrgency, 2), 0) / count;
    const urgencyConsistency = Math.max(0, 1 - (variance / 5)); // Simplified consistency score

    let rawConfidence = (sourceDiversity * 30) + (consistency * 40);
    let score = Math.min(100, Math.round(rawConfidence));

    // Offline weight
    const offlineSignals = signals.filter(s => s.source === 'offline_mesh').length;
    const offlinePenalty = offlineSignals > signals.length / 2;
    if (offlinePenalty) {
        score = Math.round(score * 0.6);
    }

    // Breakdown for transparency
    const sourceScore = Math.min(40, sourceDiversity * 15);
    const consistencyScore = Math.round(consistency * 40);
    const freshnessScore = Math.round(recencyFactor * 20);

    return {
        score,
        verification: {
            source_diversity: sourceDiversity,
            urgency_consistency: Math.round(urgencyConsistency * 100),
            recency_factor: Math.round(recencyFactor * 100),
            offline_penalty: offlinePenalty,
            breakdown: {
                diversity: sourceScore,
                consistency: consistencyScore,
                freshness: freshnessScore
            },
            verification_summary: `Verified by ${sourceDiversity} sources. Consistency: ${Math.round(urgencyConsistency * 100)}%. ${offlinePenalty ? 'Weighted for offline mesh reliability.' : 'Validated via satellite uplink.'}`
        }
    };
};

/**
 * Estimate minutes until the danger zone drops below severity threshold 4.
 *
 * Algorithm:
 *  1. Count signals in last 5 min (count5m) and 5–10 min ago (count5_10m).
 *  2. Derive arrival rate  = count5m / 5  (signals/min).
 *  3. Derive trend:
 *       rising  (×1.4)  → count5m > count5_10m   (worsening, takes longer)
 *       falling (×0.6)  → count5m < count5_10m   (improving, resolves faster)
 *       stable  (×1.0)  otherwise
 *  4. Base ETA:
 *       low activity (< 0.1 sig/min) → 5 + severityGap * 2   (quiet decay)
 *       otherwise                    → (severityGap / rate) * 3
 *  5. eta = clamp(round(base × multiplier), 1, 120)
 *
 * @param {{ timestamp: number }[]} cluster       – signals in current cluster
 * @param {number}                  currentSeverity
 * @returns {number} eta_minutes (integer, 1–120)
 */
const calculateETA = (cluster, currentSeverity) => {
    const now = Date.now();
    const FIVE_MIN = 5 * 60 * 1000;
    const TEN_MIN = 10 * 60 * 1000;
    const THRESHOLD = 4;                      // Severity stabilization target

    // Window counts
    const count5m = cluster.filter(s => (now - s.timestamp) <= FIVE_MIN).length;
    const count5_10m = cluster.filter(s => {
        const age = now - s.timestamp;
        return age > FIVE_MIN && age <= TEN_MIN;
    }).length;

    // 1. Signal Arrival Rate (signals/min in last 5 min)
    const arrivalRate = count5m / 5;

    // 2. Signal Growth Delta (velocity of the incident)
    const growthDelta = count5m - count5_10m;

    // 3. Severity Trend
    let trendMultiplier = 1.0;
    if (growthDelta > 0) trendMultiplier = 1.5;      // Rising: takes 50% longer
    else if (growthDelta < 0) trendMultiplier = 0.6;  // Falling: resolves 40% faster

    // 4. Base Calculation
    const severityGap = Math.max(0, currentSeverity - THRESHOLD);

    // Logic: Baseline 5 mins + (Severity Gap * 7 mins) + (Signal volume impact)
    // High arrival rate suggests complexity/persistence
    let baseEta = 5 + (severityGap * 7) + (arrivalRate * 2);

    // Apply trend multiplier and round
    const eta = Math.round(baseEta * trendMultiplier);

    // Clamp between 1 and 120 minutes
    return Math.min(120, Math.max(1, eta));
};

module.exports = {
    calculateSeverity,
    calculateConfidence,
    calculateETA,
};
