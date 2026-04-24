const { getPool } = require('./config/db');
getPool().then(async pool => {
    try {
        const statements = [
            "ALTER TABLE AutorizacionesSinPago ADD DEFAULT (GETDATE()) FOR AuzFecha",
            "ALTER TABLE AutorizacionesSinPago ADD DEFAULT 0 FOR AuzMontoDeuda",
            "ALTER TABLE AutorizacionesSinPago ADD DEFAULT 'ACTIVA' FOR AuzEstado",

            "ALTER TABLE CondicionesPago ADD DEFAULT 0 FOR CPaDiasVencimiento",
            "ALTER TABLE CondicionesPago ADD DEFAULT 0 FOR CPaPermiteCuotas",
            "ALTER TABLE CondicionesPago ADD DEFAULT 1 FOR CPaCantidadCuotas",
            "ALTER TABLE CondicionesPago ADD DEFAULT 0 FOR CPaDiasEntreCuotas",
            "ALTER TABLE CondicionesPago ADD DEFAULT 1 FOR CPaActiva",

            "ALTER TABLE ImputacionPago ADD DEFAULT (GETDATE()) FOR ImpFecha",

            "ALTER TABLE TiposMovimiento ADD DEFAULT '' FOR TmoPrefijo",
            "ALTER TABLE TiposMovimiento ADD DEFAULT 0 FOR TmoAfectaSaldo",
            "ALTER TABLE TiposMovimiento ADD DEFAULT 0 FOR TmoGeneraDeuda",
            "ALTER TABLE TiposMovimiento ADD DEFAULT 0 FOR TmoAplicaRecurso",
            "ALTER TABLE TiposMovimiento ADD DEFAULT 0 FOR TmoRequiereDoc",
            "ALTER TABLE TiposMovimiento ADD DEFAULT 1 FOR TmoActivo",
            "ALTER TABLE TiposMovimiento ADD DEFAULT 99 FOR TmoOrden",
            "ALTER TABLE TiposMovimiento ADD DEFAULT (GETDATE()) FOR TmoFechaAlta",

            "ALTER TABLE TransaccionDetalle ADD DEFAULT 0 FOR TdeImporteOriginal",
            "ALTER TABLE TransaccionDetalle ADD DEFAULT 0 FOR TdeAjuste",
            "ALTER TABLE TransaccionDetalle ADD DEFAULT 0 FOR TdeImporteFinal",
            "ALTER TABLE TransaccionDetalle ADD DEFAULT 1 FOR TdePagado"
        ];
        
        for (let s of statements) {
            await pool.request().query(s);
            console.log('OK:', s);
        }
        console.log('Todos los Defaults insertados correctamente!');
    } catch(e) { console.log('Error:', e.message); }
    process.exit(0);
});
