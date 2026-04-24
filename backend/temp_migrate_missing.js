const { getPool } = require('./config/db');
getPool().then(async pool => {
    try {
        const queries = [
            'SELECT * INTO AutorizacionesSinPago FROM [Base yoa].dbo.AutorizacionesSinPago',
            'ALTER TABLE AutorizacionesSinPago ADD PRIMARY KEY (AuzIdAutorizacion)',

            'SELECT * INTO CondicionesPago FROM [Base yoa].dbo.CondicionesPago',
            'ALTER TABLE CondicionesPago ADD PRIMARY KEY (CPaIdCondicion)',

            'SELECT * INTO ImputacionPago FROM [Base yoa].dbo.ImputacionPago',
            'ALTER TABLE ImputacionPago ADD PRIMARY KEY (ImpIdImputacion)',

            'SELECT * INTO TiposMovimiento FROM [Base yoa].dbo.TiposMovimiento',
            'ALTER TABLE TiposMovimiento ADD PRIMARY KEY (TmoId)',

            'SELECT * INTO TransaccionDetalle FROM [Base yoa].dbo.TransaccionDetalle',
            'ALTER TABLE TransaccionDetalle ADD PRIMARY KEY (TdeIdDetalle)'
        ];

        for(let q of queries) {
            await pool.request().query(q);
            console.log('OK:', q.split('FROM')[0]);
        }
        console.log('Tablas copiadas con exito!');
    } catch(e) { console.log('ERROR:', e.message); }
    process.exit(0);
});
