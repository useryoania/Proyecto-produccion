const axios = require('axios');

async function testEndpoint() {
    try {
        console.log("Testing /api/rolls/board?area=DF");
        const res = await axios.get('http://localhost:5000/api/rolls/board?area=DF');
        console.log("Status:", res.status);
        console.log("Data keys:", Object.keys(res.data));
    } catch (err) {
        console.error("Error calling endpoint:");
        if (err.response) {
            console.error("Status:", err.response.status);
            console.error("Data:", err.response.data);
        } else {
            console.error(err.message);
        }
    }
}

testEndpoint();
