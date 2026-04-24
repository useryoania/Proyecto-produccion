/**
 * contabilidadService.js
 * ──────────────────────────────────────────────────────────────────────────
 * Servicio central del módulo de Contabilidad de Clientes.
 * Todas las operaciones contables pasan por aquí.
 *
 * Regla de uso desde otros controladores:
 *   Siempre llamar DESPUÉS del COMMIT de la transacción principal.
 *   Si este servicio falla → log de advertencia, no rollback de la orden.
 *
 * Columnas reales confirmadas desde el código:
 *   Clientes.CliIdCliente, Clientes.Email, Clientes.TelefonoTrabajo
 *   Articulos.ProIdProducto, Articulos.Descripcion, Articulos.MonIdMoneda
 *   OrdenesDeposito.OrdCostoFinal, OrdCantidad, ProIdProducto
 * ──────────────────────────────────────────────────────────────────────────
 */

'use strict';

const { getPool, sql } = require('../config/db');
const logger           = require('../utils/logger');

// ============================================================
// SECCIÓN 1: GESTIÓN DE CUENTAS
// ============================================================

/**
 * obtenerOCrearCuenta
 * Devuelve la CueIdCuenta de un cliente para un tipo dado.
 * Si no existe, la crea con los defaults del tipo.
 *
 * @param {number} CliIdCliente
 * @param {string} CueTipo  'DINERO_UYU' | 'DINERO_USD' | 'METROS' | 'KG'
 * @param {object} opciones
 *   @param {number|null} ProIdProducto  Obligatorio para METROS/KG
 *   @param {number|null} MonIdMoneda    Obligatorio para DINERO_*
 *   @param {number}      CPaIdCondicion Condición de pago (default: 1 = Contado)
 *   @param {number}      UsuarioAlta
 * @returns {Promise<number>} CueIdCuenta
 */
async function obtenerOCrearCuenta(CliIdCliente, CueTipo, opciones = {}) {
  const pool = await getPool();
  const {
    ProIdProducto  = null,
    MonIdMoneda    = null,
    CPaIdCondicion = 1,
    UsuarioAlta    = 1,
  } = opciones;

  // Buscar cuenta existente
  const existe = await pool.request()
    .input('CliIdCliente',  sql.Int,       CliIdCliente)
    .input('CueTipo',       sql.VarChar(20), CueTipo)
    .input('ProIdProducto', sql.Int,       ProIdProducto)
    .query(`
      SELECT CueIdCuenta
      FROM   dbo.CuentasCliente
      WHERE  CliIdCliente  = @CliIdCliente
        AND  CueTipo       = @CueTipo
        AND  (
               (@ProIdProducto IS NULL     AND ProIdProducto IS NULL)
            OR (ProIdProducto = @ProIdProducto)
             )
        AND  CueActiva = 1
    `);

  if (existe.recordset.length > 0) {
    return existe.recordset[0].CueIdCuenta;
  }

  // Crear cuenta nueva
  const creada = await pool.request()
    .input('CliIdCliente',  sql.Int,       CliIdCliente)
    .input('CueTipo',       sql.VarChar(20), CueTipo)
    .input('ProIdProducto', sql.Int,       ProIdProducto)
    .input('MonIdMoneda',   sql.Int,       MonIdMoneda)
    .input('CPaIdCondicion',sql.Int,       CPaIdCondicion)
    .input('UsuarioAlta',   sql.Int,       UsuarioAlta)
    .query(`
      INSERT INTO dbo.CuentasCliente
        (CliIdCliente, CueTipo, ProIdProducto, MonIdMoneda,
         CPaIdCondicion, CueSaldoActual, CueLimiteCredito,
         CuePuedeNegativo, CueCicloActivo, CueActiva,
         CueFechaAlta, CueUsuarioAlta)
      OUTPUT INSERTED.CueIdCuenta
      VALUES
        (@CliIdCliente, @CueTipo, @ProIdProducto, @MonIdMoneda,
         @CPaIdCondicion, 0, 0,
         0, 0, 1,
         GETDATE(), @UsuarioAlta)
    `);

  const nuevaId = creada.recordset[0].CueIdCuenta;
  logger.info(`[CONTABILIDAD] Cuenta creada: CliIdCliente=${CliIdCliente}, Tipo=${CueTipo}, CueIdCuenta=${nuevaId}`);
  return nuevaId;
}

// ============================================================
// SECCIÓN 2: LIBRO MAYOR — REGISTRO DE MOVIMIENTOS
// ============================================================

/**
 * registrarMovimiento
 * Llama al SP_RegistrarMovimiento de forma transaccional.
 * Actualiza CueSaldoActual e inserta en MovimientosCuenta.
 *
 * @param {object} params
 *   @param {number}  CueIdCuenta
 *   @param {string}  MovTipo       'ORDEN' | 'PAGO' | 'ANTICIPO' | 'ENTREGA' | ...
 *   @param {string}  MovConcepto
 *   @param {number}  MovImporte    positivo = crédito / negativo = débito
 *   @param {number}  MovUsuarioAlta
 *   @param {number?} OrdIdOrden
 *   @param {number?} OReIdOrdenRetiro
 *   @param {number?} PagIdPago
 *   @param {number?} DocIdDocumento
 *   @param {string?} MovRefExterna
 *   @param {string?} MovObservaciones
 * @returns {Promise<{MovIdGenerado: number, SaldoResultante: number}>}
 */
async function registrarMovimiento(params) {
  const pool = await getPool();
  const {
    CueIdCuenta, MovTipo, MovConcepto, MovImporte, MovUsuarioAlta,
    OrdIdOrden       = null,
    OReIdOrdenRetiro = null,
    PagIdPago        = null,
    DocIdDocumento   = null,
    MovRefExterna    = null,
    MovObservaciones = null,
  } = params;

  const result = await pool.request()
    .input('CueIdCuenta',       sql.Int,          CueIdCuenta)
    .input('MovTipo',           sql.VarChar(30),  MovTipo)
    .input('MovConcepto',       sql.NVarChar(500), MovConcepto)
    .input('MovImporte',        sql.Decimal(18,4), MovImporte)
    .input('MovUsuarioAlta',    sql.Int,          MovUsuarioAlta)
    .input('OrdIdOrden',        sql.Int,          OrdIdOrden)
    .input('OReIdOrdenRetiro',  sql.Int,          OReIdOrdenRetiro)
    .input('PagIdPago',         sql.Int,          PagIdPago)
    .input('DocIdDocumento',    sql.Int,          DocIdDocumento)
    .input('MovRefExterna',     sql.VarChar(100), MovRefExterna)
    .input('MovObservaciones',  sql.NVarChar(500),MovObservaciones)
    .output('MovIdGenerado',    sql.Int)
    .output('SaldoResultante',  sql.Decimal(18,4))
    .execute('dbo.SP_RegistrarMovimiento');

  return {
    MovIdGenerado:   result.output.MovIdGenerado,
    SaldoResultante: result.output.SaldoResultante,
  };
}

// ============================================================
// SECCIÓN 3: IMPUTACIÓN DE PAGOS (PEPS)
// ============================================================

/**
 * imputarPago
 * Aplica un pago a las deudas pendientes de una cuenta
 * usando el criterio PEPS (más antiguo primero).
 * El excedente queda como crédito a favor en la cuenta.
 *
 * @param {object} params
 *   @param {number} PagIdPago
 *   @param {number} MontoDisponible
 *   @param {number} CueIdCuenta
 *   @param {number} UsuarioAlta
 * @returns {Promise<{MontoExcedente: number}>}
 */
async function imputarPago(params) {
  const pool = await getPool();
  const { PagIdPago, MontoDisponible, CueIdCuenta, UsuarioAlta } = params;

  const result = await pool.request()
    .input('PagIdPago',       sql.Int,          PagIdPago)
    .input('MontoDisponible', sql.Decimal(18,4), MontoDisponible)
    .input('CueIdCuenta',     sql.Int,          CueIdCuenta)
    .input('UsuarioAlta',     sql.Int,          UsuarioAlta)
    .output('MontoExcedente', sql.Decimal(18,4))
    .execute('dbo.SP_ImputarPagoPEPS');

  return {
    MontoExcedente: result.output.MontoExcedente ?? 0,
  };
}

// ============================================================
// SECCIÓN 4: DOCUMENTOS DE DEUDA
// ============================================================

/**
 * crearDeudaDocumento
 * Registra una deuda pendiente asociada a una orden.
 *
 * @param {object} params
 *   @param {number}  CueIdCuenta
 *   @param {number}  OrdIdOrden
 *   @param {number}  Importe
 *   @param {number}  ImportePendiente
 * @returns {Promise<number>} DDeIdDocumento
 */
async function crearDeudaDocumento(params) {
  const pool = await getPool();
  const { CueIdCuenta, OrdIdOrden, Importe, ImportePendiente = Importe } = params;

  const condRes = await pool.request()
    .input('CueIdCuenta', sql.Int, CueIdCuenta)
    .query(`
      SELECT ISNULL(cp.CPaDiasVencimiento, 0) AS DiasVencimiento
      FROM   dbo.CuentasCliente cc
      JOIN   dbo.CondicionesPago cp ON cp.CPaIdCondicion = cc.CPaIdCondicion
      WHERE  cc.CueIdCuenta = @CueIdCuenta
    `);

  const diasVenc = condRes.recordset[0]?.DiasVencimiento ?? 0;
  const estado = ImportePendiente <= 0.01 ? 'PAGADO' : 'PENDIENTE';

  const insertRes = await pool.request()
    .input('CueIdCuenta',         sql.Int,          CueIdCuenta)
    .input('OrdIdOrden',          sql.Int,          OrdIdOrden)
    .input('DDeImporteOriginal',  sql.Decimal(18,4), Importe)
    .input('DDeImportePendiente', sql.Decimal(18,4), Math.max(0, ImportePendiente))
    .input('DDeFechaEmision',     sql.Date,         new Date())
    .input('DiasVencimiento',     sql.Int,          diasVenc)
    .input('Estado',              sql.VarChar(20),  estado)
    .query(`
      INSERT INTO dbo.DeudaDocumento
        (CueIdCuenta, OrdIdOrden, DDeImporteOriginal, DDeImportePendiente,
         DDeFechaEmision, DDeFechaVencimiento, DDeEstado)
      OUTPUT INSERTED.DDeIdDocumento
      VALUES
        (@CueIdCuenta, @OrdIdOrden, @DDeImporteOriginal, @DDeImportePendiente,
         @DDeFechaEmision,
         DATEADD(DAY, @DiasVencimiento, @DDeFechaEmision),
         @Estado)
    `);

  return insertRes.recordset[0].DDeIdDocumento;
}

// ============================================================
// SECCIÓN 5: HOOKS PARA EVENTOS DEL SISTEMA
// ============================================================

/**
 * hookOrdenCreada
 * Llamar DESPUÉS del commit de crearRetiro() / createOrden().
 * Registra el débito en la cuenta de dinero del cliente.
 *
 * @param {object} params
 *   @param {number} OrdIdOrden
 *   @param {number} CliIdCliente
 *   @param {number} Importe       OrdCostoFinal
 *   @param {number} MonIdMoneda   1=UYU, 2=USD
 *   @param {string} CodigoOrden   Para el concepto del movimiento
 *   @param {number} UsuarioAlta
 */
async function hookOrdenCreada(params) {
  const { OrdIdOrden, CliIdCliente, Importe, MonIdMoneda, CodigoOrden, NombreTrabajo, UsuarioAlta, ProIdProducto } = params;
  const contabilidadCore = require('./contabilidadCore'); // Import CORE for Asientos

  try {
    // ── Si el cliente tiene plan de recursos para este artículo → no cobrar en dinero
    if (ProIdProducto) {
      const pool = await getPool();
      const planCheck = await pool.request()
        .input('CliIdCliente',  sql.Int, CliIdCliente)
        .input('ProIdProducto', sql.Int, ProIdProducto)
        .query(`
          SELECT TOP 1 pm.PlaIdPlan
          FROM   dbo.PlanesMetros  pm WITH(NOLOCK)
          JOIN   dbo.CuentasCliente cc WITH(NOLOCK)
                 ON cc.CueIdCuenta = pm.CueIdCuenta
          WHERE  pm.CliIdCliente  = @CliIdCliente
            AND  pm.ProIdProducto = @ProIdProducto
            AND  pm.PlaActivo     = 1
            AND  (pm.PlaFechaVencimiento IS NULL
               OR pm.PlaFechaVencimiento >= CAST(GETDATE() AS DATE))
        `);
      if (planCheck.recordset.length > 0) {
        logger.info(`[CONTABILIDAD] Orden ${CodigoOrden} cubierta por plan de recursos #${planCheck.recordset[0].PlaIdPlan} — sin débito monetario.`);
        return; // el hookEntregaMetros se encarga del descuento
      }
    }

    const CueTipo = MonIdMoneda === 2 ? 'DINERO_USD' : 'DINERO_UYU';

    // 1. Obtener o crear la cuenta del cliente
    const CueIdCuenta = await obtenerOCrearCuenta(CliIdCliente, CueTipo, {
      MonIdMoneda,
      UsuarioAlta,
    });

    // 2. Registrar débito en libro mayor
    const { SaldoResultante } = await registrarMovimiento({
      CueIdCuenta,
      MovTipo:      'ORDEN',
      MovConcepto:  `Orden ${CodigoOrden}${NombreTrabajo ? ' — ' + NombreTrabajo : ''}`,
      MovObservaciones: NombreTrabajo || null,
      MovImporte:   -Math.abs(Importe),
      MovUsuarioAlta: UsuarioAlta,
      OrdIdOrden,
    });

    let deudaAislada = Math.min(Math.abs(Importe), Math.max(0, -SaldoResultante));
    let idOtraMoneda = MonIdMoneda === 2 ? 1 : 2; 
    let poolDB = await getPool();

    // Si todavía hay deuda (el saldo de esta cuenta bajó de 0, o estaba en 0)
    if (deudaAislada > 0.01) {
      // Intentar cruzar desde otra cuenta si tiene dinero (Ej: Debe USD, pero tiene UYU a favor)
      const tipoOtra = MonIdMoneda === 2 ? 'DINERO_UYU' : 'DINERO_USD';
      const ctaOtraRes = await poolDB.request()
         .input('Cli', sql.Int, CliIdCliente)
         .input('Tipo', sql.VarChar(20), tipoOtra)
         .query(`SELECT CueIdCuenta, CueSaldoActual FROM CuentasCliente WHERE CliIdCliente=@Cli AND CueTipo=@Tipo AND CueActiva=1 AND CueSaldoActual > 0`);
      
      if (ctaOtraRes.recordset.length > 0) {
        const ctaOtra = ctaOtraRes.recordset[0];
        
        let coti = 1;
        const cotiRes = await poolDB.request().query('SELECT TOP 1 CotDolar FROM dbo.Cotizaciones WITH(NOLOCK) ORDER BY CotFecha DESC');
        if (cotiRes.recordset.length > 0) coti = parseFloat(cotiRes.recordset[0].CotDolar) || 1;

        // Si la orden es en USD(2) y la otra es UYU(1) -> La otra cuenta vale su saldo / coti en USD
        // Si la orden es en UYU(1) y la otra es USD(2) -> La otra cuenta vale su saldo * coti en UYU
        let tasaConvertirAOrden = MonIdMoneda === 2 ? (1 / coti) : coti;
        let saldoOtraConvertido = ctaOtra.CueSaldoActual * tasaConvertirAOrden;

        let aDescontarOrden = Math.min(deudaAislada, saldoOtraConvertido);
        
        if (aDescontarOrden > 0.01) {
           let aDescontarCtaOtra = aDescontarOrden / tasaConvertirAOrden;
           
           // Extraer plata de la bolsa positiva (otra cuenta)
           await registrarMovimiento({
             CueIdCuenta: ctaOtra.CueIdCuenta,
             MovTipo: 'PAGO_CRUZADO',
             MovConcepto: `Cruce automático -> Orden ${CodigoOrden} (${MonIdMoneda===2?'USD':'UYU'})`,
             MovImporte: -Math.abs(aDescontarCtaOtra),
             MovUsuarioAlta: UsuarioAlta,
             OrdIdOrden,
           });

           // Ingresar la plata convertida a la cuenta endeudada
           await registrarMovimiento({
             CueIdCuenta: CueIdCuenta,
             MovTipo: 'PAGO_CRUZADO',
             MovConcepto: `Cobertura desde ${tipoOtra} -> Orden ${CodigoOrden}`,
             MovImporte: Math.abs(aDescontarOrden),
             MovUsuarioAlta: UsuarioAlta,
             OrdIdOrden,
           });

           deudaAislada -= aDescontarOrden;
        }
      }
    }

    // 3. Si la cuenta tiene ciclo activo → acumular en él (cliente semanal)
    const cicloActivo = await obtenerCicloActivo(CueIdCuenta);
    if (cicloActivo) {
      await acumularEnCiclo(cicloActivo.CicIdCiclo, 'ORDEN', Math.abs(Importe));
      logger.info(`[CICLO] Orden ${CodigoOrden} acumulada en CicIdCiclo=${cicloActivo.CicIdCiclo}`);
    } else {
      // Sin ciclo activo → crear deuda documento individual con el remanente Real de deuda (0 si quedó pagada por fondos)
      await crearDeudaDocumento({ 
        CueIdCuenta, 
        OrdIdOrden, 
        Importe: Math.abs(Importe),
        ImportePendiente: Math.max(0, deudaAislada)
      });
    }

    logger.info(`[CONTABILIDAD] Orden ${CodigoOrden} registrada. Saldo cliente ${CliIdCliente}: ${SaldoResultante}`);

    // 4. Registrar ASIENTO DIARIO EN LIBRO MAYOR (GLOBAL)
    const importeAbsRounded = Math.round(Math.abs(Importe) * 100) / 100;
    const { neto, ivaMonto } = contabilidadCore.desglosarIVA(importeAbsRounded, 22);
    const cuentaCliente = MonIdMoneda === 2 ? contabilidadCore.CUENTAS.CLIENTE_USD : contabilidadCore.CUENTAS.CLIENTE_UYU; // Deudores USD / UYU

    const pool = await getPool();
    let cotizacion = 1;
    if (MonIdMoneda === 2) {
      const cotiRes = await pool.request().query('SELECT TOP 1 CotDolar FROM dbo.Cotizaciones WITH(NOLOCK) ORDER BY CotFecha DESC');
      cotizacion = cotiRes.recordset.length > 0 ? parseFloat(cotiRes.recordset[0].CotDolar) || 1 : 1;
    }

    const tran = pool.transaction();
    await tran.begin();
    try {
      await contabilidadCore.generarAsientoCompleto({
        fecha: new Date(),
        concepto: `Venta s/ Orden ${CodigoOrden}${NombreTrabajo ? ' - ' + NombreTrabajo : ''}`,
        usuarioId: UsuarioAlta,
        tcaIdTransaccion: null,
        origen: 'VENTA_ACREDITO',
        lineas: [
          { codigoCuenta: cuentaCliente,                       debeBase: importeAbsRounded, haberBase: 0,        monedaId: MonIdMoneda, cotizacion },
          { codigoCuenta: contabilidadCore.CUENTAS.VENTA_SERV, debeBase: 0,                 haberBase: neto,     monedaId: MonIdMoneda, cotizacion },
          { codigoCuenta: contabilidadCore.CUENTAS.IVA_22,     debeBase: 0,                 haberBase: ivaMonto, monedaId: MonIdMoneda, cotizacion }
        ]
      }, tran);
      await tran.commit();
    } catch (errAsiento) {
      await tran.rollback();
      logger.warn(`[CONTABILIDAD] Fallo al crear asiento para orden ${CodigoOrden}: ${errAsiento.message}`);
    }
  } catch (err) {
    logger.warn(`[CONTABILIDAD] hookOrdenCreada falló (no afecta la orden): ${err.message}`);
  }
}

/**
 * hookReposicion
 * Llamar cuando la orden es una REPOSICIÓN (CodigoOrden empieza con 'R').
 * NO afecta el saldo ni descuenta recursos.
 * Solo deja trazabilidad en MovimientosCuenta con importe = 0
 * para que quede en el historial del cliente.
 *
 * @param {object} params
 *   @param {number} OrdIdOrden
 *   @param {number} CliIdCliente
 *   @param {number} MonIdMoneda   1=UYU, 2=USD
 *   @param {string} CodigoOrden
 *   @param {number} UsuarioAlta
 */
async function hookReposicion(params) {
  const { OrdIdOrden, CliIdCliente, MonIdMoneda, CodigoOrden, NombreTrabajo, UsuarioAlta } = params;

  try {
    const CueTipo = MonIdMoneda === 2 ? 'DINERO_USD' : 'DINERO_UYU';

    // Obtener o crear la cuenta del cliente (sin modificar saldo)
    const CueIdCuenta = await obtenerOCrearCuenta(CliIdCliente, CueTipo, {
      MonIdMoneda,
      UsuarioAlta,
    });

    // Registrar movimiento con importe 0 — solo para el historial
    await registrarMovimiento({
      CueIdCuenta,
      MovTipo:        'REPOSICION',
      MovConcepto:    `Reposición ${CodigoOrden}${NombreTrabajo ? ' — ' + NombreTrabajo : ''}`,
      MovObservaciones: NombreTrabajo ? `Reposición sin cargo — ${NombreTrabajo}` : 'Orden de reposición',
      MovImporte:     0,
      MovUsuarioAlta: UsuarioAlta,
      OrdIdOrden,

    });

    logger.info(`[CONTABILIDAD] Reposición registrada en historial: ${CodigoOrden} (CliId=${CliIdCliente}, importe=$0)`);
  } catch (err) {
    logger.warn(`[CONTABILIDAD] hookReposicion falló (no afecta la orden): ${err.message}`);
  }
}

/**
 * hookPagoRegistrado
 * Llamar DESPUÉS del commit de registrarPago().
 * Acredita el pago en la cuenta y aplica imputación PEPS.
 * Si sobra dinero → genera Nota de Crédito automáticamente.
 *
 * @param {object} params
 *   @param {number} PagIdPago
 *   @param {number} CliIdCliente
 *   @param {number} MontoPago
 *   @param {number} MonIdMoneda
 *   @param {number} UsuarioAlta
 */
async function hookPagoRegistrado(params) {
  const { PagIdPago, CliIdCliente, MontoPago, MonIdMoneda, UsuarioAlta } = params;

  try {
    const CueTipo = MonIdMoneda === 2 ? 'DINERO_USD' : 'DINERO_UYU';

    const CueIdCuenta = await obtenerOCrearCuenta(CliIdCliente, CueTipo, {
      MonIdMoneda,
      UsuarioAlta,
    });

    // 1. Acreditar el pago en libro mayor
    await registrarMovimiento({
      CueIdCuenta,
      MovTipo:      'PAGO',
      MovConcepto:  `Pago recibido (PagIdPago: ${PagIdPago})`,
      MovImporte:   Math.abs(MontoPago),
      MovUsuarioAlta: UsuarioAlta,
      PagIdPago,
    });

    // 2. Si la cuenta tiene ciclo activo → acumular el pago en él
    const cicloActivo = await obtenerCicloActivo(CueIdCuenta);
    if (cicloActivo) {
      await acumularEnCiclo(cicloActivo.CicIdCiclo, 'PAGO', Math.abs(MontoPago));
      logger.info(`[CICLO] Pago ${PagIdPago} acumulado en CicIdCiclo=${cicloActivo.CicIdCiclo}`);
    }

    // 3. Imputar el pago a deudas pendientes PEPS (aplica a deudas de ciclos cerrados)
    const { MontoExcedente } = await imputarPago({
      PagIdPago,
      MontoDisponible: Math.abs(MontoPago),
      CueIdCuenta,
      UsuarioAlta,
    });

    // 4. Si sobra → El saldo ya quedó positivamente grabado en el paso 1 (PAGO). No se debe sumar de nuevo.
    /*
    if (MontoExcedente > 0) {
      await registrarMovimiento({
        CueIdCuenta,
        MovTipo:      'NOTA_CREDITO',
        MovConcepto:  `Crédito a favor por pago en exceso (PagIdPago: ${PagIdPago})`,
        MovImporte:   MontoExcedente,
        MovUsuarioAlta: UsuarioAlta,
        PagIdPago,
        MovObservaciones: `Excedente: ${MontoExcedente}`,
      });
      logger.info(`[CONTABILIDAD] Pago ${PagIdPago} — excedente $${MontoExcedente} como crédito a favor.`);
    }
    */

    logger.info(`[CONTABILIDAD] Pago ${PagIdPago} imputado. Excedente en cuenta (Saldo a favor): ${MontoExcedente}`);
  } catch (err) {
    logger.warn(`[CONTABILIDAD] hookPagoRegistrado falló (no afecta el pago): ${err.message}`);
  }
}

/**
 * hookEntregaMetros
 * Llamar DESPUÉS del commit de marcarPronto() para clientes
 * cuya cuenta es de tipo METROS o KG.
 * Descuenta la cantidad del PlanMetros activo para ese artículo.
 *
 * @param {object} params
 *   @param {number} OrdIdOrden
 *   @param {number} CliIdCliente
 *   @param {number} ProIdProducto   Artículo de la orden
 *   @param {number} Cantidad        OrdCantidad
 *   @param {string} CodigoOrden
 *   @param {number} UsuarioAlta
 */
async function hookEntregaMetros(params) {
  const { OrdIdOrden, CliIdCliente, ProIdProducto, Cantidad, CodigoOrden, UsuarioAlta, NombreTrabajo } = params;

  try {
    const pool = await getPool();

    // 1. Verificar si el cliente tiene cuenta de METROS para este artículo
    const cuentaRes = await pool.request()
      .input('CliIdCliente',  sql.Int, CliIdCliente)
      .input('ProIdProducto', sql.Int, ProIdProducto)
      .query(`
        SELECT CueIdCuenta
        FROM   dbo.CuentasCliente
        WHERE  CliIdCliente  = @CliIdCliente
          AND  ProIdProducto = @ProIdProducto
          AND  CueTipo NOT IN ('USD','UYU','ARS','EUR','PYG','BRL','CORRIENTE','CREDITO','DEBITO','CAJA','DINERO_USD','DINERO_UYU')
          AND  CueActiva = 1
      `);

    if (cuentaRes.recordset.length === 0) {
      // No tiene cuenta de metros para este artículo — no es error
      return;
    }

    const CueIdCuenta = cuentaRes.recordset[0].CueIdCuenta;

    // 2. Descontar en cascada de los planes activos (FIFO)
    const planRes = await pool.request()
      .input('CueIdCuenta',   sql.Int, CueIdCuenta)
      .input('ProIdProducto', sql.Int, ProIdProducto)
      .query(`
        SELECT PlaIdPlan, PlaCantidadTotal, PlaCantidadUsada, PlaPrecioUnitario, MonIdMoneda
        FROM   dbo.PlanesMetros WITH (UPDLOCK, ROWLOCK)
        WHERE  CueIdCuenta   = @CueIdCuenta
          AND  ProIdProducto = @ProIdProducto
          AND  PlaActivo     = 1
          AND  (PlaFechaVencimiento IS NULL OR PlaFechaVencimiento >= CAST(GETDATE() AS DATE))
        ORDER  BY PlaFechaAlta ASC
      `);

    if (planRes.recordset.length === 0) {
      logger.warn(`[CONTABILIDAD] hookEntregaMetros: sin plan activo para CliId=${CliIdCliente} ProId=${ProIdProducto}`);
      // Llama a generar deuda por el 100%
      if (params.Importe > 0) {
        await hookOrdenCreada({
          OrdIdOrden, CliIdCliente, Importe: params.Importe, MonIdMoneda: params.MonIdMoneda,
          CodigoOrden, NombreTrabajo: params.NombreTrabajo, UsuarioAlta, ProIdProducto: null
        });
      }
      return;
    }

    let cantidadPendiente = Cantidad;
    let valorCubiertoPorPlanes = 0;

    // Obtener cotización si hay cruce de monedas
    const cotRes = await pool.request().query('SELECT TOP 1 CotDolar FROM dbo.Cotizaciones ORDER BY CotFecha DESC');
    const TC = cotRes.recordset.length > 0 ? parseFloat(cotRes.recordset[0].CotDolar) || 40.0 : 40.0;

    for (const plan of planRes.recordset) {
      if (cantidadPendiente <= 0) break;

      const disponible = plan.PlaCantidadTotal - plan.PlaCantidadUsada;
      if (disponible <= 0) {
         await pool.request().query(`UPDATE dbo.PlanesMetros SET PlaActivo = 0 WHERE PlaIdPlan = ${plan.PlaIdPlan}`);
         continue;
      }

      const consumir = Math.min(cantidadPendiente, disponible);
      const nuevaUsada = plan.PlaCantidadUsada + consumir;
      const activo = nuevaUsada >= plan.PlaCantidadTotal ? 0 : 1;

      await pool.request()
        .input('P', sql.Int, plan.PlaIdPlan)
        .input('U', sql.Decimal(18,4), nuevaUsada)
        .input('A', sql.Bit, activo)
        .query(`UPDATE dbo.PlanesMetros SET PlaCantidadUsada = @U, PlaActivo = @A WHERE PlaIdPlan = @P`);

      await registrarMovimiento({
        CueIdCuenta,
        MovTipo:     'ENTREGA', // El Motor puede sobreescribir esto en futuras versiones
        MovConcepto: `${CodigoOrden} ${NombreTrabajo || ''}`.trim() || `Entrega Plan #${plan.PlaIdPlan}`,
        MovImporte:  -Math.abs(consumir),
        MovUsuarioAlta: UsuarioAlta,
        OrdIdOrden,
        MovObservaciones: `Plan #${plan.PlaIdPlan}`,
      });

      cantidadPendiente -= consumir;
      const restante = plan.PlaCantidadTotal - nuevaUsada;

      // Calcular el valor financiero de los metros consumidos para restarlo a la deuda final
      const precioTotal = parseFloat(plan.PlaPrecioUnitario) || 0;
      let precioUnitarioPlan = plan.PlaCantidadTotal > 0 ? (precioTotal / plan.PlaCantidadTotal) : 0;
      
      if (plan.MonIdMoneda && params.MonIdMoneda && plan.MonIdMoneda !== params.MonIdMoneda && precioUnitarioPlan > 0) {
         if (plan.MonIdMoneda === 2 && params.MonIdMoneda === 1) { // Plan en USD, Orden en UYU -> multiplicar
             precioUnitarioPlan = precioUnitarioPlan * TC;
         } else if (plan.MonIdMoneda === 1 && params.MonIdMoneda === 2) { // Plan en UYU, Orden en USD -> dividir
             precioUnitarioPlan = precioUnitarioPlan / TC;
         }
      }
      valorCubiertoPorPlanes += (consumir * precioUnitarioPlan);

      logger.info(`[CONTABILIDAD] Metros descontados: ${consumir}. Plan ${plan.PlaIdPlan} → Restante: ${restante}`);

      if (restante > 0 && restante / plan.PlaCantidadTotal < 0.1) {
        logger.warn(`[CONTABILIDAD] ⚠️ Plan ${plan.PlaIdPlan} de CliId=${CliIdCliente} tiene menos del 10% restante (${restante} uds)`);
      }
    }

    // 3. Generar cargo monetario si no se cubrió todo con planes o si corresponde
    // Dado que ordenesController ahora delega la orden SI hay plan activo, procesamos lo que falte
    if (params.Importe > 0) {
      let deudaACobrar = params.Importe;

      if (cantidadPendiente > 0) {
        if (valorCubiertoPorPlanes > 0) {
           deudaACobrar = params.Importe - valorCubiertoPorPlanes;
           if (deudaACobrar < 0) deudaACobrar = 0; 
        } else {
           // fallback si no había precio en el plan
           const porcentajeFaltante = cantidadPendiente / Cantidad;
           deudaACobrar = params.Importe * porcentajeFaltante;
        }
      } else {
         // Si el plan cubrió TODO (cantidadPendiente == 0), no hay deuda!
         deudaACobrar = 0;
      }

      const deudaRedondeada = Math.round(deudaACobrar * 100) / 100;

      if (deudaRedondeada > 0) {
        logger.info(`[CONTABILIDAD] Planes consumidos. Faltaban ${cantidadPendiente} uds. Deuda original: ${params.Importe}, Valor cubierto: ${valorCubiertoPorPlanes}. Generando deuda por ${deudaRedondeada}.`);

        await hookOrdenCreada({
          OrdIdOrden,
          CliIdCliente,
          Importe: deudaRedondeada,
          MonIdMoneda: params.MonIdMoneda,
          CodigoOrden,
          NombreTrabajo: params.NombreTrabajo ? `${params.NombreTrabajo} (Saldo Faltante)` : 'Exceso de Plan (Saldo Faltante)',
          UsuarioAlta,
          ProIdProducto: null // evitamos loops
        });
      }
    }

  } catch (err) {
    logger.warn(`[CONTABILIDAD] hookEntregaMetros falló (no afecta la entrega): ${err.message}`);
  }
}

// ============================================================
// SECCIÓN 6: CONSULTAS DE SALDO Y ESTADO
// ============================================================

/**
 * getSaldoCliente
 * Devuelve el saldo actual de todas las cuentas de un cliente.
 *
 * @param {number} CliIdCliente
 * @returns {Promise<Array>}
 */
async function getSaldoCliente(CliIdCliente) {
  const pool = await getPool();

  const result = await pool.request()
    .input('CliIdCliente', sql.Int, CliIdCliente)
    .query(`
      SELECT
        cc.CueIdCuenta,
        cc.CueTipo,
        cc.ProIdProducto,
        cc.CueSaldoActual,
        cc.CueLimiteCredito,
        cc.CuePuedeNegativo,
        cc.CueDiasCiclo,
        cc.CueCicloActivo,
        RTRIM(art.Descripcion)          AS NombreArticulo,
        u.UniDescripcionUnidad          AS UniNombreCompleto,
        u.[UniNotación]                 AS UniSimbolo,
        ISNULL(u.UniDescripcionUnidad, cc.CueTipo) AS UnidadLabel,
        CASE WHEN cc.ProIdProducto IS NOT NULL OR cc.CueTipo NOT IN ('USD','UYU','ARS','EUR','PYG','BRL','CORRIENTE','CREDITO','DEBITO','CAJA','DINERO_USD','DINERO_UYU')
             THEN ISNULL(u.[UniNotación], 'mts') 
             ELSE ISNULL(mon.MonSimbolo, '$') END AS MonSimbolo,
        cp.CPaNombre    AS CondicionPago,
        ISNULL((
          SELECT SUM(DDeImportePendiente)
          FROM   dbo.DeudaDocumento
          WHERE  CueIdCuenta = cc.CueIdCuenta
            AND  DDeEstado IN ('PENDIENTE', 'VENCIDO', 'PARCIAL')
        ), 0) AS DeudaPendienteTotal,
        ISNULL((
          SELECT COUNT(*)
          FROM   dbo.DeudaDocumento
          WHERE  CueIdCuenta = cc.CueIdCuenta
            AND  DDeEstado = 'VENCIDO'
        ), 0) AS DocumentosVencidos
      FROM      dbo.CuentasCliente cc
      LEFT JOIN dbo.Articulos       art ON art.ProIdProducto = cc.ProIdProducto
      LEFT JOIN dbo.Unidades        u   ON u.UniIdUnidad     = art.UniIdUnidad
      LEFT JOIN dbo.Monedas         mon ON mon.MonIdMoneda   = cc.MonIdMoneda
      LEFT JOIN dbo.CondicionesPago cp  ON cp.CPaIdCondicion = cc.CPaIdCondicion
      WHERE cc.CliIdCliente = @CliIdCliente
        AND cc.CueActiva    = 1
      ORDER BY cc.CueTipo, art.Descripcion
    `);

  return result.recordset;
}

/**
 * getMovimientos
 * Devuelve el libro mayor de una cuenta con filtros de fecha.
 *
 * @param {number}  CueIdCuenta
 * @param {Date?}   FechaDesde
 * @param {Date?}   FechaHasta
 * @param {number?} Top         Límite de registros (default: 100)
 * @returns {Promise<Array>}
 */
async function getMovimientos(CueIdCuenta, FechaDesde = null, FechaHasta = null, Top = 100) {
  const pool = await getPool();

  const request = pool.request()
    .input('CueIdCuenta', sql.Int, CueIdCuenta)
    .input('Top', sql.Int, Top);

  let filtroFecha = '';
  if (FechaDesde) {
    request.input('FechaDesde', sql.Date, FechaDesde);
    filtroFecha += ' AND CAST(m.MovFecha AS DATE) >= @FechaDesde';
  }
  if (FechaHasta) {
    request.input('FechaHasta', sql.Date, FechaHasta);
    filtroFecha += ' AND CAST(m.MovFecha AS DATE) <= @FechaHasta';
  }

  const result = await request.query(`
    SELECT TOP (@Top)
      m.MovIdMovimiento,
      m.MovTipo,
      m.MovConcepto,
      m.MovImporte,
      m.MovSaldoPosterior,
      m.MovFecha,
      m.MovAnulado,
      m.OrdIdOrden,
      m.OReIdOrdenRetiro,
      m.PagIdPago,
      m.MovRefExterna,
      m.MovObservaciones
    FROM dbo.MovimientosCuenta m
    WHERE m.CueIdCuenta = @CueIdCuenta
      ${filtroFecha}
    ORDER BY m.MovFecha DESC, m.MovIdMovimiento DESC
  `);

  return result.recordset;
}

/**
 * getDeudas
 * Devuelve los documentos de deuda pendientes de una cuenta.
 *
 * @param {number}   CueIdCuenta
 * @param {string?}  SoloEstado  'PENDIENTE' | 'VENCIDO' | 'PARCIAL' | null (todos)
 * @returns {Promise<Array>}
 */
async function getDeudas(CueIdCuenta, SoloEstado = null) {
  const pool = await getPool();

  const request = pool.request().input('CueIdCuenta', sql.Int, CueIdCuenta);
  let filtroEstado = '';

  if (SoloEstado) {
    request.input('Estado', sql.VarChar(20), SoloEstado);
    filtroEstado = "AND DDeEstado = @Estado";
  } else {
    filtroEstado = "AND DDeEstado IN ('PENDIENTE', 'VENCIDO', 'PARCIAL')";
  }

  const result = await request.query(`
    SELECT
      d.DDeIdDocumento,
      d.OrdIdOrden,
      od.OrdCodigoOrden AS CodigoOrden,
      d.DDeImporteOriginal,
      d.DDeImportePendiente,
      d.DDeFechaEmision,
      d.DDeFechaVencimiento,
      d.DDeCuotaNumero,
      d.DDeCuotaTotal,
      d.DDeEstado,
      DATEDIFF(DAY, d.DDeFechaVencimiento, GETDATE()) AS DiasVencido
    FROM dbo.DeudaDocumento d
    LEFT JOIN dbo.OrdenesDeposito od ON od.OrdIdOrden = d.OrdIdOrden
    WHERE d.CueIdCuenta = @CueIdCuenta
      ${filtroEstado}
    ORDER BY d.DDeFechaVencimiento ASC
  `);

  return result.recordset;
}

/**
 * getDeudasPorCliente
 * Devuelve todos los documentos de deuda pendientes de un cliente.
 */
async function getDeudasPorCliente(CliIdCliente) {
  const pool = await getPool();
  const result = await pool.request()
    .input('CliIdCliente', sql.Int, parseInt(CliIdCliente))
    .query(`
      SELECT
        d.DDeIdDocumento,
        d.OrdIdOrden,
        d.DocIdDocumento,
        COALESCE(od.OrdCodigoOrden, 'VTA-DIR') AS CodigoOrden,
        COALESCE(
          od.OrdNombreTrabajo, 
          (SELECT TOP 1 TdeDescripcion 
           FROM dbo.TransaccionDetalle td
           JOIN dbo.DocumentosContables doc ON CAST(doc.DocNumero AS VARCHAR) = CAST(td.TcaIdTransaccion AS VARCHAR)
           WHERE doc.DocIdDocumento = d.DocIdDocumento),
          'Venta Directa'
        ) AS NombreTrabajo,
        d.DDeImporteOriginal,
        d.DDeImportePendiente,
        d.DDeFechaEmision,
        d.DDeFechaVencimiento,
        d.DDeEstado,
        cc.CueTipo,
        ISNULL(mon.MonSimbolo, '$U') AS MonSimbolo,
        DATEDIFF(DAY, d.DDeFechaVencimiento, GETDATE()) AS DiasVencido
      FROM dbo.DeudaDocumento d WITH(NOLOCK)
      JOIN dbo.CuentasCliente cc WITH(NOLOCK) ON cc.CueIdCuenta = d.CueIdCuenta
      LEFT JOIN dbo.Monedas mon WITH(NOLOCK) ON mon.MonIdMoneda = cc.MonIdMoneda
      LEFT JOIN dbo.OrdenesDeposito od WITH(NOLOCK) ON od.OrdIdOrden = d.OrdIdOrden
      WHERE cc.CliIdCliente = @CliIdCliente
        AND d.DDeEstado IN ('PENDIENTE', 'PARCIAL', 'VENCIDO')
        AND d.DDeImportePendiente > 0.01
      ORDER BY d.DDeFechaVencimiento ASC
    `);

  return result.recordset;
}

/**
 * getAntiguedadDeuda
 * Tabla de antigüedad de deuda para todos los clientes activos.
 * Agrupa en tramos: Al día / 1-30 / 31-60 / 61-90 / +90 días.
 *
 * @returns {Promise<Array>}
 */
async function getAntiguedadDeuda() {
  const pool = await getPool();

  const result = await pool.request().query(`
    SELECT
      c.CliIdCliente,
      cli.Nombre                                    AS NombreCliente,
      c.CueTipo,
      ISNULL(mon.MonSimbolo, '$U')                  AS MonSimbolo,
      c.CueTipo                                     AS Moneda,
      -- Al día (no vencido o sin vencer)
      ISNULL(SUM(CASE WHEN DATEDIFF(DAY, d.DDeFechaVencimiento, GETDATE()) <= 0
                      THEN d.DDeImportePendiente ELSE 0 END), 0) AS AlDia,
      -- 1 a 30 días vencido
      ISNULL(SUM(CASE WHEN DATEDIFF(DAY, d.DDeFechaVencimiento, GETDATE()) BETWEEN 1  AND 30
                      THEN d.DDeImportePendiente ELSE 0 END), 0) AS Dias1_30,
      -- 31 a 60 días vencido
      ISNULL(SUM(CASE WHEN DATEDIFF(DAY, d.DDeFechaVencimiento, GETDATE()) BETWEEN 31 AND 60
                      THEN d.DDeImportePendiente ELSE 0 END), 0) AS Dias31_60,
      -- 61 a 90 días vencido
      ISNULL(SUM(CASE WHEN DATEDIFF(DAY, d.DDeFechaVencimiento, GETDATE()) BETWEEN 61 AND 90
                      THEN d.DDeImportePendiente ELSE 0 END), 0) AS Dias61_90,
      -- Más de 90 días vencido
      ISNULL(SUM(CASE WHEN DATEDIFF(DAY, d.DDeFechaVencimiento, GETDATE()) > 90
                      THEN d.DDeImportePendiente ELSE 0 END), 0) AS Mas90,
      -- Total pendiente
      ISNULL(SUM(d.DDeImportePendiente), 0)         AS TotalDeuda
    FROM      dbo.CuentasCliente c
    JOIN      dbo.Clientes       cli ON cli.CliIdCliente = c.CliIdCliente
    LEFT JOIN dbo.Monedas        mon ON mon.MonIdMoneda  = c.MonIdMoneda
    JOIN      dbo.DeudaDocumento d   ON d.CueIdCuenta   = c.CueIdCuenta
                                    AND d.DDeEstado IN ('PENDIENTE', 'VENCIDO', 'PARCIAL')
    WHERE c.CueActiva = 1
      AND c.CueTipo IN ('DINERO_UYU', 'DINERO_USD', 'CORRIENTE')
    GROUP BY c.CliIdCliente, cli.Nombre, c.CueTipo, mon.MonSimbolo
    HAVING SUM(d.DDeImportePendiente) > 0
    ORDER BY TotalDeuda DESC
  `);

  return result.recordset;
}


// ============================================================
// SECCIÓN 7: CICLOS DE CRÉDITO (CLIENTES SEMANALES)
// ============================================================

/**
 * obtenerCicloActivo
 * Devuelve el ciclo ABIERTO de una cuenta, si existe.
 * @param {number} CueIdCuenta
 * @returns {Promise<object|null>}
 */
async function obtenerCicloActivo(CueIdCuenta) {
  const pool = await getPool();
  const res  = await pool.request()
    .input('CueIdCuenta', sql.Int, CueIdCuenta)
    .query(`
      SELECT TOP 1
        CicIdCiclo, CueIdCuenta, CliIdCliente,
        CicFechaInicio, CicFechaCierre, CicDiasAprobados,
        CicTotalOrdenes, CicTotalPagos, CicSaldoFacturar, CicEstado
      FROM dbo.CiclosCredito
      WHERE CueIdCuenta = @CueIdCuenta
        AND CicEstado = 'ABIERTO'
      ORDER BY CicFechaInicio DESC
    `);
  return res.recordset[0] || null;
}

/**
 * abrirCicloPorCuenta
 * Abre un nuevo ciclo de crédito para una cuenta.
 * Calcula la fecha de cierre basándose en CueDiasCiclo.
 * Si ya tiene uno abierto, lo devuelve sin crear uno nuevo.
 *
 * @param {object} params
 *   @param {number} CueIdCuenta
 *   @param {number} CliIdCliente
 *   @param {number} UsuarioAlta
 *   @param {Date?}  FechaInicio    default = hoy
 * @returns {Promise<{CicIdCiclo, esNuevo}>}
 */
async function abrirCicloPorCuenta({ CueIdCuenta, CliIdCliente, UsuarioAlta, FechaInicio = null }) {
  const pool = await getPool();

  // Verificar si ya tiene uno abierto
  const existente = await obtenerCicloActivo(CueIdCuenta);
  if (existente) {
    logger.info(`[CICLO] CueIdCuenta=${CueIdCuenta} ya tiene ciclo abierto CicIdCiclo=${existente.CicIdCiclo}`);
    return { CicIdCiclo: existente.CicIdCiclo, esNuevo: false };
  }

  // Obtener CueDiasCiclo de la cuenta
  const cuentaRes = await pool.request()
    .input('CueIdCuenta', sql.Int, CueIdCuenta)
    .query(`SELECT ISNULL(CueDiasCiclo, 7) AS Dias FROM dbo.CuentasCliente WHERE CueIdCuenta = @CueIdCuenta`);

  const dias = cuentaRes.recordset[0]?.Dias ?? 7;
  const fechaIni = FechaInicio ? new Date(FechaInicio) : new Date();
  const fechaCierre = new Date(fechaIni);
  fechaCierre.setDate(fechaCierre.getDate() + dias);

  const insertRes = await pool.request()
    .input('CueIdCuenta',      sql.Int,  CueIdCuenta)
    .input('CliIdCliente',     sql.Int,  CliIdCliente)
    .input('CicFechaInicio',   sql.Date, fechaIni)
    .input('CicFechaCierre',   sql.Date, fechaCierre)
    .input('CicDiasAprobados', sql.Int,  dias)
    .input('UsuarioAlta',      sql.Int,  UsuarioAlta)
    .query(`
      INSERT INTO dbo.CiclosCredito
        (CueIdCuenta, CliIdCliente, CicFechaInicio, CicFechaCierre,
         CicDiasAprobados, CicTotalOrdenes, CicTotalPagos,
         CicEstado, CicUsuarioApertura)
      OUTPUT INSERTED.CicIdCiclo
      VALUES
        (@CueIdCuenta, @CliIdCliente, @CicFechaInicio, @CicFechaCierre,
         @CicDiasAprobados, 0, 0,
         'ABIERTO', @UsuarioAlta)
    `);

  const CicIdCiclo = insertRes.recordset[0].CicIdCiclo;
  logger.info(`[CICLO] Ciclo ABIERTO: CicIdCiclo=${CicIdCiclo} CueIdCuenta=${CueIdCuenta} hasta ${fechaCierre.toISOString().split('T')[0]}`);
  return { CicIdCiclo, esNuevo: true };
}

/**
 * acumularEnCiclo
 * Acumula un importe en el campo especificado del ciclo activo.
 * @param {number} CicIdCiclo
 * @param {'ORDEN'|'PAGO'} tipo
 * @param {number} importe   (siempre positivo)
 */
async function acumularEnCiclo(CicIdCiclo, tipo, importe) {
  const pool  = await getPool();
  const campo = tipo === 'PAGO' ? 'CicTotalPagos' : 'CicTotalOrdenes';

  await pool.request()
    .input('CicIdCiclo', sql.Int,          CicIdCiclo)
    .input('Importe',    sql.Decimal(18,4), Math.abs(importe))
    .query(`UPDATE dbo.CiclosCredito SET ${campo} = ${campo} + @Importe WHERE CicIdCiclo = @CicIdCiclo`);
}

/**
 * cerrarCicloCompleto
 * Cierra un ciclo de crédito:
 *   1. Calcula CicSaldoFacturar = TotalOrdenes - TotalPagos
 *   2. Genera un DocumentoContable tipo FACTURA
 *   3. Crea un DeudaDocumento por el saldo a cobrar
 *   4. Registra movimiento de cierre en el libro mayor
 *   5. Abre automáticamente el ciclo siguiente
 *
 * @param {object} params
 *   @param {number} CicIdCiclo
 *   @param {number} UsuarioAlta
 * @returns {Promise<{DocIdDocumento, SaldoFacturar, nuevoCiclo}>}
 */
async function cerrarCicloCompleto({ CicIdCiclo, UsuarioAlta }) {
  const pool = await getPool();

  // 1. Leer el ciclo
  const cicloRes = await pool.request()
    .input('CicIdCiclo', sql.Int, CicIdCiclo)
    .query(`
      SELECT c.*, cc.CueDiasCiclo, cc.MonIdMoneda
      FROM dbo.CiclosCredito c
      JOIN dbo.CuentasCliente cc ON cc.CueIdCuenta = c.CueIdCuenta
      WHERE c.CicIdCiclo = @CicIdCiclo
    `);

  if (!cicloRes.recordset.length)
    throw new Error(`Ciclo ${CicIdCiclo} no encontrado.`);

  const ciclo = cicloRes.recordset[0];
  if (ciclo.CicEstado !== 'ABIERTO' && ciclo.CicEstado !== 'VENCIDO')
    throw new Error(`Ciclo ${CicIdCiclo} está en estado ${ciclo.CicEstado}, no se puede cerrar.`);

  const saldoFacturar = Number(ciclo.CicTotalOrdenes) - Number(ciclo.CicTotalPagos);

  // 2. Generar número de factura correlativo
  const anio = new Date().getFullYear();
  const seqRes = await pool.request()
    .input('Tipo', sql.VarChar(20), 'FACTURA_CICLO')
    .input('Anio', sql.Int,         anio)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.SecuenciaDocumentos WHERE SecTipo = @Tipo)
        INSERT INTO dbo.SecuenciaDocumentos (SecTipo, SecUltimoNum, SecAnio) VALUES (@Tipo, 0, @Anio);
      UPDATE dbo.SecuenciaDocumentos
      SET    SecUltimoNum = SecUltimoNum + 1, SecAnio = @Anio
      OUTPUT INSERTED.SecUltimoNum
      WHERE  SecTipo = @Tipo;
    `);
  const numero  = seqRes.recordset[0].SecUltimoNum;
  const docNumero = `FC-${anio}-${String(numero).padStart(5,'0')}`;

  // 3. Insertar DocumentoContable
  let DocIdDocumento = null;
  if (saldoFacturar > 0) {
    const docRes = await pool.request()
      .input('CueIdCuenta',   sql.Int,          ciclo.CueIdCuenta)
      .input('CliIdCliente',  sql.Int,          ciclo.CliIdCliente)
      .input('DocNumero',     sql.VarChar(50),  docNumero)
      .input('DocTotal',      sql.Decimal(18,4), saldoFacturar)
      .input('DocSubtotal',   sql.Decimal(18,4), saldoFacturar)
      .input('MonIdMoneda',   sql.Int,          ciclo.MonIdMoneda || 1)
      .input('CicIdCiclo',    sql.Int,          CicIdCiclo)
      .input('FechaDesde',    sql.Date,         new Date(ciclo.CicFechaInicio))
      .input('FechaHasta',    sql.Date,         new Date(ciclo.CicFechaCierre))
      .input('UsuarioAlta',   sql.Int,          UsuarioAlta)
      .query(`
        INSERT INTO dbo.DocumentosContables
          (CueIdCuenta, CliIdCliente, DocTipo, DocNumero, DocSerie,
           DocFechaDesde, DocFechaHasta, DocSubtotal, DocTotal,
           MonIdMoneda, CicIdCiclo, DocEstado,
           DocFechaEmision, DocUsuarioAlta)
        OUTPUT INSERTED.DocIdDocumento
        VALUES
          (@CueIdCuenta, @CliIdCliente, 'FACTURA', @DocNumero, 'A',
           @FechaDesde, @FechaHasta, @DocSubtotal, @DocTotal,
           @MonIdMoneda, @CicIdCiclo, 'EMITIDO',
           GETDATE(), @UsuarioAlta)
      `);
    DocIdDocumento = docRes.recordset[0].DocIdDocumento;

    // 4. Crear DeudaDocumento por el saldo a facturar
    await crearDeudaDocumento({
      CueIdCuenta: ciclo.CueIdCuenta,
      OrdIdOrden: null,
      Importe: saldoFacturar,
    });

    // 5. Registrar movimiento de cierre en libro mayor
    await registrarMovimiento({
      CueIdCuenta:   ciclo.CueIdCuenta,
      MovTipo:       'CIERRE_CICLO',
      MovConcepto:   `Cierre ciclo ${ciclo.CicFechaInicio ? new Date(ciclo.CicFechaInicio).toLocaleDateString('es-UY') : ''} → ${ciclo.CicFechaCierre ? new Date(ciclo.CicFechaCierre).toLocaleDateString('es-UY') : ''} | ${docNumero}`,
      MovImporte:    0,   // neutro, es solo el marcador de cierre
      MovUsuarioAlta: UsuarioAlta,
      DocIdDocumento,
      MovObservaciones: `Ordenes: ${ciclo.CicTotalOrdenes} | Pagos: ${ciclo.CicTotalPagos} | Saldo: ${saldoFacturar}`,
    });
  }

  // 6. Cerrar el ciclo actual
  await pool.request()
    .input('CicIdCiclo',     sql.Int,          CicIdCiclo)
    .input('SaldoFacturar',  sql.Decimal(18,4), saldoFacturar)
    .input('TotalOrdenes',   sql.Decimal(18,4), Number(ciclo.CicTotalOrdenes))
    .input('TotalPagos',     sql.Decimal(18,4), Number(ciclo.CicTotalPagos))
    .input('NumeroFactura',  sql.VarChar(100),  docNumero)
    .input('UsuarioCierre',  sql.Int,          UsuarioAlta)
    .query(`
      UPDATE dbo.CiclosCredito
      SET CicEstado        = 'CERRADO',
          CicSaldoFacturar  = @SaldoFacturar,
          CicTotalOrdenes   = @TotalOrdenes,
          CicTotalPagos     = @TotalPagos,
          CicNumeroFactura  = @NumeroFactura,
          CicFechaFactura   = GETDATE(),
          CicUsuarioCierre  = @UsuarioCierre
      WHERE CicIdCiclo = @CicIdCiclo
    `);

  logger.info(`[CICLO] Ciclo ${CicIdCiclo} → CERRADO. Saldo ${saldoFacturar}, Factura ${docNumero}`);

  // 7. Abrir ciclo siguiente automáticamente
  const nuevoCicloFechaInicio = ciclo.CicFechaCierre ? new Date(ciclo.CicFechaCierre) : new Date();
  const nuevoCiclo = await abrirCicloPorCuenta({
    CueIdCuenta:  ciclo.CueIdCuenta,
    CliIdCliente: ciclo.CliIdCliente,
    UsuarioAlta,
    FechaInicio:  nuevoCicloFechaInicio,
  });

  return { DocIdDocumento, SaldoFacturar: saldoFacturar, docNumero, nuevoCiclo };
}

/**
 * cerrarCiclosVencidos
 * Busca ciclos ABIERTOS cuya fecha de cierre ya pasó y los marca como VENCIDO.
 * Luego los cierra automáticamente. Llamado por el CRON nocturno.
 *
 * @returns {Promise<{procesados: number, errores: number}>}
 */
async function cerrarCiclosVencidos() {
  const pool = await getPool();
  let procesados = 0, errores = 0;

  // Marcar como VENCIDO los que pasaron su fecha
  await pool.request().query(`
    UPDATE dbo.CiclosCredito
    SET    CicEstado = 'VENCIDO'
    WHERE  CicEstado = 'ABIERTO'
      AND  CicFechaCierre < CAST(GETDATE() AS DATE)
  `);

  // Cerrar todos los VENCIDOS
  const vencidos = await pool.request().query(`
    SELECT CicIdCiclo FROM dbo.CiclosCredito WHERE CicEstado = 'VENCIDO'
  `);

  for (const c of vencidos.recordset) {
    try {
      await cerrarCicloCompleto({ CicIdCiclo: c.CicIdCiclo, UsuarioAlta: 1 });
      procesados++;
    } catch (e) {
      logger.error(`[CICLO] Error cerrando CicIdCiclo=${c.CicIdCiclo}: ${e.message}`);
      errores++;
    }
  }

  logger.info(`[CICLO] cerrarCiclosVencidos → procesados: ${procesados}, errores: ${errores}`);
  return { procesados, errores };
}


// ============================================================
// SECCIÓN X: HOOK — RETIRO AUTORIZADO SIN PAGO (FIADO)
// ============================================================

async function hookRetiroSinPago({ OReIdOrdenRetiro, CliIdCliente, OrdIds = [], Monto = 0, UsuarioAlta = 1, Observacion = '' }) {
  try {
    const pool = await getPool();

    const cueRes = await pool.request()
      .input('CliIdCliente', sql.Int, CliIdCliente)
      .query(`
        SELECT TOP 1 CueIdCuenta
        FROM   dbo.CuentasCliente
        WHERE  CliIdCliente = @CliIdCliente
          AND  CueTipo IN ('DINERO_UYU', 'DINERO_USD')
          AND  CueActiva = 1
        ORDER BY CASE CueTipo WHEN 'DINERO_UYU' THEN 1 ELSE 2 END
      `);

    if (cueRes.recordset.length > 0) {
      const { CueIdCuenta } = cueRes.recordset[0];
      await registrarMovimiento({
        CueIdCuenta,
        MovTipo:          'FIADO',
        MovConcepto:      `Retiro R-${OReIdOrdenRetiro} entregado sin cobro`,
        MovImporte:       0,
        MovUsuarioAlta:   UsuarioAlta,
        OReIdOrdenRetiro: OReIdOrdenRetiro,
        MovObservaciones: `Monto: ${Number(Monto).toFixed(2)}${Observacion ? ' | ' + Observacion : ''}`,
      });
    } else {
      logger.warn(`[FIADO] Sin cuenta DINERO para CliId=${CliIdCliente}`);
    }

    if (OrdIds.length > 0) {
      const placeholders = OrdIds.map((_, i) => `@ord${i}`).join(',');
      const req2 = pool.request();
      OrdIds.forEach((id, i) => req2.input(`ord${i}`, sql.Int, id));
      const updated = await req2.query(`
        UPDATE dbo.DeudaDocumento
        SET    DDeEstado = 'EN_GESTION'
        WHERE  OrdIdOrden IN (${placeholders})
          AND  DDeEstado = 'PENDIENTE'
      `);
      logger.info(`[FIADO] R-${OReIdOrdenRetiro}: ${updated.rowsAffected[0]} deuda(s) -> EN_GESTION`);
    }

    logger.info(`[FIADO] OK: R-${OReIdOrdenRetiro}, Cli=${CliIdCliente}, Monto=${Monto}`);
  } catch (err) {
    logger.warn('[FIADO] hookRetiroSinPago fallo (no afecta la entrega):', err.message);
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  // Cuentas
  obtenerOCrearCuenta,

  // Libro mayor
  registrarMovimiento,
  getMovimientos,

  // Pagos
  imputarPago,

  // Deuda
  crearDeudaDocumento,
  getDeudas,

  // Ciclos de crédito
  obtenerCicloActivo,
  abrirCicloPorCuenta,
  acumularEnCiclo,
  cerrarCicloCompleto,
  cerrarCiclosVencidos,

  // Hooks — llamar post-commit desde otros controladores
  hookOrdenCreada,
  hookReposicion,
  hookPagoRegistrado,
  hookEntregaMetros,
  hookRetiroSinPago,

  // Consultas
  getSaldoCliente,
  getAntiguedadDeuda,

  // --- MOTOR UNIFICADO ---
  procesarEventoContable,

  // Consultas extra
  getDeudasPorCliente,
};

/**
 * procesarEventoContable (MOTOR UNIFICADO)
 * ──────────────────────────────────────────────────────────────────────────
 * Orquestador central que consulta el motor de reglas y aplica todas las
 * tareas contables (Submayor, Deuda, Recursos, Asientos).
 *
 * @param {string} evtCodigo   Código del evento (ej: 'VTA_CAJA', 'PAGO')
 * @param {object} data        Datos de la operación { CliIdCliente, Importe, ... }
 */
async function procesarEventoContable(evtCodigo, data) {
  const motor = require('./motorContable');
  const contabilidadCore = require('./contabilidadCore');
  const evt = await motor.getEvento(evtCodigo);

  if (!evt) {
    logger.warn(`[MOTOR] Evento ${evtCodigo} omitido (no configurado en Cont_EventosContables).`);
    return null;
  }

  const {
    CliIdCliente, Importe = 0, MonIdMoneda = 1, UsuarioAlta = 70,
    OrdIdOrden = null, CodigoOrden = '', NombreTrabajo = '', 
    ProIdProducto = null, Cantidad = 0,
    OReIdOrdenRetiro = null, PagIdPago = null
  } = data;

  try {
    let resSubmayor = null;
    const pool = await getPool();

    // 1. LÓGICA DE SUBMAYOR (CUENTAS CORRIENTES / SALDO CLIENTE)
    if (evt.EvtAfectaSaldo !== 0 && CliIdCliente) {
      let saltarDinero = false;
      
      // Si el evento aplica recursos, verificamos si existe un plan activo para evitar doble cobro
      if (evt.EvtAplicaRecurso && ProIdProducto) {
         const pCheck = await pool.request()
            .input('C', sql.Int, CliIdCliente)
            .input('P', sql.Int, ProIdProducto)
            .query(`
              SELECT TOP 1 PlaIdPlan FROM PlanesMetros 
              WHERE CliIdCliente=@C AND ProIdProducto=@P AND PlaActivo=1 
              AND (PlaFechaVencimiento IS NULL OR PlaFechaVencimiento >= CAST(GETDATE() AS DATE))
            `);
         if (pCheck.recordset.length > 0) {
            saltarDinero = true;
            logger.info(`[MOTOR] ${evtCodigo}: Cliente ${CliIdCliente} tiene plan para Producto ${ProIdProducto}. Se omite cobro en dinero.`);
         }
      }

      if (!saltarDinero) {
        const cueTipo = MonIdMoneda === 2 ? 'DINERO_USD' : 'DINERO_UYU';
        const cueId = await obtenerOCrearCuenta(CliIdCliente, cueTipo, { MonIdMoneda, UsuarioAlta });
        
        // Registrar en historial de movimientos
        resSubmayor = await registrarMovimiento({
          CueIdCuenta: cueId,
          MovTipo: evtCodigo,
          MovConcepto: `${CodigoOrden} ${NombreTrabajo}`.trim() || evtCodigo,
          MovImporte: Math.abs(Importe) * (evt.EvtAfectaSaldo || 1), // Efecto natural directo: 1 = Suma/Haber a favor (+), -1 = Resta/Debe deuda (-)
          MovUsuarioAlta: UsuarioAlta,
          OrdIdOrden, OReIdOrdenRetiro, PagIdPago
        });

        // 2. GENERACIÓN DE DEUDA VIVA (DOCUMENTOS PENDIENTES) Y CRUCES DE MONEDA
        // Si el saldo resultante bajó de 0 (hay deuda generada)
        if (evt.EvtGeneraDeuda && resSubmayor.SaldoResultante < 0) {
           let deudaReal = Math.min(Math.abs(Importe), Math.max(0, -resSubmayor.SaldoResultante));
           
           if (deudaReal > 0.01) {
              // Intentar cruce de monedas (si tiene saldo a favor en la otra)
              const tipoOtra = MonIdMoneda === 2 ? 'DINERO_UYU' : 'DINERO_USD';
              const ctaOtraRes = await pool.request()
                 .input('CliCruce', sql.Int, CliIdCliente)
                 .input('TipoCruce', sql.VarChar(20), tipoOtra)
                 .query(`SELECT CueIdCuenta, CueSaldoActual FROM CuentasCliente WHERE CliIdCliente=@CliCruce AND CueTipo=@TipoCruce AND CueActiva=1 AND CueSaldoActual > 0.01`);
              
              if (ctaOtraRes.recordset.length > 0) {
                 const ctaOtra = ctaOtraRes.recordset[0];
                 let coti = 1;
                 const cotiRes = await pool.request().query('SELECT TOP 1 CotDolar FROM dbo.Cotizaciones WITH(NOLOCK) ORDER BY CotFecha DESC');
                 if (cotiRes.recordset.length > 0) coti = parseFloat(cotiRes.recordset[0].CotDolar) || 1;

                 // Tasa para convertir de la "otra" moneda a la "actual"
                 let tasaConvertirAOrden = MonIdMoneda === 2 ? (1 / coti) : coti;
                 let saldoOtraConvertido = ctaOtra.CueSaldoActual * tasaConvertirAOrden;

                 let aDescontarOrden = Math.min(deudaReal, saldoOtraConvertido);
                 
                 if (aDescontarOrden > 0.01) {
                    let aDescontarCtaOtra = aDescontarOrden / tasaConvertirAOrden;
                    
                    // Extraer de la bolsa positiva (otra cuenta)
                    await registrarMovimiento({
                      CueIdCuenta: ctaOtra.CueIdCuenta,
                      MovTipo: 'PAGO_CRUZADO',
                      MovConcepto: `Cruce automático -> Orden ${CodigoOrden}`,
                      MovImporte: -Math.abs(aDescontarCtaOtra),
                      MovUsuarioAlta: UsuarioAlta,
                      OrdIdOrden, OReIdOrdenRetiro,
                    });

                    // Ingresar la plata convertida a la cuenta endeudada
                    await registrarMovimiento({
                      CueIdCuenta: cueId,
                      MovTipo: 'PAGO_CRUZADO',
                      MovConcepto: `Cobertura desde ${tipoOtra}`,
                      MovImporte: Math.abs(aDescontarOrden),
                      MovUsuarioAlta: UsuarioAlta,
                      OrdIdOrden, OReIdOrdenRetiro,
                    });

                    deudaReal -= aDescontarOrden;
                 }
              }

              // Si TODAVÍA hay deuda viva, se hace el documento pendiente
              if (deudaReal > 0.01) {
                 await crearDeudaDocumento({ 
                    CueIdCuenta: cueId, OrdIdOrden, 
                    Importe: Math.abs(Importe), 
                    ImportePendiente: deudaReal 
                 });
              } else {
                 // Deuda cubierta completamente por cruce
                 resSubmayor.cubiertoPorSaldo = true;
              }
           }
        } else if (evt.EvtGeneraDeuda) {
           // Si el evento genera deuda pero SaldoResultante >= 0, significa que la cuenta TENÍA saldo a favor suficiente
           resSubmayor.cubiertoPorSaldo = true;
        }

        // 2.5. AUTO-MARCAR ORDEN COMO PAGADA SI FUE CUBIERTA 100% POR SALDO
        if (evt.EvtGeneraDeuda && resSubmayor?.cubiertoPorSaldo === true && OrdIdOrden) {
           logger.info(`[MOTOR] Orden ${CodigoOrden} cubierta totalmente por Saldo a Favor. Auto-marcando como paga.`);
           await pool.request().input('Id', sql.Int, OrdIdOrden).query(`
             UPDATE dbo.OrdenesDeposito SET OrdEstadoActual = CASE WHEN OrdEstadoActual = 1 THEN 7 ELSE OrdEstadoActual END WHERE OrdIdOrden = @Id;
           `);
           // Chequear si la orden de retiro padre también debe pasar a abonada
           await pool.request().input('Id', sql.Int, OrdIdOrden).query(`
             UPDATE r SET OReEstadoActual = CASE WHEN OReEstadoActual = 1 THEN 3 WHEN OReEstadoActual = 5 THEN 8 ELSE OReEstadoActual END
             FROM dbo.OrdenesRetiro r
             INNER JOIN dbo.OrdenesDeposito d ON d.OReIdOrdenRetiro = r.OReIdOrdenRetiro
             WHERE d.OrdIdOrden = @Id AND NOT EXISTS (
                SELECT 1 FROM dbo.OrdenesDeposito od2 
                LEFT JOIN dbo.DeudaDocumento dd ON dd.OrdIdOrden = od2.OrdIdOrden
                WHERE od2.OReIdOrdenRetiro = r.OReIdOrdenRetiro AND od2.OrdIdOrden != @Id
                  AND (od2.PagIdPago IS NULL AND (dd.DDeImportePendiente > 0.01 OR dd.DDeImportePendiente IS NULL))
             )
           `);
        }
      }
    }

    // 3. LÓGICA DE RECURSOS (PLANES METROS/KG)
    if (evt.EvtAplicaRecurso && ProIdProducto && Cantidad > 0) {
      await hookEntregaMetros({ 
        OrdIdOrden, CliIdCliente, ProIdProducto, Cantidad, 
        CodigoOrden, UsuarioAlta, Importe, MonIdMoneda, NombreTrabajo 
      });
    }

    // 4. LÓGICA DE IMPUTACIÓN (SOLO PARA PAGOS)
    if (PagIdPago && cueIdCta) {
       await imputarPago({
          PagIdPago,
          MontoDisponible: Math.abs(Importe),
          CueIdCuenta: cueIdCta,
          UsuarioAlta
       });
       logger.info(`[MOTOR] Pago ${PagIdPago} imputado automáticamente.`);
    }

    // 5. LÓGICA DE ASIENTO CONTABLE (LIBRO MAYOR)
    const reglas = await motor.getReglasAsiento(evtCodigo);
    if (reglas && reglas.length >= 2) {
      let cotiz = 1;
      if (MonIdMoneda === 2) {
        const cRes = await pool.request().query('SELECT TOP 1 CotDolar FROM Cotizaciones WITH(NOLOCK) ORDER BY CotFecha DESC');
        cotiz = cRes.recordset.length > 0 ? parseFloat(cRes.recordset[0].CotDolar) || 1 : 1;
      }

      const importeAbsRounded = Math.round(Math.abs(Importe) * 100) / 100;
      const { neto, ivaMonto } = contabilidadCore.desglosarIVA(importeAbsRounded, 22);
      const lineas = await contabilidadCore.resolverLineasDesdeMotor(evtCodigo, {
        moneda: MonIdMoneda === 2 ? 'USD' : 'UYU',
        cotizacion: cotiz,
        totalNeto: importeAbsRounded,
        neto, ivaMonto,
        clienteId: CliIdCliente,
        monedaId: MonIdMoneda
      });

      if (lineas.length >= 2) {
        const tran = pool.transaction();
        await tran.begin();
        try {
          await contabilidadCore.generarAsientoCompleto({
            fecha: new Date(),
            concepto: `${CodigoOrden} ${NombreTrabajo}`.trim() || evtCodigo,
            usuarioId: UsuarioAlta,
            origen: 'MOTOR',
            lineas
          }, tran);
          await tran.commit();
        } catch (errAsi) {
          await tran.rollback();
          logger.error(`[MOTOR] Falló Asiento ${evtCodigo}: ${errAsi.message}`);
        }
      }
    }

    return { success: true, saldoActual: resSubmayor?.SaldoResultante };
  } catch (err) {
    logger.error(`[MOTOR] Error crítico en procesarEventoContable (${evtCodigo}): ${err.message}`);
    // No lanzamos error para no romper el proceso de negocio principal (fire-and-forget logic)
    return { success: false, error: err.message };
  }
}
