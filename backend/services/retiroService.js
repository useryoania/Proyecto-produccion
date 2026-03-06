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
async function crearRetiro(transaction, { ordIds, totalCost, lugarRetiro, usuarioAlta, formaRetiro, codCliente, moneda }) {
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
        .query(`
            INSERT INTO OrdenesRetiro 
                (OReIdOrdenRetiro, OReCostoTotalOrden, LReIdLugarRetiro, OReFechaAlta, OReUsuarioAlta, OReEstadoActual, OReFechaEstadoActual, FormaRetiro, CodCliente, MonIdMoneda)
            VALUES 
                (@OReId, @Costo, @Lugar, GETDATE(), @Usr, @Estado, GETDATE(), @FormaRetiro, @CodCliente, @Moneda)
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

module.exports = { crearRetiro };
