USE [SecureAppDB];
GO

-- 1. Tabla de Definición de Requisitos por Área
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ConfigRequisitosProduccion]'))
BEGIN
    CREATE TABLE [dbo].[ConfigRequisitosProduccion](
        [RequisitoID] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [AreaID] [nvarchar](50) NOT NULL,       -- Ej: 'DTF', 'SUBLIMACION'
        [CodigoRequisito] [nvarchar](50) NOT NULL, -- Ej: 'REQ_PRENDA', 'REQ_MATRIZ'
        [Descripcion] [nvarchar](100) NULL,     -- Texto para mostrar en UI
        [EsBloqueante] [bit] DEFAULT 1          -- Si true, alerta si falta
    );
    PRINT 'Tabla ConfigRequisitosProduccion creada.';
END

-- 2. Tabla de Reglas de Mapeo (Bulto -> Requisito)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ConfigRequisitoReglas]'))
BEGIN
    CREATE TABLE [dbo].[ConfigRequisitoReglas](
        [ReglaID] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [RequisitoID] [int] NOT NULL,
        [TipoBulto] [nvarchar](50) NULL,      -- Match por Tipo (PROD_TERMINADO, INSUMO, etc)
        [MatchKeyword] [nvarchar](100) NULL,  -- Match por Palabra Clave en Descripción/Etiqueta (Opcional)
        CONSTRAINT FK_Reglas_Requisito FOREIGN KEY (RequisitoID) REFERENCES ConfigRequisitosProduccion(RequisitoID)
    );
    PRINT 'Tabla ConfigRequisitoReglas creada.';
END

-- 3. Tabla Transaccional de Cumplimiento (Checklist por Orden)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[OrdenCumplimientoRequisitos]'))
BEGIN
    CREATE TABLE [dbo].[OrdenCumplimientoRequisitos](
        [CumplimientoID] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [OrdenID] [int] NOT NULL,
        [AreaID] [nvarchar](50) NOT NULL,
        [RequisitoID] [int] NOT NULL,
        [Estado] [nvarchar](20) DEFAULT 'CUMPLIDO',
        [FechaCumplimiento] [datetime] DEFAULT GETDATE(),
        [BultoID] [int] NULL, -- Referencia al bulto que lo cumplió
        CONSTRAINT UC_Orden_Req UNIQUE (OrdenID, RequisitoID) -- Evitar duplicados
    );
    PRINT 'Tabla OrdenCumplimientoRequisitos creada.';
END

-- ---------------------------------------------------------
-- DATOS INICIALES (SEMILLA) SEGÚN TU SOLICITUD
-- ---------------------------------------------------------

-- Limpiar configuración previa para recargar
DELETE FROM ConfigRequisitoReglas;
DELETE FROM ConfigRequisitosProduccion;

-- A. Configuración para DTF
-- Requiere: Prendas (Semielaborado) e Insumo DTF
INSERT INTO ConfigRequisitosProduccion (AreaID, CodigoRequisito, Descripcion) VALUES ('DTF', 'REQ_PRENDAS', 'Recepción de Prendas Base');
INSERT INTO ConfigRequisitosProduccion (AreaID, CodigoRequisito, Descripcion) VALUES ('DTF', 'REQ_FILM', 'Recepción de Film DTF');

DECLARE @ID_DTF_PRENDA INT = (SELECT RequisitoID FROM ConfigRequisitosProduccion WHERE CodigoRequisito = 'REQ_PRENDAS' AND AreaID='DTF');
DECLARE @ID_DTF_FILM INT = (SELECT RequisitoID FROM ConfigRequisitosProduccion WHERE CodigoRequisito = 'REQ_FILM' AND AreaID='DTF');

-- Reglas DTF
-- Si llega un bulto que dice "Corte" o es Semielaborado -> Cumple Prendas
INSERT INTO ConfigRequisitoReglas (RequisitoID, TipoBulto, MatchKeyword) VALUES (@ID_DTF_PRENDA, 'PROD_SEMIELABORADO', NULL); 
INSERT INTO ConfigRequisitoReglas (RequisitoID, TipoBulto, MatchKeyword) VALUES (@ID_DTF_PRENDA, NULL, 'Corte'); 
-- Si llega un bulto de Insumo que dice "DTF" -> Cumple Film
INSERT INTO ConfigRequisitoReglas (RequisitoID, TipoBulto, MatchKeyword) VALUES (@ID_DTF_FILM, 'INSUMO', 'DTF');

-- B. Configuración para BORDADO
-- Requiere: Prendas y Matriz
INSERT INTO ConfigRequisitosProduccion (AreaID, CodigoRequisito, Descripcion) VALUES ('BORDADO', 'REQ_PRENDAS', 'Recepción de Prendas a Bordar');
INSERT INTO ConfigRequisitosProduccion (AreaID, CodigoRequisito, Descripcion) VALUES ('BORDADO', 'REQ_MATRIZ', 'Matriz/Diseño Aprobado');

DECLARE @ID_BOR_PRENDA INT = (SELECT RequisitoID FROM ConfigRequisitosProduccion WHERE CodigoRequisito = 'REQ_PRENDAS' AND AreaID='BORDADO');
-- Reglas Bordado
INSERT INTO ConfigRequisitoReglas (RequisitoID, TipoBulto, MatchKeyword) VALUES (@ID_BOR_PRENDA, 'PROD_SEMIELABORADO', NULL);

-- C. Configuración para SUBLIMACION / CORTE
-- Requiere: Tela Cliente
INSERT INTO ConfigRequisitosProduccion (AreaID, CodigoRequisito, Descripcion) VALUES ('SUBLIMACION', 'REQ_TELA', 'Recepción Tela Cliente');
DECLARE @ID_SUB_TELA INT = (SELECT RequisitoID FROM ConfigRequisitosProduccion WHERE CodigoRequisito = 'REQ_TELA' AND AreaID='SUBLIMACION');

-- Reglas Sublimacion
-- Bulto que empiece con PRE- (que indica cliente) o diga Tela
INSERT INTO ConfigRequisitoReglas (RequisitoID, TipoBulto, MatchKeyword) VALUES (@ID_SUB_TELA, NULL, 'PRE-'); 
INSERT INTO ConfigRequisitoReglas (RequisitoID, TipoBulto, MatchKeyword) VALUES (@ID_SUB_TELA, NULL, 'Tela');

PRINT 'Configuración de requisitos cargada.';
GO
