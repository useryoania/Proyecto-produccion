'use strict';
const cajaService = require('../services/cajaService');
const logger      = require('../utils/logger');
const contabilidadSvc = require('../services/contabilidadService');
const contabilidadCore = require('../services/contabilidadCore'); // ERP Core
const { getPool, sql } = require('../config/db');

// ── helpers ───────────────────────────────────────────────────────────────────
const io = (req) => req.app.get('socketio');

// ─── TRANSACCIONES ───────────────────────────────────────────────────────────

const procesarTransaccion = async (req, res) => {
  const usuarioId = req.user?.id || 70;
  try {
    const { header, aplicaciones, pagos } = req.body;
    if (!header || !aplicaciones?.length || !pagos?.length)
      return res.status(400).json({ success:false, error:'Faltan header, aplicaciones o pagos.' });
    if (header.tipoDocumento && header.tipoDocumento !== 'NINGUNO') {
      const pool = await getPool();
      const rTipo = await pool.request().input('d', sql.VarChar(10), header.tipoDocumento).query('SELECT 1 FROM Config_TiposDocumento WHERE CodDocumento = @d');
      if (!rTipo.recordset.length) return res.status(400).json({ success:false, error:'tipoDocumento inválido.' });
    }
    const resultado = await cajaService.procesarTransaccion({ header, aplicaciones, pagos, usuarioId });
    const s = io(req); if (s) { s.emit('actualizado',{type:'actualizacion'}); s.emit('retiros:update',{type:'pago'}); }
    return res.status(201).json(resultado);
  } catch (err) {
    logger.error('[CAJA] procesarTransaccion:', err.message);
    return res.status(500).json({ success:false, error:err.message });
  }
};

const procesarVentaDirecta = async (req, res) => {
  const usuarioId = req.user?.id || 70;
  try {
    const data = req.body; // { header, items, pagos }
    if (!data.header || !data.items?.length)
      return res.status(400).json({ success:false, error:'Faltan datos de la venta.' });

    const resultado = await cajaService.procesarVentaDirecta({ ...data, usuarioId });
    const s = io(req); if (s) { s.emit('actualizado',{type:'actualizacion'}); s.emit('retiros:update',{type:'venta'}); }
    return res.status(201).json(resultado);
  } catch (err) {
    logger.error('[CAJA] procesarVentaDirecta:', err.message);
    return res.status(500).json({ success:false, error:err.message });
  }
};

const getProductosVenta = async (req, res) => {
  try {
    const data = await cajaService.getProductosVenta();
    return res.json({ success:true, data });
  } catch (err) {
    logger.error('[CAJA] getProductosVenta:', err.message);
    return res.status(500).json({ success:false, error:err.message });
  }
};

const anularTransaccion = async (req, res) => {
  const usuarioId = req.user?.id || 70;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ success:false, error:'ID inválido.' });
  try {
    const r = await cajaService.anularTransaccion({ tcaIdTransaccion:id, usuarioId, motivo:req.body.motivo });
    const s = io(req); if (s) s.emit('retiros:update',{type:'anulacion'});
    return res.json(r);
  } catch (err) {
    logger.error('[CAJA] anularTransaccion:', err.message);
    return res.status(500).json({ success:false, error:err.message });
  }
};

const getTransaccion = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ success:false, error:'ID inválido.' });
  try {
    const data = await cajaService.getTransaccion(id);
    if (!data) return res.status(404).json({ success:false, error:'Transacción no encontrada.' });
    return res.json({ success:true, data });
  } catch (err) { return res.status(500).json({ success:false, error:err.message }); }
};

const getHistorialCliente = async (req, res) => {
  const clienteId = parseInt(req.params.clienteId, 10);
  if (isNaN(clienteId)) return res.status(400).json({ success:false, error:'clienteId inválido.' });
  const { desde, hasta, limit } = req.query;
  try {
    const data = await cajaService.getTransaccionesByCliente({ clienteId, desde:desde||null, hasta:hasta||null, limit:parseInt(limit||50) });
    return res.json({ success:true, total:data.length, data });
  } catch (err) { return res.status(500).json({ success:false, error:err.message }); }
};

// ─── SESIÓN DE CAJA ──────────────────────────────────────────────────────────

/** GET /api/contabilidad/caja/sesion/actual — sesión activa de hoy */
const getSesionActual = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT TOP 1
        StuIdSesion, StuFechaApertura, StuUsuarioAbre, StuMontoInicial, StuEstado,
        DATEDIFF(MINUTE, StuFechaApertura, GETDATE()) AS MinutosAbierta
      FROM dbo.SesionesTurno WITH(NOLOCK)
      WHERE StuEstado = 'ABIERTA'
        AND CAST(StuFechaApertura AS DATE) = CAST(GETDATE() AS DATE)
      ORDER BY StuFechaApertura DESC
    `);
    if (result.recordset.length === 0)
      return res.json({ success:true, sesion:null, mensaje:'No hay caja abierta hoy.' });
    return res.json({ success:true, sesion:result.recordset[0] });
  } catch (err) {
    logger.error('[CAJA] getSesionActual:', err.message);
    return res.status(500).json({ success:false, error:err.message });
  }
};

/** POST /api/contabilidad/caja/sesion/abrir */
const abrirSesion = async (req, res) => {
  const usuarioId = req.user?.id || 70;
  const { montoInicial = 0 } = req.body;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('UsuarioId',    sql.Int,           usuarioId)
      .input('MontoInicial', sql.Decimal(18,2),  parseFloat(montoInicial) || 0)
      .execute('SP_AbrirSesionCaja');
    logger.info(`[CAJA] 🟢 Caja abierta por usuario ${usuarioId}. Sesión: ${result.recordset[0]?.StuIdSesion}`);
    return res.status(201).json({ success:true, sesion:result.recordset[0] });
  } catch (err) {
    logger.error('[CAJA] abrirSesion:', err.message);
    const status = err.message.includes('ya existe') ? 409 : 500;
    return res.status(status).json({ success:false, error:err.message });
  }
};

/** POST /api/contabilidad/caja/sesion/:id/cerrar */
const cerrarSesion = async (req, res) => {
  const usuarioId  = req.user?.id || 70;
  const id         = parseInt(req.params.id, 10);
  const { montoFinal, observaciones } = req.body;
  if (isNaN(id))      return res.status(400).json({ success:false, error:'ID de sesión inválido.' });
  if (!montoFinal && montoFinal !== 0) return res.status(400).json({ success:false, error:'montoFinal es requerido.' });
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('StuIdSesion',   sql.Int,           id)
      .input('UsuarioId',     sql.Int,           userId)
      .input('MontoFinal',    sql.Decimal(18,2),  parseFloat(montoFinal))
      .input('Observaciones', sql.NVarChar(500),  observaciones || null)
      .execute('SP_CerrarSesionCaja');
    logger.info(`[CAJA] 🔴 Caja cerrada. Sesión: ${id}. Diferencia: ${result.recordset[0]?.Diferencia}`);
    return res.json({ success:true, resumen:result.recordset[0] });
  } catch (err) {
    logger.error('[CAJA] cerrarSesion:', err.message);
    return res.status(500).json({ success:false, error:err.message });
  }
};

/** GET /api/contabilidad/caja/sesion/:id/resumen — totales de una sesión */
const getResumenSesion = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ success:false, error:'ID inválido.' });
  try {
    const pool = await getPool();
    const [sesRes, cobRes, egrRes] = await Promise.all([
      pool.request().input('Id',sql.Int,id).query(`SELECT * FROM dbo.SesionesTurno WITH(NOLOCK) WHERE StuIdSesion=@Id`),
      pool.request().input('Id',sql.Int,id).query(`
        SELECT COUNT(*) AS CantCobros, ISNULL(SUM(TcaTotalCobrado),0) AS TotalCobrado,
               ISNULL(SUM(TcaTotalAjuste),0) AS TotalAjuste
        FROM dbo.TransaccionesCaja WITH(NOLOCK) WHERE StuIdSesion=@Id AND TcaEstado='COMPLETADO'`),
      pool.request().input('Id',sql.Int,id).query(`
        SELECT COUNT(*) AS CantEgresos, ISNULL(SUM(EgrMontoConvertido),0) AS TotalEgresos
        FROM dbo.EgresosCaja WITH(NOLOCK) WHERE StuIdSesion=@Id AND EgrEstado='REGISTRADO'`),
    ]);
    if (!sesRes.recordset.length) return res.status(404).json({ success:false, error:'Sesión no encontrada.' });
    return res.json({
      success: true,
      sesion:  sesRes.recordset[0],
      cobros:  cobRes.recordset[0],
      egresos: egrRes.recordset[0],
    });
  } catch (err) { return res.status(500).json({ success:false, error:err.message }); }
};

// ─── MOVIMIENTOS DETALLADOS DEL TURNO ────────────────────────────────────────
const getMovimientosTurno = async (req, res) => {
  const usuarioId = req.user?.id || 70;
  try {
    const pool = await getPool();
    // Obtener la sesión activa
    const sR = await pool.request().query(`SELECT StuIdSesion, StuFechaApertura FROM dbo.SesionesTurno WITH(NOLOCK) WHERE StuEstado = 'ABIERTA'`);
    if(!sR.recordset.length) return res.json({ success:true, movimientos:[], totales:{} });
    
    const sid = sR.recordset[0].StuIdSesion;
    const fecAbierta = sR.recordset[0].StuFechaApertura;

    const movimientos = await pool.request()
      .input('Sid', sql.Int, sid)
      .input('FecA', sql.DateTime, fecAbierta)
      .query(`
      SELECT 
        'INGRESO' as TipoOperacion,
        t.TcaFecha as Fecha,
        ISNULL(ct1.Detalle, t.TcaTipoDocumento) as TipoComprobante,
        ISNULL(t.TcaSerieDoc,'') + '-' + ISNULL(t.TcaNumeroDoc,'') as Comprobante,
        'Cobro Mostrador' as Concepto,
        mp.MPaDescripcionMetodo as MedioDePago,
        CASE WHEN p.PagIdMonedaPago = 2 THEN 'USD' ELSE 'UYU' END as Moneda,
        p.PagMontoPago as Entrada,
        0 as Salida
      FROM dbo.TransaccionesCaja t WITH(NOLOCK)
      JOIN dbo.Pagos p WITH(NOLOCK) ON p.PagTcaIdTransaccion = t.TcaIdTransaccion
      LEFT JOIN dbo.MetodosPagos mp WITH(NOLOCK) ON mp.MPaIdMetodoPago = p.MPaIdMetodoPago
      LEFT JOIN dbo.Config_TiposDocumento ct1 WITH(NOLOCK) ON ct1.CodDocumento = t.TcaTipoDocumento
      WHERE (t.StuIdSesion = @Sid OR (t.StuIdSesion IS NULL AND t.TcaFecha >= @FecA)) AND t.TcaEstado = 'COMPLETADO' AND p.PagTipoMovimiento != 'ANULADO'
      UNION ALL
      SELECT 
        'EGRESO' as TipoOperacion,
        e.EgrFecha as Fecha,
        ISNULL(ct2.Detalle, e.EgrTipoDocumento) as TipoComprobante,
        ISNULL(e.EgrSerieDoc,'') + '-' + ISNULL(e.EgrNumeroDoc,'') as Comprobante,
        e.EgrConcepto as Concepto,
        mp.MPaDescripcionMetodo as MedioDePago,
        e.EgrMoneda as Moneda,
        0 as Entrada,
        e.EgrMonto as Salida
      FROM dbo.EgresosCaja e WITH(NOLOCK)
      LEFT JOIN dbo.MetodosPagos mp WITH(NOLOCK) ON mp.MPaIdMetodoPago = e.MPaIdMetodoPago
      LEFT JOIN dbo.Config_TiposDocumento ct2 WITH(NOLOCK) ON ct2.CodDocumento = e.EgrTipoDocumento
      WHERE e.StuIdSesion = @Sid AND e.EgrEstado = 'REGISTRADO'
      ORDER BY Fecha ASC
    `);

    return res.json({ success:true, movimientos: movimientos.recordset });
  } catch (err) {
    return res.status(500).json({ success:false, error:err.message });
  }
};

// ─── NUMERACIÓN DE DOCUMENTOS ─────────────────────────────────────────────────

/** GET /api/contabilidad/caja/siguiente-numero?tipoDoc=ETICKET&serie=A */
const getSiguienteNumero = async (req, res) => {
  const { tipoDoc, serie = 'A' } = req.query;
  if (!tipoDoc) return res.status(400).json({ success:false, error:'tipoDoc es requerido.' });
  try {
    const pool = await getPool();
    // Solo PEEK — no incrementa todavía; el incremento real ocurre al CONFIRMAR la transacción
    const result = await pool.request()
      .input('TipoDoc', sql.VarChar(20), tipoDoc)
      .input('Serie',   sql.VarChar(5),  serie)
      .query(`
        SELECT
          s.SecUltimoNumero + 1  AS NumeroEntero,
          ISNULL(s.SecPrefijo,'') +
            RIGHT(REPLICATE('0', s.SecDigitos) + CAST(s.SecUltimoNumero+1 AS VARCHAR(10)), s.SecDigitos)
                               AS NumeroFormato,
          s.SecTipoDoc AS TipoDoc,
          s.SecSerie   AS Serie,
          ISNULL(s.SecPrefijo,'') AS Prefijo
        FROM Config_TiposDocumento c WITH(NOLOCK)
        JOIN dbo.SecuenciaDocumentos s WITH(NOLOCK) ON c.SecIdSecuencia = s.SecIdSecuencia
        WHERE c.CodDocumento = @TipoDoc AND s.SecSerie = @Serie AND s.SecActivo = 1
      `);
    if (!result.recordset.length)
      return res.status(404).json({ success:false, error:`No hay secuencia para ${tipoDoc}-${serie}.` });
    return res.json({ success:true, ...result.recordset[0] });
  } catch (err) { return res.status(500).json({ success:false, error:err.message }); }
};

/** GET /api/contabilidad/caja/secuencias — todas las series activas */
const getSecuencias = async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT SecIdSecuencia, SecTipoDoc, SecSerie, ISNULL(SecPrefijo,'') AS SecPrefijo,
             SecDigitos, SecUltimoNumero, SecActivo
      FROM dbo.SecuenciaDocumentos WITH(NOLOCK)
      ORDER BY SecTipoDoc, SecSerie
    `);
    return res.json({ success:true, data:r.recordset });
  } catch (err) { return res.status(500).json({ success:false, error:err.message }); }
};

// ─── EGRESOS ─────────────────────────────────────────────────────────────────

/** POST /api/contabilidad/caja/egreso */
const registrarEgreso = async (req, res) => {
  const usuarioId = req.user?.id || 70;
  const { stuIdSesion, cuentaGastoCodigo, concepto, proveedor, monto, moneda='UYU', monedaId=1,
          cotizacion, metodoPagoId, tipoDocumento, serieDoc, numeroDoc, observaciones } = req.body;
  if (!cuentaGastoCodigo || !monto) return res.status(400).json({ success:false, error:'cuentaGastoCodigo y monto son obligatorios.' });
  
  const montoNum  = parseFloat(monto);
  const cotNum    = parseFloat(cotizacion) || null;
  const convertido = (moneda === 'USD' && cotNum) ? montoNum * cotNum : montoNum;
  
  const pool = await getPool();
  const transaction = pool.transaction();
  
  try {
    await transaction.begin();

    let numeroDocFinal = numeroDoc || null;
    if (tipoDocumento && tipoDocumento !== 'NINGUNO' && !numeroDoc) {
      try {
        const seqR = await transaction.request()
          .input('CodDoc', sql.VarChar(10), tipoDocumento)
          .input('Serie',  sql.VarChar(5),  serieDoc || 'A')
          .query(`
            DECLARE @SecId INT;
            SELECT @SecId = s.SecIdSecuencia
            FROM Config_TiposDocumento c
            JOIN SecuenciaDocumentos s ON c.SecIdSecuencia = s.SecIdSecuencia
            WHERE c.CodDocumento = @CodDoc AND s.SecSerie = @Serie AND s.SecActivo = 1;

            IF @SecId IS NOT NULL
            BEGIN
              UPDATE SecuenciaDocumentos
              SET SecUltimoNumero = SecUltimoNumero + 1
              OUTPUT 
                ISNULL(INSERTED.SecPrefijo,'') + 
                RIGHT(REPLICATE('0', INSERTED.SecDigitos) + CAST(INSERTED.SecUltimoNumero AS VARCHAR(10)), INSERTED.SecDigitos) AS NumeroFormato
              WHERE SecIdSecuencia = @SecId;
            END
          `);
        if (seqR.recordset && seqR.recordset.length) {
            numeroDocFinal = seqR.recordset[0].NumeroFormato;
        }
      } catch (errSeq) { logger.error('Error seq egreso:', errSeq.message); }
    }

    const result = await transaction.request()
      .input('StuIdSesion',      sql.Int,           stuIdSesion   || null)
      .input('EgrUsuarioId',     sql.Int,           usuarioId)
      .input('EgrConcepto',      sql.NVarChar(200),  concepto)
      .input('EgrProveedor',     sql.NVarChar(150),  proveedor     || null)
      .input('EgrMonto',         sql.Decimal(18,4),  montoNum)
      .input('EgrMoneda',        sql.VarChar(10),    moneda)
      .input('EgrCotizacion',    sql.Decimal(18,4),  cotNum)
      .input('EgrConvertido',    sql.Decimal(18,4),  convertido)
      .input('MPaIdMetodoPago',  sql.Int,            metodoPagoId  || null)
      .input('EgrTipoDoc',       sql.VarChar(20),    tipoDocumento || null)
      .input('EgrSerieDoc',      sql.VarChar(5),     serieDoc      || null)
      .input('EgrNumeroDoc',     sql.VarChar(20),    numeroDocFinal)
      .input('EgrObservaciones', sql.NVarChar(300),  observaciones || null)
      .query(`
        INSERT INTO dbo.EgresosCaja
          (StuIdSesion, EgrFecha, EgrUsuarioId, EgrConcepto, EgrProveedor,
           EgrMonto, EgrMoneda, EgrCotizacion, EgrMontoConvertido,
           MPaIdMetodoPago, EgrTipoDocumento, EgrSerieDoc, EgrNumeroDoc,
           EgrEstado, EgrObservaciones)
        OUTPUT INSERTED.EgrIdEgreso
        VALUES
          (@StuIdSesion, GETDATE(), @EgrUsuarioId, @EgrConcepto, @EgrProveedor,
           @EgrMonto, @EgrMoneda, @EgrCotizacion, @EgrConvertido,
           @MPaIdMetodoPago, @EgrTipoDoc, @EgrSerieDoc, @EgrNumeroDoc,
           'REGISTRADO', @EgrObservaciones)
      `);
    
    const idEgreso = result.recordset[0].EgrIdEgreso;

    // ── PASO ERP: Generar Asiento Contable
    const lineasContables = [];
    // 1. Débito a la cuenta de Gasto Elegida (Ej: Papelería, Mantenimiento)
    lineasContables.push({
      codigoCuenta: cuentaGastoCodigo,
      debeBase: montoNum,
      haberBase: 0,
      monedaId: moneda === 'USD' ? 2 : 1,
      cotizacion: cotNum || 1,
      entidadId: null, // Podría ser el proveedor si ampliamos el plan de cuentas
      entidadTipo: 'PROVEEDOR'
    });

    // 2. Crédito a Caja / Banco (Salida de dinero)
    lineasContables.push({
      codigoCuenta: moneda === 'USD' ? contabilidadCore.CUENTAS.CAJA_USD : contabilidadCore.CUENTAS.CAJA_UYU,
      debeBase: 0,
      haberBase: montoNum,
      monedaId: moneda === 'USD' ? 2 : 1,
      cotizacion: cotNum || 1
    });

    await contabilidadCore.generarAsientoCompleto({
      concepto: `Egreso de Caja: ${concepto}`,
      usuarioId,
      tcaIdTransaccion: idEgreso, // Lo guardamos aquí mapeando el ID Egreso (para drilldown custom luego)
      origen: 'CAJA_EGRESOS',
      lineas: lineasContables
    }, transaction);

    await transaction.commit();

    logger.info(`[CAJA-ERP] Egreso Registrado y Asentado ID=${idEgreso} Monto=${montoNum} ${moneda}`);
    return res.status(201).json({ success:true, egrIdEgreso:idEgreso, numeroDoc:numeroDocFinal });
  } catch (err) {
    try { await transaction.rollback(); } catch (_) {}
    logger.error('[CAJA-ERP] registrarEgreso Error:', err.message);
    return res.status(500).json({ success:false, error:err.message });
  }
};

// ─── AUTORIZACIÓN SIN PAGO ───────────────────────────────────────────────────

/** POST /api/contabilidad/caja/autorizar */
const autorizarSinPago = async (req, res) => {
  const usuarioId = req.user?.id || 70;
  const { oreIdOrdenRetiro, motivo, montoDeuda=0, fechaVencimiento } = req.body;
  if (!oreIdOrdenRetiro || !motivo?.trim())
    return res.status(400).json({ success:false, error:'oreIdOrdenRetiro y motivo son obligatorios.' });
  try {
    const pool = await getPool();
    const transaction = pool.transaction();
    await transaction.begin();
    try {
      // Cambiar estado de la orden a 9 (Autorizado sin pago)
      await transaction.request()
        .input('Id',  sql.Int, parseInt(oreIdOrdenRetiro))
        .input('Usr', sql.Int, usuarioId)
        .query(`
          UPDATE dbo.OrdenesRetiro
          SET OReEstadoActual = 9, OReFechaEstadoActual = GETDATE(), ORePasarPorCaja = 0
          WHERE OReIdOrdenRetiro = @Id;
          INSERT INTO dbo.HistoricoEstadosOrdenesRetiro (OReIdOrdenRetiro, EORIdEstadoOrden, HEOFechaEstado, HEOUsuarioAlta)
          VALUES (@Id, 9, GETDATE(), @Usr);
        `);
      // Registrar en la tabla de autorizaciones
      const auzRes = await transaction.request()
        .input('OReId',    sql.Int,           parseInt(oreIdOrdenRetiro))
        .input('Usr',      sql.Int,           usuarioId)
        .input('Motivo',   sql.NVarChar(300),  motivo.trim())
        .input('Monto',    sql.Decimal(18,2),  parseFloat(montoDeuda) || 0)
        .input('FechaVenc',sql.Date,           fechaVencimiento || null)
        .query(`
          INSERT INTO dbo.AutorizacionesSinPago
            (OReIdOrdenRetiro, AuzFecha, AuzUsuarioId, AuzMotivo, AuzMontoDeuda, AuzFechaVencimiento, AuzEstado)
          OUTPUT INSERTED.AuzIdAutorizacion
          VALUES (@OReId, GETDATE(), @Usr, @Motivo, @Monto, @FechaVenc, 'ACTIVA')
        `);
      await transaction.commit();
      const s = io(req); if (s) { s.emit('retiros:update',{type:'autorizacion'}); }
      logger.info(`[CAJA] ✅ Autorización sin pago: OrdenRetiro=${oreIdOrdenRetiro}`);
      return res.status(201).json({ success:true, auzIdAutorizacion:auzRes.recordset[0].AuzIdAutorizacion });
    } catch (e) { await transaction.rollback(); throw e; }
  } catch (err) {
    logger.error('[CAJA] autorizarSinPago:', err.message);
    return res.status(500).json({ success:false, error:err.message });
  }
};

// ─── OPERACIÓN MANUAL DESDE CAJA (MOTOR UNIFICADO) ───────────────────────────

/**
 * POST /api/contabilidad/caja/operacion-manual
 *
 * El cajero elige una operacion del Motor (EvtCodigo) y el sistema:
 *  1. Carga las reglas de Cont_ReglasAsiento para ese evento
 *  2. Registra MovimientosCuenta según EvtAfectaSaldo del evento
 *  3. Genera el asiento en Libro Mayor via contabilidadCore
 *  4. Crea el documento en DocumentosContables si EvtGeneraDeuda
 *
 * Payload:
 *  { evtCodigo, clienteId, importe, moneda, monedaId, cotizacion,
 *    metodoPagoId, serieDoc, observaciones }
 */
const motorContable = require('../services/motorContable');

const registrarOperacionManual = async (req, res) => {
  const usuarioId = req.user?.id || 70;
  const {
    evtCodigo, clienteId, importe, moneda = 'UYU', monedaId = 1,
    cotizacion, metodoPagoId, serieDoc = 'A', observaciones = ''
  } = req.body;

  if (!evtCodigo) return res.status(400).json({ success: false, error: 'evtCodigo es obligatorio.' });
  if (!importe || isNaN(parseFloat(importe))) return res.status(400).json({ success: false, error: 'importe es obligatorio.' });

  // Cargar el evento del motor
  const evento = await motorContable.getEvento(evtCodigo);
  if (!evento) return res.status(404).json({ success: false, error: `Evento '${evtCodigo}' no encontrado en el Motor.` });
  if (!evento.EvtActivo) return res.status(400).json({ success: false, error: `Evento '${evtCodigo}' está inactivo.` });
  if (evento.EvtUsaEntidad && !clienteId) return res.status(400).json({ success: false, error: `El evento '${evento.EvtNombre}' requiere un cliente.` });

  const montoNum = parseFloat(importe);
  const cotNum   = parseFloat(cotizacion) || 1;
  const convertido = moneda === 'USD' ? montoNum * cotNum : montoNum;

  const pool = await getPool();
  const transaction = pool.transaction();

  try {
    await transaction.begin();

    // 1. Verificar caja abierta
    const sRes = await transaction.request().query("SELECT TOP 1 StuIdSesion FROM dbo.SesionesTurno WITH(UPDLOCK) WHERE StuEstado='ABIERTA'");
    if (!sRes.recordset.length) { await transaction.rollback(); return res.status(400).json({ success: false, error: 'No hay caja abierta.' }); }
    const sesionId = sRes.recordset[0].StuIdSesion;

    // 2. Encabezado de transaccion
    const nDoc = await transaction.request()
      .input('T', sql.VarChar(20), evento.EvtPrefijo || evtCodigo)
      .query('SELECT ISNULL(MAX(TcaNumeroDoc),0)+1 AS N FROM dbo.TransaccionesCaja WITH(UPDLOCK) WHERE TcaTipoDocumento=@T');
    const numDoc = nDoc.recordset[0].N;

    const rTca = await transaction.request()
      .input('Ses', sql.Int, sesionId)
      .input('Usr', sql.Int, usuarioId)
      .input('Cli', sql.Int, clienteId || null)
      .input('TipoD', sql.VarChar(50), evento.EvtPrefijo || evtCodigo)
      .input('Serie', sql.VarChar(10), serieDoc)
      .input('Num',  sql.VarChar(20), String(numDoc))
      .input('Bruto', sql.Decimal(18,2), montoNum)
      .input('Neto',  sql.Decimal(18,2), montoNum)
      .input('Cob',   sql.Decimal(18,2), convertido)
      .input('Obs',   sql.NVarChar(500), observaciones || evento.EvtNombre)
      .query(`INSERT INTO dbo.TransaccionesCaja
        (StuIdSesion,TcaUsuarioId,TcaClienteId,TcaFecha,TcaTipoDocumento,TcaSerieDoc,TcaNumeroDoc,TcaEstado,TcaTotalBruto,TcaTotalAjuste,TcaTotalNeto,TcaTotalCobrado,TcaObservaciones)
        OUTPUT INSERTED.TcaIdTransaccion
        VALUES (@Ses,@Usr,@Cli,GETDATE(),@TipoD,@Serie,@Num,'COMPLETADO',@Bruto,0,@Neto,@Cob,@Obs)`);
    const tcaId = rTca.recordset[0].TcaIdTransaccion;

    // 3. Movimiento en Submayor del cliente (si el evento afecta saldo y hay cliente)
    let docId = null;
    if (clienteId && evento.EvtAfectaSaldo !== 0) {
      const tipoCuenta = moneda === 'USD' ? 'DINERO_USD' : 'DINERO_UYU';
      const cRes = await transaction.request()
        .input('Cli', sql.Int, clienteId)
        .input('T', sql.VarChar(20), tipoCuenta)
        .query('SELECT CueIdCuenta FROM dbo.CuentasCliente WHERE CliIdCliente=@Cli AND CueTipo=@T AND CueActiva=1');
      
      let cuentaId = cRes.recordset[0]?.CueIdCuenta;
      if (!cuentaId) {
        const nCta = await transaction.request()
          .input('Cli', sql.Int, clienteId).input('T', sql.VarChar(20), tipoCuenta)
          .input('Mon', sql.Int, monedaId).input('Usr', sql.Int, usuarioId)
          .query(`INSERT INTO dbo.CuentasCliente (CliIdCliente,CueTipo,MonIdMoneda,CPaIdCondicion,CueSaldoActual,CueLimiteCredito,CuePuedeNegativo,CueCicloActivo,CueActiva,CueFechaAlta,CueUsuarioAlta)
                  OUTPUT INSERTED.CueIdCuenta VALUES (@Cli,@T,@Mon,1,0,0,0,0,1,GETDATE(),@Usr)`);
        cuentaId = nCta.recordset[0].CueIdCuenta;
      }

      // El importe tiene el signo segun EvtAfectaSaldo (+1 acredita, -1 debita)
      const importeMov = montoNum * evento.EvtAfectaSaldo;
      const updSaldo = await transaction.request()
        .input('C', sql.Int, cuentaId).input('D', sql.Decimal(18,4), importeMov)
        .query('UPDATE dbo.CuentasCliente SET CueSaldoActual=CueSaldoActual+@D OUTPUT INSERTED.CueSaldoActual WHERE CueIdCuenta=@C');
      const nuevoSaldo = updSaldo.recordset[0].CueSaldoActual;

      // Documento de deuda si aplica
      if (evento.EvtGeneraDeuda) {
        const rDoc = await transaction.request()
          .input('Cta', sql.Int, cuentaId)
          .input('Cli', sql.Int, clienteId)
          .input('Tot', sql.Decimal(18,2), montoNum)
          .input('Usr', sql.Int, usuarioId)
          .input('Tca', sql.Int, tcaId)
          .input('Serie', sql.VarChar(10), serieDoc)
          .query(`INSERT INTO dbo.DocumentosContables (CueIdCuenta,CliIdCliente,DocTipo,DocNumero,DocSerie,DocSubtotal,DocTotal,DocEstado,DocUsuarioAlta)
                  OUTPUT INSERTED.DocIdDocumento
                  VALUES (@Cta,@Cli,'${evtCodigo}',CAST(@Tca AS VARCHAR),@Serie,@Tot,@Tot,'PENDIENTE',@Usr)`);
        docId = rDoc.recordset[0].DocIdDocumento;
      }

      await transaction.request()
        .input('Cue', sql.Int, cuentaId).input('Tip', sql.VarChar(30), evtCodigo)
        .input('Con', sql.NVarChar(500), `${evento.EvtNombre}${observaciones ? ': '+observaciones : ''}`)
        .input('Imp', sql.Decimal(18,4), importeMov).input('Sal', sql.Decimal(18,4), nuevoSaldo)
        .input('Usr', sql.Int, usuarioId).input('Doc', sql.Int, docId)
        .query(`INSERT INTO dbo.MovimientosCuenta (CueIdCuenta,MovTipo,MovConcepto,MovImporte,MovSaldoPosterior,DocIdDocumento,MovUsuarioAlta,MovFecha)
                VALUES (@Cue,@Tip,@Con,@Imp,@Sal,@Doc,@Usr,GETDATE())`);
    }

    // 4. Asiento en Libro Mayor usando reglas del Motor
    const reglasAsiento = await motorContable.getReglasAsiento(evtCodigo);
    if (reglasAsiento.length > 0) {
      try {
        const iva22 = montoNum / 1.22 * 0.22;
        const neto  = montoNum - iva22;
        const contexto = { importeTotal: montoNum, importeNeto: neto, importeIva: iva22, importeDescuento: 0 };
        const formulaMap = { TOTAL: montoNum, NETO: neto, IVA: iva22, DESCUENTO: 0 };

        const lineasContables = reglasAsiento.map(r => {
          const monto = formulaMap[r.RasFormula] ?? montoNum;
          return {
            codigoCuenta: r.CueCodigo === 'META_CLIENTE' ? (moneda === 'USD' ? contabilidadCore.CUENTAS.CLIENTE_USD : contabilidadCore.CUENTAS.CLIENTE_UYU)
                        : r.CueCodigo === 'META_CAJA'    ? (moneda === 'USD' ? contabilidadCore.CUENTAS.CAJA_USD    : contabilidadCore.CUENTAS.CAJA_UYU)
                        : r.CueCodigo,
            debeBase:  r.RasNaturaleza === 'DEBE'  ? monto : 0,
            haberBase: r.RasNaturaleza === 'HABER' ? monto : 0,
            monedaId, cotizacion: cotNum,
            entidadId: clienteId || null, entidadTipo: 'CLIENTE',
          };
        });

        await contabilidadCore.generarAsientoCompleto({
          concepto: `${evento.EvtNombre}${observaciones ? ': ' + observaciones : ''}`,
          usuarioId, tcaIdTransaccion: tcaId, origen: 'CAJA_MOTOR',
          lineas: lineasContables
        }, transaction);
      } catch (eAsiento) {
        logger.warn(`[MOTOR] Asiento parcial para ${evtCodigo}: ${eAsiento.message}`);
      }
    }

    await transaction.commit();
    logger.info(`[CAJA-MOTOR] Operacion '${evtCodigo}' TcaId=${tcaId} Cliente=${clienteId} Monto=${montoNum}`);
    return res.status(201).json({ success: true, tcaIdTransaccion: tcaId, evtCodigo, importe: montoNum, docId });

  } catch (err) {
    try { await transaction.rollback(); } catch (_) {}
    logger.error('[CAJA-MOTOR] registrarOperacionManual:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── EXPORTS ─────────────────────────────────────────────────────────────────
module.exports = {
  // Transacciones
  procesarTransaccion, procesarVentaDirecta, getProductosVenta, anularTransaccion, getTransaccion, getHistorialCliente,
  // Sesión de caja
  getSesionActual, abrirSesion, cerrarSesion, getResumenSesion, getMovimientosTurno,
  // Numeración
  getSiguienteNumero, getSecuencias,
  // Egresos
  registrarEgreso,
  // Autorizaciones
  autorizarSinPago,
  // Motor: Operación Manual
  registrarOperacionManual,
};

