const { getPool, sql } = require('../config/db');

// ==========================================
// 1. GUARDAR RECEPCIÓN
// ==========================================
exports.createReception = async (req, res) => {
    const { clienteId, tipo, servicios, telaCliente, bultos, referencias, usuario, observaciones } = req.body;

    try {
        const pool = await getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Generar Detalle (Servicios o Tela)
            let detalle = '';
            if (tipo === 'PAQUETE DE PRENDAS') {
                detalle = (servicios || []).join('/');
            } else {
                detalle = `TELA: ${telaCliente}`;
            }

            // Insertar
            const request = new sql.Request(transaction);
            const result = await request
                .input('Cliente', sql.VarChar(255), clienteId)
                .input('Tipo', sql.VarChar(50), tipo)
                .input('Detalle', sql.NVarChar(sql.MAX), detalle)
                .input('Bultos', sql.Int, bultos || 1)
                .input('Ref', sql.NVarChar(sql.MAX), (referencias || []).join(' | '))
                .input('Obs', sql.NVarChar(sql.MAX), observaciones || '')
                .input('UID', sql.Int, usuario ? usuario.id : null)
                .query(`
                    INSERT INTO Recepciones (Cliente, Tipo, Detalle, CantidadBultos, Referencias, Observaciones, UsuarioID, Estado)
                    OUTPUT INSERTED.RecepcionID
                    VALUES (@Cliente, @Tipo, @Detalle, @Bultos, @Ref, @Obs, @UID, 'Ingresado');
                `);

            const newId = result.recordset[0].RecepcionID;
            const codigo = `PRE-${newId}`;

            // Actualizar Codigo
            await new sql.Request(transaction)
                .input('ID', sql.Int, newId)
                .input('Cod', sql.VarChar(50), codigo)
                .query("UPDATE Recepciones SET Codigo = @Cod WHERE RecepcionID = @ID");

            // FUSION LOGISTICA: Insertar en Logistica_Bultos
            // Asumimos Ubicacion 'RECEPCION' por defecto al ingresar
            await new sql.Request(transaction)
                .input('Cod', sql.VarChar, codigo)
                .input('Det', sql.NVarChar, detalle)
                .input('UID', sql.Int, usuario ? usuario.id : null)
                .query(`
                    INSERT INTO Logistica_Bultos (CodigoEtiqueta, Tipocontenido, OrdenID, Descripcion, UbicacionActual, Estado, UsuarioCreador)
                    VALUES (@Cod, 'TELA_CLIENTE', NULL, @Det, 'RECEPCION', 'EN_STOCK', @UID);
                `);

            await transaction.commit();

            res.json({ success: true, ordenAsignada: codigo, message: `Orden ${codigo} guardada correctamente.` });

        } catch (inner) {
            await transaction.rollback();
            throw inner;
        }

    } catch (err) {
        console.error("Error createReception:", err);
        res.status(500).json({ error: err.message });
    }
};

// ==========================================
// 2. DATOS DE INICIALIZACIÓN
// ==========================================
exports.getInitData = async (req, res) => {
    try {
        const pool = await getPool();

        // Clientes: De Ordenes y Recepciones
        const clientesRes = await pool.request().query(`
            SELECT DISTINCT Cliente FROM Ordenes WHERE Cliente IS NOT NULL
            UNION
            SELECT DISTINCT Cliente FROM Recepciones WHERE Cliente IS NOT NULL
            ORDER BY Cliente
        `);
        const clientes = clientesRes.recordset.map(r => r.Cliente);

        // Servicios: DESDE TABLA AREAS (Corregido 'Nombre')
        const areasRes = await pool.request().query("SELECT Nombre FROM Areas ORDER BY Nombre");
        const servicios = areasRes.recordset.map(r => r.Nombre);

        // Tipos
        const tipos = ['PAQUETE DE PRENDAS', 'TELA DE CLIENTE'];

        // Proximo ID (Estimado)
        const identRes = await pool.request().query("SELECT IDENT_CURRENT('Recepciones') + 1 as NextID");
        const nextId = identRes.recordset[0].NextID || 1;

        res.json({
            clientes,
            servicios,
            tipos,
            prefix: 'PRE',
            nextCode: `PRE-${nextId}`
        });

    } catch (err) {
        console.error("Error getInitData:", err);
        res.status(500).json({ error: err.message });
    }
};

// ==========================================
// 3. HISTORIAL
// ==========================================
exports.getHistory = async (req, res) => {
    const { cliente, orden, fechaDesde, fechaHasta, page = 1, pageSize = 50 } = req.query;
    const offset = (page - 1) * pageSize;

    try {
        const pool = await getPool();
        const request = pool.request();

        let query = `
            SELECT * FROM Recepciones WHERE 1=1
        `;

        if (cliente) {
            request.input('Cli', sql.VarChar(255), `%${cliente}%`);
            query += " AND Cliente LIKE @Cli";
        }
        if (orden) {
            request.input('Ord', sql.VarChar(50), `%${orden}%`);
            query += " AND Codigo LIKE @Ord";
        }
        if (fechaDesde) {
            request.input('FD', sql.DateTime, fechaDesde);
            query += " AND FechaRecepcion >= @FD";
        }
        if (fechaHasta) {
            request.input('FH', sql.DateTime, new Date(fechaHasta + 'T23:59:59'));
            query += " AND FechaRecepcion <= @FH";
        }

        // Count Total
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as Total');
        const countRes = await request.query(countQuery);
        const total = countRes.recordset[0].Total;

        // Paging
        query += ` ORDER BY RecepcionID DESC OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;

        const result = await request.query(query);

        res.json({
            rows: result.recordset,
            total,
            page: parseInt(page),
            pageSize: parseInt(pageSize)
        });

    } catch (err) {
        console.error("Error getHistory:", err);
        res.status(500).json({ error: err.message });
    }
};

// ==========================================
// 4. ORDENES POR CLIENTE
// ==========================================
exports.getOrdersByClient = async (req, res) => {
    const { cliente } = req.query;
    try {
        const pool = await getPool();
        const request = pool.request();

        let query = `
            SELECT TOP 50 CodigoOrden 
            FROM Ordenes 
            WHERE Cliente = @Cli
            ORDER BY OrdenID DESC
        `;

        const result = await request.input('Cli', sql.VarChar(255), cliente).query(query);

        res.json(result.recordset.map(r => r.CodigoOrden));
    } catch (err) {
        console.error("Error getOrdersByClient:", err);
        res.status(500).json({ error: err.message });
    }
};
