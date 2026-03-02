const { sql, getPool } = require('../config/db');

class LabelGenerationService {

    /**
     * Valida y regenera etiquetas para una orden.
     * SIMPLIFICADO: Ahora solo se encarga de crear los bultos para logística.
     * La cotización y sincronización se movieron al flujo de ERPSyncService.
     */
    static async regenerateLabelsForOrder(ordenId, userId, userName, cantidadManual = null) {
        let transaction;
        try {
            const pool = await getPool();

            // 1. Obtener Info Orden Actual
            const orderRes = await pool.request()
                .input('OID', sql.Int, ordenId)
                .query(`SELECT * FROM Ordenes WHERE OrdenID = @OID`);

            if (orderRes.recordset.length === 0) {
                return { success: false, error: 'Orden no encontrada' };
            }
            const o = orderRes.recordset[0];

            // --- VALIDACIÓN DE MAGNITUD ---
            const magnitudStr = o.Magnitud || '';
            let magnitudValor = 0;
            if (typeof magnitudStr === 'number') magnitudValor = magnitudStr;
            else if (magnitudStr) {
                const match = magnitudStr.toString().match(/[\d\.]+/);
                if (match) magnitudValor = parseFloat(match[0]);
            }

            if (magnitudValor <= 0) {
                return { success: false, error: `No se pueden generar etiquetas: La magnitud es 0 o inválida (${magnitudStr}).` };
            }

            // --- CÁLCULO CANTIDAD BULTOS (Lógica Metros/Bulto) ---
            let totalBultos = cantidadManual;

            if (!totalBultos || totalBultos < 1) {
                try {
                    const configRes = await pool.request()
                        .input('Clave', sql.VarChar(50), 'METROSBULTOS')
                        .input('AreaID', sql.VarChar(20), o.AreaID || 'GEN')
                        .query(`SELECT TOP 1 Valor FROM ConfiguracionGlobal WHERE Clave = @Clave AND (AreaID = @AreaID OR AreaID = 'ADMIN') ORDER BY CASE WHEN AreaID = @AreaID THEN 1 ELSE 2 END ASC`);

                    let metrosPorBulto = 60;
                    if (configRes.recordset.length > 0) metrosPorBulto = parseFloat(configRes.recordset[0].Valor) || 60;

                    const metrosRes = await pool.request()
                        .input('OID', sql.Int, ordenId)
                        .query(`SELECT SUM(ISNULL(Copias, 1) * ISNULL(Metros, 0)) as TotalMetos FROM ArchivosOrden WHERE OrdenID = @OID AND EstadoArchivo IN ('OK', 'Finalizado')`);

                    const totalMetros = metrosRes.recordset[0].TotalMetos || 0;
                    if (totalMetros > 0) totalBultos = Math.ceil(totalMetros / metrosPorBulto);
                    else totalBultos = 1;
                } catch (e) {
                    totalBultos = 1;
                }
            }

            // QR Simplificado para Control Interno
            const qrSimple = `ORD-${o.OrdenID}`;

            // --- TRANSACCION DB ---
            transaction = new sql.Transaction(pool);
            await transaction.begin();

            // --- VALIDACION: NoDocERP (Requisito para Logística/React) ---
            if (!o.NoDocERP) {
                await transaction.rollback();
                return { success: false, error: 'No se pueden generar etiquetas: El pedido no tiene asignado un NoDocERP. Sincronice con el ERP primero.' };
            }

            // Limpieza de datos logísticos previos
            try {
                await new sql.Request(transaction).input('OID', sql.Int, ordenId).query(`
                    DELETE M FROM MovimientosLogistica M
                    INNER JOIN Logistica_Bultos LB ON M.CodigoBulto = LB.CodigoEtiqueta
                    INNER JOIN Etiquetas E ON LB.CodigoEtiqueta = E.CodigoEtiqueta
                    WHERE E.OrdenID = @OID
                `);
                await new sql.Request(transaction).input('OID', sql.Int, ordenId).query(`
                    DELETE LE FROM Logistica_EnvioItems LE
                    INNER JOIN Logistica_Bultos LB ON LE.BultoID = LB.BultoID
                    WHERE LB.OrdenID = @OID
                `);
            } catch (ign) { }

            await new sql.Request(transaction).input('OID', sql.Int, ordenId).query("DELETE FROM Logistica_Bultos WHERE OrdenID = @OID");
            await new sql.Request(transaction).input('OID', sql.Int, ordenId).query("DELETE FROM Etiquetas WHERE OrdenID = @OID");

            // Insertar Nuevos Bultos/Etiquetas
            const proximoServicio = (o.ProximoServicio || 'DEPOSITO').trim().toUpperCase();
            const esUltimoServicio = proximoServicio.includes('DEPOSITO') || proximoServicio === '';
            const tipoBulto = esUltimoServicio ? 'PROD_TERMINADO' : 'EN_PROCESO';

            for (let i = 1; i <= totalBultos; i++) {
                await new sql.Request(transaction)
                    .input('OID', sql.Int, ordenId)
                    .input('Num', sql.Int, i)
                    .input('Tot', sql.Int, totalBultos)
                    .input('QR', sql.NVarChar(sql.MAX), qrSimple)
                    .input('User', sql.VarChar(100), userName)
                    .input('Area', sql.VarChar(20), o.AreaID || 'GEN')
                    .input('UID', sql.Int, userId)
                    .input('Job', sql.NVarChar(255), (o.DescripcionTrabajo || '').substring(0, 255))
                    .input('Tipo', sql.VarChar(50), tipoBulto)
                    .query(`
                        INSERT INTO Etiquetas(OrdenID, NumeroBulto, TotalBultos, CodigoQR, FechaGeneracion, Usuario)
                        VALUES(@OID, @Num, @Tot, @QR, GETDATE(), @User);

                        DECLARE @NewID INT = SCOPE_IDENTITY();
                        DECLARE @Code NVARCHAR(50) = 'B' + CAST(@NewID AS NVARCHAR) + '-' + @Area + FORMAT(GETDATE(), 'MMdd');
                        
                        UPDATE Etiquetas SET CodigoEtiqueta = @Code WHERE EtiquetaID = @NewID;

                        INSERT INTO Logistica_Bultos (CodigoEtiqueta, Tipocontenido, OrdenID, Descripcion, UbicacionActual, Estado, UsuarioCreador)
                        VALUES (@Code, @Tipo, @OID, @Job, @Area, 'EN_STOCK', @UID);
                    `);
            }

            await transaction.commit();
            console.log(`[LabelService] Exito. ${totalBultos} bultos generados para Orden ${ordenId}.`);

            return { success: true, totalBultos };

        } catch (err) {
            if (transaction) await transaction.rollback();
            throw err;
        }
    }
}

module.exports = LabelGenerationService;
