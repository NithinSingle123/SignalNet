const db = require('../db');
const { v4: uuidv4 } = require('uuid');

/**
 * Generates human-readable advisory text based on event type and severity.
 */
const generateAdvisoryText = (event) => {
    const base = `PUBLIC SAFETY ADVISORY: Potential ${event.type || 'incident'} detected. `;
    const severityNote = event.severity >= 9
        ? "URGENT: Extreme danger reported. Seek shelter immediately."
        : "CAUTION: Significant activity detected. Avoid the area.";

    return `${base}${severityNote} (Confidence: ${event.confidence}%)`;
};

/**
 * Simulates the dispatch of advisories via various channels.
 */
const simulateDispatch = (advisory) => {
    const channels = advisory.channels.split(',');
    channels.forEach(channel => {
        console.log(`[DISPATCH] [${channel.trim()}] Sending to subscribers: "${advisory.message}"`);
    });
};

/**
 * Processes an event to determine if an advisory should be triggered.
 */
const processEvent = async (event, io) => {
    // Threshold check: Severity >= 8 AND Confidence >= 60
    if (event.severity >= 8 && event.confidence >= 60) {
        console.log(`Advisory threshold met for event ${event.id}`);

        try {
            // Check if an advisory already exists for this event
            const row = await db.get(`SELECT id FROM advisories WHERE event_id = $1`, [event.id]);
            if (row) return; // Advisory already sent for this event

            const id = uuidv4();
            const message = generateAdvisoryText(event);
            const channels = "SMS,EMAIL,PUSH";
            const created_at = Date.now();

            const sql = `INSERT INTO advisories (id, event_id, message, channels, created_at) VALUES ($1, $2, $3, $4, $5)`;

            await db.run(sql, [id, event.id, message, channels, created_at]);

            const advisory = { id, event_id: event.id, message, channels, created_at };
            console.log(`Automated advisory generated: ${id}`);

            // 1. Simulate dispatch
            simulateDispatch(advisory);

            // 2. Emit via socket
            io.emit('newAdvisory', advisory);
        } catch (err) {
            console.error('Error processing advisory:', err);
        }
    }
};

module.exports = { processEvent };
