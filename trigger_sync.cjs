const axios = require('axios');

async function triggerSync() {
    try {
        console.log("Triggering Sync...");
        const res = await axios.post('http://localhost:5000/api/rest-sync/run');
        console.log("Sync Result:", res.data);
    } catch (err) {
        if (err.response) {
            console.error("Sync Failed Status:", err.response.status);
            console.error("Sync Failed Data:", err.response.data);
        } else {
            console.error("Sync Failed:", err.message);
        }
    }
}

triggerSync();
