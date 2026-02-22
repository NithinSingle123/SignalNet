const axios = require('axios');

const API_URL = 'http://localhost:3000/api/signal';

const sendSignal = async (source, urgency, lat, lon) => {
    try {
        await axios.post(API_URL, {
            id: `bypass-test-${Date.now()}-${Math.random()}`,
            sourceSurge: source,
            type: 'fire',
            latitude: lat,
            longitude: lon,
            urgency,
            timestamp: Date.now()
        });
        console.log(`[TEST] Sent signal from ${source}`);
    } catch (e) {
        console.error(`[TEST] Failed: ${e.message}`);
    }
};

const triggerBypassScenario = async () => {
    console.log("Generating high-severity / low-confidence alert for Commander verification...");
    const lat = 17.3850 + (Math.random() - 0.5) * 0.01;
    const lon = 78.4867 + (Math.random() - 0.5) * 0.01;

    // Send 3 signals (minimum for cluster) with MAX urgency
    // Using high urgency ensures Severity >= 7 so it appears in the top Alert Panel
    // Using fewer sources/signals keeps Confidence low (around 30-40%)
    for (let i = 0; i < 3; i++) {
        await sendSignal(`sensor_${i}`, 10, lat, lon);
        await new Promise(r => setTimeout(r, 200));
    }

    console.log("Done. Check for a red card with low confidence and the 'FORCE ACTIVE' button.");
};

triggerBypassScenario();
