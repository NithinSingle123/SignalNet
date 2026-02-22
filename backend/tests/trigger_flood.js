const axios = require('axios');

const API_URL = 'http://localhost:3000/api/signal';

const sendSignal = async (source, urgency, lat, lon) => {
    try {
        await axios.post(API_URL, {
            id: `flood-${Date.now()}-${Math.random()}`,
            source,
            type: 'flood',
            latitude: lat,
            longitude: lon,
            urgency,
            timestamp: Date.now()
        });
        console.log(`Sent flood signal from ${source}`);
    } catch (e) {
        console.error(`Failed to send flood signal: ${e.message}`);
    }
};

const runTest = async () => {
    console.log("Starting FLOOD simulation...");
    const lat = 17.5000;
    const lon = 78.5000;

    await sendSignal('water_sensor_01', 9, lat, lon);
    await new Promise(r => setTimeout(r, 500));
    await sendSignal('civic_app', 8, lat + 0.001, lon + 0.002);
    await new Promise(r => setTimeout(r, 500));
    await sendSignal('iot_drain_gauge', 9, lat - 0.001, lon - 0.001);

    console.log("Flood signals sent. Check the dashboard to verify FLOOD recommendations.");
};

runTest();
