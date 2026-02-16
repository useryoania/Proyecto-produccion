const axios = require('axios');

async function testLogin() {
    console.log("Testing Login for 'Kasak-1899'...");
    try {
        const res = await axios.post('http://localhost:5000/api/web-auth/login', {
            identifier: 'Kasak-1899',
            password: '2'
        });
        console.log("✅ Login Success:", res.data);
    } catch (error) {
        if (error.response) {
            console.error("❌ AXIOS RESPONSE ERROR:", error.response.status, error.response.data);
        } else if (error.request) {
            console.error("❌ AXIOS NO RESPONSE:", error.message);
        } else {
            console.error("❌ SETUP ERROR:", error.message);
        }
    }
}

testLogin();
