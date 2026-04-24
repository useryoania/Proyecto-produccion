const { getPool } = require('./backend/config/db');

async function main() {
    const pool = await getPool();

    // 1. Ver muestra de PedidosCobranza
    const r1 = await pool.request().query(`
        SELECT TOP 3 ID, NoDocERP, MontoTotal, MontoContabilizado, MetrosContabilizados, FechaGeneracion
        FROM PedidosCobranza ORDER BY ID DESC
    `);
    console.log('\n=== PedidosCobranza (ultimas 3) ===');
    r1.recordset.forEach(r => console.log(r));

    // 2. La consulta clave: ordenes en deposito con PedidosCobranza pero SIN contabilizar
    const r2 = await pool.request().query(`
        SELECT 
            od.OrdCodigoOrden,
            od.OrdFechaIngresoOrden,
            pc.ID          as PCId,
            pc.MontoTotal,
            pc.MontoContabilizado,
            pc.MetrosContabilizados
        FROM OrdenesDeposito od
        INNER JOIN PedidosCobranza pc ON LTRIM(RTRIM(pc.NoDocERP)) = LTRIM(RTRIM(od.OrdCodigoOrden))
        WHERE od.OrdEstadoActual = 1
        ORDER BY od.OrdFechaIngresoOrden DESC
    `);
    console.log('\n=== Ordenes en Deposito con PedidosCobranza ===');
    const sinContabilizar = r2.recordset.filter(r => !r.MontoContabilizado && !r.MetrosContabilizados);
    console.log(`Total: ${r2.recordset.length} | Sin contabilizar: ${sinContabilizar.length}`);
    r2.recordset.forEach(r => {
        const estado = (!r.MontoContabilizado && !r.MetrosContabilizados) ? '⚠️  SIN CONTABILIZAR' : '✅';
        console.log(`  ${estado} ${r.OrdCodigoOrden} | PC#${r.PCId} | Monto=${r.MontoTotal} | Contabilizado=${r.MontoContabilizado} | Metros=${r.MetrosContabilizados}`);
    });

    process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
