-- Listar TODAS las FK que apuntan a CuentasCliente
SELECT 
    fk.name AS FK_Name,
    tp.name AS Tabla_Hija,
    cp.name AS Columna_Hija
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
JOIN sys.tables tp  ON tp.object_id  = fk.parent_object_id
JOIN sys.columns cp ON cp.object_id  = fk.parent_object_id AND cp.column_id = fkc.parent_column_id
JOIN sys.tables tr  ON tr.object_id  = fk.referenced_object_id
WHERE tr.name = 'CuentasCliente'
ORDER BY tp.name;
