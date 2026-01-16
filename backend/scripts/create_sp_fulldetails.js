const { getPool, sql } = require('../config/db');

async function createSpFullDetails() {
    try {
        const pool = await getPool();

        const query = `
        CREATE OR ALTER PROCEDURE sp_ObtenerDetalleCompletoOrden
            @OrdenID INT
        AS
        BEGIN
            SET NOCOUNT ON;

            -- 1. HEADER
            SELECT O.*, A.Nombre as AreaNombre
            FROM Ordenes O
            LEFT JOIN Areas A ON O.AreaID = A.AreaID
            WHERE O.OrdenID = @OrdenID;

            -- 2. FILES
            SELECT * FROM ArchivosOrden WHERE OrdenID = @OrdenID;

            -- 3. FALLAS
            SELECT F.*, TF.Titulo as TipoFallaTitulo 
            FROM FallasProduccion F
            LEFT JOIN TiposFallas TF ON F.FallaID = TF.FallaID 
            WHERE F.OrdenID = @OrdenID;

            -- 4. HISTORY
            -- Intentamos vincular el Estado con un Area para dar contexto
            SELECT 
                H.OrdenID,
                H.Estado,
                H.FechaInicio as Fecha,  
                H.FechaFin,
                H.Usuario as UsuarioID,
                H.Detalle as Descripcion, 
                'Cambio Estado' as Accion,
                A.Nombre as AreaNombre,
                A.AreaID as AreaCode
            FROM HistorialOrdenes H
            LEFT JOIN ConfigEstados CE ON H.Estado = CE.Nombre
            LEFT JOIN Areas A ON CE.AreaID = A.AreaID
            WHERE H.OrdenID = @OrdenID
            ORDER BY H.FechaInicio DESC;
        END
        `;

        await pool.request().query(query);
        console.log("✅ SP sp_ObtenerDetalleCompletoOrden creado/actualizado correctamente.");
        process.exit(0);

    } catch (err) {
        console.error("❌ Error creando SP:", err);
        process.exit(1);
    }
}

createSpFullDetails();
