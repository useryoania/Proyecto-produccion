SELECT 
    p.name AS PROCEDURE_NAME,
    p.create_date AS CREATED,
    p.modify_date AS LAST_MODIFIED,
    s.last_execution_time AS LAST_EXECUTED,
    ISNULL(s.execution_count, 0) AS EXECUTION_COUNT
FROM 
    sys.procedures AS p
LEFT JOIN 
    sys.dm_exec_procedure_stats AS s ON p.object_id = s.object_id
WHERE 
    p.is_ms_shipped = 0 -- Excluir SPs del sistema
ORDER BY 
    s.last_execution_time DESC; -- Los NULOS (no usados recientemente) quedarán al final o principio según motor, mejor manejar en script
