const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env' });

async function test() {
    try {
        const username = process.env.MACROSOFT_API_USER || 'user';
        const password = process.env.MACROSOFT_API_PASSWORD || '1234';
        const baseUrl = process.env.ERP_API_URL || 'http://localhost:6061';

        console.log('Authenticating...');
        const authRes = await axios.post(baseUrl + '/authenticate', { username, password });
        const token = authRes.data.token || authRes.data.accessToken || authRes.data;

        console.log('Fetching clients...');
        const res = await axios.get(baseUrl + '/clientes', {
            headers: { Authorization: 'Bearer ' + token }
        });

        console.log('Keys in response:', Object.keys(res.data));
        if (res.data.data) {
            console.log('Array length in data.data:', res.data.data.length);
        } else if (Array.isArray(res.data)) {
            console.log('Array length in data:', res.data.length);
        } else {
            console.log('Type of data:', typeof res.data);
        }

        // try with parameters pageSize or limit
        const res2 = await axios.get(baseUrl + '/clientes?pageSize=1000&limit=1000&top=1000', {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (res2.data.data) {
            console.log('With params, Array length in data.data:', res2.data.data.length);
        } else if (Array.isArray(res2.data)) {
            console.log('With params, Array length in data:', res2.data.length);
        }

        console.log("Metadata?", res.data.meta || res.data.pagination || "No pagination/meta field");

    } catch (e) {
        console.error(e.response ? e.response.data : e.message);
    }
}
test();
