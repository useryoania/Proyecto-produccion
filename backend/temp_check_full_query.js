const { getPool } = require('./config/db');

getPool().then(async pool => {
    try {
        console.log('-- Running full query --');
        await pool.request().query(`
        DECLARE @TC DECIMAL(18,4) = ISNULL((SELECT TOP 1 CotDolar FROM dbo.Cotizaciones ORDER BY CotFecha DESC), 40.0);
  
        SELECT
          c.CliIdCliente,
          c.Nombre,
          c.NombreFantasia,
          c.Email,
          c.CodCliente,
          
          -- Sumatoria global de saldos en la moneda base del sistema (UYU)
          -- Aquí asumo que la base de la empresa es UYU y convierto cuentas USD a UYU
          SUM(
            CASE 
              WHEN mon.MonSimbolo = 'U$S' THEN cc.CueSaldoActual * @TC
              ELSE cc.CueSaldoActual
            END
          ) AS SaldoGlobalLocal,
          SUM(CASE WHEN cc.CueActiva = 1 THEN 1 ELSE 0 END) AS TotalCuentasActivas,
          
          -- Deuda total calculada consolidada desde DeudaDocumento
          ISNULL((
            SELECT SUM(CASE 
                         WHEN dmon.MonSimbolo = 'U$S' THEN dd.DDeImportePendiente * @TC 
                         ELSE dd.DDeImportePendiente END)
            FROM dbo.DeudaDocumento dd
            JOIN dbo.CuentasCliente dcc ON dcc.CueIdCuenta = dd.CueIdCuenta
            LEFT JOIN dbo.Monedas dmon ON dmon.MonIdMoneda = dcc.MonIdMoneda
            WHERE dcc.CliIdCliente = c.CliIdCliente 
              AND dd.DDeEstado IN ('PENDIENTE','VENCIDO','PARCIAL')
          ), 0) AS DeudaVencidaTotal,
          
          -- Cantidad de documentos vencidos para ese cliente (congelada al estado)
          ISNULL((
            SELECT COUNT(*)
            FROM dbo.DeudaDocumento dd
            JOIN dbo.CuentasCliente dcc ON dcc.CueIdCuenta = dd.CueIdCuenta
            WHERE dcc.CliIdCliente = c.CliIdCliente 
              AND dd.DDeEstado IN ('VENCIDO','PARCIAL') 
              AND dd.DDeFechaVencimiento < CAST(GETDATE() AS DATE)
          ), 0) AS CantidadDocumentosVencidos

        FROM      dbo.Clientes c WITH(NOLOCK)
        LEFT JOIN dbo.CuentasCliente cc  WITH(NOLOCK) ON cc.CliIdCliente = c.CliIdCliente
        LEFT JOIN dbo.Monedas mon        WITH(NOLOCK) ON mon.MonIdMoneda = cc.MonIdMoneda
        WHERE 1=1 
        GROUP BY c.CliIdCliente, c.Nombre, c.NombreFantasia, c.Email, c.CodCliente
        ORDER BY DeudaVencidaTotal DESC, c.Nombre
        `);
        console.log('OK Query Executed!');
    } catch(e) {
        console.log('Error in full query:', e.message);
    }
    process.exit(0);
});
