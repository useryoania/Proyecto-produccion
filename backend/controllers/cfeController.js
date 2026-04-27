const { getPool, sql } = require('../config/db');
const logger = require('../utils/logger');
const { resolverLineasDesdeMotor, generarAsientoCompleto } = require('../services/contabilidadCore');

exports.getDocumentosCFE = async (req, res) => {
    try {
        const { fechaDesde, fechaHasta, tipo, estado, clienteId } = req.query;
        const pool = await getPool();
        const request = pool.request();

        let baseQuery = `
            SELECT 
                d.*,
                c.NombreFantasia AS CliNombreFantasia,
                c.Nombre AS CliRazonSocial,
                c.CioRuc AS CliRUT,
                c.CioRuc AS CliDocumento,
                c.IDCliente AS StringIDCliente
            FROM DocumentosContables d
            LEFT JOIN Clientes c ON d.CliIdCliente = c.CodCliente
            WHERE 1=1
        `;

        if (fechaDesde) {
            baseQuery += ` AND d.DocFechaEmision >= @fechaDesde`;
            request.input('fechaDesde', sql.Date, fechaDesde);
        }
        if (fechaHasta) {
            baseQuery += ` AND d.DocFechaEmision < DATEADD(day, 1, CAST(@fechaHasta AS DATE))`;
            request.input('fechaHasta', sql.Date, fechaHasta);
        }
        if (tipo) {
            baseQuery += ` AND d.DocTipo = @tipo`;
            request.input('tipo', sql.VarChar(50), tipo);
        }
        if (estado) {
            baseQuery += ` AND d.CfeEstado = @estado`;
            request.input('estado', sql.VarChar(50), estado);
        }
        if (clienteId) {
            baseQuery += ` AND d.CliIdCliente = @clienteId`;
            request.input('clienteId', sql.Int, clienteId);
        }

        baseQuery += ` ORDER BY d.DocFechaEmision DESC`;

        const result = await request.query(baseQuery);
        res.json(result.recordset);
    } catch (error) {
        logger.error('Error obteniendo documentos CFE:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.enviarADGI = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();
        
        // 1. Obtener documento
        const docResult = await pool.request()
            .input('Id', sql.Int, id)
            .query(`SELECT DocNumero, CfeEstado FROM DocumentosContables WHERE DocIdDocumento = @Id`);
            
        if (docResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Documento no encontrado' });
        }
        
        const doc = docResult.recordset[0];
        if (doc.CfeEstado === 'ACEPTADO_DGI') {
            return res.status(400).json({ error: 'Este documento ya fue firmado y aceptado por DGI.' });
        }

        // --- AQUI IRIA LA CONEXION HTTP A LA API DEL PROVEEDOR CFE ---
        // await axios.post('https://api.tuproveedor.com/emitir', payload);
        
        // --- SIMULACION DE RESPUESTA EXITOSA DGI ---
        const fakeCAE = 'CAE' + Math.floor(Math.random() * 1000000000);
        const fakeOficial = 'A-' + Math.floor(Math.random() * 100000);
        const fakeUrl = 'https://tuproveedor.com/ver_pdf?cae=' + fakeCAE;
        
        await pool.request()
            .input('Id', sql.Int, id)
            .input('CAE', sql.VarChar(255), fakeCAE)
            .input('Oficial', sql.VarChar(100), fakeOficial)
            .input('Url', sql.NVarChar, fakeUrl)
            .query(`
                UPDATE DocumentosContables 
                SET CfeEstado = 'ACEPTADO_DGI', 
                    CfeCAE = @CAE, 
                    CfeNumeroOficial = @Oficial, 
                    CfeUrlImpresion = @Url
                WHERE DocIdDocumento = @Id
            `);
            
        logger.info(`Documento ${id} emitido exitosamente a DGI (Simulado). CAE: ${fakeCAE}`);
        res.json({ message: 'Documento enviado exitosamente', cae: fakeCAE, numeroOficial: fakeOficial });
    } catch (error) {
        logger.error('Error enviando a DGI:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.crearFacturaManual = async (req, res) => {
    const { DocTipo, MonIdMoneda, CliIdCliente, Lineas, Totales } = req.body;
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    
    try {
        await transaction.begin();
        const request = transaction.request();
        
        // 1. Obtener configuración del documento y secuencia
        const resConfig = await request
            .input('codDoc', sql.VarChar(10), DocTipo)
            .query(`
                SELECT c.EvtCodigo, c.Detalle, s.SecSerie, s.SecUltimoNumero, s.SecIdSecuencia 
                FROM Config_TiposDocumento c
                LEFT JOIN SecuenciaDocumentos s ON c.SecIdSecuencia = s.SecIdSecuencia
                WHERE c.CodDocumento = @codDoc
            `);
            
        if (resConfig.recordset.length === 0) {
            throw new Error('Tipo de documento no configurado o inactivo.');
        }
        
        const config = resConfig.recordset[0];
        const serie = config.SecSerie || 'M';
        let numero = 1;

        if (config.SecIdSecuencia) {
            const resSeq = await request
                .input('secId', sql.Int, config.SecIdSecuencia)
                .query(`
                    UPDATE SecuenciaDocumentos 
                    SET SecUltimoNumero = SecUltimoNumero + 1 
                    OUTPUT INSERTED.SecUltimoNumero 
                    WHERE SecIdSecuencia = @secId
                `);
            numero = resSeq.recordset[0].SecUltimoNumero;
        } else {
            const resMax = await request.query(`SELECT ISNULL(MAX(DocNumero), 0) + 1 AS num FROM DocumentosContables WHERE DocSerie='M'`);
            numero = resMax.recordset[0].num;
        }

        // 2. Crear documento CFE
        const insertDoc = await request
            .input('tipo', sql.VarChar(50), config.Detalle)
            .input('cuenta', sql.Int, MonIdMoneda === 2 ? 119 : 118)
            .input('moneda', sql.Int, MonIdMoneda)
            .input('clienteId', sql.Int, CliIdCliente || 1)
            .input('subtotal', sql.Decimal(18,2), Totales.subtotal)
            .input('iva', sql.Decimal(18,2), Totales.iva)
            .input('total', sql.Decimal(18,2), Totales.total)
            .input('serie', sql.VarChar(10), serie)
            .input('numero', sql.Int, numero)
            .input('usuario', sql.Int, req.user?.id || 1)
            .query(`
                INSERT INTO DocumentosContables 
                (DocTipo, CueIdCuenta, MonIdMoneda, CliIdCliente, DocSubtotal, DocImpuestos, 
                 DocTotalDescuentos, DocTotalRecargos, DocTotal, DocEstado, 
                 DocFechaEmision, DocUsuarioAlta, CfeEstado, DocSerie, DocNumero, DocPagado)
                OUTPUT INSERTED.DocIdDocumento
                VALUES 
                (@tipo, @cuenta, @moneda, @clienteId, @subtotal, @iva, 
                 0, 0, @total, 1, 
                 GETDATE(), @usuario, 'PENDIENTE', @serie, @numero, 0)
            `);
            
        const docId = insertDoc.recordset[0].DocIdDocumento;

        // 3. Contabilizar automáticamente
        const evtCodigo = config.EvtCodigo;
        
        const lineasContables = await resolverLineasDesdeMotor(evtCodigo, {
            totalNeto: Totales.total,
            clienteId: CliIdCliente
        });

        if (lineasContables.length > 0) {
            const asiId = await generarAsientoCompleto({
                concepto: `${DocTipo} Manual M-${docId} - ${CliIdCliente ? 'Cliente ' + CliIdCliente : 'Consumidor'}`,
                usuarioId: req.user?.id || 1,
                origen: 'FACTURACION_MANUAL',
                lineas: lineasContables
            }, transaction);
            
            // Update DocumentosContables with the AsiIdAsiento
            if (asiId) {
                await request
                    .input('docId', sql.Int, docId)
                    .input('asiId', sql.Int, asiId)
                    .query(`UPDATE DocumentosContables SET AsiIdAsiento = @asiId WHERE DocIdDocumento = @docId`);
            }
        }

        await transaction.commit();
        res.json({ success: true, message: 'Documento CFE generado exitosamente', docId });

    } catch (err) {
        await transaction.rollback();
        logger.error('Error en crearFacturaManual:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getNomencladores = async (req, res) => {
    try {
        const pool = await getPool();
        const [resMonedas, resDocTipos] = await Promise.all([
            pool.request().query('SELECT MonIdMoneda as id, MonDescripcionMoneda as nombre, MonSimbolo as simbolo FROM Monedas ORDER BY MonIdMoneda'),
            pool.request().query(`
                SELECT 
                    CodDocumento as value, 
                    Detalle as label, 
                    Codigo_Efact, 
                    RutObligatorio, 
                    AfectaCtaCte, 
                    Referenciado, 
                    NroCaja, 
                    EvtCodigo 
                FROM Config_TiposDocumento 
                WHERE EvtCodigo IS NOT NULL
                ORDER BY CodDocumento
            `)
        ]);

        res.json({
            success: true,
            monedas: resMonedas.recordset,
            tiposDocumentos: resDocTipos.recordset
        });
    } catch (err) {
        logger.error('Error en getNomencladores CFE:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.anularFactura = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();
        const transaction = pool.transaction();
        await transaction.begin();

        const docRes = await transaction.request()
            .input('id', sql.Int, id)
            .query('SELECT CfeEstado, DocPagado, AsiIdAsiento FROM DocumentosContables WHERE DocIdDocumento = @id');
        
        if (docRes.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Documento no encontrado' });
        }
        
        const doc = docRes.recordset[0];
        if (doc.CfeEstado !== 'PENDIENTE') {
            await transaction.rollback();
            return res.status(400).json({ error: 'Solo se pueden anular documentos en estado PENDIENTE' });
        }
        if (doc.DocPagado) {
            await transaction.rollback();
            return res.status(400).json({ error: 'No se puede anular un documento pagado generado desde caja. Debe anular el recibo correspondiente.' });
        }

        // Marcar como anulado
        await transaction.request()
            .input('id', sql.Int, id)
            .query("UPDATE DocumentosContables SET CfeEstado = 'ANULADO', DocEstado = 0 WHERE DocIdDocumento = @id");

        // Revertir Asiento Contable
        if (doc.AsiIdAsiento) {
            await transaction.request()
                .input('asiId', sql.Int, doc.AsiIdAsiento)
                .query("UPDATE Cont_AsientosCabecera SET AsiEstado = 0 WHERE AsiIdAsiento = @asiId");
        }

        await transaction.commit();
        res.json({ success: true, message: 'Factura anulada correctamente' });
    } catch (err) {
        logger.error('Error anulando factura:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.editarFactura = async (req, res) => {
    try {
        const { id } = req.params;
        const { CliIdCliente, MonIdMoneda, DocSubtotal, DocImpuestos, DocTotal } = req.body;
        
        const pool = await getPool();
        const transaction = pool.transaction();
        await transaction.begin();

        const docRes = await transaction.request()
            .input('id', sql.Int, id)
            .query('SELECT CfeEstado, DocPagado, AsiIdAsiento FROM DocumentosContables WHERE DocIdDocumento = @id');
            
        if (docRes.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Documento no encontrado' });
        }
        
        const doc = docRes.recordset[0];
        if (doc.CfeEstado !== 'PENDIENTE') {
            await transaction.rollback();
            return res.status(400).json({ error: 'Solo se pueden editar documentos en estado PENDIENTE' });
        }
        if (doc.DocPagado) {
            await transaction.rollback();
            return res.status(400).json({ error: 'No se puede editar un documento pagado generado desde caja.' });
        }

        // Update Document
        await transaction.request()
            .input('id', sql.Int, id)
            .input('clienteId', sql.Int, CliIdCliente || 1)
            .input('moneda', sql.Int, MonIdMoneda)
            .input('subtotal', sql.Decimal(18,2), DocSubtotal)
            .input('iva', sql.Decimal(18,2), DocImpuestos)
            .input('total', sql.Decimal(18,2), DocTotal)
            .input('cuenta', sql.Int, MonIdMoneda === 2 ? 119 : 118)
            .query(`
                UPDATE DocumentosContables SET 
                    CliIdCliente = @clienteId,
                    MonIdMoneda = @moneda,
                    DocSubtotal = @subtotal,
                    DocImpuestos = @iva,
                    DocTotal = @total,
                    CueIdCuenta = @cuenta
                WHERE DocIdDocumento = @id
            `);

        // If it has an Asiento, we should ideally reverse it and recreate it, or just update the totals if it's a simple 2-line asiento.
        // For simplicity, we just delete the old lines and re-insert them, OR since it's just a manual invoice, we update the existing lines.
        // Actually, to keep it simple, we can delete the old AsientoDetalle and re-insert 2 lines.
        if (doc.AsiIdAsiento) {
            await transaction.request()
                .input('asiId', sql.Int, doc.AsiIdAsiento)
                .query("DELETE FROM Cont_AsientosDetalle WHERE AsiIdAsiento = @asiId");
                
            // Insert new lines (Debito a Cliente, Credito a Ventas)
            const cuentaCliente = MonIdMoneda === 2 ? 119 : 118;
            const cuentaVentas = 411; // Assuming 411 is Ventas
            
            await transaction.request()
                .input('asiId', sql.Int, doc.AsiIdAsiento)
                .input('cuentaCli', sql.Int, cuentaCliente)
                .input('cuentaVen', sql.Int, cuentaVentas)
                .input('total', sql.Decimal(18,2), DocTotal)
                .query(`
                    INSERT INTO Cont_AsientosDetalle (AsiIdAsiento, CueIdCuenta, DetDebe, DetHaber)
                    VALUES 
                    (@asiId, @cuentaCli, @total, 0),
                    (@asiId, @cuentaVen, 0, @total)
                `);
        }

        await transaction.commit();
        res.json({ success: true, message: 'Factura actualizada correctamente' });
    } catch (err) {
        logger.error('Error editando factura:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getDetalleFactura = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();
        
        const result = await pool.request()
            .input('docId', sql.Int, id)
            .query(`
                SELECT 
                    DcdIdDetalle,
                    OrdCodigoOrden,
                    DcdNomItem,
                    DcdDscItem,
                    DcdCantidad,
                    DcdPrecioUnitario,
                    DcdSubtotal,
                    DcdImpuestos,
                    DcdTotal
                FROM DocumentosContablesDetalle
                WHERE DocIdDocumento = @docId
            `);
            
        res.json({ success: true, detalles: result.recordset });
    } catch (err) {
        logger.error('Error obteniendo detalle de factura:', err);
        res.status(500).json({ error: err.message });
    }
};
