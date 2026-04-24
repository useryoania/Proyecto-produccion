
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
