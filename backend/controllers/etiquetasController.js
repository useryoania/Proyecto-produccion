const { sql, getPool } = require('../config/db');

/**
 * Obtiene las etiquetas generadas para una orden específica.
 */
const getEtiquetas = async (req, res) => {
    try {
        const { ordenId } = req.params;
        const pool = await getPool();

        const result = await pool.request()
            .input('OrdenID', sql.Int, ordenId)
            .query(`
                SELECT 
                    EtiquetaID,
                    OrdenID,
                    NumeroBulto,
                    TotalBultos,
                    CodigoQR,
                    FechaGeneracion,
                    CodigoEtiqueta
                FROM Etiquetas
                WHERE OrdenID = @OrdenID
                ORDER BY NumeroBulto ASC
            `);

        res.json(result.recordset);
    } catch (err) {
        console.error("Error en getEtiquetas:", err);
        res.status(500).json({ error: 'Error al obtener etiquetas', message: err.message });
    }
};

/**
 * DELETE /api/etiqueta/:id
 * Elimina la etiqueta indicadat.
 */
const deleteEtiqueta = async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'EtiquetaID requerido' });

    try {
        const pool = await getPool();

        // 1. Verificar existencia y obtener OrdenID
        const check = await pool.request()
            .input('EtiquetaID', sql.Int, id)
            .query('SELECT OrdenID FROM Etiquetas WHERE EtiquetaID = @EtiquetaID');

        if (check.recordset.length === 0) {
            return res.status(404).json({ error: 'Etiqueta no encontrada' });
        }

        const ordenId = check.recordset[0].OrdenID;

        // 2. Borrar etiqueta
        await pool.request()
            .input('EtiquetaID', sql.Int, id)
            .query('DELETE FROM Etiquetas WHERE EtiquetaID = @EtiquetaID');

        // 3. Actualizar TotalBultos en el resto de etiquetas de la orden
        await pool.request()
            .input('OrdenID', sql.Int, ordenId)
            .query(`
                UPDATE Etiquetas
                SET TotalBultos = (SELECT COUNT(*) FROM Etiquetas WHERE OrdenID = @OrdenID)
                WHERE OrdenID = @OrdenID
            `);

        res.json({ success: true, message: 'Etiqueta eliminada correctamente' });

    } catch (err) {
        console.error('Error eliminando etiqueta:', err);
        res.status(500).json({ error: err.message });
    }
};

const createExtraLabel = async (req, res) => {
    const { ordenId } = req.body;
    // Si req.user no existe, usar defaults
    const userId = req.user?.id || 1;
    const safeUser = req.user?.usuario || 'Sistema';

    try {
        const pool = await getPool();

        // 1. Obtener Info Orden
        const orderRes = await pool.request()
            .input('OID', sql.Int, ordenId)
            .query("SELECT CodigoOrden, Cliente, Prioridad, DescripcionTrabajo, Material, Magnitud, AreaID FROM Ordenes WHERE OrdenID = @OID");

        if (orderRes.recordset.length === 0) return res.status(404).json({ error: 'Orden no encontrada' });
        const o = orderRes.recordset[0];

        // 2. Obtener Ultimo Bulto
        const maxRes = await pool.request()
            .input('OID', sql.Int, ordenId)
            .query("SELECT ISNULL(MAX(NumeroBulto), 0) as MaxBulto, COUNT(*) as Total FROM Etiquetas WHERE OrdenID = @OID");

        const nextNum = maxRes.recordset[0].MaxBulto + 1;
        const newTotal = maxRes.recordset[0].Total + 1;

        // 3. Preparar Datos QR
        const safeDesc = (o.DescripcionTrabajo || '').replace(/\$\*/g, ' ');
        const safeMat = (o.Material || '').replace(/\$\*/g, ' ');
        const qrString = `${o.CodigoOrden} $ * ${nextNum} $ * ${o.Cliente} $ * ${safeDesc} $ * ${o.Prioridad} $ * ${safeMat} $ * ${o.Magnitud} `;

        // 4. Insertar con Transaccion
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const request = new sql.Request(transaction);

            // Insertar Etiqueta
            const result = await request
                .input('OID', sql.Int, ordenId)
                .input('Num', sql.Int, nextNum)
                .input('Tot', sql.Int, newTotal)
                .input('QR', sql.NVarChar(sql.MAX), qrString)
                .input('User', sql.VarChar(100), safeUser)
                .input('Area', sql.VarChar(20), o.AreaID || 'GEN')
                .input('UID', sql.Int, userId) // Pass ID for Logistica_Bultos
                .query(`
                    INSERT INTO Etiquetas(OrdenID, NumeroBulto, TotalBultos, CodigoQR, FechaGeneracion, Usuario)
                    VALUES(@OID, @Num, @Tot, @QR, GETDATE(), @User);
                    
                    DECLARE @NewID INT = SCOPE_IDENTITY();
                    DECLARE @Code NVARCHAR(50) = @Area + FORMAT(GETDATE(), 'MMdd') + '-' + CAST(@NewID AS NVARCHAR);
                    
                    DECLARE @FinalQR NVARCHAR(MAX) = @QR + ' $ * ' + @Code;
                    UPDATE Etiquetas SET CodigoEtiqueta = @Code, CodigoQR = @FinalQR WHERE EtiquetaID = @NewID;

                    -- FUSION LOGISTICA: Insertar en Logistica_Bultos
                    INSERT INTO Logistica_Bultos (CodigoEtiqueta, Tipocontenido, OrdenID, Descripcion, UbicacionActual, Estado, UsuarioCreador)
                    VALUES (@Code, 'PROD_TERMINADO', @OID, 'Bulto generado desde Orden', @Area, 'EN_STOCK', @UID);
                    
                    SELECT * FROM Etiquetas WHERE EtiquetaID = @NewID;
                `);

            // Actualizar TotalBultos en otras etiquetas
            await new sql.Request(transaction)
                .input('OID', sql.Int, ordenId)
                .input('NewTotal', sql.Int, newTotal)
                .query("UPDATE Etiquetas SET TotalBultos = @NewTotal WHERE OrdenID = @OID");

            await transaction.commit();
            res.json({ success: true, label: result.recordset[0] });

        } catch (inner) {
            await transaction.rollback();
            throw inner;
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getEtiquetas,
    deleteEtiqueta,
    createExtraLabel
};
