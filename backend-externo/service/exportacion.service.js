// C:\sistema-produccion\backend-externo\service\exportacion.service.js

const { getPool } = require('../config/db.config'); 

// *****************************************************************
// 1. CONSULTA PARA PEDIDOS OPTIMIZADA (Usando LEFT JOIN y MAX/CASE)
// *****************************************************************

const CONSULTA_PEDIDOS_COMPLETA = `
    SELECT 
        C2.FECHA, 
        C2.CODCLIENTE, 
        Cl.Nombre, 
        Cl.NombreFantasia, 
        L2.CodArt, 
        L2.Descripcion, 
        C2.NRODOC AS CabezalID, 
        A.CodStock, 
        A.Grupo, 
        C2.Validado, 
        psl.archivo, 
        psl.cantCopias, 
        psl.notas, 
        C2.ESTADO, 
        psl.sublinea_id, 
        L2.ID AS LineaID,
        -- Campos Pivotados (Identificadores)
        PivotId.NombreTrabajo,
        PivotId.Prioridad
        
    FROM dbo.Cabezal2 AS C2 
    INNER JOIN dbo.Clientes AS Cl ON C2.CODCLIENTE = Cl.CodCliente 
    INNER JOIN dbo.Lineas2 AS L2 ON C2.NRODOC = L2.NroDoc 
    INNER JOIN dbo.Articulos AS A ON L2.CodArt = A.CodArticulo 
    INNER JOIN dbo.pedidos_sublineas AS psl ON L2.ID = psl.linea_id

    -- 2. UNIÓN CON LA TABLA PIVOTADA
    LEFT JOIN (
        SELECT
            Ides.RELACION,
            -- Pivoteamos la DESCRIPCION (el valor) donde el CODID es 1
            MAX(CASE WHEN Ides.CODID = 1 THEN Ides.DESCRIPCION ELSE NULL END) AS NombreTrabajo,
            -- Pivoteamos la DESCRIPCION (el valor) donde el CODID es 2
            MAX(CASE WHEN Ides.CODID = 2 THEN Ides.DESCRIPCION ELSE NULL END) AS Prioridad
        FROM 
            dbo.Identificadores AS Ides
        -- Agrupamos por la clave de relación para obtener una fila por pedido
        GROUP BY 
            Ides.RELACION
    ) AS PivotId ON PivotId.RELACION = C2.NRODOC 
    
    ORDER BY C2.NRODOC, L2.ID
`; 

const getPedidos = async () => {
    // ... (El resto de la función es igual) ...
    try {
        const pool = await getPool();
        const result = await pool.request().query(CONSULTA_PEDIDOS_COMPLETA);
        return result.recordset;
    } catch (error) {
        console.error("❌ Error SQL en getPedidos:", error.message);
        throw error;
    }
};

module.exports = { 
    getPedidos
};