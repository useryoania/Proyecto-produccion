const { getPool, sql } = require('../config/db');

const procedures = [
    `
    CREATE OR ALTER PROCEDURE sp_ObtenerDashboardLogistica
        @AreaUsuario NVARCHAR(50)
    AS
    BEGIN
        SET NOCOUNT ON;

        SELECT 
            O.OrdenID, 
            O.CodigoOrden, 
            O.Cliente, 
            O.Estado, 
            O.FechaIngreso, 
            O.ProximoServicio, 
            O.AreaID,
            (SELECT COUNT(*) FROM Etiquetas E WHERE E.OrdenID = O.OrdenID) as Bultos
        FROM Ordenes O
        WHERE O.Estado IN ('FALLA', 'EN_LOGISTICA', 'PRONTO SECTOR', 'INCOMPLETO', 'EN_TRANSITO', 'EN PROCESO', 'TERMINADO')
        AND (
            @AreaUsuario IN ('ADMIN', 'GERENCIA') 
            OR 
            (@AreaUsuario = 'LOGISTICA' AND (O.AreaID = 'LOGISTICA' OR O.Estado = 'EN_LOGISTICA'))
            OR 
            (O.AreaID = @AreaUsuario)
        )
        ORDER BY O.FechaIngreso DESC;
    END
    `,
    `
    CREATE OR ALTER PROCEDURE sp_ObtenerResumenActivas
        @Role NVARCHAR(50),
        @AreaKey NVARCHAR(50)
    AS
    BEGIN
        SET NOCOUNT ON;

        DECLARE @IsAdmin BIT = 0;
        IF LOWER(@Role) = 'admin' SET @IsAdmin = 1;

        SELECT
            o.AreaID,
            COUNT(*) AS total
        FROM dbo.Ordenes o
        WHERE o.Estado NOT IN ('Cancelado', 'Finalizado')
        AND (@IsAdmin = 1 OR o.AreaID = @AreaKey)
        GROUP BY o.AreaID;
    END
    `,
    `
    CREATE OR ALTER PROCEDURE sp_CrearOrden
        @AreaID VARCHAR(20),
        @Cliente NVARCHAR(200),
        @Descripcion NVARCHAR(300),
        @Prioridad VARCHAR(20),
        @Material VARCHAR(255),
        @Variante VARCHAR(100),
        @Magnitud VARCHAR(50),
        @Nota NVARCHAR(MAX),
        @FechaEstimada DATETIME,
        @ArchivosJSON NVARCHAR(MAX)
    AS
    BEGIN
        SET NOCOUNT ON;
        BEGIN TRY
            BEGIN TRANSACTION;
                DECLARE @NewOrdenID INT;

                INSERT INTO dbo.Ordenes (AreaID, Cliente, DescripcionTrabajo, Prioridad, Material, Variante, Magnitud, Nota, FechaEstimadaEntrega, ArchivosCount, Estado, FechaIngreso)
                VALUES (@AreaID, @Cliente, @Descripcion, @Prioridad, @Material, @Variante, @Magnitud, @Nota, @FechaEstimada, 0, 'Pendiente', GETDATE());
                
                SET @NewOrdenID = SCOPE_IDENTITY();

                IF @ArchivosJSON IS NOT NULL
                BEGIN
                    INSERT INTO dbo.ArchivosOrden (OrdenID, NombreArchivo, RutaAlmacenamiento, TipoArchivo, Copias, Metros, FechaSubida)
                    SELECT 
                        @NewOrdenID, 
                        JSON_VALUE(value, '$.nombre'), 
                        JSON_VALUE(value, '$.link'), 
                        JSON_VALUE(value, '$.tipo'), 
                        ISNULL(JSON_VALUE(value, '$.copias'), 1), 
                        ISNULL(JSON_VALUE(value, '$.metros'), 0), 
                        GETDATE()
                    FROM OPENJSON(@ArchivosJSON);

                    UPDATE dbo.Ordenes SET ArchivosCount = (SELECT COUNT(*) FROM dbo.ArchivosOrden WHERE OrdenID = @NewOrdenID) WHERE OrdenID = @NewOrdenID;
                END

            COMMIT TRANSACTION;
            SELECT @NewOrdenID as OrdenID;
        END TRY
        BEGIN CATCH
            ROLLBACK TRANSACTION;
            THROW;
        END CATCH
    END
    `,
    `
    CREATE OR ALTER PROCEDURE sp_CrearDespacho
        @AreaOrigen VARCHAR(20),
        @AreaDestino VARCHAR(20),
        @UsuarioID INT,
        @Observaciones NVARCHAR(255),
        @OrderIdsJSON NVARCHAR(MAX)
    AS
    BEGIN
        SET NOCOUNT ON;
        BEGIN TRY
            BEGIN TRANSACTION;
                DECLARE @DateStr NVARCHAR(20) = FORMAT(GETDATE(), 'yyMMdd');
                DECLARE @Seq INT = (SELECT COUNT(*) FROM Despachos) + 1;
                DECLARE @DispatchCode NVARCHAR(50) = 'DSP-' + @DateStr + '-' + CAST(@Seq AS NVARCHAR);
                DECLARE @DID INT;

                INSERT INTO Despachos (Codigo, AreaOrigenID, AreaDestinoID, UsuarioEmisorID, Estado, Observaciones)
                VALUES (@DispatchCode, @AreaOrigen, @AreaDestino, @UsuarioID, 'EN_TRANSITO', @Observaciones);
                SET @DID = SCOPE_IDENTITY();

                SELECT value as OrderID INTO #OrdersToProcess FROM OPENJSON(@OrderIdsJSON);
                
                INSERT INTO DespachoItems (DespachoID, OrdenID, EtiquetaID, CodigoBulto, EstadoItem)
                SELECT @DID, O.OrderID, E.EtiquetaID, ISNULL(E.CodigoQR, 'BULTO-' + CAST(E.EtiquetaID AS VARCHAR)), 'EN_TRANSITO'
                FROM #OrdersToProcess O JOIN Etiquetas E ON O.OrderID = E.OrdenID;

                INSERT INTO DespachoItems (DespachoID, OrdenID, EstadoItem, CodigoBulto)
                SELECT @DID, O.OrderID, 'EN_TRANSITO', 'GENERICO'
                FROM #OrdersToProcess O LEFT JOIN Etiquetas E ON O.OrderID = E.OrdenID WHERE E.EtiquetaID IS NULL;

                UPDATE dbo.Ordenes SET Estado = 'EN_TRANSITO' WHERE OrdenID IN (SELECT OrderID FROM #OrdersToProcess);

                DROP TABLE #OrdersToProcess;

            COMMIT TRANSACTION;
            SELECT @DID as DispatchId, @DispatchCode as DispatchCode;
        END TRY
        BEGIN CATCH
            ROLLBACK TRANSACTION;
            THROW;
        END CATCH
    END
    `,
    `
    CREATE OR ALTER PROCEDURE sp_AsignarRollo
        @IsNew BIT,
        @RollId INT = NULL,
        @RollName NVARCHAR(100) = NULL,
        @AreaCode VARCHAR(20) = NULL,
        @UserId INT,
        @OrderIdsJSON NVARCHAR(MAX)
    AS
    BEGIN
        SET NOCOUNT ON;
        BEGIN TRY
            BEGIN TRANSACTION;
                
                DECLARE @TargetRollID INT = @RollId;

                IF @IsNew = 1
                BEGIN
                    IF @AreaCode IS NULL
                        SELECT TOP 1 @AreaCode = AreaID FROM dbo.Ordenes WHERE OrdenID IN (SELECT value FROM OPENJSON(@OrderIdsJSON));
                    
                    SET @AreaCode = ISNULL(@AreaCode, 'GEN');
                    SET @RollName = ISNULL(@RollName, 'Nuevo Lote');

                    SELECT TOP 1 @TargetRollID = RolloID FROM dbo.Rollos WHERE Nombre = @RollName AND AreaID = @AreaCode AND Estado != 'Cerrado';

                    IF @TargetRollID IS NULL
                    BEGIN
                        INSERT INTO dbo.Rollos (Nombre, AreaID, CapacidadMaxima, Estado, FechaCreacion)
                        VALUES (@RollName, @AreaCode, 100, 'Abierto', GETDATE());
                        SET @TargetRollID = SCOPE_IDENTITY();
                        UPDATE dbo.Rollos SET Nombre = CONCAT(@RollName, ' #', CAST(@TargetRollID AS VARCHAR)) WHERE RolloID = @TargetRollID;
                    END
                END
                ELSE
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM dbo.Rollos WHERE RolloID = @TargetRollID) THROW 50001, 'El rollo especificado no existe.', 1;
                END
                
                DECLARE @MaxSeq INT;
                SELECT @MaxSeq = ISNULL(MAX(Secuencia), 0) FROM dbo.Ordenes WHERE RolloID = @TargetRollID;

                MERGE INTO dbo.Ordenes AS Target
                USING (SELECT value AS OrderID, ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) + @MaxSeq AS NewSeq FROM OPENJSON(@OrderIdsJSON)) AS Source
                ON Target.OrdenID = Source.OrderID
                WHEN MATCHED THEN
                    UPDATE SET RolloID = @TargetRollID, Estado = 'En Proceso', EstadoenArea = 'En Rollo', Secuencia = Source.NewSeq;

                INSERT INTO dbo.HistorialOrdenes (OrdenID, Estado, FechaInicio, DuracionMinutos, Detalle)
                SELECT value, 'En Proceso', GETDATE(), 0, CONCAT('Asignado a Rollo ', @TargetRollID) FROM OPENJSON(@OrderIdsJSON);

                INSERT INTO dbo.Auditoria (IdUsuario, Accion, Detalles, FechaHora, DireccionIP)
                VALUES (@UserId, 'ASIGNAR_ROLLO', CONCAT('Asignó rollo ', @TargetRollID, ' a órdenes'), GETDATE(), 'SP_INTERNAL');

            COMMIT TRANSACTION;
            SELECT @TargetRollID as RolloID;
        END TRY
        BEGIN CATCH
            ROLLBACK TRANSACTION;
            THROW;
        END CATCH
    END
    `,
    `
    CREATE OR ALTER PROCEDURE sp_ObtenerOrdenesArea
        @Area VARCHAR(20) = NULL,
        @Mode VARCHAR(20) = 'active', 
        @Q NVARCHAR(100) = NULL
    AS
    BEGIN
        SET NOCOUNT ON;

        -- Normalización de estados "Finales"
        DECLARE @EstadosFinales TABLE (Estado VARCHAR(50));
        INSERT INTO @EstadosFinales VALUES ('Entregado'), ('Finalizado'), ('Cancelado');

        SELECT 
            o.OrdenID, o.CodigoOrden, o.IdCabezalERP, o.Cliente, o.DescripcionTrabajo,
            o.AreaID, o.Estado, o.EstadoenArea, o.Prioridad, o.FechaIngreso, o.FechaEstimadaEntrega,
            o.Magnitud, o.Material, o.Variante, o.RolloID, o.Nota, o.Observaciones,
            o.meta_data, o.ArchivosCount, o.ProximoServicio,
            m.Nombre as NombreMaquina,
            r.Nombre as NombreRollo,
            (
                SELECT ArchivoID, NombreArchivo as nombre, RutaAlmacenamiento as link,
                       TipoArchivo as tipo, Copias as copias, Metros as metros, DetalleLinea
                FROM dbo.ArchivosOrden 
                WHERE OrdenID = o.OrdenID 
                FOR JSON PATH
            ) as files_data
        FROM dbo.Ordenes o
        LEFT JOIN dbo.ConfigEquipos m ON o.MaquinaID = m.EquipoID
        LEFT JOIN dbo.Rollos r ON o.RolloID = r.RolloID
        WHERE (@Area IS NULL OR o.AreaID = @Area)
          AND (
              (@Mode = 'history' AND o.Estado IN (SELECT Estado FROM @EstadosFinales))
              OR
              (@Mode != 'history' AND o.Estado NOT IN (SELECT Estado FROM @EstadosFinales))
          )
          AND (
              @Q IS NULL 
              OR o.Cliente LIKE '%' + @Q + '%' 
              OR o.CodigoOrden LIKE '%' + @Q + '%' 
              OR CAST(o.OrdenID AS VARCHAR) LIKE '%' + @Q + '%'
          )
        ORDER BY o.Prioridad DESC, o.FechaIngreso ASC;
    END
    `,
    `
    CREATE OR ALTER PROCEDURE sp_ObtenerDetalleDespacho
        @Codigo VARCHAR(50)
    AS
    BEGIN
        SET NOCOUNT ON;

        DECLARE @DID INT = (SELECT DespachoID FROM Despachos WHERE Codigo = @Codigo);

        IF @DID IS NULL
        BEGIN
            SELECT NULL as Dispatch;
            RETURN;
        END

        -- Result Set 1: Header
        SELECT * FROM Despachos WHERE DespachoID = @DID;

        -- Result Set 2: Items
        SELECT 
            DI.ID as ItemID, DI.OrdenID, DI.EtiquetaID, DI.CodigoBulto, DI.EstadoItem, DI.FechaEscaneo,
            O.CodigoOrden, O.Cliente, O.Material,
            (SELECT COUNT(*) FROM Etiquetas E WHERE E.OrdenID = O.OrdenID) as Bultos
        FROM DespachoItems DI
        INNER JOIN Ordenes O ON DI.OrdenID = O.OrdenID
        WHERE DI.DespachoID = @DID;
    END
    `,
    `
    CREATE OR ALTER PROCEDURE sp_RecepcionarItem
        @DispatchId INT,
        @OrderId INT = NULL,
        @ItemId INT = NULL
    AS
    BEGIN
        SET NOCOUNT ON;
        
        DECLARE @ActualItemID INT;
        DECLARE @ActualOrderID INT;
        DECLARE @EstadoItem VARCHAR(20);
        DECLARE @AreaDestino VARCHAR(20);

        -- 1. Identificar Item
        IF @ItemId IS NOT NULL
        BEGIN
            SELECT @ActualItemID = ID, @ActualOrderID = OrdenID, @EstadoItem = EstadoItem 
            FROM DespachoItems WHERE ID = @ItemId AND DespachoID = @DispatchId;
        END
        ELSE
        BEGIN
            SELECT TOP 1 @ActualItemID = ID, @ActualOrderID = OrdenID, @EstadoItem = EstadoItem
            FROM DespachoItems WHERE DespachoID = @DispatchId AND OrdenID = @OrderId;
        END

        -- 2. Validaciones
        IF @ActualItemID IS NULL
        BEGIN
            THROW 50002, '❌ ALERTA: Este bulto NO pertenece a este despacho.', 1;
        END

        IF @EstadoItem = 'RECIBIDO'
        BEGIN
            SELECT 0 as Success, '⚠️ Ya fue escaneado anteriormente.' as Message;
            RETURN;
        END

        -- 3. Transacción
        BEGIN TRY
            BEGIN TRANSACTION;
                
                -- Update Item
                UPDATE DespachoItems SET EstadoItem = 'RECIBIDO', FechaEscaneo = GETDATE() WHERE ID = @ActualItemID;

                -- Determine New Status
                SELECT @AreaDestino = AreaDestinoID FROM Despachos WHERE DespachoID = @DispatchId;
                
                DECLARE @NewStatus VARCHAR(20) = 'EN PROCESO';
                IF @AreaDestino IN ('LOGISTICA', 'DESPACHO') SET @NewStatus = 'EN_LOGISTICA';

                -- Update Order
                UPDATE Ordenes SET Estado = @NewStatus WHERE OrdenID = @ActualOrderID;

            COMMIT TRANSACTION;
            SELECT 1 as Success, '✅ Bulto recibido correctamente' as Message;
        END TRY
        BEGIN CATCH
            ROLLBACK TRANSACTION;
            THROW;
        END CATCH
    END
    `,
    `
    CREATE OR ALTER PROCEDURE sp_ObtenerHistorialOrden
        @OrdenID INT
    AS
    BEGIN
        SET NOCOUNT ON;
        SELECT Estado, FechaInicio, FechaFin,
               ISNULL(DuracionMinutos, DATEDIFF(MINUTE, FechaInicio, GETDATE())) as DuracionMinutos, 
               Detalle
        FROM dbo.HistorialOrdenes 
        WHERE OrdenID = @OrdenID 
        ORDER BY FechaInicio DESC;
    END
    `,
    `
    CREATE OR ALTER PROCEDURE sp_ActualizarEstadoOrden
        @OrdenID INT,
        @NuevoEstado VARCHAR(50),
        @Usuario VARCHAR(100) = 'SISTEMA'
    AS
    BEGIN
        SET NOCOUNT ON;
        DECLARE @ProximoServicio VARCHAR(50);
        DECLARE @EstadoLogistica VARCHAR(100) = NULL;
        DECLARE @EstadoEnArea VARCHAR(50) = NULL;
        DECLARE @PrevEstado VARCHAR(50);

        SELECT @PrevEstado = Estado, @ProximoServicio = ProximoServicio 
        FROM dbo.Ordenes WHERE OrdenID = @OrdenID;

        IF @NuevoEstado = 'EN_LOGISTICA'
        BEGIN
            SET @EstadoLogistica = 'HACIA ' + UPPER(ISNULL(@ProximoServicio, 'LOGÍSTICA'));
            SET @EstadoEnArea = 'Enviado';
        END

        UPDATE dbo.Ordenes 
        SET Estado = @NuevoEstado,
            EstadoLogistica = ISNULL(@EstadoLogistica, EstadoLogistica),
            EstadoenArea = ISNULL(@EstadoEnArea, EstadoenArea)
        WHERE OrdenID = @OrdenID;
    END
    `,
    `
    CREATE OR ALTER PROCEDURE sp_CancelarOrden
        @OrdenID INT,
        @Motivo NVARCHAR(MAX),
        @Usuario VARCHAR(100)
    AS
    BEGIN
        SET NOCOUNT ON;
        BEGIN TRY
            BEGIN TRANSACTION;

            -- 1. Actualizar Orden
            UPDATE dbo.Ordenes 
            SET Estado = 'CANCELADO', 
                Nota = ISNULL(Nota, '') + ' [CANCELADO: ' + @Motivo + ']'
            WHERE OrdenID = @OrdenID;

            -- 2. Cancelar Archivos
            UPDATE dbo.ArchivosOrden 
            SET EstadoArchivo = 'CANCELADO',
                UsuarioControl = @Usuario,
                FechaControl = GETDATE()
            WHERE OrdenID = @OrdenID;

            -- 3. Historial
            INSERT INTO dbo.HistorialOrdenes (OrdenID, Estado, FechaInicio, DuracionMinutos, Detalle)
            VALUES (@OrdenID, 'CANCELADO', GETDATE(), 0, 'Orden Cancelada por ' + @Usuario + '. Motivo: ' + @Motivo);

            COMMIT TRANSACTION;
            SELECT 1 as Success;
        END TRY
        BEGIN CATCH
            ROLLBACK TRANSACTION;
            THROW;
        END CATCH
    END
    `,
    `
    CREATE OR ALTER PROCEDURE sp_DesasignarOrden
        @OrdenID INT,
        @UsuarioID INT,
        @UsuarioIP VARCHAR(50)
    AS
    BEGIN
        SET NOCOUNT ON;
        DECLARE @PrevRolloID INT;
        
        BEGIN TRY
            BEGIN TRANSACTION;

            SELECT @PrevRolloID = RolloID FROM dbo.Ordenes WHERE OrdenID = @OrdenID;

            -- Actualizar Orden (Remover campos que no existen si aplican)
            -- Asumimos RolloID, Estado, EstadoenArea, MaquinaID existen.
            -- Si Secuencia no existe, la quitamos.
            UPDATE dbo.Ordenes 
            SET RolloID = NULL, 
                Estado = 'Pendiente', 
                EstadoenArea = NULL, 
                MaquinaID = NULL,
                Secuencia = NULL
            WHERE OrdenID = @OrdenID;

            -- Historial
            DECLARE @Detallle VARCHAR(200) = CASE WHEN @PrevRolloID IS NOT NULL THEN 'Desasignado del Rollo ' + CAST(@PrevRolloID AS VARCHAR) ELSE 'Desasignado de Rollo' END;
            
            INSERT INTO dbo.HistorialOrdenes (OrdenID, Estado, FechaInicio, DuracionMinutos, Detalle)
            VALUES (@OrdenID, 'Pendiente', GETDATE(), 0, @Detallle);

            -- Auditoria (Tabla Auditoria usa IdUsuario, no UsuarioID, y DireccionIP)
            INSERT INTO dbo.Auditoria (IdUsuario, Accion, Detalles, DireccionIP, FechaHora)
            VALUES (@UsuarioID, 'DESASIGNAR_ORDEN', 'Orden ' + CAST(@OrdenID AS VARCHAR) + ' sacada del rollo ' + ISNULL(CAST(@PrevRolloID AS VARCHAR), '?'), @UsuarioIP, GETDATE());

            COMMIT TRANSACTION;
            SELECT 1 as Success;
        END TRY
        BEGIN CATCH
            ROLLBACK TRANSACTION;
            THROW;
        END CATCH
    END
    `,
    `
    -- 1. CREAR BULTO (UNITARIO)
    CREATE OR ALTER PROCEDURE sp_CrearBulto
        @CodigoEtiqueta NVARCHAR(50), 
        @Tipo NVARCHAR(20), -- 'PROD_TERMINADO', 'INSUMO'
        @OrdenID INT = NULL,
        @Descripcion NVARCHAR(255) = NULL,
        @Ubicacion NVARCHAR(50),
        @UsuarioID INT
    AS
    BEGIN
        SET NOCOUNT ON;
        IF EXISTS (SELECT 1 FROM Logistica_Bultos WHERE CodigoEtiqueta = @CodigoEtiqueta)
            THROW 51000, 'El c&oacute;digo de etiqueta ya existe.', 1;

        INSERT INTO Logistica_Bultos (CodigoEtiqueta, Tipocontenido, OrdenID, Descripcion, UbicacionActual, Estado, UsuarioCreador)
        VALUES (@CodigoEtiqueta, @Tipo, @OrdenID, @Descripcion, @Ubicacion, 'CREADO', @UsuarioID);

        SELECT SCOPE_IDENTITY() as BultoID;
    END
    `,
    `
    -- 2. CREAR ENVÍO (HEADER + ITEMS)
    CREATE OR ALTER PROCEDURE sp_CrearEnvioLogistico
        @CodigoRemito NVARCHAR(50),
        @AreaOrigen NVARCHAR(50),
        @AreaDestino NVARCHAR(50),
        @UsuarioID INT,
        @BultosIdsJSON NVARCHAR(MAX) -- Array de IDs [1, 2, 5]
    AS
    BEGIN
        SET NOCOUNT ON;
        BEGIN TRY
            BEGIN TRANSACTION;

            -- Crear Cabecera
            INSERT INTO Logistica_Envios (CodigoRemito, AreaOrigenID, AreaDestinoID, UsuarioEmisor, Estado, FechaSalida)
            VALUES (@CodigoRemito, @AreaOrigen, @AreaDestino, @UsuarioID, 'EN_TRANSITO', GETDATE());
            
            DECLARE @EnvioID INT = SCOPE_IDENTITY();

            -- Insertar Items y Actualizar Estado Bultos
            INSERT INTO Logistica_EnvioItems (EnvioID, BultoID, EstadoRecepcion)
            SELECT @EnvioID, value, 'PENDIENTE'
            FROM OPENJSON(@BultosIdsJSON);

            UPDATE Logistica_Bultos 
            SET Estado = 'EN_TRANSITO', UbicacionActual = 'TRANSITO'
            WHERE BultoID IN (SELECT value FROM OPENJSON(@BultosIdsJSON));

            COMMIT TRANSACTION;
            SELECT @EnvioID as EnvioID;
        END TRY
        BEGIN CATCH
            ROLLBACK TRANSACTION;
            THROW;
        END CATCH
    END
    `,
    `
    -- 3. RECEPCIONAR ENVÍO (TOTAL O PARCIAL)
    -- Se llama cada vez que se escanea un bulto en destino o al cerrar el envío
    CREATE OR ALTER PROCEDURE sp_RecepcionarBulto
        @EnvioID INT,
        @CodigoEtiqueta NVARCHAR(50),
        @UsuarioID INT
    AS
    BEGIN
        SET NOCOUNT ON;
        DECLARE @BultoID INT;
        
        SELECT @BultoID = BultoID FROM Logistica_Bultos WHERE CodigoEtiqueta = @CodigoEtiqueta;

        IF @BultoID IS NULL THROW 51004, 'Bulto no encontrado', 1;

        -- Verificar si pertenece al envío
        IF NOT EXISTS (SELECT 1 FROM Logistica_EnvioItems WHERE EnvioID = @EnvioID AND BultoID = @BultoID)
             THROW 51005, 'Este bulto no pertenece al envío seleccionado', 1;

        UPDATE Logistica_EnvioItems 
        SET EstadoRecepcion = 'ESCANEADO', FechaEscaneo = GETDATE()
        WHERE EnvioID = @EnvioID AND BultoID = @BultoID;
        
        -- Obtener destino para actualizar ubicación física
        DECLARE @Destino NVARCHAR(50);
        SELECT @Destino = AreaDestinoID FROM Logistica_Envios WHERE EnvioID = @EnvioID;

        UPDATE Logistica_Bultos
        SET Estado = 'EN_STOCK', UbicacionActual = @Destino
        WHERE BultoID = @BultoID;

        SELECT 'OK' as Resultado;
    END
    `
];

async function run() {
    try {
        const pool = await getPool();
        console.log("🔄 Iniciando creación de Stored Procedures...");

        for (const procSql of procedures) {
            // Extraer nombre para log
            const match = procSql.match(/PROCEDURE\s+(\w+)/i);
            const procName = match ? match[1] : 'Unknown';

            console.log(`Creating/Updating: ${procName}...`);
            await pool.request().query(procSql);
        }

        console.log("✅ Todos los procedimientos almacenados han sido actualizados.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error creando procedimientos:", err);
        process.exit(1);
    }
}

run();
