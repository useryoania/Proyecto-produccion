const sql = require('mssql');

const config = {
  server: 'userdb.cv8sc0gu009m.us-east-2.rds.amazonaws.com',
  database: 'ProductionControl',
  user: 'admin',
  password: '7loFPNdyrRylJAKiZYK7',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function testConnection() {
  try {
    console.log('🔗 Probando conexión...');
    const pool = await sql.connect(config);
    console.log('✅ Conexión exitosa!');
    
    const result = await pool.request().query('SELECT DB_NAME() as db_name, @@VERSION as version');
    console.log('📊 Base de datos:', result.recordset[0].db_name);
    console.log('🔧 Versión:', result.recordset[0].version.split('\n')[0]);
    
    await pool.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
    
    if (err.message.includes('Login failed')) {
      console.log('💡 Error de autenticación - Verifica usuario y contraseña');
    } else if (err.message.includes('getaddrinfo')) {
      console.log('💡 Error de red - Verifica el nombre del servidor');
    } else if (err.message.includes('certificate')) {
      console.log('💡 Error de certificado - Usando configuración sin SSL');
    }
  }
}

testConnection();