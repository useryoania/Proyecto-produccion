const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function test() {
    try {
        const username = process.env.MACROSOFT_API_USER || 'user';
        const password = process.env.MACROSOFT_API_PASSWORD || '1234';
        const baseUrl = process.env.ERP_API_URL || 'http://localhost:6061';

        console.log('Authenticating...');
        const authRes = await axios.post(baseUrl + '/authenticate', { username, password });
        const token = authRes.data.token || authRes.data.accessToken || authRes.data;

        console.log('Fetching clients page 1...');
        const res = await axios.get(baseUrl + '/clientes?page=1', {
            headers: { Authorization: 'Bearer ' + token }
        });

        let allClients = res.data.data || [];
        const totalPages = res.data.pages || 1;
        console.log('Total pages:', totalPages);

        if (totalPages > 1) {
            console.log('Fetching remaining pages in parallel...');
            const requests = [];
            // fetching pages 2 to totalPages
            for (let i = 2; i <= totalPages; i++) {
                requests.push(axios.get(baseUrl + '/clientes?page=' + i, {
                    headers: { Authorization: 'Bearer ' + token }
                }).catch(e => ({ data: { data: [] } })));
            }

            const results = await Promise.all(requests);
            for (let r of results) {
                if (r && r.data && r.data.data) {
                    allClients = allClients.concat(r.data.data);
                }
            }
        }

        console.log('Total clients loaded:', allClients.length);

    } catch (e) {
        console.error(e.response ? e.response.data : e.message);
    }
}
test();
