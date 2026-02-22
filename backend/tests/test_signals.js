const axios = require('axios');

const API_URL = 'http://localhost:3000/api/signal';

const sendSignal = async (source, urgency, lat, lon) => {
    try {
        await axios.post(API_URL, {
            id: `test-${Date.now()}-${Math.random()}`,
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
    console.log("Starting multi-source incident simulation...");
    const lat = 17.4100;
    const lon = 78.4300;

    // Send signals from different sources to trigger diversity logic
    await sendSignal('sensor_node_01', 8, lat, lon);
    await new Promise(r => setTimeout(r, 500));
    await sendSignal('mobile_app_user', 9, lat + 0.001, lon + 0.001);
    await new Promise(r => setTimeout(r, 500));
    await sendSignal('offline_mesh', 8, lat - 0.001, lon - 0.001);

    console.log("Signals sent. Check the dashboard for the high-severity event and verification data.");
};

runTest();
