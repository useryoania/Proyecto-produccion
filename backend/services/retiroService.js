/**
 * retiroService.js — Servicio unificado para crear órdenes de retiro.
 * Centraliza la lógica compartida entre ordenesRetiroController (local)
 * y webOrdersController (web), eliminando duplicación de código.
 */
const { sql } = require('../config/db');

/**
 * Determina el estado inicial del retiro según el tipo de cliente.
 * TClIdTipoCliente: 1=Comun, 2=Semanal, 3=Rollo por adelantado, 4=Deudor
 * Semanal y Rollo no pagan al retirar → estado 4 (Abonado de antemano)
 * Comun y Deudor pagan al retirar → estado 1 (Ingresado)
 */
function resolverEstadoPorTipoCliente(tipoCliente) {
    return (tipoCliente === 2 || tipoCliente === 3) ? 4 : 1;
}

/**
 * Crea una orden de retiro completa dentro de una transacción existente.
 *
 * @param {Transaction} transaction — transacción SQL ya iniciada
 * @param {Object} params
 * @param {number[]} params.ordIds — IDs numéricos de OrdenesDeposito a incluir en el retiro
 * @param {number} params.totalCost — costo total del retiro
 * @param {number} params.lugarRetiro — ID del lugar de retiro
 * @param {number} params.usuarioAlta — ID del usuario que crea el retiro
 * @param {string} params.formaRetiro — 'RL' (Retiro Local) o 'RW' (Retiro Web)
 * @param {number} [params.codCliente] — código del cliente
 * @param {string} [params.moneda] — moneda del retiro ('UYU' o 'USD')
 * @returns {number} OReIdOrdenRetiro — ID del retiro creado
 */
async function crearRetiro(transaction, { ordIds, totalCost, lugarRetiro, usuarioAlta, formaRetiro, codCliente, moneda, direccion, departamento, localidad, agenciaId }) {
    if (!ordIds || ordIds.length === 0) {
        throw new Error('No se proporcionaron órdenes válidas para el retiro.');
    }

    // Determinar estado del retiro y CodCliente según tipo de cliente (lógica centralizada)
    const tipoRes = await transaction.request()
        .input('OrdId', sql.Int, ordIds[0])
        .query(`
            SELECT c.TClIdTipoCliente, c.CodCliente 
            FROM OrdenesDeposito o WITH(NOLOCK)
            JOIN Clientes c WITH(NOLOCK) ON c.CliIdCliente = o.CliIdCliente
            WHERE o.OrdIdOrden = @OrdId
        `);
    const tipoCliente = tipoRes.recordset[0]?.TClIdTipoCliente || 1;
    const estadoOrdenRetiro = resolverEstadoPorTipoCliente(tipoCliente);
    // Si no se pasó codCliente, resolverlo desde la orden
    const finalCodCliente = codCliente || tipoRes.recordset[0]?.CodCliente || null;

    // 1. Generar ID para OrdenesRetiro con UPDLOCK (previene race condition)
    const maxIdRes = await transaction.request().query(
        'SELECT ISNULL(MAX(OReIdOrdenRetiro), 0) + 1 AS NextId FROM OrdenesRetiro WITH (UPDLOCK)'
    );
    const OReIdOrdenRetiro = maxIdRes.recordset[0].NextId;

    // 2. INSERT OrdenesRetiro (con CodCliente, MonIdMoneda, FormaRetiro)
    await transaction.request()
        .input('OReId', sql.Int, OReIdOrdenRetiro)
        .input('Costo', sql.Float, totalCost || 0)
        .input('Lugar', sql.Int, lugarRetiro)
        .input('Estado', sql.Int, estadoOrdenRetiro)
        .input('Usr', sql.Int, usuarioAlta)
        .input('FormaRetiro', sql.VarChar(2), formaRetiro || 'RL')
        .input('CodCliente', sql.Int, finalCodCliente)
        .input('Moneda', sql.VarChar(10), moneda || null)
        .input('Dir', sql.NVarChar(500), direccion || null)
        .input('Depto', sql.NVarChar(200), departamento || null)
        .input('Loc', sql.NVarChar(200), localidad || null)
        .input('AgenciaId', sql.Int, agenciaId ? parseInt(agenciaId, 10) : null)
        .query(`
            INSERT INTO OrdenesRetiro 
                (OReIdOrdenRetiro, OReCostoTotalOrden, LReIdLugarRetiro, OReFechaAlta, OReUsuarioAlta, OReEstadoActual, OReFechaEstadoActual, FormaRetiro, CodCliente, MonIdMoneda, DireccionEnvio, DepartamentoEnvio, LocalidadEnvio, AgenciaEnvio)
            VALUES 
                (@OReId, @Costo, @Lugar, GETDATE(), @Usr, @Estado, GETDATE(), @FormaRetiro, @CodCliente, @Moneda, @Dir, @Depto, @Loc, @AgenciaId)
        `);

    // 3. INSERT HistoricoEstadosOrdenesRetiro (estado inicial)
    await transaction.request()
        .input('OReId', sql.Int, OReIdOrdenRetiro)
        .input('Estado', sql.Int, estadoOrdenRetiro)
        .input('Usr', sql.Int, usuarioAlta)
        .query(`
            INSERT INTO HistoricoEstadosOrdenesRetiro (OReIdOrdenRetiro, EORIdEstadoOrden, HEOFechaEstado, HEOUsuarioAlta)
            VALUES (@OReId, @Estado, GETDATE(), @Usr)
        `);

    // 4. Generar IDs para RelOrdenesRetiroOrdenes con UPDLOCK
    const maxRelRes = await transaction.request().query(
        'SELECT ISNULL(MAX(RORIdOrdenRetiroOrden), 0) AS MaxId FROM RelOrdenesRetiroOrdenes WITH (UPDLOCK)'
    );
    let nextRelId = maxRelRes.recordset[0].MaxId;

    for (const ordId of ordIds) {
        nextRelId++;
        await transaction.request()
            .input('RelId', sql.Int, nextRelId)
            .input('RetiroId', sql.Int, OReIdOrdenRetiro)
            .input('OrdenId', sql.Int, ordId)
            .query(`
                INSERT INTO RelOrdenesRetiroOrdenes (RORIdOrdenRetiroOrden, OReIdOrdenRetiro, OrdIdOrden)
                VALUES (@RelId, @RetiroId, @OrdenId)
            `);
    }

    // 5. UPDATE OrdenesDeposito (estado=4, asignar lugar y retiroId)
    //    + INSERT HistoricoEstadosOrdenes
    for (const ordId of ordIds) {
        await transaction.request()
            .input('OrdId', sql.Int, ordId)
            .input('Lugar', sql.Int, lugarRetiro)
            .input('RetiroId', sql.Int, OReIdOrdenRetiro)
            .input('Usr', sql.Int, usuarioAlta)
            .query(`
                UPDATE OrdenesDeposito SET 
                    LReIdLugarRetiro = @Lugar, 
                    OReIdOrdenRetiro = @RetiroId,
                    OrdEstadoActual = 4, 
                    OrdFechaEstadoActual = GETDATE()
                WHERE OrdIdOrden = @OrdId;

                INSERT INTO HistoricoEstadosOrdenes (OrdIdOrden, EOrIdEstadoOrden, HEOFechaEstado, HEOUsuarioAlta)
                VALUES (@OrdId, 4, GETDATE(), @Usr);
            `);
    }

    return OReIdOrdenRetiro;
}

/**
 * Marca un retiro y todas sus órdenes hijas como entregadas.
 * Centraliza la lógica que estaba duplicada en 4 funciones distintas.
 *
 * @param {Transaction|Request} transactionOrReq — transacción SQL o request
 * @param {number} OReIdOrdenRetiro — ID numérico del retiro
 * @param {Date} fecha — fecha de entrega
 * @param {number} usuarioId — ID del usuario que entrega
 */
async function marcarEntregado(transactionOrReq, OReIdOrdenRetiro, fecha, usuarioId) {
    // Soportar tanto transaction.request() como new sql.Request(transaction)
    const request = typeof transactionOrReq.request === 'function'
        ? transactionOrReq.request()
        : new sql.Request(transactionOrReq);

    await request
        .input('ID', sql.Int, OReIdOrdenRetiro)
        .input('Fec', sql.DateTime, fecha)
        .input('Usr', sql.Int, usuarioId)
        .query(`
            INSERT INTO HistoricoEstadosOrdenes (OrdIdOrden, EOrIdEstadoOrden, HEOFechaEstado, HEOUsuarioAlta)
            SELECT OrdIdOrden, 9, @Fec, @Usr FROM OrdenesDeposito WHERE OReIdOrdenRetiro = @ID;

            UPDATE OrdenesDeposito SET OrdEstadoActual = 9, OrdFechaEstadoActual = @Fec WHERE OReIdOrdenRetiro = @ID;

            UPDATE OrdenesRetiro SET OReEstadoActual = 5, ORePasarPorCaja = 0, OReFechaEstadoActual = @Fec WHERE OReIdOrdenRetiro = @ID;
            INSERT INTO HistoricoEstadosOrdenesRetiro (OReIdOrdenRetiro, EORIdEstadoOrden, HEOFechaEstado, HEOUsuarioAlta) VALUES (@ID, 5, @Fec, @Usr);
        `);
}

/**
 * Registra un pago para un retiro, actualiza estados y hace auto-cierre si corresponde.
 * Centraliza la lógica que estaba duplicada en pagosController y webRetirosController.
 *
 * @param {Transaction} transaction — transacción SQL ya iniciada
 * @param {Object} params
 * @param {number} params.ordenRetiroId — ID numérico del retiro
 * @param {number} params.metodoPagoId — ID del método de pago
 * @param {number} params.monedaId — ID de la moneda
 * @param {number} params.monto — monto del pago
 * @param {number[]} [params.orderNumbers] — IDs de OrdenesDeposito a actualizar
 * @param {number} params.usuarioId — ID del usuario que registra el pago
 * @param {number} params.nuevoEstado — estado nuevo del retiro (3=Abonado, 8=Empaquetado y abonado)
 * @returns {{ pagoId: number }} — ID del pago creado
 */
async function registrarPago(transaction, { ordenRetiroId, metodoPagoId, monedaId, monto, orderNumbers, usuarioId, nuevoEstado }) {
    // 1. INSERT Pagos
    const createReq = typeof transaction.request === 'function'
        ? transaction.request()
        : new sql.Request(transaction);

    const pagoResult = await createReq
        .input('metodoPagoId', sql.Int, metodoPagoId)
        .input('monedaId', sql.Int, monedaId)
        .input('monto', sql.Float, monto)
        .input('fecha', sql.DateTime, new Date())
        .input('usuarioId', sql.Int, usuarioId)
        .query(`
            INSERT INTO Pagos (MPaIdMetodoPago, PagIdMonedaPago, PagMontoPago, PagFechaPago, PagUsuarioAlta)
            OUTPUT INSERTED.PagIdPago
            VALUES (@metodoPagoId, @monedaId, @monto, @fecha, @usuarioId)
        `);

    const pagoId = pagoResult.recordset[0].PagIdPago;

    // 2. UPDATE OrdenesRetiro (estado + PagIdPago)
    const updateRetReq = typeof transaction.request === 'function'
        ? transaction.request()
        : new sql.Request(transaction);

    await updateRetReq
        .input('ordenRetiroId', sql.Int, ordenRetiroId)
        .input('nuevoEstado', sql.Int, nuevoEstado)
        .input('pagoId', sql.Int, pagoId)
        .query(`
            UPDATE OrdenesRetiro 
            SET PagIdPago = @pagoId, OReEstadoActual = @nuevoEstado, OReFechaEstadoActual = GETDATE(), ORePasarPorCaja = 0
            WHERE OReIdOrdenRetiro = @ordenRetiroId;
        `);

    // 3. INSERT Histórico retiro
    const histRetReq = typeof transaction.request === 'function'
        ? transaction.request()
        : new sql.Request(transaction);

    await histRetReq
        .input('ordenRetiroId', sql.Int, ordenRetiroId)
        .input('nuevoEstado', sql.Int, nuevoEstado)
        .input('usuarioId', sql.Int, usuarioId)
        .query(`
            INSERT INTO HistoricoEstadosOrdenesRetiro (OReIdOrdenRetiro, EORIdEstadoOrden, HEOFechaEstado, HEOUsuarioAlta)
            VALUES (@ordenRetiroId, @nuevoEstado, GETDATE(), @usuarioId);
        `);

    // 4. UPDATE OrdenesDeposito + Histórico (si hay orderNumbers)
    if (orderNumbers && orderNumbers.length > 0) {
        const updateReq = typeof transaction.request === 'function'
            ? transaction.request()
            : new sql.Request(transaction);

        updateReq.input('pagoId', sql.Int, pagoId);
        orderNumbers.forEach((oid, i) => updateReq.input(`oid${i}`, sql.Int, parseInt(oid, 10)));
        const inClause = orderNumbers.map((_, i) => `@oid${i}`).join(',');

        await updateReq.query(`
            UPDATE OrdenesDeposito SET PagIdPago = @pagoId, OrdEstadoActual = 7, OrdFechaEstadoActual = GETDATE()
            WHERE OrdIdOrden IN (${inClause});
        `);

        const histReq = typeof transaction.request === 'function'
            ? transaction.request()
            : new sql.Request(transaction);

        histReq.input('Usr', sql.Int, usuarioId);
        orderNumbers.forEach((oid, i) => histReq.input(`oid${i}`, sql.Int, parseInt(oid, 10)));
        const histValues = orderNumbers.map((_, i) => `(@oid${i}, 7, GETDATE(), @Usr)`).join(',');

        await histReq.query(`
            INSERT INTO HistoricoEstadosOrdenes (OrdIdOrden, EOrIdEstadoOrden, HEOFechaEstado, HEOUsuarioAlta)
            VALUES ${histValues};
        `);
    }

    // 5. AUTO-CIERRE: si todas las órdenes hijas están pagas → estado 4 (Abonado)
    const checkReq = typeof transaction.request === 'function'
        ? transaction.request()
        : new sql.Request(transaction);

    const todasPagasRes = await checkReq
        .input('ordenRetiroId', sql.Int, ordenRetiroId)
        .query(`
            SELECT 
                COUNT(*) AS total,
                SUM(CASE WHEN od.PagIdPago IS NOT NULL THEN 1 ELSE 0 END) AS pagas
            FROM OrdenesDeposito od WITH(NOLOCK)
            WHERE od.OReIdOrdenRetiro = @ordenRetiroId
              AND od.OrdEstadoActual NOT IN (6, 9)
        `);

    const { total, pagas } = todasPagasRes.recordset[0];

    if (total > 0 && total === pagas) {
        const cierreReq = typeof transaction.request === 'function'
            ? transaction.request()
            : new sql.Request(transaction);

        await cierreReq
            .input('ordenRetiroId', sql.Int, ordenRetiroId)
            .input('pagoId', sql.Int, pagoId)
            .input('usuarioId', sql.Int, usuarioId)
            .query(`
                UPDATE OrdenesRetiro 
                SET PagIdPago = @pagoId, OReEstadoActual = 4, OReFechaEstadoActual = GETDATE(), ORePasarPorCaja = 0
                WHERE OReIdOrdenRetiro = @ordenRetiroId
                  AND (PagIdPago IS NULL OR PagIdPago = 0);

                INSERT INTO HistoricoEstadosOrdenesRetiro (OReIdOrdenRetiro, EORIdEstadoOrden, HEOFechaEstado, HEOUsuarioAlta)
                VALUES (@ordenRetiroId, 4, GETDATE(), @usuarioId);
            `);

        console.log(`[AUTO-PAGO] OrdenRetiro R-${ordenRetiroId} marcada como Abonada automáticamente.`);
    }

    return { pagoId };
}

module.exports = { crearRetiro, marcarEntregado, registrarPago };
