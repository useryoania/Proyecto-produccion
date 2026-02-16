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
        console.error("❌ Login Failed:", error.response ? error.response.data : error.message);
    }
}

testLogin();
