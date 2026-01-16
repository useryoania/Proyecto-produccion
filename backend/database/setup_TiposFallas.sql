IF OBJECT_ID('dbo.TiposFallas', 'U') IS NOT NULL
DROP TABLE dbo.TiposFallas;
GO

CREATE TABLE dbo.TiposFallas (
    FallaID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    AreaID VARCHAR(20) NOT NULL,
    Titulo NVARCHAR(100) NOT NULL,
    DescripcionDefault NVARCHAR(255) NULL,
    EsFrecuente BIT DEFAULT 0
);
GO
