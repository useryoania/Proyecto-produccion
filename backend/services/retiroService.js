/**
 * retiroService.js — Servicio unificado para crear órdenes de retiro.
 * Centraliza la lógica compartida entre ordenesRetiroController (local)
 * y webOrdersController (web), eliminando duplicación de código.
 */
const { sql, getPool } = require('../config/db');
const logger = require('../utils/logger');

/**
 * resolverEstadoPorTipoCliente
 * SOLO como fallback cuando no hay datos de contabilidad disponibles.
 * La lógica real usa verificarRecursoCliente() para cada retiro.
 */
function resolverEstadoPorTipoCliente(tipoCliente) {
    return (tipoCliente === 2 || tipoCliente === 3) ? 4 : 1;
}

/**
 * verificarRecursoCliente
 * Chequea si el cliente tiene un plan de recursos activo para el producto dado.
 * Devuelve: tieneRecurso, planId, saldoDisponible, nombreArticulo, unidad, motivo.
 */
async function verificarRecursoCliente(transaction, { CliIdCliente, ProIdProducto }) {
    if (!CliIdCliente || !ProIdProducto) {
        return { tieneRecurso: false, motivo: 'sin_datos' };
    }

    try {
        const planRes = await transaction.request()
            .input('CliIdCliente',  sql.Int, CliIdCliente)
            .input('ProIdProducto', sql.Int, ProIdProducto)
            .query(`
                SELECT TOP 1
                    p.PlaIdPlan,
                    p.PlaCantidadTotal,
                    p.PlaCantidadTotal - p.PlaCantidadUsada AS SaldoDisponible,
                    ISNULL(a.Nombre, ISNULL(cu.NombreArticulo, 'Material')) AS NombreArticulo,
                    ISNULL(cu.UniSimbolo, ISNULL(cu.UnidadLabel, 'mts')) AS Unidad
                FROM dbo.PlanesMetros p WITH(NOLOCK)
                JOIN dbo.CuentasCliente cu WITH(NOLOCK) ON cu.CueIdCuenta = p.CueIdCuenta
                LEFT JOIN dbo.Articulos a  WITH(NOLOCK) ON a.IDArticulo  = @ProIdProducto
                WHERE p.CliIdCliente  = @CliIdCliente
                  AND p.ProIdProducto = @ProIdProducto
                  AND p.PlaActivo     = 1
                  AND (p.PlaFechaVencimiento IS NULL
                    OR p.PlaFechaVencimiento >= CAST(GETDATE() AS DATE))
                ORDER BY p.PlaFechaAlta DESC
            `);

        if (!planRes.recordset.length) {
            return { tieneRecurso: false, motivo: 'sin_plan' };
        }

        const plan = planRes.recordset[0];
        return {
            tieneRecurso:     true,
            planId:           plan.PlaIdPlan,
            saldoDisponible:  Number(plan.SaldoDisponible),
            totalPlan:        Number(plan.PlaCantidadTotal),
            nombreArticulo:   plan.NombreArticulo,
            unidad:           plan.Unidad,
            motivo:           `plan_${plan.PlaIdPlan}`,
        };
    } catch (err) {
        logger.warn(`[RECURSO] Error verificando plan CliId=${CliIdCliente}: ${err.message}. Sin recurso.`);
        return { tieneRecurso: false, motivo: 'error_verificacion' };
    }
}

/**
 * verificarCicloSemanal
 * Solo para clientes tipo 2 (Semanal): verifica ciclo de crédito abierto.
 * Devuelve { activo: bool, saldo: number, simbolo: string }.
 */
async function verificarCicloSemanal(transaction, CliIdCliente) {
    try {
        const cicloRes = await transaction.request()
            .input('CliIdCliente', sql.Int, CliIdCliente)
            .query(`
                SELECT TOP 1
                    cc.CicIdCiclo,
                    cc.CicFechaCierre,
                    cu.CueSaldoActual,
                    ISNULL(mo.MonSimbolo, '$U') AS MonSimbolo
                FROM   dbo.CiclosCredito  cc WITH(NOLOCK)
                JOIN   dbo.CuentasCliente cu WITH(NOLOCK) ON cu.CueIdCuenta = cc.CueIdCuenta
                LEFT JOIN dbo.Monedas     mo WITH(NOLOCK) ON mo.MonIdMoneda = cu.MonIdMoneda
                WHERE  cu.CliIdCliente = @CliIdCliente
                  AND  cc.CicEstado    = 'ABIERTO'
                  AND  cc.CicFechaCierre >= CAST(GETDATE() AS DATE)
            `);

        if (!cicloRes.recordset.length) {
            logger.warn(`[RECURSO] Semanal CliId=${CliIdCliente} → sin ciclo activo.`);
            return { activo: false, saldo: 0, simbolo: '$U' };
        }
        const row = cicloRes.recordset[0];
        return { activo: true, fechaCierre: row.CicFechaCierre, saldo: Number(row.CueSaldoActual ?? 0), simbolo: row.MonSimbolo };
    } catch (err) {
        logger.warn(`[RECURSO] Error verificando ciclo CliId=${CliIdCliente}: ${err.message}.`);
        return { activo: false, saldo: 0, simbolo: '$U' };
    }
}

/**
 * verificarSaldoMonetario
 * Verifica si el cliente tiene saldo positivo en alguna cuenta monetaria.
 */
async function verificarSaldoMonetario(transaction, CliIdCliente) {
    try {
        const res = await transaction.request()
            .input('CliIdCliente', sql.Int, CliIdCliente)
            .query(`
                SELECT TOP 1
                    cu.CueSaldoActual,
                    ISNULL(mo.MonSimbolo, '$U') AS MonSimbolo
                FROM dbo.CuentasCliente cu WITH(NOLOCK)
                LEFT JOIN dbo.Monedas mo WITH(NOLOCK) ON mo.MonIdMoneda = cu.MonIdMoneda
                WHERE cu.CliIdCliente = @CliIdCliente
                  AND cu.CueSaldoActual > 0
                ORDER BY cu.CueSaldoActual DESC
            `);
        if (!res.recordset.length) return { tieneSaldo: false, saldo: 0, simbolo: '$U' };
        const row = res.recordset[0];
        return { tieneSaldo: true, saldo: Number(row.CueSaldoActual), simbolo: row.MonSimbolo };
    } catch (err) {
        logger.warn(`[SALDO] Error verificando saldo CliId=${CliIdCliente}: ${err.message}.`);
        return { tieneSaldo: false, saldo: 0, simbolo: '$U' };
    }
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

    // ── VALIDACIÓN: excluir órdenes que ya pertenecen a un retiro activo ──
    const checkParams = ordIds.map((_, i) => `@dup${i}`).join(',');
    const dupReq = transaction.request();
    ordIds.forEach((id, i) => dupReq.input(`dup${i}`, sql.Int, id));
    const dupRes = await dupReq.query(`
        SELECT OrdIdOrden FROM OrdenesDeposito WITH(NOLOCK)
        WHERE OrdIdOrden IN (${checkParams})
          AND OReIdOrdenRetiro IS NOT NULL
          AND OrdEstadoActual NOT IN (6, 9)
    `);
    const yaAsignadas = new Set(dupRes.recordset.map(r => r.OrdIdOrden));
    const ordIdsLibres = ordIds.filter(id => !yaAsignadas.has(id));
    if (ordIdsLibres.length === 0) {
        throw new Error('Todas las órdenes seleccionadas ya pertenecen a un retiro activo.');
    }
    if (yaAsignadas.size > 0) {
        logger.warn(`[crearRetiro] ${yaAsignadas.size} orden(es) ya asignadas a otro retiro, se excluyen: ${[...yaAsignadas].join(', ')}`);
    }
    ordIds = ordIdsLibres;

    // Datos del cliente (iguales para todas las órdenes del retiro)
    const tipoRes = await transaction.request()
        .input('OrdId', sql.Int, ordIds[0])
        .query(`
        SELECT c.TClIdTipoCliente, c.CodCliente, o.CliIdCliente
            FROM OrdenesDeposito o WITH(NOLOCK)
            JOIN Clientes c WITH(NOLOCK) ON c.CliIdCliente = o.CliIdCliente
            WHERE o.OrdIdOrden = @OrdId
        `);
    const tipoCliente     = tipoRes.recordset[0]?.TClIdTipoCliente || 1;
    const CliIdCliente    = tipoRes.recordset[0]?.CliIdCliente     || null;
    const finalCodCliente = codCliente || tipoRes.recordset[0]?.CodCliente || null;

    // Datos de CADA orden: producto, cantidad, nombre del material y si ya tiene pago
    const ordParamsClause = ordIds.map((_, i) => `@ord${i}`).join(',');
    const ordDataReq = transaction.request();
    ordIds.forEach((id, i) => ordDataReq.input(`ord${i}`, sql.Int, id));
    const ordDataRes = await ordDataReq.query(`
        SELECT
            od.OrdIdOrden,
            od.ProIdProducto,
            od.OrdCantidad,
            od.PagIdPago,
            ISNULL(a.Descripcion, ISNULL(od.OrdNombreTrabajo, 'Material')) AS NombreProducto
        FROM   dbo.OrdenesDeposito od WITH(NOLOCK)
        LEFT JOIN dbo.Articulos    a  WITH(NOLOCK) ON a.ProIdProducto = od.ProIdProducto
        WHERE  od.OrdIdOrden IN (${ordParamsClause})
    `);
    const ordenesData     = ordDataRes.recordset;
    const pagoExistenteId = ordenesData.find(o => o.PagIdPago)?.PagIdPago || null;

    // ── ESTADO DEL RETIRO: evaluar CADA orden individualmente ───────────────────
    //
    //  Regla: el retiro es autorizado (estado 4) SOLO si TODAS las órdenes
    //  están cubiertas (por plan de recursos o por ciclo semanal).
    //  Si CUALQUIERA necesita pago en caja → todo el retiro queda en estado 1.
    //
    //  Los metros ya fueron descontados al INGRESO (hookEntregaMetros).
    //  Aquí solo se VERIFICA el estado de autorización.

    let estadoOrdenRetiro;
    const coberturaOrdenes = {};  // { [OrdIdOrden]: '...' }  para descripción final

    if (pagoExistenteId) {
        estadoOrdenRetiro = 3; // Al menos una orden ya tiene pago registrado

    } else if (tipoCliente === 2 || tipoCliente === 3) {
        // TODO: DEUDA TÉCNICA — Bypass temporal para clientes tipo 2 (Semanal) y tipo 3.
        // Cuando PlanesMetros y CiclosCredito estén completamente implementados
        // (UI de gestión + carga de datos en producción), eliminar este bloque y
        // dejar que caigan al else de abajo para que pasen por la verificación real
        // de verificarRecursoCliente() y verificarCicloSemanal().
        estadoOrdenRetiro = 4;
        logger.info(`[RETIRO] Cliente tipo ${tipoCliente} → Estado 4 (Abonado de antemano) directo [bypass temporal].`);

    } else {
        // Verificar ciclo semanal del cliente (solo tipo 2)
        let cicloInfo = { activo: false, saldo: 0, simbolo: '$U' };
        if (tipoCliente === 2) {
            cicloInfo = await verificarCicloSemanal(transaction, CliIdCliente);
        }

        // Verificar saldo monetario (para tipo 3 adelantado o cualquier cliente con crédito)
        let saldoInfo = { tieneSaldo: false, saldo: 0, simbolo: '$U' };
        if (tipoCliente === 3 || (!cicloInfo.activo && CliIdCliente)) {
            saldoInfo = await verificarSaldoMonetario(transaction, CliIdCliente);
        }

        // Evaluar cada orden individualmente
        let todasCubiertas = true;

        for (const orden of ordenesData) {
            const { OrdIdOrden, ProIdProducto, OrdCantidad, NombreProducto } = orden;
            const mat = NombreProducto || 'Material';  // material de esta orden

            // ¿Cubierta por plan de recursos?
            if (ProIdProducto) {
                const recurso = await verificarRecursoCliente(transaction, { CliIdCliente, ProIdProducto });
                if (recurso.tieneRecurso) {
                    const cant     = parseFloat(OrdCantidad || 0).toFixed(2);
                    const restante = (recurso.saldoDisponible - parseFloat(OrdCantidad || 0)).toFixed(2);
                    // La nota incluye el material de la orden y los datos del plan
                    const nota = `Plan #${recurso.planId} — ${mat} | Consume: ${cant} ${recurso.unidad} | Quedan: ${restante} ${recurso.unidad}`;
                    coberturaOrdenes[OrdIdOrden] = nota;
                    logger.info(`[RETIRO] Orden ${OrdIdOrden} cubierta por plan #${recurso.planId} (restante: ${restante} ${recurso.unidad})`);
                    continue;
                }
            }

            // ¿Cubierta por ciclo semanal?
            if (cicloInfo.activo) {
                // Mostramos el material de la orden y el tipo de cobertura (no el saldo negativo)
                const hasta = cicloInfo.fechaCierre
                    ? new Date(cicloInfo.fechaCierre).toLocaleDateString('es-UY')
                    : '';
                const nota = `Ciclo semanal — ${mat}${hasta ? ` | Vigente hasta ${hasta}` : ''}`;
                coberturaOrdenes[OrdIdOrden] = nota;
                logger.info(`[RETIRO] Orden ${OrdIdOrden} cubierta por ciclo semanal`);
                continue;
            }

            // ¿Cubierta por saldo monetario positivo?
            if (saldoInfo.tieneSaldo) {
                const nota = `Saldo disponible — ${mat} | ${saldoInfo.simbolo} ${saldoInfo.saldo.toFixed(2)} a favor`;
                coberturaOrdenes[OrdIdOrden] = nota;
                logger.info(`[RETIRO] Orden ${OrdIdOrden} cubierta por saldo ${saldoInfo.simbolo} ${saldoInfo.saldo}`);
                continue;
            }

            // Ninguna cobertura → necesita pago en caja
            logger.info(`[RETIRO] Orden ${OrdIdOrden} sin cobertura → requiere pago`);
            todasCubiertas = false;
            break;
        }

        estadoOrdenRetiro = todasCubiertas ? 4 : 1;
    }

    // 1. Generar ID para OrdenesRetiro con UPDLOCK (previene race condition)
    const maxIdRes = await transaction.request().query(
        'SELECT ISNULL(MAX(OReIdOrdenRetiro), 0) + 1 AS NextId FROM OrdenesRetiro WITH (UPDLOCK)'
    );
    const OReIdOrdenRetiro = maxIdRes.recordset[0].NextId;

    // 2. INSERT OrdenesRetiro (con CodCliente, MonIdMoneda, FormaRetiro, PagIdPago si ya está pago)
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
        .input('PagIdExistente', sql.Int, pagoExistenteId)
        .query(`
            INSERT INTO OrdenesRetiro 
                (OReIdOrdenRetiro, OReCostoTotalOrden, LReIdLugarRetiro, OReFechaAlta, OReUsuarioAlta, OReEstadoActual, OReFechaEstadoActual, FormaRetiro, CodCliente, MonIdMoneda, DireccionEnvio, DepartamentoEnvio, LocalidadEnvio, AgenciaEnvio, PagIdPago)
            VALUES 
                (@OReId, @Costo, @Lugar, GETDATE(), @Usr, @Estado, GETDATE(), @FormaRetiro, @CodCliente, @Moneda, @Dir, @Depto, @Loc, @AgenciaId, @PagIdExistente)
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

    // 5. UPDATE OrdenesDeposito (estado=4, asignar lugar, retiroId y nota de cobertura)
    //    + INSERT HistoricoEstadosOrdenes
    for (const ordId of ordIds) {
        const notaCobertura = coberturaOrdenes?.[ordId] || null;
        const req = transaction.request()
            .input('OrdId', sql.Int, ordId)
            .input('Lugar', sql.Int, lugarRetiro)
            .input('RetiroId', sql.Int, OReIdOrdenRetiro)
            .input('Usr', sql.Int, usuarioAlta);

        if (notaCobertura) {
            // OVERWRITE OrdNombreTrabajo con la nota limpia de cobertura
            // (no se concatena al contenido previo para evitar confusiones de lectura)
            req.input('Nota', sql.NVarChar(500), notaCobertura);
            await req.query(`
                UPDATE OrdenesDeposito SET 
                    LReIdLugarRetiro     = @Lugar, 
                    OReIdOrdenRetiro     = @RetiroId,
                    OrdEstadoActual      = 4, 
                    OrdFechaEstadoActual = GETDATE(),
                    OrdNombreTrabajo     = @Nota
                WHERE OrdIdOrden = @OrdId;

                INSERT INTO HistoricoEstadosOrdenes (OrdIdOrden, EOrIdEstadoOrden, HEOFechaEstado, HEOUsuarioAlta)
                VALUES (@OrdId, 4, GETDATE(), @Usr);
            `);
        } else {
            await req.query(`
                UPDATE OrdenesDeposito SET 
                    LReIdLugarRetiro     = @Lugar, 
                    OReIdOrdenRetiro     = @RetiroId,
                    OrdEstadoActual      = 4, 
                    OrdFechaEstadoActual = GETDATE()
                WHERE OrdIdOrden = @OrdId;

                INSERT INTO HistoricoEstadosOrdenes (OrdIdOrden, EOrIdEstadoOrden, HEOFechaEstado, HEOUsuarioAlta)
                VALUES (@OrdId, 4, GETDATE(), @Usr);
            `);
        }
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

            -- Liberar estante automáticamente al entregar
            DELETE FROM OcupacionEstantes
            WHERE OrdenRetiro = COALESCE(
                (SELECT FormaRetiro FROM OrdenesRetiro WITH(NOLOCK) WHERE OReIdOrdenRetiro = @ID),
                'R'
            ) + '-' + CAST(@ID AS VARCHAR);
        `);

    // ── Descuento de recursos (Planes de Metros) ─────────────────────────────
    // Por cada orden del retiro, si el cliente tiene cuenta METROS/KG,
    // descontamos la cantidad de su plan activo.
    // SE EJECUTA DE FORMA ASÍNCRONA (Fire and Forget) para no dejar la transacción SQL abierta.
    (async () => {
        try {
            const svc = require('./contabilidadService');
            const pool = await (require('../config/db')).getPool();

            // Obtener órdenes con su cliente, artículo y cantidad
            const ordenesRes = await pool.request()
                .input('OReId', sql.Int, OReIdOrdenRetiro)
                .query(`
                    SELECT
                        od.OrdIdOrden,
                        od.OrdCantidad,
                        od.OrdCodigo,
                        o.CodCliente,
                        cl.CliIdCliente,
                        art.IDArticulo AS ProIdProducto
                    FROM dbo.OrdenesDeposito od WITH(NOLOCK)
                    JOIN dbo.Ordenes         o   WITH(NOLOCK) ON o.OrdenID     = od.OrdIdOrdenExterna
                    JOIN dbo.Clientes        cl  WITH(NOLOCK) ON cl.CodCliente = o.CodCliente
                    LEFT JOIN dbo.Articulos  art WITH(NOLOCK) ON art.IDArticulo = od.OrdIdArticulo
                    WHERE od.OReIdOrdenRetiro = @OReId
                      AND od.OrdEstadoActual  = 9
                `);

            for (const ord of ordenesRes.recordset) {
                if (!ord.CliIdCliente || !ord.ProIdProducto) continue;
                try {
                    await svc.hookEntregaMetros({
                        CliIdCliente:  ord.CliIdCliente,
                        ProIdProducto: ord.ProIdProducto,
                        Cantidad:      Number(ord.OrdCantidad) || 1,
                        OrdIdOrden:    ord.OrdIdOrden,
                        UsuarioAlta:   usuarioId,
                    });
                } catch (hookErr) {
                    // No bloquear la entrega si el hook falla — solo loguear
                    logger.warn(`[hookEntregaMetros] CliId=${ord.CliIdCliente} OrdId=${ord.OrdIdOrden}: ${hookErr.message}`);
                }
            }
        } catch (err) {
            logger.warn(`[marcarEntregado] Error en descuento de metros: ${err.message}`);
        }
    })();
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
            SET PagIdPago = @pagoId, 
                OReEstadoActual = CASE WHEN OReEstadoActual = 5 THEN 5 ELSE @nuevoEstado END,
                OReFechaEstadoActual = GETDATE(), ORePasarPorCaja = 0
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
                SET PagIdPago = @pagoId, 
                    OReEstadoActual = CASE WHEN OReEstadoActual = 5 THEN 5 ELSE 4 END,
                    OReFechaEstadoActual = GETDATE(), ORePasarPorCaja = 0
                WHERE OReIdOrdenRetiro = @ordenRetiroId
                  AND (PagIdPago IS NULL OR PagIdPago = 0 OR OReEstadoActual = 5);

                INSERT INTO HistoricoEstadosOrdenesRetiro (OReIdOrdenRetiro, EORIdEstadoOrden, HEOFechaEstado, HEOUsuarioAlta)
                VALUES (@ordenRetiroId, 4, GETDATE(), @usuarioId);
            `);

        logger.info(`[AUTO-PAGO] OrdenRetiro R-${ordenRetiroId} marcada como Abonada automáticamente.`);
    }

    return { pagoId };
}

module.exports = { crearRetiro, marcarEntregado, registrarPago };
