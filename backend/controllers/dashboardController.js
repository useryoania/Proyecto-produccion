const { getPool } = require('../config/db');
const logger = require('../utils/logger');

const safe = async (fn, fallback, label) => {
    try { return await fn(); }
    catch (e) { logger.error(`[DASHBOARD] ${label}:`, e.message); return fallback; }
};

/**
 * GET /api/dashboard/deposito
 */
exports.getDepositoDashboard = async (req, res) => {
    try {
        const pool = await getPool();

        const [
            estadosRes,
            totalActivasRes,
            porEmpaquetarRes,
            porLevantarRes,
            pagosRes,
            tipoClienteRes,
            entraronHoyRes,
            despachadasHoyRes,
            retirosActivosRes,
            retirosPorEstadoRes,
        ] = await Promise.all([

            // 1. OrdenesDeposito activas por estado
            // Estados terminales: 9=Entregado, 10=Cancelado, 11=Perdida
            safe(() => pool.request().query(`
                SELECT o.OrdEstadoActual AS estado,
                       eo.EOrNombreEstado AS nombre,
                       COUNT(*) AS total
                FROM OrdenesDeposito o WITH(NOLOCK)
                LEFT JOIN EstadosOrdenes eo WITH(NOLOCK) ON eo.EOrIdEstadoOrden = o.OrdEstadoActual
                WHERE o.OrdEstadoActual NOT IN (9, 10, 11)
                GROUP BY o.OrdEstadoActual, eo.EOrNombreEstado
                ORDER BY o.OrdEstadoActual
            `), { recordset: [] }, 'estadosPorEstado'),

            // 2. Total activas
            safe(() => pool.request().query(`
                SELECT COUNT(*) AS total
                FROM OrdenesDeposito WITH(NOLOCK)
                WHERE OrdEstadoActual NOT IN (9, 10, 11)
            `), { recordset: [{ total: 0 }] }, 'totalActivas'),

            // 3. Retiros por empaquetar (estado 1 o 2)
            safe(() => pool.request().query(`
                SELECT COUNT(*) AS total
                FROM OrdenesRetiro WITH(NOLOCK)
                WHERE OReEstadoActual IN (1, 2)
            `), { recordset: [{ total: 0 }] }, 'porEmpaquetar'),

            // 4. Retiros listos para levantar (estado 7 y 8)
            safe(() => pool.request().query(`
                SELECT COUNT(*) AS total
                FROM OrdenesRetiro WITH(NOLOCK)
                WHERE OReEstadoActual IN (7, 8)
            `), { recordset: [{ total: 0 }] }, 'porLevantar'),

            // 5. Pagadas vs pendientes (desde OrdenesRetiro donde vive PagIdPago)
            safe(() => pool.request().query(`
                SELECT
                    SUM(CASE WHEN r.PagIdPago IS NOT NULL THEN 1 ELSE 0 END) AS pagas,
                    SUM(CASE WHEN r.PagIdPago IS NULL     THEN 1 ELSE 0 END) AS pendientes
                FROM OrdenesRetiro r WITH(NOLOCK)
                WHERE r.OReEstadoActual NOT IN (5, 6)
            `), { recordset: [{ pagas: 0, pendientes: 0 }] }, 'pagos'),

            // 6. Por tipo de cliente (basado en OrdenesRetiro activas)
            safe(() => pool.request().query(`
                SELECT ISNULL(tc.TClDescripcion, 'Sin tipo') AS tipo,
                       COUNT(DISTINCT r.OReIdOrdenRetiro) AS total
                FROM OrdenesRetiro r WITH(NOLOCK)
                LEFT JOIN OrdenesDeposito o WITH(NOLOCK) ON o.OReIdOrdenRetiro = r.OReIdOrdenRetiro
                LEFT JOIN Clientes c WITH(NOLOCK) ON c.CliIdCliente = o.CliIdCliente
                LEFT JOIN TiposClientes tc WITH(NOLOCK) ON tc.TClIdTipoCliente = c.TClIdTipoCliente
                WHERE r.OReEstadoActual NOT IN (5, 6)
                GROUP BY tc.TClDescripcion
                ORDER BY total DESC
            `), { recordset: [] }, 'tipoCliente'),

            // 7. Entraron hoy
            safe(() => pool.request().query(`
                SELECT COUNT(*) AS total
                FROM OrdenesDeposito WITH(NOLOCK)
                WHERE CAST(OrdFechaIngresoOrden AS DATE) = CAST(GETDATE() AS DATE)
                  AND OrdEstadoActual NOT IN (9, 10, 11)
            `), { recordset: [{ total: 0 }] }, 'entraronHoy'),

            // 8. Despachadas hoy (En camino=8 o Entregado=9, con fecha de hoy)
            safe(() => pool.request().query(`
                SELECT COUNT(*) AS total
                FROM OrdenesDeposito WITH(NOLOCK)
                WHERE OrdEstadoActual IN (8, 9)
                  AND CAST(OrdFechaEstadoActual AS DATE) = CAST(GETDATE() AS DATE)
            `), { recordset: [{ total: 0 }] }, 'despachadasHoy'),

            // 9. Retiros activos totales
            safe(() => pool.request().query(`
                SELECT COUNT(*) AS total
                FROM OrdenesRetiro WITH(NOLOCK)
                WHERE OReEstadoActual NOT IN (5, 6)
            `), { recordset: [{ total: 0 }] }, 'retirosActivos'),

            // 10. OrdenesRetiro activas por estado
            safe(() => pool.request().query(`
                SELECT r.OReEstadoActual AS estado,
                       er.EORNombreEstado AS nombre,
                       COUNT(DISTINCT r.OReIdOrdenRetiro) AS total
                FROM OrdenesRetiro r WITH(NOLOCK)
                LEFT JOIN EstadosOrdenesRetiro er WITH(NOLOCK) ON er.EORIdEstadoOrden = r.OReEstadoActual
                WHERE r.OReEstadoActual NOT IN (5, 6)
                GROUP BY r.OReEstadoActual, er.EORNombreEstado
                ORDER BY r.OReEstadoActual
            `), { recordset: [] }, 'retirosPorEstado'),
        ]);

        res.json({
            ordenesPorEstado:      estadosRes.recordset,
            totalActivas:          totalActivasRes.recordset[0]?.total ?? 0,
            retirosPorEmpaquetar:  porEmpaquetarRes.recordset[0]?.total ?? 0,
            retirosPorLevantar:    porLevantarRes.recordset[0]?.total ?? 0,
            pagas:                 pagosRes.recordset[0]?.pagas ?? 0,
            pendientesPago:        pagosRes.recordset[0]?.pendientes ?? 0,
            porTipoCliente:        tipoClienteRes.recordset,
            entraronHoy:           entraronHoyRes.recordset[0]?.total ?? 0,
            despachadasHoy:        despachadasHoyRes.recordset[0]?.total ?? 0,
            retirosActivos:        retirosActivosRes.recordset[0]?.total ?? 0,
            retirosPorEstado:      retirosPorEstadoRes.recordset,
        });

    } catch (err) {
        logger.error('[DASHBOARD DEPÓSITO] Error general:', err);
        res.status(500).json({ error: err.message });
    }
};
