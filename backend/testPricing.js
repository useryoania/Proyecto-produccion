const axios = require('axios');
async function run() {
    try {
        const res = await axios.post('http://127.0.0.1:5000/api/logistics/deposit-recalculate', {
            items: [{ qr: 'ORD-174' }]
        });
        console.log("RECALC RESULT:", JSON.stringify(res.data, null, 2));
    } catch(e) {
        if(e.response) {
            console.log("STATUS:", e.response.status);
            console.log("DATA TYPE:", typeof e.response.data);
            console.log("DATA:", e.response.data);
        } else {
            console.error("NO RESPONSE:", e.message);
        }
    }
}
run();
