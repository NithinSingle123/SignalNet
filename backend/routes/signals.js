const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const signalQueue = require('../engine/queue');

// POST /api/signal
router.post('/', async (req, res) => {
    const { source, type, latitude, longitude, urgency, metadata } = req.body;

    if (!source || !type || !latitude || !longitude || !urgency) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = uuidv4();
    const timestamp = Date.now();
    const metadataStr = metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null;

    const sql = `INSERT INTO signals (id, source, type, latitude, longitude, urgency, timestamp, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
    const params = [id, source, type, latitude, longitude, urgency, timestamp, metadataStr];

    try {
        await db.run(sql, params);

        // Enqueue signal for background processing
        const newSignal = { id, source, type, latitude, longitude, urgency, timestamp, metadata: metadataStr };
        signalQueue.add('processSignal', newSignal);

        res.json({ message: 'Signal received', id: id });
    } catch (err) {
        console.error('Error inserting signal:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// GET /api/signal (Fetch recent signals for map visualization)
router.get('/', async (req, res) => {
    // Get signals from last 30 minutes
    const timeLimit = Date.now() - (30 * 60 * 1000);
    const sql = `SELECT * FROM signals WHERE timestamp > $1`;

    try {
        const rows = await db.all(sql, [timeLimit]);
        const parsedRows = rows.map(r => ({
            ...r,
            metadata: r.metadata ? JSON.parse(r.metadata) : null
        }));
        res.json(parsedRows);
    } catch (err) {
        console.error('Error fetching signals:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
