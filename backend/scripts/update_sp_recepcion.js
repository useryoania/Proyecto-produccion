const { getPool, sql } = require('../config/db');

async function run() {
    try {
        const pool = await getPool();
        console.log("Actualizando sp_RecepcionarBulto...");

        const query = `
            CREATE OR ALTER PROCEDURE sp_RecepcionarBulto
                @EnvioID INT,
                @CodigoEtiqueta NVARCHAR(50),
                @UsuarioID INT
            AS
            BEGIN
                SET NOCOUNT ON;

                -- Limpieza básica del código recibido
                SET @CodigoEtiqueta = LTRIM(RTRIM(@CodigoEtiqueta));

                -- Verificar si el item existe en el despacho (buscando coincidencia directa o con variaciones comunes)
                DECLARE @ItemID INT;

                SELECT TOP 1 @ItemID = ID
                FROM DespachoItems
                WHERE DespachoID = @EnvioID
                  AND (
                      CodigoBulto = @CodigoEtiqueta 
                      OR CodigoBulto = REPLACE(@CodigoEtiqueta, '/', '-') -- Si DB tiene guion y llega barra
                      OR REPLACE(CodigoBulto, '/', '-') = @CodigoEtiqueta -- Si DB tiene barra y llega guion
                  );

                IF @ItemID IS NULL
                BEGIN
                    -- Error 51004 se mapea a 404 Not Found en el backend
                    THROW 51004, 'Bulto no encontrado en este despacho.', 1;
                END

                -- Realizar la recepción
                UPDATE DespachoItems
                SET EstadoItem = 'RECIBIDO',
                    FechaEscaneo = GETDATE()
                WHERE ID = @ItemID;
                
                -- Opcional: Registrar evento en historial global si existiera tabla de auditoría
            END
        `;

        await pool.request().query(query);
        console.log("✅ sp_RecepcionarBulto actualizado correctamente.");
        process.exit(0);

    } catch (err) {
        console.error("❌ Error actualizando SP:", err);
        process.exit(1);
    }
}

run();
