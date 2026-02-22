const axios = require('axios');
const API_URL = 'http://localhost:3000/api/signal';

const sendSignal = async (source, urgency, lat, lon) => {
    try {
        await axios.post(API_URL, {
            id: `test-adv-${Date.now()}-${Math.random()}`,
            source,
            type: 'fire',
            latitude: lat,
            longitude: lon,
            urgency,
            timestamp: Date.now()
        });
        console.log(`Sent signal from ${source}`);
    } catch (e) {
        console.error(`Failed to send signal: ${e.message}`);
    }
};

const runTest = async () => {
    console.log("Triggering Advisory Threshold Simulation...");
    const lat = 17.5000;
    const lon = 78.5000;

    // 5 signals to ensure consistency = 1.0
    // 2 sources for confidence
    // Urgency 4 for high enough severity
    await sendSignal('citizen_A', 4, lat, lon);
    await sendSignal('citizen_B', 4, lat + 0.0001, lon);
    await sendSignal('citizen_C', 4, lat, lon + 0.0001);
    await sendSignal('sensor_X', 4, lat - 0.0001, lon);
    await sendSignal('sensor_Y', 4, lat, lon - 0.0001);

    console.log("Signals sent. Check backend logs for Advisory dispatch.");
};

runTest();
