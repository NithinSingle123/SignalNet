const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const signals = [
    // 1. Initial Twitter noise (low urgency)
    { source: 'twitter', type: 'flood', latitude: 17.3850, longitude: 78.4867, urgency: 3 },
    // 2. Another Twitter report nearby
    { source: 'twitter', type: 'flood', latitude: 17.3855, longitude: 78.4870, urgency: 4 },
    // 3. Traffic data confirms slowdown (medium urgency) -> Should trigger EVENT creation
    { source: 'traffic', type: 'flood', latitude: 17.3860, longitude: 78.4865, urgency: 6 },
    // 4. Sensor data (high urgency) -> spike severity
    { source: 'sensor', type: 'flood', latitude: 17.3852, longitude: 78.4868, urgency: 9 },
    // 5. Offline mesh confirmation
    { source: 'offline_mesh', type: 'flood', latitude: 17.3845, longitude: 78.4875, urgency: 5, endpoint: '/offline-signal' }
];

const runSimulation = async () => {
    console.log("🚀 Starting Flood Simulation...");

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

        // Wait between signals to simulate real-time
        await sleep(3000);
    }

    console.log("\n🌊 Simulation Complete. Check Dashboard.");
};

runSimulation();
