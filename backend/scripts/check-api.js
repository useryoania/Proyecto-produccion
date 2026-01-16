const axios = require('axios');

async function checkApi() {
    try {
        const response = await axios.get('http://localhost:5000/api/production-file-control/ordenes');
        console.log("Status:", response.status);
        if (response.data && response.data.length > 0) {
            console.log("Keys of first item:", Object.keys(response.data[0]));
            console.log("First item:", response.data[0]);
        } else {
            console.log("No data returned or empty list");
        }
    } catch (error) {
        console.error("Error:", error.message);
    }
}

checkApi();
