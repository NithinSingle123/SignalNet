const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const signalQueue = require('../engine/queue');

// POST /api/offline-signal
router.post('/', async (req, res) => {
    const { source, type, latitude, longitude, urgency } = req.body;
    const signalSource = source || 'offline_mesh';

    if (!type || !latitude || !longitude || !urgency) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = uuidv4();
    const timestamp = Date.now();

    const sql = `INSERT INTO signals (id, source, type, latitude, longitude, urgency, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    const params = [id, signalSource, type, latitude, longitude, urgency, timestamp];

    try {
        await db.run(sql, params);

        // Enqueue for background processing
        const newSignal = { id, source: signalSource, type, latitude, longitude, urgency, timestamp };
        signalQueue.add('processSignal', newSignal);

        res.json({ message: 'Offline signal received', id: id });
    } catch (err) {
        console.error('Error inserting offline signal:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
