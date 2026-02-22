const axios = require('axios');

const API_URL = 'http://localhost:3000/api/signal';

const sendSignal = async (source, urgency, lat, lon) => {
    try {
        await axios.post(API_URL, {
            id: `move-${Date.now()}-${Math.random()}`,
            source,
            type: 'fire',
            latitude: lat,
            longitude: lon,
            urgency,
            timestamp: Date.now()
        });
        console.log(`[${new Date().toLocaleTimeString()}] Signal from ${source} at ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    } catch (e) {
        console.error(`Failed: ${e.message}`);
    }
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const runSimulation = async () => {
    console.log("🚀 Starting Dynamic Movement Simulation (Drifting Incident)...");

    let baseLat = 17.4000;
    let baseLon = 78.4300;

    // Step 1: Establish the event with 3 signals
    console.log("Establishing initial cluster...");
    await sendSignal('sensor_static_1', 8, baseLat, baseLon);
    await sendSignal('sensor_static_2', 9, baseLat + 0.0005, baseLon - 0.0005);
    await sendSignal('mobile_user_1', 8, baseLat - 0.0005, baseLon + 0.0005);

    await sleep(5000);

    // Step 2: Simulate drift over 10 steps
    for (let i = 1; i <= 10; i++) {
        // Shift coordinates north-west
        baseLat += 0.0015;
        baseLon -= 0.0015;
        console.log(`Drift Step ${i}/10...`);

        // Send a burst of signals at the NEW location to shift the average faster
        for (let j = 0; j < 3; j++) {
            await sendSignal(`drone_recon_${i}_${j}`, 9, baseLat + (Math.random() * 0.0002), baseLon + (Math.random() * 0.0002));
            await sendSignal(`mobile_user_${i}_${j}`, 8, baseLat - (Math.random() * 0.0002), baseLon - (Math.random() * 0.0002));
        }

        await new Promise(r => setTimeout(r, 8000));
    }

    console.log("✅ Simulation Complete. You should see a fading trail and a velocity indicator on the map.");
};

runSimulation();
