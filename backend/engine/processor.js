const db = require('../db');
const scoring = require('./scoring');
const { calculateDistance } = require('./distance');
const { v4: uuidv4 } = require('uuid');
const advisoryEngine = require('./advisory');

const determineLifecyclePhase = (confidence, status) => {
    if (status === 'resolved') return 'Recovery';
    if (confidence < 40) return 'Detection';
    if (confidence < 70) return 'Verification';
    return 'Active Response';
};

const processSignal = async (newSignal, io) => {
    console.log(`Processing signal: ${newSignal.id}`);

    // 1. Get recent signals of same type (last 15 mins)
    const fifteenMinsAgo = Date.now() - (15 * 60 * 1000);
    const sql = `SELECT * FROM signals WHERE type = $1 AND timestamp > $2`;

    try {
        const rows = await db.all(sql, [newSignal.type, fifteenMinsAgo]);

        // 2. Filter by distance (500m)
        const cluster = rows.filter(s => {
            const dist = calculateDistance(newSignal.latitude, newSignal.longitude, s.latitude, s.longitude);
            return dist <= 500;
        });

        console.log(`Found ${cluster.length} signals in cluster (including new one)`);

        // 3. If >= 3 signals, create/update event
        if (cluster.length >= 3) {
            await createOrUpdateEvent(cluster, newSignal.type, io);
        }
    } catch (err) {
        console.error('Error processing signal cluster:', err.message);
    }
};

// ─── Centroid history recording ───────────────────────────────────────────────
const MAX_HISTORY = 20;

const recordCentroid = async (eventId, lat, lng, io) => {
    const now = Date.now();

    try {
        await db.run(
            `INSERT INTO event_centroids (event_id, latitude, longitude, recorded_at) VALUES ($1, $2, $3, $4)`,
            [eventId, lat, lng, now]
        );

        // Prune to MAX_HISTORY most recent rows (Postgres compatible DELETE)
        await db.run(
            `DELETE FROM event_centroids
             WHERE event_id = $1 AND id NOT IN (
                 SELECT id FROM event_centroids
                 WHERE event_id = $2
                 ORDER BY recorded_at DESC
                 LIMIT $3
             )`,
            [eventId, eventId, MAX_HISTORY]
        );

        // Emit updated trail
        const trail = await db.all(
            `SELECT * FROM event_centroids WHERE event_id = $1 ORDER BY recorded_at ASC`,
            [eventId]
        );
        console.log(`[PROCESSOR] Emitting centroidUpdate for ${eventId} (${trail.length} points)`);
        io.emit('centroidUpdate', { eventId, trail });
    } catch (err) {
        console.error('Error recording centroid:', err.message);
    }
};

// ─── Create or update event ───────────────────────────────────────────────────
const createOrUpdateEvent = async (cluster, type, io) => {
    // Centroid
    const avgLat = cluster.reduce((sum, s) => sum + s.latitude, 0) / cluster.length;
    const avgLon = cluster.reduce((sum, s) => sum + s.longitude, 0) / cluster.length;

    // Core metrics
    const urgencyAvg = cluster.reduce((sum, s) => sum + s.urgency, 0) / cluster.length;
    const severity = scoring.calculateSeverity(cluster.length, urgencyAvg, 1);
    const { score: confidence, verification } = scoring.calculateConfidence(cluster);
    const verification_data = JSON.stringify(verification);

    const eta_minutes = scoring.calculateETA(cluster, severity);
    console.log(`ETA for severity ${severity}: ${eta_minutes} min`);

    const lookupWindow = Date.now() - (60 * 60 * 1000); // Look back 1 hour

    try {
        // Broaden search: 1 hour history or any active event
        const events = await db.all(`SELECT * FROM events WHERE created_at > $1 OR status = 'active'`, [lookupWindow]);

        // Match logic:
        // 1. Prioritize active events of the same type within 1km
        // 2. Then active events of any type within 1km
        // 3. Then resolved events within 1km
        const sortedNearby = events
            .map(e => ({ ...e, dist: calculateDistance(avgLat, avgLon, parseFloat(e.latitude), parseFloat(e.longitude)) }))
            .filter(e => e.dist < 1000)
            .sort((a, b) => {
                // Priority boosters
                if (a.status === 'active' && b.status !== 'active') return -1;
                if (a.status !== 'active' && b.status === 'active') return 1;
                if (a.type === type && b.type !== type) return -1;
                if (a.type !== type && b.type === type) return 1;
                return a.dist - b.dist;
            });

        const existingEvent = sortedNearby[0];

        if (existingEvent) {
            // Keep status IF already resolved (don't reactivate automatically to avoid flicker)
            // But if active, definitely stay active.
            const targetStatus = existingEvent.status === 'resolved' ? 'resolved' : 'active';

            const updateSql = `
                UPDATE events
                SET severity = $1, confidence = $2, latitude = $3, longitude = $4,
                    status = $5, eta_minutes = $6, verification_data = $7,
                    lifecycle_phase = $8, type = $9
                WHERE id = $10`;

            const lifecycle_phase = determineLifecyclePhase(confidence, targetStatus);

            await db.run(updateSql, [severity, confidence, avgLat, avgLon, targetStatus, eta_minutes, verification_data, lifecycle_phase, type, existingEvent.id]);
            console.log(`[PROCESSOR] Updated ${targetStatus} event ${existingEvent.id} location to: ${avgLat.toFixed(6)}, ${avgLon.toFixed(6)} (Matched at distance: ${existingEvent.dist.toFixed(0)}m)`);

            io.emit('eventUpdate', {
                id: existingEvent.id,
                severity,
                confidence,
                latitude: avgLat,
                longitude: avgLon,
                status: 'active',
                lifecycle_phase,
                type,
                created_at: existingEvent.created_at,
                signal_count: cluster.length,
                eta_minutes,
                verification: JSON.parse(verification_data)
            });

            await recordCentroid(existingEvent.id, avgLat, avgLon, io);
            await advisoryEngine.processEvent({ id: existingEvent.id, severity, confidence, type }, io);
        } else {
            const id = uuidv4();
            const created_at = Date.now();
            const insertSql = `
                INSERT INTO events
                    (id, severity, confidence, latitude, longitude, status, created_at, eta_minutes, verification_data, lifecycle_phase, type)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;

            const lifecycle_phase = determineLifecyclePhase(confidence, 'active');

            await db.run(insertSql, [id, severity, confidence, avgLat, avgLon, 'active', created_at, eta_minutes, verification_data, lifecycle_phase, type]);
            console.log(`Created event ${id}`);

            io.emit('newAlert', {
                id, severity, confidence, latitude: avgLat, longitude: avgLon, status: 'active',
                lifecycle_phase,
                type,
                created_at, signal_count: cluster.length, eta_minutes, verification: JSON.parse(verification_data)
            });

            await recordCentroid(id, avgLat, avgLon, io);
            await advisoryEngine.processEvent({ id, severity, confidence, type }, io);
        }
    } catch (err) {
        console.error('Error createOrUpdateEvent:', err.message);
    }
};

module.exports = { processSignal };
