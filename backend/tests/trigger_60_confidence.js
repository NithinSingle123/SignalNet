const axios = require('axios');

const API_URL = 'http://localhost:3000/api/signal';

const sendSignal = async (source, urgency, lat, lon) => {
    try {
        await axios.post(API_URL, {
            id: `60pct-${Date.now()}-${Math.random()}`,
            source,
            type: 'fire',
            latitude: lat,
            longitude: lon,
            urgency,
            timestamp: Date.now()
        });
        console.log(`[60% TEST] Sent signal from ${source}`);
    } catch (e) {
        console.error(`[60% TEST] Failed: ${e.message}`);
    }
};

const trigger60PercentAlert = async () => {
    console.log("Generating 60% Confidence / High Severity alert...");

    // Use a unique-ish location to avoid merging with old tests immediately
    const lat = 17.3850 + (Math.random() - 0.5) * 0.02;
    const lon = 78.4867 + (Math.random() - 0.5) * 0.02;

    /* 
       Logic for 60% Confidence:
       - 2 Sources (Diversity 2) = 2 * 30 = 60
       - 5+ Signals (Consistency 1.0) = 40
       - Total Base = 100
       - Offline Penalty (if >50% are offline_mesh) = 100 * 0.6 = 60%
    */

    // 1. Send 5 signals from offline_mesh
    for (let i = 0; i < 5; i++) {
        await sendSignal('offline_mesh', 8, lat, lon);
        await new Promise(r => setTimeout(r, 100));
    }

    // 2. Send 1 signal from a different sensor to get Source Diversity = 2
    await sendSignal('sensor_gamma', 9, lat, lon);

    console.log("\nTarget reached: Severity should be ~7.5 and Confidence exactly 60.");
    console.log("Check the top alerts panel for the red card with the FORCE ACTIVE button.");
};

trigger60PercentAlert();
