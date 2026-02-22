const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const signals = [
    // 1. Initial 911 calls about smoke (downtown area, distinct from flood)
    { source: '911_call', type: 'fire', latitude: 17.3950, longitude: 78.4967, urgency: 5 },
    // 2. Social media reports of visible flames
    { source: 'twitter', type: 'fire', latitude: 17.3952, longitude: 78.4965, urgency: 7 },
    // 3. Temperature sensor spike triggers high urgency
    { source: 'thermal_sensor', type: 'fire', latitude: 17.3948, longitude: 78.4970, urgency: 9 },
    // 4. Drone verification confirming spread
    { source: 'drone_surveillance', type: 'fire', latitude: 17.3955, longitude: 78.4960, urgency: 8 },
    // 5. Offline mesh confirming firefighter unit deployment request
    { source: 'offline_mesh', type: 'fire', latitude: 17.3950, longitude: 78.4967, urgency: 6, endpoint: '/offline-signal' }
];

const runSimulation = async () => {
    console.log("🔥 Starting Urban Fire Disaster Simulation...");

    for (const [index, signal] of signals.entries()) {
        console.log(`\nSending Signal ${index + 1}: ${signal.source.toUpperCase()} (${signal.urgency})`);

        try {
            const endpoint = signal.endpoint ? `${API_URL}${signal.endpoint}` : `${API_URL}/signal`;
            const { endpoint: _, ...payload } = signal;

            await axios.post(endpoint, payload);
            console.log("✅ Signal Sent");
        } catch (error) {
            console.error("❌ Failed to send signal:", error.message);
        }

        // Wait between signals to simulate real-time escalation
        await sleep(2000);
    }

    console.log("\n🚒 Simulation Complete. Check Dashboard for new 'Urban Fire' alert.");
};

runSimulation();
