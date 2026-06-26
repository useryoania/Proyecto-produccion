require('dotenv').config();
const { getCatalog } = require('./controllers/wmsController');

async function testGetCatalog() {
    console.log('Testing getCatalog...');
    const req = {};
    const res = {
        json: (data) => console.log('Response JSON:', JSON.stringify(data, null, 2)),
        status: (code) => {
            console.log('Status code:', code);
            return {
                json: (data) => console.log('Error JSON:', data)
            };
        }
    };
    
    await getCatalog(req, res);
}

testGetCatalog();
