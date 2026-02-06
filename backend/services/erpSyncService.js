const axios = require('axios');
const { sql, getPool } = require('../config/db');

class ERPSyncService {

    /**
     * Sincroniza las "sublineas" del ERP con la suma de magnitudes de las órdenes locales.
     * Se ejecuta por NoDocERP.
     */
    static async syncOrderToERP(noDocERP) {
        if (!noDocERP) {
            console.warn("[ERPSync] NoDocERP no proporcionado, omitiendo sync.");
            return;
        }

        try {
            const pool = await getPool();

            // 1. Agrupar Magnitudes por Articulo para este Documento ERP
            const result = await pool.request()
                .input('Doc', sql.Int, noDocERP) // Asumo int segun ejemplo "74". Si es varchar, cambiaré.
                // Usamos sql.VarChar si NoDocERP es alfanumérico en BD, pero el ejemplo '74' parece int.
                // Mirando columnas: NoDocERP suele ser numérico. Lo trataré como string/flexible.
                .input('DocStr', sql.NVarChar(50), noDocERP.toString())
                .query(`
                    SELECT 
                        CodArticulo, 
                        SUM(TRY_CAST(Magnitud AS DECIMAL(18,2))) as TotalMagnitud
                    FROM Ordenes
                    WHERE NoDocERP = @DocStr OR NoDocERP = @Doc
                    GROUP BY CodArticulo
                `);

            const lines = result.recordset;

            if (lines.length === 0) {
                console.log(`[ERPSync] No hay líneas para NoDocERP ${noDocERP}`);
                return;
            }

            console.log(`[ERPSync] Sincronizando ERP Doc ${noDocERP}. ${lines.length} líneas encontradas.`);

            // 2. Enviar Updates al ERP
            for (const line of lines) {
                if (!line.CodArticulo) continue;

                const payload = {
                    CodArt: line.CodArticulo.trim(),
                    CantidadDebe: 0,
                    CantidadHaber: line.TotalMagnitud || 0
                };

                const url = `http://localhost:6061/api/pedidos/${noDocERP}/sublineas`;

                try {
                    console.log(`[ERPSync] PUT ${url}`, payload);
                    const res = await axios.put(url, payload);
                    console.log(`[ERPSync] OK Linea ${line.CodArticulo}:`, res.status);
                } catch (apiErr) {
                    const status = apiErr.response?.status;
                    const msg = apiErr.response?.data?.message || apiErr.message;
                    console.error(`[ERPSync] Error Linea ${line.CodArticulo} (Status ${status}):`, msg);
                }
            }

        } catch (err) {
            console.error("[ERPSync] Error General:", err.message);
        }
    }
}

module.exports = ERPSyncService;
