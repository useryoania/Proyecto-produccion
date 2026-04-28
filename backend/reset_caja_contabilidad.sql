-- ==============================================================
-- SCRIPT DE VACIADO (RESET) DE CAJA Y CONTABILIDAD
-- ==============================================================
-- ADVERTENCIA: Este script elimina todos los registros de caja, 
-- movimientos de cuentas y contabilidad. 
-- NO EJECUTAR EN PRODUCCIÓN SIN RESPALDO PREVIO.
-- ==============================================================

USE [Macrosoft]; -- Asegúrate de que este es el nombre correcto de tu base de datos
GO

BEGIN TRANSACTION;

BEGIN TRY
    -- 1. Vaciar detalles y relaciones (Hijos primero para evitar conflictos de Foreign Key)
    PRINT 'Vaciando detalles y relaciones...';
    DELETE FROM dbo.ImputacionPago;
    DELETE FROM dbo.TransaccionDetalle;
    DELETE FROM dbo.AjustesDocumento;
    DELETE FROM dbo.EgresosCaja;
    DELETE FROM dbo.AutorizacionesSinPago;
    DELETE FROM dbo.MovimientosCuenta;
    DELETE FROM dbo.DocumentosContablesDetalle;
    DELETE FROM dbo.Cont_AsientosDetalle;

    -- 2. Vaciar Cabeceras y Tablas Maestras (Padres)
    PRINT 'Vaciando cabeceras de transacciones...';
    DELETE FROM dbo.TransaccionesCaja;
    DELETE FROM dbo.DeudaDocumento;
    DELETE FROM dbo.DocumentosContables;
    DELETE FROM dbo.Cont_AsientosCabecera;
    DELETE FROM dbo.PlanesMetros;
    DELETE FROM dbo.CiclosCredito;
    DELETE FROM dbo.SesionesTurno;

    -- 3. Limpiar Cola de Correos / Estados de Cuenta
    PRINT 'Limpiando cola de correos...';
    DELETE FROM dbo.ColaEstadosCuenta;

    -- 4. Poner a cero los saldos de los clientes
    PRINT 'Reseteando saldos de clientes a cero...';
    UPDATE dbo.CuentasCliente 
    SET CueSaldoActual = 0 
    WHERE CueSaldoActual <> 0;

    -- 5. Reiniciar secuencias de documentos (Opcional, descomentar si se requiere reiniciar la numeración)
    -- PRINT 'Reiniciando secuencias de documentos...';
    -- UPDATE dbo.SecuenciaDocumentos SET NumeroActual = 0; 
    -- DBCC CHECKIDENT ('TransaccionesCaja', RESEED, 0); -- Si las tablas usan IDENTITY

    COMMIT TRANSACTION;
    PRINT '✅ Vaciado completado con éxito.';

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT '❌ ERROR DURANTE EL VACIADO:';
    PRINT ERROR_MESSAGE();
END CATCH;
GO
