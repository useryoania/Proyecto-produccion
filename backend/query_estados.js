require('dotenv').config({ path: 'c:/Integracion/User-Macrosoft/Proyecto-produccion/backend/.env' });
const sql = require('mssql');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function getEstados() {
    try {
        await sql.connect(config);
        
        try {
            const res1 = await sql.query("SELECT * FROM ConfigEstados WITH(NOLOCK) ORDER BY AreaID, Orden");
            console.log('--- ConfigEstados ---');
            console.dir(res1.recordset, { maxArrayLength: null });
        } catch (e) {
            console.log('Error ConfigEstados', e.message);
        }

        try {
            const res2 = await sql.query("SELECT * FROM EstadosOrdenes WITH(NOLOCK) ORDER BY EstadoID");
            console.log('--- EstadosOrdenes ---');
            console.dir(res2.recordset, { maxArrayLength: null });
        } catch (e) {
            console.log('Error EstadosOrdenes', e.message);
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}
getEstados();
