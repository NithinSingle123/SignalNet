const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Generate distinct incidents far apart (approx 1km+ separation)
const incidents = [
    { name: "North Bridge Collision", type: "accident", lat: 17.4000, lon: 78.4800, urgency: 8 },
    { name: "South Market Fire", type: "fire", lat: 17.3700, lon: 78.4800, urgency: 9 },
    { name: "East End Flooding", type: "flood", lat: 17.3850, lon: 78.5100, urgency: 6 },
    { name: "West Power Outage", type: "power_failure", lat: 17.3850, lon: 78.4500, urgency: 5 },
    { name: "Central Riot", type: "riot", lat: 17.3850, lon: 78.4867, urgency: 7 } // Overlaps with original flood but diff type/time potentially? No, processor checks dist.
];

const runSimulation = async () => {
    console.log("🌍 Starting City-Wide Multi-Incident Simulation...");
    console.log("Generating 4 DISTINCT incidents separated by >1km...");

    for (const incident of incidents) {
        // Send a cluster of 3 signals for EACH incident to ensure it triggers an event
        // Processor requires >= 3 signals to create an event
        console.log(`\n🚨 Triggering Incident: ${incident.name}`);

        for (let i = 0; i < 3; i++) {
            // Add slight jitter to effectively test clustering
            const jitterLat = (Math.random() - 0.5) * 0.0005; // ~50m jitter
            const jitterLon = (Math.random() - 0.5) * 0.0005;

            const payload = {
                source: ['twitter', 'sensor', '911_call'][i],
                type: incident.type,
                latitude: incident.lat + jitterLat,
                longitude: incident.lon + jitterLon,
                urgency: incident.urgency
            };

            try {
                await axios.post(`${API_URL}/signal`, payload);
                process.stdout.write('.');
            } catch (error) {
                console.error("X", error.message);
            }
            await sleep(200);
        }
        console.log(" Done.");
        await sleep(1000); // Pause between major incidents
    }

    console.log("\n✅ Simulation Complete. You should see 5 distinct alerts on the map.");
};

runSimulation();
