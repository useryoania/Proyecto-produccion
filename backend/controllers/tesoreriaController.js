'use strict';
const { getPool, sql } = require('../config/db');
const logger = require('../utils/logger');
const { resolverLineasDesdeMotor, generarAsientoCompleto } = require('../services/contabilidadCore');

exports.getBancos = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM TesoreriaBancos WHERE Activo = 1 ORDER BY NombreBanco');
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    logger.error('Error getBancos:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getCheques = async (req, res) => {
  try {
    const { estado, tipo } = req.query;
    const pool = await getPool();
    let query = `
      SELECT c.*, b.NombreBanco 
      FROM TesoreriaCheques c 
      JOIN TesoreriaBancos b ON c.IdBanco = b.IdBanco
      WHERE 1=1
    `;
    const request = pool.request();
    if (estado) {
      query += ` AND c.Estado = @estado`;
      request.input('estado', sql.VarChar, estado);
    }
    if (tipo) {
      query += ` AND c.Tipo = @tipo`;
      request.input('tipo', sql.VarChar, tipo);
    }
    query += ` ORDER BY c.FechaRegistro DESC`;
    
    const result = await request.query(query);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    logger.error('Error getCheques:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.recibirCheque = async (req, res) => {
  const { 
    NumeroCheque, IdBanco, Monto, FechaEmision, FechaVencimiento, IdClienteOrigen,
    Agencia, EmitidoPor, EndosadoPor, EsPagoParcial, CategoriaPropiedad, ClasificacionPlazo, RubroContableId
  } = req.body;
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  
  try {
    await transaction.begin();
    const reqTx = transaction.request();
    
    const insertRes = await reqTx
      .input('Num', sql.VarChar, NumeroCheque)
      .input('Bco', sql.Int, IdBanco)
      .input('Monto', sql.Decimal(18,2), Monto)
      .input('Fem', sql.Date, FechaEmision)
      .input('Fve', sql.Date, FechaVencimiento)
      .input('Cli', sql.Int, IdClienteOrigen || null)
      .input('Agencia', sql.VarChar, Agencia || null)
      .input('EmitidoPor', sql.VarChar, EmitidoPor || null)
      .input('EndosadoPor', sql.VarChar, EndosadoPor || null)
      .input('EsPagoParcial', sql.Bit, EsPagoParcial ? 1 : 0)
      .input('CatProp', sql.VarChar, CategoriaPropiedad || 'Tercero')
      .input('ClasPlazo', sql.VarChar, ClasificacionPlazo || 'Común')
      .input('Rubro', sql.Int, RubroContableId || null)
      .query(`
        INSERT INTO TesoreriaCheques (
          Tipo, NumeroCheque, IdBanco, Monto, IdMoneda, FechaEmision, FechaVencimiento, 
          Estado, IdClienteOrigen, Agencia, EmitidoPor, EndosadoPor, EsPagoParcial, 
          CategoriaPropiedad, ClasificacionPlazo, RubroContableId
        )
        OUTPUT INSERTED.IdCheque
        VALUES (
          'TERCERO', @Num, @Bco, @Monto, 1, @Fem, @Fve, 
          'EN_CARTERA', @Cli, @Agencia, @EmitidoPor, @EndosadoPor, @EsPagoParcial, 
          @CatProp, @ClasPlazo, @Rubro
        )
      `);
      
    const IdCheque = insertRes.recordset[0].IdCheque;

    // Asiento contable
    const lineas = await resolverLineasDesdeMotor('TES_CHEQUE_REC', { 
      totalNeto: Monto, 
      clienteId: IdClienteOrigen 
    });
    
    if (lineas.length > 0) {
      await generarAsientoCompleto({
        concepto: `Recepción Cheque Tercero #${NumeroCheque}`,
        usuarioId: req.user?.id || 1,
        origen: 'TESORERIA',
        lineas
      }, transaction);
    }

    await transaction.commit();
    res.json({ success: true, message: 'Cheque recibido y contabilizado', data: { IdCheque } });
  } catch (err) {
    await transaction.rollback();
    logger.error('Error recibirCheque:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.emitirCheque = async (req, res) => {
  const { NumeroCheque, IdBanco, Monto, FechaEmision, FechaVencimiento, IdProveedorDestino } = req.body;
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  
  try {
    await transaction.begin();
    const reqTx = transaction.request();
    
    const insertRes = await reqTx
      .input('Num', sql.VarChar, NumeroCheque)
      .input('Bco', sql.Int, IdBanco)
      .input('Monto', sql.Decimal(18,2), Monto)
      .input('Fem', sql.Date, FechaEmision)
      .input('Fve', sql.Date, FechaVencimiento)
      .input('Prov', sql.Int, IdProveedorDestino || null)
      .query(`
        INSERT INTO TesoreriaCheques (Tipo, NumeroCheque, IdBanco, Monto, IdMoneda, FechaEmision, FechaVencimiento, Estado, IdProveedorDestino)
        OUTPUT INSERTED.IdCheque
        VALUES ('PROPIO', @Num, @Bco, @Monto, 1, @Fem, @Fve, 'EMITIDO', @Prov)
      `);
      
    const IdCheque = insertRes.recordset[0].IdCheque;

    // Asiento contable
    const lineas = await resolverLineasDesdeMotor('TES_CHEQUE_EMI', { 
      totalNeto: Monto 
    });
    
    if (lineas.length > 0) {
      await generarAsientoCompleto({
        concepto: `Emisión Cheque Propio #${NumeroCheque}`,
        usuarioId: req.user?.id || 1,
        origen: 'TESORERIA',
        lineas
      }, transaction);
    }

    await transaction.commit();
    res.json({ success: true, message: 'Cheque emitido y contabilizado', data: { IdCheque } });
  } catch (err) {
    await transaction.rollback();
    logger.error('Error emitirCheque:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.cambiarEstadoCheque = async (req, res) => {
  const { id } = req.params;
  const { Estado, Notas } = req.body;
  
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  
  try {
    await transaction.begin();
    const reqTx = transaction.request();
    
    const chq = await reqTx.input('Id', sql.Int, id).query(`SELECT * FROM TesoreriaCheques WHERE IdCheque = @Id`);
    if (chq.recordset.length === 0) throw new Error('Cheque no encontrado');
    const cheque = chq.recordset[0];
    
    await reqTx
      .input('Estado', sql.VarChar, Estado)
      .input('Notas', sql.VarChar, Notas || null)
      .query(`UPDATE TesoreriaCheques SET Estado = @Estado, Notas = ISNULL(@Notas, Notas) WHERE IdCheque = @Id`);

    // Asiento según el nuevo estado
    let evtCodigo = null;
    if (Estado === 'DEPOSITADO' && cheque.Tipo === 'TERCERO') evtCodigo = 'TES_CHEQUE_DEP';
    if (Estado === 'ENDOSADO' && cheque.Tipo === 'TERCERO') evtCodigo = 'TES_CHEQUE_END';
    if (Estado === 'RECHAZADO' && cheque.Tipo === 'TERCERO') evtCodigo = 'TES_CHEQUE_REB';
    if (Estado === 'COBRADO' && cheque.Tipo === 'PROPIO') evtCodigo = 'TES_CHEQUE_COB';
    
    if (evtCodigo) {
      const lineas = await resolverLineasDesdeMotor(evtCodigo, { totalNeto: cheque.Monto });
      if (lineas.length > 0) {
        await generarAsientoCompleto({
          concepto: `Cambio Estado Cheque #${cheque.NumeroCheque} -> ${Estado}`,
          usuarioId: req.user?.id || 1,
          origen: 'TESORERIA',
          lineas
        }, transaction);
      }
    }

    await transaction.commit();
    res.json({ success: true, message: `Cheque actualizado a ${Estado}` });
  } catch (err) {
    await transaction.rollback();
    logger.error('Error cambiarEstado:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
