const { getPool, sql } = require('../config/db');
const moment = require('moment-timezone');
const { crearRetiro } = require('../services/retiroService');

const createOrdenRetiro = async (req, res) => {
  const { orders, totalCost, lugarRetiro } = req.body;
  const UsuarioAlta = req.user?.id || 70;

  if (!orders || orders.length === 0) {
    return res.status(400).json({ error: 'No se proporcionaron órdenes válidas.' });
  }

  const pool = await getPool();
  let transaction;

  try {
    // Validar orden y determinar tipo de cliente
    const clientResult = await pool.request()
      .input('OrderCode', sql.VarChar, orders[0].orderNumber)
      .query(`
          SELECT o.CliIdCliente, c.TClIdTipoCliente 
          FROM OrdenesDeposito o WITH(NOLOCK)
          JOIN Clientes c WITH(NOLOCK) ON c.CliIdCliente = o.CliIdCliente
          WHERE o.OrdCodigoOrden = @OrderCode
        `);

    if (clientResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Orden o cliente no encontrado.' });
    }

    const { TClIdTipoCliente } = clientResult.recordset[0];
    const estadoOrdenRetiro = (TClIdTipoCliente === 2 || TClIdTipoCliente === 3) ? 4 : 1;

    // Resolver orderNumbers → ordIds
    const orderReq = pool.request();
    orders.forEach((order, i) => {
      orderReq.input(`code${i}`, sql.VarChar, order.orderNumber);
    });
    const orderIdResults = await orderReq.query(`
      SELECT OrdIdOrden FROM OrdenesDeposito WITH(NOLOCK) 
      WHERE OrdCodigoOrden IN (${orders.map((_, i) => `@code${i}`).join(',')})
    `);

    if (orderIdResults.recordset.length === 0) {
      throw new Error('No se encontraron órdenes para los códigos proporcionados.');
    }

    const ordIds = orderIdResults.recordset.map(r => r.OrdIdOrden);

    // Crear retiro usando servicio unificado
    transaction = await pool.transaction();
    await transaction.begin();

    const OReIdOrdenRetiro = await crearRetiro(transaction, {
      ordIds, totalCost, lugarRetiro, estadoOrdenRetiro,
      usuarioAlta: UsuarioAlta,
      formaRetiro: 'RL'
    });

    await transaction.commit();

    const io = req.app.get('socketio');
    if (io) {
      io.emit('actualizado', { type: 'actualizacion' });
      io.emit('retiros:update', { type: 'nuevo_retiro' }); // Nuevo retiro creado
    }

    res.status(201).json({
      message: 'Orden de retiro creada correctamente y órdenes actualizadas',
      OReIdOrdenRetiro,
    });
  } catch (err) {
    if (transaction) {
      try { await transaction.rollback(); } catch (e) { }
    }
    console.error('Error al crear la orden de retiro:', err);
    res.status(500).json({ error: 'Error al crear la orden de retiro' });
  }
};

const getOrdenesRetiroQueryBase = `
  SELECT 
    r.OReIdOrdenRetiro,
    r.OReCostoTotalOrden,
    r.OReFechaAlta,
    r.OReUsuarioAlta,
    r.OReEstadoActual,
    r.PagIdPago,
    r.ORePasarPorCaja,
    r.FormaRetiro,
    lr.LReNombreLugar AS lugarRetiro,
    er.EORNombreEstado AS estado,
    o.OrdIdOrden AS orderId,
    o.OrdCodigoOrden AS orderNumber,
    o.OrdEstadoActual AS orderEstado,
    o.OrdCostoFinal as costoFinal,
    monOrden.MonSimbolo AS orderMonedaSimbolo,
    p.MPaIdMetodoPago AS orderIdMetodoPago,
    mp.MPaDescripcionMetodo AS orderMetodoPago,
    monPago.MonSimbolo AS monetPagoSimbolo,
    p.PagMontoPago AS orderMontoPago,
    p.PagFechaPago AS orderFechaPago,
    p.PagRutaComprobante AS comprobante,
    c.CodigoReact AS CliCodigoCliente,
    tc.TClDescripcion AS TClDescripcion,
    tc.TClIdTipoCliente AS TClIdTipoCliente
  FROM OrdenesRetiro r WITH(NOLOCK)
  LEFT JOIN LugaresRetiro lr WITH(NOLOCK) ON lr.LReIdLugarRetiro = r.LReIdLugarRetiro
  LEFT JOIN EstadosOrdenesRetiro er WITH(NOLOCK) ON er.EORIdEstadoOrden = r.OReEstadoActual
  LEFT JOIN OrdenesDeposito o WITH(NOLOCK) ON o.OReIdOrdenRetiro = r.OReIdOrdenRetiro
  LEFT JOIN Monedas monOrden WITH(NOLOCK) ON monOrden.MonIdMoneda = o.MonIdMoneda
  LEFT JOIN Pagos p WITH(NOLOCK) ON p.PagIdPago = o.PagIdPago
  LEFT JOIN Monedas monPago WITH(NOLOCK) ON monPago.MonIdMoneda = p.PagIdMonedaPago
  LEFT JOIN MetodosPagos mp WITH(NOLOCK) ON mp.MPaIdMetodoPago = p.MPaIdMetodoPago
  LEFT JOIN Clientes c WITH(NOLOCK) ON c.CliIdCliente = o.CliIdCliente
  LEFT JOIN TiposClientes tc WITH(NOLOCK) ON tc.TClIdTipoCliente = c.TClIdTipoCliente
`;

const processRetirosRows = (rows) => {
  const map = {};
  for (const row of rows) {
    if (!map[row.OReIdOrdenRetiro]) {
      map[row.OReIdOrdenRetiro] = {
        ordenDeRetiro: `R-${String(row.OReIdOrdenRetiro).padStart(4, '0')}`,
        totalCost: parseFloat(row.OReCostoTotalOrden).toFixed(2),
        lugarRetiro: row.lugarRetiro || 'Desconocido',
        fechaAlta: row.OReFechaAlta,
        usuarioAlta: row.OReUsuarioAlta,
        estado: row.estado || 'Desconocido',
        pagorealizado: row.PagIdPago ? 1 : 0,
        metodoPago: row.orderMetodoPago,
        montopagorealizado: row.PagIdPago ? `${row.monetPagoSimbolo || ''} ${parseFloat(row.orderMontoPago || 0).toFixed(2)}` : null,
        fechapagooden: row.orderFechaPago,
        comprobante: row.comprobante,
        CliCodigoCliente: row.CliCodigoCliente || 'Desconocido',
        TClDescripcion: row.TClDescripcion || 'Desconocido',
        TClIdTipoCliente: row.TClIdTipoCliente,
        orders: []
      };
    }

    if (row.orderId) {
      map[row.OReIdOrdenRetiro].orders.push({
        orderNumber: row.orderNumber,
        orderId: row.orderId,
        orderEstado: row.orderEstado,
        orderCosto: row.orderMonedaSimbolo ? `${row.orderMonedaSimbolo} ${parseFloat(row.costoFinal).toFixed(2)}` : null,
        orderIdMetodoPago: row.orderIdMetodoPago,
        orderMetodoPago: row.orderMetodoPago,
        orderPago: row.monetPagoSimbolo ? `${row.monetPagoSimbolo} ${parseFloat(row.orderMontoPago).toFixed(2)}` : null,
        orderFechaPago: row.orderFechaPago
      });
    }
  }
  return Object.values(map);
};

const getOrdenesRetiroPorEstados = async (req, res) => {
  const estados = req.query.estados.split(',');
  try {
    const pool = await getPool();
    const request = pool.request();

    estados.forEach((e, i) => request.input(`e${i}`, sql.Int, parseInt(e.trim(), 10)));
    const inClause = estados.map((_, i) => `@e${i}`).join(',');

    const query = `
      ${getOrdenesRetiroQueryBase}
      WHERE r.OReEstadoActual IN (${inClause})
      AND (CAST(DATEADD(d,-7,GETDATE()) AS DATE) <= CAST(r.OReFechaAlta AS DATE) OR r.OReEstadoActual NOT IN (5,6))
    `;

    const result = await request.query(query);
    res.json(processRetirosRows(result.recordset));
  } catch (err) {
    console.error('Error al obtener las órdenes de retiro:', err);
    res.status(500).json({ error: 'Error' });
  }
};

const actualizarOrdenRetiroEstado = async (req, res) => {
  const { ordenDeRetiro, nuevoEstado } = req.body;
  const fechaActual = moment().tz('America/Montevideo').format('YYYY-MM-DD HH:mm:ss');
  const UsuarioAlta = req.user?.id || 70;

  let transaction;
  try {
    const OReIdOrdenRetiro = parseInt(ordenDeRetiro.replace('R-', ''), 10);
    const pool = await getPool();

    const estRes = await pool.request().input('Est', sql.VarChar, nuevoEstado).query('SELECT EORIdEstadoOrden FROM EstadosOrdenesRetiro WITH(NOLOCK) WHERE EORNombreEstado = @Est');
    if (estRes.recordset.length === 0) throw new Error('Estado no encontrado');
    const estadoId = estRes.recordset[0].EORIdEstadoOrden;

    transaction = await pool.transaction();
    await transaction.begin();

    await transaction.request()
      .input('ID', sql.Int, OReIdOrdenRetiro).input('EstID', sql.Int, estadoId).input('Fec', sql.DateTime, new Date(fechaActual)).input('Usr', sql.Int, UsuarioAlta)
      .query(`
        UPDATE OrdenesRetiro SET OReEstadoActual = @EstID, OReFechaEstadoActual = @Fec WHERE OReIdOrdenRetiro = @ID;
        INSERT INTO HistoricoEstadosOrdenesRetiro (OReIdOrdenRetiro, EORIdEstadoOrden, HEOFechaEstado, HEOUsuarioAlta) VALUES (@ID, @EstID, @Fec, @Usr);
      `);

    await transaction.commit();
    res.status(200).json({ message: 'Órden de retiro actualizada' });
    req.app.get('socketio')?.emit('actualizado', { type: 'actualizacion' });
    req.app.get('socketio')?.emit('retiros:update', { type: 'estado' });
  } catch (err) {
    if (transaction) try { await transaction.rollback(); } catch (e) { }
    res.status(500).json({ error: err.message });
  }
};

const marcarOrdenRetiroPronto = async (req, res) => {
  const { ordenDeRetiro, scannedValues } = req.body;
  const fechaActual = moment().tz('America/Montevideo').format('YYYY-MM-DD HH:mm:ss');
  const UsuarioAlta = req.user?.id || 70;

  let transaction;
  try {
    const OReIdOrdenRetiro = parseInt(ordenDeRetiro.replace('R-', ''), 10);
    const pool = await getPool();

    transaction = await pool.transaction();
    await transaction.begin();

    // Parametrizar scannedValues para evitar SQL injection
    const scanReq = transaction.request();
    scanReq.input('Fec', sql.DateTime, new Date(fechaActual));
    scanReq.input('Usr', sql.Int, UsuarioAlta);
    scannedValues.forEach((v, i) => {
      scanReq.input(`sv${i}`, sql.VarChar, v.trim());
    });
    const inParams = scannedValues.map((_, i) => `@sv${i}`).join(',');

    await scanReq.query(`
      INSERT INTO HistoricoEstadosOrdenes (OrdIdOrden, EOrIdEstadoOrden, HEOFechaEstado, HEOUsuarioAlta)
      SELECT OrdIdOrden, 7, @Fec, @Usr
      FROM OrdenesDeposito WHERE OrdCodigoOrden IN (${inParams});
      
      UPDATE OrdenesDeposito SET OrdEstadoActual = 7, OrdFechaEstadoActual = @Fec WHERE OrdCodigoOrden IN (${inParams});
    `);

    const retRes = await transaction.request().input('ID', sql.Int, OReIdOrdenRetiro).query('SELECT OReEstadoActual FROM OrdenesRetiro WITH(NOLOCK) WHERE OReIdOrdenRetiro = @ID');
    if (retRes.recordset.length > 0) {
      const nuevoEstado = retRes.recordset[0].OReEstadoActual === 1 ? 7 : 8;
      await transaction.request()
        .input('ID', sql.Int, OReIdOrdenRetiro).input('EstID', sql.Int, nuevoEstado).input('Fec', sql.DateTime, new Date(fechaActual)).input('Usr', sql.Int, UsuarioAlta)
        .query(`
          UPDATE OrdenesRetiro SET OReEstadoActual = @EstID, OReFechaEstadoActual = @Fec WHERE OReIdOrdenRetiro = @ID;
          INSERT INTO HistoricoEstadosOrdenesRetiro (OReIdOrdenRetiro, EORIdEstadoOrden, HEOFechaEstado, HEOUsuarioAlta) VALUES (@ID, @EstID, @Fec, @Usr);
        `);
    }

    await transaction.commit();
    res.status(200).json({ message: 'Órdenes escaneadas marcadas como Pronto y orden de retiro actualizada' });
    req.app.get('socketio')?.emit('actualizado', { type: 'actualizacion' });
    req.app.get('socketio')?.emit('retiros:update', { type: 'estado' });
  } catch (err) {
    if (transaction) try { await transaction.rollback(); } catch (e) { }
    res.status(500).json({ error: err.message });
  }
};

const ordenesRetiroCaja = async (req, res) => {
  try {
    const pool = await getPool();
    // FIX: c.Tipo era string 'C' pero ahora es INT. Clientes Comunes = TClIdTipoCliente = 1
    // También se quitó el filtro de LugarRetiro fijo (5) para que muestre todos los que vendrían a retiro en local.
    const query = `
      ${getOrdenesRetiroQueryBase}
      WHERE (r.OReEstadoActual = 1 OR r.OReEstadoActual = 7)
      AND c.TClIdTipoCliente = 1
      AND r.LReIdLugarRetiro = 5
      AND NOT EXISTS (
        SELECT 1 FROM Pagos px WHERE px.PagIdPago = r.PagIdPago
      )
    `;
    const result = await pool.request().query(query);
    res.status(200).json(processRetirosRows(result.recordset));
  } catch (err) {
    console.error('[CAJA ERROR]', err);
    res.status(500).json({ error: err.message });
  }
};

const marcarOrdenRetiroEntregado = async (req, res) => {
  const { ordenDeRetiro } = req.body;
  const fechaActual = moment().tz('America/Montevideo').format('YYYY-MM-DD HH:mm:ss');
  const UsuarioAlta = req.user?.id || 70;

  let transaction;
  try {
    const OReIdOrdenRetiro = parseInt(ordenDeRetiro.replace('R-', ''), 10);
    const pool = await getPool();

    transaction = await pool.transaction();
    await transaction.begin();

    await transaction.request()
      .input('ID', sql.Int, OReIdOrdenRetiro).input('Fec', sql.DateTime, new Date(fechaActual)).input('Usr', sql.Int, UsuarioAlta)
      .query(`
        INSERT INTO HistoricoEstadosOrdenes (OrdIdOrden, EOrIdEstadoOrden, HEOFechaEstado, HEOUsuarioAlta)
        SELECT OrdIdOrden, 9, @Fec, @Usr FROM OrdenesDeposito WHERE OReIdOrdenRetiro = @ID;

        UPDATE OrdenesDeposito SET OrdEstadoActual = 9, OrdFechaEstadoActual = @Fec WHERE OReIdOrdenRetiro = @ID;
        
        UPDATE OrdenesRetiro SET OReEstadoActual = 5, ORePasarPorCaja = 0, OReFechaEstadoActual = @Fec WHERE OReIdOrdenRetiro = @ID;
        INSERT INTO HistoricoEstadosOrdenesRetiro (OReIdOrdenRetiro, EORIdEstadoOrden, HEOFechaEstado, HEOUsuarioAlta) VALUES (@ID, 5, @Fec, @Usr);
      `);

    await transaction.commit();
    res.status(200).json({ message: 'Entregadas' });
    req.app.get('socketio')?.emit('actualizado', { type: 'actualizacion' });
    req.app.get('socketio')?.emit('retiros:update', { type: 'estado' });
  } catch (err) {
    if (transaction) try { await transaction.rollback(); } catch (e) { }
    res.status(500).json({ error: err.message });
  }
};

const getOrdenesRetiroPasarPorCaja = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`${getOrdenesRetiroQueryBase} WHERE r.ORePasarPorCaja = 1`);
    res.status(200).json(processRetirosRows(result.recordset));
  } catch (err) {
    console.error('[PASAR CAJA ERROR]', err);
    res.status(500).json({ error: err.message });
  }
};

const ordenesRetiroMarcarPasarPorCaja = async (req, res) => {
  const { ordenDeRetiro } = req.body;
  const pasarPorCaja = req.params.pasar === '1';
  let transaction;
  try {
    const OReIdOrdenRetiro = parseInt(ordenDeRetiro.replace('R-', ''), 10);
    const pool = await getPool();

    transaction = await pool.transaction();
    await transaction.begin();

    await transaction.request()
      .input('ID', sql.Int, OReIdOrdenRetiro).input('Pasar', sql.Bit, pasarPorCaja)
      .query('UPDATE OrdenesRetiro SET ORePasarPorCaja = @Pasar WHERE OReIdOrdenRetiro = @ID');

    await transaction.commit();
    res.status(200).json({ message: 'Exito' });
    req.app.get('socketio')?.emit('actualizado', { type: 'actualizacion' });
    req.app.get('socketio')?.emit('retiros:update', { type: 'estado' });
  } catch (err) {
    if (transaction) try { await transaction.rollback(); } catch (e) { }
    res.status(500).json({ error: err.message });
  }
};

const getOrdenesRetiroPorFecha = async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    let queryCond = [];

    if (req.query.date) {
      request.input('Fecha', sql.Date, req.query.date);
      queryCond.push('CAST(r.OReFechaAlta AS DATE) = @Fecha');
    }
    if (req.query.codigo) {
      request.input('Codigo', sql.Int, req.query.codigo);
      queryCond.push('r.OReIdOrdenRetiro = @Codigo');
    }

    const whereClause = queryCond.length > 0 ? 'WHERE ' + queryCond.join(' AND ') : '';
    const query = `${getOrdenesRetiroQueryBase} ${whereClause}`;

    const result = await request.query(query);
    res.json(processRetirosRows(result.recordset));
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
};

const getOrdenesRetiroPorLugar = async (req, res) => {
  const { lugarId } = req.params;
  const { pagas, no_pagas } = req.query; // Filtros opcionales
  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('LugarId', sql.Int, parseInt(lugarId, 10));

    let query = `
      ${getOrdenesRetiroQueryBase}
      WHERE r.LReIdLugarRetiro = @LugarId
      AND r.OReEstadoActual NOT IN (5, 6)
    `;

    // FIX: filtro no_pagas usa NOT EXISTS para evitar falsos positivos con LEFT JOIN
    if (pagas === 'true') {
      // Retiro con pago registrado a nivel de cabecera
      query += ` AND EXISTS (SELECT 1 FROM Pagos px WHERE px.PagIdPago = r.PagIdPago)`;
    } else if (no_pagas === 'true') {
      // Retiro SIN ningún pago en cabecera ni en ninguna de sus hijas
      query += `
        AND NOT EXISTS (SELECT 1 FROM Pagos px WHERE px.PagIdPago = r.PagIdPago)
        AND NOT EXISTS (
          SELECT 1 FROM OrdenesDeposito od
          INNER JOIN Pagos px2 ON px2.PagIdPago = od.PagIdPago
          WHERE od.OReIdOrdenRetiro = r.OReIdOrdenRetiro
        )
      `;
    }

    const result = await request.query(query);
    res.json(processRetirosRows(result.recordset));
  } catch (err) {
    console.error('[DESPACHOS LUGAR] Error:', err);
    res.status(500).json({ error: 'Error al cargar despachos' });
  }
};

const marcarDespachoEntregadoAutorizado = async (req, res) => {
  const { ordenesParaEntregar, password } = req.body;
  const fechaActual = moment().tz('America/Montevideo').format('YYYY-MM-DD HH:mm:ss');
  const UsuarioAlta = req.user?.id || 70;

  if (!Array.isArray(ordenesParaEntregar) || ordenesParaEntregar.length === 0) {
    return res.status(400).json({ error: 'No se seleccionaron órdenes.' });
  }

  let transaction;
  try {
    const pool = await getPool();
    transaction = await pool.transaction();
    await transaction.begin();

    for (const ordenDeRetiro of ordenesParaEntregar) {
      const OReIdOrdenRetiro = parseInt(ordenDeRetiro.replace('R-', ''), 10);

      // Chequear estado de pago y tipo de cliente
      const checkRes = await transaction.request()
        .input('ID', sql.Int, OReIdOrdenRetiro)
        .query(`
          SELECT r.PagIdPago, o.PagIdPago as O_PagIdPago, c.TClIdTipoCliente
          FROM OrdenesRetiro r WITH(NOLOCK)
          LEFT JOIN OrdenesDeposito o WITH(NOLOCK) ON o.OReIdOrdenRetiro = r.OReIdOrdenRetiro
          LEFT JOIN Clientes c WITH(NOLOCK) ON c.CliIdCliente = o.CliIdCliente
          WHERE r.OReIdOrdenRetiro = @ID
        `);

      if (checkRes.recordset.length === 0) continue;

      // Una ORDEN está "impaga" si NI el retiro principal NI las órdenes hijas tienen PagIdPago.
      // Simplificaremos asumiendo que el Retiro dicta el estado general en este caso.
      const isImpaga = checkRes.recordset.some(row => !row.PagIdPago && !row.O_PagIdPago);
      const isSemanalOAdelantado = checkRes.recordset.some(row => row.TClIdTipoCliente === 2 || row.TClIdTipoCliente === 3);

      if (isImpaga && !isSemanalOAdelantado) {
        if (!password || password !== process.env.CONTRAAUTORIZO) {
          throw new Error(`La orden de retiro ${ordenDeRetiro} no está paga y requiere autorización. Contraseña incorrecta.`);
        }
      }

      await transaction.request()
        .input('ID', sql.Int, OReIdOrdenRetiro)
        .input('Fec', sql.DateTime, new Date(fechaActual))
        .input('Usr', sql.Int, UsuarioAlta)
        .query(`
          INSERT INTO HistoricoEstadosOrdenes (OrdIdOrden, EOrIdEstadoOrden, HEOFechaEstado, HEOUsuarioAlta)
          SELECT OrdIdOrden, 9, @Fec, @Usr FROM OrdenesDeposito WHERE OReIdOrdenRetiro = @ID;

          UPDATE OrdenesDeposito SET OrdEstadoActual = 9, OrdFechaEstadoActual = @Fec WHERE OReIdOrdenRetiro = @ID;
          
          UPDATE OrdenesRetiro SET OReEstadoActual = 5, ORePasarPorCaja = 0, OReFechaEstadoActual = @Fec WHERE OReIdOrdenRetiro = @ID;
          INSERT INTO HistoricoEstadosOrdenesRetiro (OReIdOrdenRetiro, EORIdEstadoOrden, HEOFechaEstado, HEOUsuarioAlta) VALUES (@ID, 5, @Fec, @Usr);
        `);
    }

    await transaction.commit();
    res.status(200).json({ message: 'Órdenes entregadas correctamente.' });
    req.app.get('socketio')?.emit('actualizado', { type: 'actualizacion' });
    req.app.get('socketio')?.emit('retiros:update', { type: 'estado' });
  } catch (err) {
    if (transaction) try { await transaction.rollback(); } catch (e) { }
    console.error("Error al marcar despacho entregado:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createOrdenRetiro, getOrdenesRetiroPorEstados, actualizarOrdenRetiroEstado, marcarOrdenRetiroPronto,
  marcarOrdenRetiroEntregado, ordenesRetiroCaja, getOrdenesRetiroPasarPorCaja, ordenesRetiroMarcarPasarPorCaja, getOrdenesRetiroPorFecha,
  getOrdenesRetiroPorLugar, marcarDespachoEntregadoAutorizado
};
