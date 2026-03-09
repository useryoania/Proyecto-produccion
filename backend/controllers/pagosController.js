const { getPool, sql } = require('../config/db');
const { registrarPago } = require('../services/retiroService');

// Controlador para obtener métodos de pago
const obtenerMetodosPago = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT MPaIdMetodoPago, MPaDescripcionMetodo FROM MetodosPagos WITH(NOLOCK)');
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener métodos de pago:', error);
    res.status(500).json({ error: 'Error al obtener métodos de pago' });
  }
};

// Controlador para realizar un pago
const realizarPago = async (req, res) => {
  const { metodoPagoId, monedaId, monto, ordenRetiro, orderNumbers } = req.body;
  const usuarioId = req.user?.id || 70;
  console.log('Cuerpo de la solicitud recibido:', req.body);

  const pool = await getPool();
  let transaction;

  try {
    const ordenRetiroId = parseInt(ordenRetiro.replace(/^R-0*/, ''), 10);
    if (isNaN(ordenRetiroId)) {
      return res.status(400).json({ error: "Invalid ordenRetiroId. Must be a valid number." });
    }

    // Validate orden de retiro first
    const ordRetResult = await pool.request()
      .input('ID', sql.Int, ordenRetiroId)
      .query('SELECT OReEstadoActual FROM OrdenesRetiro WITH(NOLOCK) WHERE OReIdOrdenRetiro = @ID');

    if (ordRetResult.recordset.length === 0) {
      throw new Error(`No se encontró la orden de retiro con ID: ${ordenRetiroId}`);
    }

    const estadoActual = ordRetResult.recordset[0].OReEstadoActual;
    const nuevoEstado = estadoActual === 1 ? 3 : 8;

    transaction = await pool.transaction();
    await transaction.begin();

    const { pagoId } = await registrarPago(transaction, {
      ordenRetiroId, metodoPagoId, monedaId, monto, orderNumbers, usuarioId, nuevoEstado
    });

    await transaction.commit();

    const io = req.app.get('socketio');
    if (io) {
      io.emit('actualizado', { type: 'actualizacion' });
      io.emit('retiros:update', { type: 'pago' }); // Notifica WebRetirosPage
    }

    res.status(200).json({ message: 'Pago registrado correctamente', pagoId });
  } catch (error) {
    if (transaction) {
      try { await transaction.rollback(); } catch (e) { }
    }
    console.error('Error al registrar el pago:', error);
    res.status(500).json({ error: error.message });
  }
};

const subirComprobante = async (req, res) => {
  try {
    const { ordenRetiroId } = req.body;
    console.log('ordenRetiroId recibido:', ordenRetiroId);

    if (!ordenRetiroId || !req.file) {
      return res.status(400).send({ error: 'Faltan datos o archivo.' });
    }

    const filePath = req.file.filename;

    const pool = await getPool();
    const result = await pool.request()
      .input('ordenRetiroId', sql.Int, ordenRetiroId)
      .input('filePath', sql.NVarChar, filePath)
      .query(`
        UPDATE Pag
        SET PagRutaComprobante = @filePath
        FROM Pagos Pag WITH(NOLOCK)
        JOIN OrdenesRetiro ORe WITH(NOLOCK) ON ORe.PagIdPago = Pag.PagIdPago
        WHERE ORe.OReIdOrdenRetiro = @ordenRetiroId
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).send({ error: 'No se encontró la orden de retiro asociada.' });
    }

    res.status(200).send({ message: 'Archivo subido y ruta guardada correctamente', filePath });
  } catch (error) {
    console.error('Error al subir comprobante:', error);
    res.status(500).send({ error: 'Error al subir el comprobante.' });
  }
};

module.exports = { obtenerMetodosPago, realizarPago, subirComprobante };
