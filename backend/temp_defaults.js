const { getPool } = require('./config/db');

getPool().then(async pool => {
    const queries = [
        'ALTER TABLE SesionesTurno ADD CONSTRAINT DF_SesionesTurno_FechaApertura DEFAULT (GETDATE()) FOR StuFechaApertura;',
        'ALTER TABLE SesionesTurno ADD CONSTRAINT DF_SesionesTurno_MontoInicial DEFAULT 0 FOR StuMontoInicial;',
        "ALTER TABLE SesionesTurno ADD CONSTRAINT DF_SesionesTurno_Estado DEFAULT 'ABIERTA' FOR StuEstado;",
        'ALTER TABLE TransaccionesCaja ADD CONSTRAINT DF_TransaccionesCaja_Fecha DEFAULT (GETDATE()) FOR TcaFecha;',
        "ALTER TABLE TransaccionesCaja ADD CONSTRAINT DF_Tca_Moneda DEFAULT 'UYU' FOR TcaMonedaBase;",
        "ALTER TABLE TransaccionesCaja ADD CONSTRAINT DF_Tca_Estado DEFAULT 'COMPLETADO' FOR TcaEstado;",
        'ALTER TABLE TransaccionesCaja ADD CONSTRAINT DF_Tca_Bruto DEFAULT 0 FOR TcaTotalBruto;',
        'ALTER TABLE TransaccionesCaja ADD CONSTRAINT DF_Tca_Neto DEFAULT 0 FOR TcaTotalNeto;',
        'ALTER TABLE TransaccionesCaja ADD CONSTRAINT DF_Tca_Ajuste DEFAULT 0 FOR TcaTotalAjuste;',
        'ALTER TABLE TransaccionesCaja ADD CONSTRAINT DF_Tca_Cobrado DEFAULT 0 FOR TcaTotalCobrado;'
    ];

    for(let q of queries) {
        try {
            await pool.request().query(q);
        } catch (e) {
            console.error('Failed querying:', q, '--> Error:', e.message);
        }
    }
    process.exit(0);
});
