const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/events
router.get('/', async (req, res) => {
    const sql = `SELECT * FROM events WHERE status != 'archived' ORDER BY created_at DESC`;
    try {
        const rows = await db.all(sql, []);
        const cleanedRows = rows.map(row => ({
            ...row,
            verification: row.verification_data ? JSON.parse(row.verification_data) : null
        }));
        res.json(cleanedRows);
    } catch (err) {
        console.error('Error fetching events:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/events/:id/resolve
router.post('/:id/resolve', async (req, res) => {
    const { id } = req.params;
    const sql = `UPDATE events SET status = 'resolved', lifecycle_phase = 'Recovery' WHERE id = $1`;

    try {
        await db.run(sql, [id]);

        // Fetch updated event to emit
        const row = await db.get(`SELECT * FROM events WHERE id = $1`, [id]);
        if (row) {
            req.app.get('io').emit('eventUpdate', row);
            res.json(row);
        } else {
            res.json({ id, status: 'resolved', lifecycle_phase: 'Recovery' });
        }
    } catch (err) {
        console.error('Error resolving event:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/events/:id/bypass
router.post('/:id/bypass', async (req, res) => {
    const { id } = req.params;
    const sql = `UPDATE events SET confidence = 100, status = 'active', lifecycle_phase = 'Active Response' WHERE id = $1`;
    try {
        await db.run(sql, [id]);
        const row = await db.get(`SELECT * FROM events WHERE id = $1`, [id]);
        if (row) {
            req.app.get('io').emit('eventUpdate', row);
            res.json(row);
        } else {
            res.status(404).json({ error: 'Event not found' });
        }
    } catch (err) {
        console.error('Error bypassing event:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/events/:id/centroids
router.get('/:id/centroids', async (req, res) => {
    const { id } = req.params;
    const sql = `SELECT * FROM event_centroids WHERE event_id = $1 ORDER BY recorded_at ASC`;
    try {
        const rows = await db.all(sql, [id]);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching centroids:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/events/:id/advisories
router.get('/:id/advisories', async (req, res) => {
    const { id } = req.params;
    const sql = `SELECT * FROM advisories WHERE event_id = $1 ORDER BY created_at DESC`;
    try {
        const rows = await db.all(sql, [id]);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching advisories:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

