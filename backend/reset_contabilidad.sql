 
-- 9. Resetear secuencias de numeracion
UPDATE dbo.SecuenciaDocumentos SET SecUltimoNum = 0;
PRINT CAST(@@ROWCOUNT AS VARCHAR) + ' secuencias reseteadas.';

PRINT '';
PRINT '=== Limpieza completada. Base lista para pruebas. ===';
