const axios = require('axios');

async function testToken() {
    try {
        const tokenRes = await axios.post(`https://administracionuser.uy/api/apilogin/generate-token`, {
            apiKey: "api_key_google_123sadas12513_user"
        });
        const token = tokenRes.data.token;
        console.log("Token obtenido:", token);

        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        console.log("Payload del Token:", JSON.parse(jsonPayload));
    } catch (e) {
        console.error(e.message);
    }
}
testToken();
