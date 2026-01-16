USE [SecureAppDB]
GO

/****** Object:  StoredProcedure [dbo].[sp_ObtenerDetalleIntegralPedido]    Script Date: 13/01/2026 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROCEDURE [dbo].[sp_ObtenerDetalleIntegralPedido]
    @Ref NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. IDENTIFICAR RAIZ (Lógica Original Robusta)
    DECLARE @BaseRef NVARCHAR(50) = LTRIM(RTRIM(@Ref));
    DECLARE @Idx INT = CHARINDEX('(', @Ref);
    
    IF @Idx > 0 
        SET @BaseRef = RTRIM(LEFT(@Ref, @Idx - 1));
    
    -- Tabla para guardar IDs de Ordenes afectadas (con campos extra para facilitar joins)
    DECLARE @OrdenesTbl TABLE (OrdenID INT, CodigoOrden NVARCHAR(50), AreaID NVARCHAR(20), Estado NVARCHAR(50));

    INSERT INTO @OrdenesTbl (OrdenID, CodigoOrden, AreaID, Estado)
    SELECT OrdenID, CodigoOrden, AreaID, Estado FROM Ordenes
    WHERE CodigoOrden = @BaseRef 
       OR CodigoOrden LIKE @BaseRef + ' (%'
       OR NoDocERP = @BaseRef; -- Añadido NoDocERP por si acaso
    
    IF NOT EXISTS (SELECT 1 FROM @OrdenesTbl)
    BEGIN
        RETURN; 
    END

    -- RS 1: HEADER (Mantenemos igual)
    SELECT TOP 1
        @BaseRef as PedidoRef,
        O.Cliente,
        O.DescripcionTrabajo as Descripcion,
        O.FechaIngreso,
        (SELECT COUNT(*) FROM @OrdenesTbl) as TotalOrdenes,
        (SELECT COUNT(*) FROM @OrdenesTbl WHERE Estado IN ('ENTREGADA', 'FINALIZADA', 'TERMINADO')) as Terminadas,
        (SELECT COUNT(*) FROM Logistica_Bultos WHERE OrdenID IN (SELECT OrdenID FROM @OrdenesTbl)) as BultosTotal
    FROM Ordenes O
    WHERE O.OrdenID = (SELECT TOP 1 OrdenID FROM @OrdenesTbl);

    -- RS 2: RUTA (CORREGIDO: LISTA DETALLADA CON JOIN)
    -- En vez de agrupar, devolvemos la secuencia de áreas con sus estados reales y nombres
    SELECT 
        O.AreaID AS Area, 
        ISNULL(A.Nombre, O.AreaID) AS Nombre, -- Traemos A.Nombre, si es null usamos ID
        O.Estado,
        O.EstadoenArea,
        O.EstadoLogistica,
        O.ProximoServicio
    FROM Ordenes O
    LEFT JOIN Areas A ON O.AreaID = A.AreaID
    WHERE O.OrdenID IN (SELECT OrdenID FROM @OrdenesTbl)
    ORDER BY O.Secuencia ASC, O.OrdenID ASC;

    -- RS 3: ORDENES (Detalle - Añadimos AreaNombre para la tabla)
    SELECT 
        O.OrdenID, O.CodigoOrden, O.AreaID, O.Material, O.Estado, O.FechaIngreso, O.Magnitud,
        ISNULL(A.Nombre, O.AreaID) as AreaNombre,
        (SELECT COUNT(*) FROM FallasProduccion WHERE OrdenID = O.OrdenID) as FallasCount
    FROM Ordenes O
    LEFT JOIN Areas A ON O.AreaID = A.AreaID
    WHERE O.OrdenID IN (SELECT OrdenID FROM @OrdenesTbl)
    ORDER BY O.CodigoOrden;

    -- RS 4: LOGISTICA (Igual)
    SELECT B.*, O.CodigoOrden 
    FROM Logistica_Bultos B
    JOIN Ordenes O ON B.OrdenID = O.OrdenID
    WHERE B.OrdenID IN (SELECT OrdenID FROM @OrdenesTbl);

    -- RS 5: INCIDENCIAS (Igual)
    SELECT F.*, O.CodigoOrden, TF.Titulo as TipoFalla
    FROM FallasProduccion F
    JOIN Ordenes O ON F.OrdenID = O.OrdenID
    LEFT JOIN TiposFallas TF ON F.FallaID = TF.FallaID
    WHERE F.OrdenID IN (SELECT OrdenID FROM @OrdenesTbl);

    -- RS 6: HISTORIAL (Igual)
    SELECT TOP 50 
        H.OrdenID, 
        H.Estado, 
        H.FechaInicio as Fecha, 
        H.Detalle, 
        O.CodigoOrden
    FROM HistorialOrdenes H
    JOIN Ordenes O ON H.OrdenID = O.OrdenID
    WHERE H.OrdenID IN (SELECT OrdenID FROM @OrdenesTbl)
    ORDER BY H.FechaInicio DESC;
END
GO
