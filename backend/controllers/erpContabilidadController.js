'use strict';
/**
 * erpContabilidadController.js
 * ────────────────────────────────────────────────────────────────────────────
 * Controlador de las interfaces administrativas del Plan de Cuentas y Libro Mayor.
 */

const { getPool } = require('../config/db');
const logger = require('../utils/logger');

/** GET /api/contabilidad/erp/cuentas */
exports.getPlanCuentas = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT CueId, CueCodigo, CueNombre, CueNivel, CueTipoBase, CueMoneda, CueImputable, CueActiva
      FROM dbo.Cont_PlanCuentas WITH(NOLOCK)
      ORDER BY CueCodigo
    `);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    logger.error('[CONTABILIDAD-ERP] getPlanCuentas:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

/** GET /api/contabilidad/erp/cuentas/gastos */
exports.getCuentasGastos = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT CueId, CueCodigo, CueNombre, CueMoneda
      FROM dbo.Cont_PlanCuentas WITH(NOLOCK)
      WHERE CueTipoBase = 'PERDIDA' AND CueImputable = 1 AND CueActiva = 1
      ORDER BY CueNombre
    `);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    logger.error('[CONTABILIDAD-ERP] getCuentasGastos:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

/** GET /api/contabilidad/erp/libro-mayor?desde=YYYY-MM-DD&hasta=YYYY-MM-DD */
exports.getLibroMayor = async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const pool = await getPool();
    const request = pool.request();

    let whereClause = '';
    if (desde) { request.input('Desde', desde); whereClause += ' AND CAST(cab.AsiFecha AS DATE) >= @Desde'; }
    if (hasta) { request.input('Hasta', hasta); whereClause += ' AND CAST(cab.AsiFecha AS DATE) <= @Hasta'; }

    const result = await request.query(`
      SELECT 
        cab.AsiId, cab.AsiFecha, cab.AsiConcepto, cab.TcaIdTransaccion,
        cab.SysOrigen AS AsiOrigen,
        det.DetId, det.DetDebeUYU AS DebeUYU, det.DetHaberUYU AS HaberUYU,
        det.DetImporteOriginal, det.DetMonedaId, det.DetCotizacion,
        cue.CueCodigo, cue.CueNombre
      FROM dbo.Cont_AsientosCabecera cab WITH(NOLOCK)
      JOIN dbo.Cont_AsientosDetalle det WITH(NOLOCK) ON det.AsiId = cab.AsiId
      JOIN dbo.Cont_PlanCuentas cue WITH(NOLOCK) ON cue.CueId = det.CueId
      WHERE 1=1 ${whereClause}
      ORDER BY cab.AsiFecha DESC, cab.AsiId DESC, det.DetId ASC
    `);

    // Agrupar por cabecera
    const asientos = [];
    let currCab = null;

    for (const row of result.recordset) {
      if (!currCab || currCab.AsiId !== row.AsiId) {
        if (currCab) asientos.push(currCab);
        currCab = {
          AsiId: row.AsiId, AsiFecha: row.AsiFecha, AsiConcepto: row.AsiConcepto,
          TcaIdTransaccion: row.TcaIdTransaccion, AsiOrigen: row.AsiOrigen,
          lineas: []
        };
      }
      currCab.lineas.push({
        CueCodigo: row.CueCodigo,
        CueNombre: row.CueNombre,
        DebeUYU: row.DebeUYU,
        HaberUYU: row.HaberUYU,
        ImporteOriginal: row.DetImporteOriginal,
        MonedaId: row.DetMonedaId,
        Cotizacion: row.DetCotizacion
      });
    }
    if (currCab) asientos.push(currCab);

    res.json({ success: true, data: asientos });
  } catch (err) {
    logger.error('[CONTABILIDAD-ERP] getLibroMayor:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};


/** POST /api/contabilidad/erp/cuentas */
exports.crearCuenta = async (req, res) => {
  try {
    const { codigo, nombre, nivel, tipoBase, moneda, imputable } = req.body;
    const pool = await getPool();
    await pool.request()
      .input('codigo', `${codigo}`)
      .input('nombre', nombre)
      .input('nivel', nivel)
      .input('tipoBase', tipoBase)
      .input('moneda', moneda || 'AMBAS')
      .input('imputable', imputable ? 1 : 0)
      .query(`
        INSERT INTO dbo.Cont_PlanCuentas (CueCodigo, CueNombre, CueNivel, CueTipoBase, CueMoneda, CueImputable, CueActiva)
        VALUES (@codigo, @nombre, @nivel, @tipoBase, @moneda, @imputable, 1)
      `);
    res.json({ success: true, message: 'Cuenta contable creada' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/** PUT /api/contabilidad/erp/cuentas/:id */
exports.actualizarCuenta = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, nombre, nivel, tipoBase, moneda, imputable, activa } = req.body;
    const pool = await getPool();
    await pool.request()
      .input('id', id)
      .input('codigo', `${codigo}`)
      .input('nombre', nombre)
      .input('nivel', nivel)
      .input('tipoBase', tipoBase)
      .input('moneda', moneda || 'AMBAS')
      .input('imputable', imputable ? 1 : 0)
      .input('activa', activa ? 1 : 0)
      .query(`
        UPDATE dbo.Cont_PlanCuentas
        SET CueCodigo=@codigo, CueNombre=@nombre, CueNivel=@nivel, CueTipoBase=@tipoBase,
            CueMoneda=@moneda, CueImputable=@imputable, CueActiva=@activa
        WHERE CueId=@id
      `);
    res.json({ success: true, message: 'Cuenta actualizada' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
