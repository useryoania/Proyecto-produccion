
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
