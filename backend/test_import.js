const axios = require('axios');

async function test() {
    try {
        const payload = {
            docNumbers: ["DF-82488"] // I'll just post a known order or any fake order
        };
        // wait we don't have a known doc number. Let's send a fake payload that replicates the frontend sent data.
        
        let p = {
            docNumbers: ["FAKE-123"],
            payloads: [
                {
                    nombreTrabajo: "TEST CORTE",
                    codigoOrdenReal: "FAKE-123",
                    idExterno: "FAKE-123",
                    servicios: [
                        {
                            areaId: "CORTE",
                            esPrincipal: true,
                            cabecera: {
                                cantidad: 1
                            },
                            items: []
                        }
                    ],
                    clienteInfo: {
                        idReact: 1
                    }
                }
            ]
        };

        const res = await axios.post('http://localhost:5000/api/import-on-demand/import', p);
        console.log("Success:", JSON.stringify(res.data, null, 2));

    } catch (e) {
        console.error("Error:", e.response ? e.response.data : e.message);
    }
}
test();
