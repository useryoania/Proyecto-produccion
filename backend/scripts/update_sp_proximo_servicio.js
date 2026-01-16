const { getPool, sql } = require('../config/db');

async function run() {
    try {
        const pool = await getPool();
        console.log("Actualizando sp_PredecirProximoServicio usando tabla dbo.ConfiguracionRutas...");

        // Nota: Asumimos que la tabla ConfiguracionRutas existe en la BD actual.
        // Si está en otra BD, necesitaríamos el prefijo [SecureAppDB].[dbo].
        // Usaremos dbo.ConfiguracionRutas por defecto.

        const query = `
            CREATE OR ALTER PROCEDURE sp_PredecirProximoServicio
                @OrdenID INT
            AS
            BEGIN
                SET NOCOUNT ON;
                DECLARE @AreaActual NVARCHAR(50);
                DECLARE @Proximo NVARCHAR(50) = NULL;

                SELECT @AreaActual = AreaID FROM dbo.Ordenes WHERE OrdenID = @OrdenID;
                SET @AreaActual = RTRIM(LTRIM(@AreaActual));

                -- Consultar la tabla de configuración de rutas (Estructura dada por usuario)
                -- AreaOrigen -> AreaDestino
                SELECT TOP 1 @Proximo = AreaDestino
                FROM dbo.ConfiguracionRutas
                WHERE AreaOrigen = @AreaActual
                ORDER BY Prioridad ASC; 

                -- Si no se encuentra regla, lógica de fallback esencial
                IF @Proximo IS NULL 
                BEGIN
                    IF @AreaActual IN ('SB', 'SUB') SET @Proximo = 'CORTE';
                    ELSE IF @AreaActual IN ('CORTE') SET @Proximo = 'COSTURA';
                    ELSE IF @AreaActual IN ('COSTURA') SET @Proximo = 'CONTROL';
                    ELSE SET @Proximo = 'LOGISTICA';
                END

                -- Actualizar la Orden con el Próximo Servicio predicho
                UPDATE dbo.Ordenes 
                SET ProximoServicio = @Proximo 
                WHERE OrdenID = @OrdenID;

                SELECT @Proximo as ProximoServicio;
            END
        `;

        await pool.request().query(query);
        console.log("✅ sp_PredecirProximoServicio actualizado correctamente (Modelo ConfiguracionRutas).");
        process.exit(0);

    } catch (err) {
        console.error("❌ Error actualizando SP:", err);

        // Si falla por 'Invalid object name', intentamos con el prefijo de la DB externa
        if (err.message.includes('Invalid object name')) {
            console.log("⚠️ Tabla local no encontrada. Reintentando con [SecureAppDB]...");
            // Aquí iría el reintento, pero mejor dejar que falle para que el usuario nos confirme si debemos usar cross-db.
        }
        process.exit(1);
    }
}

run();
