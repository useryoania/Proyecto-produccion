/**
 * fix_contabilidad_pendiente.cjs
 * 
 * PROPÓSITO: Detecta y repara órdenes en DEPOSITO que tienen PedidosCobranza
 *            pero MontoContabilizado = NULL (contabilidad incompleta/faltante).
 * 
 * USO MANUAL:  node fix_contabilidad_pendiente.cjs
 * USO DRY-RUN: node fix_contabilidad_pendiente.cjs --dry-run   (solo muestra, no toca nada)
 */

const { getPool, sql } = require('./backend/config/db');
const contabilidadService = require('./backend/services/contabilidadService');

const isDryRun = process.argv.includes('--dry-run');

async function main() {
    const pool = await getPool();
    console.log(`\n🔍 Iniciando ${isDryRun ? '[DRY-RUN] ' : ''}reparación contable...`);

    // ─────────────────────────────────────────────────────────────────
    // PASO 1: Detectar inconsistencias
    // Criterio: Orden en depósito (OrdEstadoActual=1) con PedidosCobranza
    //           donde MontoContabilizado IS NULL (nunca se contabilizó)
    // ─────────────────────────────────────────────────────────────────
    const inconsistencias = await pool.request().query(`
        SELECT 
            od.OrdCodigoOrden       AS CodigoOrden,
            od.OrdFechaIngresoOrden AS FechaDeposito,
            pc.ID                   AS PCId,
            pc.NoDocERP,
            pc.MontoTotal,
            pc.MontoContabilizado,
            pc.MetrosContabilizados,
            o.OrdenID,
            o.CliIdCliente,
            o.DescripcionTrabajo
        FROM OrdenesDeposito od
        INNER JOIN PedidosCobranza pc 
            ON LTRIM(RTRIM(pc.NoDocERP)) = LTRIM(RTRIM(od.OrdCodigoOrden))
        INNER JOIN Ordenes o 
            ON LTRIM(RTRIM(o.NoDocERP)) = LTRIM(RTRIM(pc.NoDocERP))
        WHERE od.OrdEstadoActual = 1
          AND (pc.MontoContabilizado IS NULL)
        ORDER BY od.OrdFechaIngresoOrden ASC
    `);

    const rows = inconsistencias.recordset;

    if (rows.length === 0) {
        console.log('✅ No hay inconsistencias. Todas las órdenes en depósito están contabilizadas.');
        process.exit(0);
    }

    console.log(`\n⚠️  Se encontraron ${rows.length} orden(es) SIN CONTABILIZAR:\n`);
    rows.forEach(r => {
        console.log(`  • ${r.CodigoOrden} (PC#${r.PCId}) | Monto=$${r.MontoTotal} | Ingresó: ${new Date(r.FechaDeposito).toLocaleString()}`);
    });

    if (isDryRun) {
        console.log('\n[DRY-RUN] No se realizó ningún cambio. Quitá --dry-run para reparar.');
        process.exit(0);
    }

    // ─────────────────────────────────────────────────────────────────
    // PASO 2: Reparar cada inconsistencia
    // ─────────────────────────────────────────────────────────────────
    let reparadas = 0;
    let fallidas = 0;

    for (const row of rows) {
        const tag = `[REPAIR] [${row.CodigoOrden}]`;
        try {
            console.log(`\n${tag} Procesando...`);

            // Obtener las líneas del detalle de cobranza
            const detReq = await pool.request()
                .input('PID', sql.Int, row.PCId)
                .query('SELECT Cantidad, Subtotal AS TotalLinea, ProIdProducto AS IDProdReact FROM PedidosCobranzaDetalle WHERE PedidoCobranzaID = @PID');

            const detalles = detReq.recordset;

            if (detalles.length === 0) {
                console.log(`${tag} ⚠️  Sin detalles en PedidosCobranzaDetalle — saltando.`);
                fallidas++;
                continue;
            }

            // Total metros del detalle
            const totalMetros = detalles.reduce((acc, d) => acc + (parseFloat(d.Cantidad) || 0), 0);
            const currentMonto = parseFloat(row.MontoTotal) || 0;

            // Contabilizar línea por línea con la misma lógica del Check-in
            for (const d of detalles) {
                const lineImp = parseFloat(d.TotalLinea) || 0;
                const lineQty = parseFloat(d.Cantidad) || 0;

                // Detectar si tiene plan activo para este producto
                let planMetrosDisp = 0;
                let planIdCtb = null;
                if (d.IDProdReact && row.CliIdCliente) {
                    const planRes = await pool.request()
                        .input('Cli', sql.Int, row.CliIdCliente)
                        .input('Pro', sql.Int, d.IDProdReact)
                        .query(`SELECT TOP 1 PlaIdPlan,
                                    ISNULL(PlaMetrosTotal, 0) - ISNULL(PlaMetrosConsumidos, 0) AS MetrosDisponibles
                                FROM PlanesMetros WITH(NOLOCK)
                                WHERE CliIdCliente = @Cli AND ProIdProducto = @Pro
                                  AND PlaActivo = 1
                                  AND (PlaFechaVencimiento IS NULL OR PlaFechaVencimiento >= CAST(GETDATE() AS DATE))
                                ORDER BY PlaFechaVencimiento ASC`);
                    if (planRes.recordset.length > 0) {
                        planMetrosDisp = parseFloat(planRes.recordset[0].MetrosDisponibles) || 0;
                        planIdCtb = planRes.recordset[0].PlaIdPlan;
                    }
                }

                const hayPlan = planIdCtb !== null && planMetrosDisp > 0;

                if (hayPlan && lineQty <= planMetrosDisp) {
                    // CASO A: Cobertura total → ENTREGA a $0
                    console.log(`${tag}   → ENTREGA TOTAL prepago (${lineQty}m, $0)`);
                    await contabilidadService.procesarEventoContable('ENTREGA', {
                        OrdIdOrden: row.OrdenID, CliIdCliente: row.CliIdCliente,
                        ProIdProducto: d.IDProdReact, Cantidad: lineQty, Importe: 0,
                        CodigoOrden: row.CodigoOrden, NombreTrabajo: `[REPAIR] ${row.DescripcionTrabajo}`,
                        UsuarioAlta: 1, MonIdMoneda: 1
                    });

                } else if (hayPlan && planMetrosDisp > 0 && lineQty > planMetrosDisp) {
                    // CASO B: Cobertura parcial → ENTREGA + ORDEN
                    const metrosRest = lineQty - planMetrosDisp;
                    const importeExc = parseFloat((lineImp * (metrosRest / lineQty)).toFixed(2));
                    console.log(`${tag}   → ENTREGA PARCIAL (${planMetrosDisp}m $0) + ORDEN (${metrosRest}m $${importeExc})`);
                    await contabilidadService.procesarEventoContable('ENTREGA', {
                        OrdIdOrden: row.OrdenID, CliIdCliente: row.CliIdCliente,
                        Cantidad: planMetrosDisp, Importe: 0,
                        CodigoOrden: row.CodigoOrden, NombreTrabajo: `[REPAIR-PREPAGO] ${row.DescripcionTrabajo}`,
                        UsuarioAlta: 1, MonIdMoneda: 1
                    });
                    if (importeExc > 0 || metrosRest > 0) {
                        await contabilidadService.procesarEventoContable('ORDEN', {
                            OrdIdOrden: row.OrdenID, CliIdCliente: row.CliIdCliente,
                            Cantidad: metrosRest, Importe: importeExc,
                            CodigoOrden: row.CodigoOrden, NombreTrabajo: `[REPAIR-EXCEDENTE] ${row.DescripcionTrabajo}`,
                            UsuarioAlta: 1, MonIdMoneda: 1
                        });
                    }

                } else if (lineImp > 0) {
                    // CASO C: Sin plan → ORDEN normal
                    console.log(`${tag}   → ORDEN normal (${lineQty}m, $${lineImp})`);
                    await contabilidadService.procesarEventoContable('ORDEN', {
                        OrdIdOrden: row.OrdenID, CliIdCliente: row.CliIdCliente,
                        ProIdProducto: d.IDProdReact, Cantidad: lineQty, Importe: lineImp,
                        CodigoOrden: row.CodigoOrden, NombreTrabajo: `[REPAIR] ${row.DescripcionTrabajo}`,
                        UsuarioAlta: 1, MonIdMoneda: 1
                    });
                } else {
                    console.log(`${tag}   → Línea sin importe ni plan, saltando.`);
                }
            }

            // Marcar como contabilizada
            await pool.request()
                .input('M',   sql.Decimal(18, 2), currentMonto)
                .input('Met', sql.Decimal(18, 2), totalMetros)
                .input('PID', sql.Int, row.PCId)
                .query('UPDATE PedidosCobranza SET MontoContabilizado = @M, MetrosContabilizados = @Met WHERE ID = @PID');

            console.log(`${tag} ✅ Reparada correctamente.`);
            reparadas++;

        } catch (err) {
            console.error(`${tag} ❌ Error al reparar:`, err.message);
            fallidas++;
        }
    }

    console.log(`\n═══════════════════════════════════════`);
    console.log(`Reparadas: ${reparadas} | Fallidas: ${fallidas}`);
    console.log('═══════════════════════════════════════\n');
    process.exit(fallidas > 0 ? 1 : 0);
}

main().catch(e => { console.error('Error crítico:', e.message); process.exit(1); });
