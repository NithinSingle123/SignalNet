const axios = require('axios');
const API_URL = 'http://localhost:3000/api/signal';

const sendSignal = async (source, urgency, lat, lon, text) => {
    try {
        await axios.post(API_URL, {
            id: `social-${Date.now()}-${Math.random()}`,
            source,
            type: 'fire',
            latitude: lat,
            longitude: lon,
            urgency,
            timestamp: Date.now(),
            metadata: { text }
        });
        console.log(`Sent social signal from ${source}: "${text}"`);
    } catch (e) {
        console.error(`Failed to send signal: ${e.message}`);
    }
};

const runTest = async () => {
    console.log("Triggering Social Intel Simulation...");
    const lat = 17.4000;
    const lon = 78.4500;

    await sendSignal('user_alpha', 9, lat, lon, "MASSIVE flood at central square! please help!");
    await new Promise(r => setTimeout(r, 500));
    await sendSignal('rescue_team_bot', 10, lat + 0.0005, lon + 0.0005, "URGENT rescue operations starting at central square. danger level high.");
    await new Promise(r => setTimeout(r, 500));
    await sendSignal('citizen_reporter', 7, lat - 0.0005, lon, "The fire is spreading towards the library. we need more water!");

    console.log("Signals sent. Open the map, click the incident, and check the Live Social Intel panel.");
};

runTest();
