-- contabilidad_core_setup.sql
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CondicionesPago')
BEGIN
    CREATE TABLE dbo.CondicionesPago (
        CPaIdCondicion INT IDENTITY(1,1) PRIMARY KEY,
        CPaNombre VARCHAR(100) NOT NULL,
        CPaDiasVencimiento INT NOT NULL DEFAULT 0,
        CPaActivo BIT NOT NULL DEFAULT 1
    );
    INSERT INTO dbo.CondicionesPago (CPaNombre, CPaDiasVencimiento) VALUES ('Contado', 0);
    INSERT INTO dbo.CondicionesPago (CPaNombre, CPaDiasVencimiento) VALUES ('Crédito 30 Días', 30);
    PRINT 'Tabla CondicionesPago creada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CuentasCliente')
BEGIN
    CREATE TABLE dbo.CuentasCliente (
        CueIdCuenta INT IDENTITY(1,1) PRIMARY KEY,
        CliIdCliente INT NOT NULL,
        CueTipo VARCHAR(20) NOT NULL,
        ProIdProducto INT NULL,
        MonIdMoneda INT NULL,
        CPaIdCondicion INT NOT NULL DEFAULT 1,
        CueSaldoActual DECIMAL(18,4) NOT NULL DEFAULT 0,
        CueLimiteCredito DECIMAL(18,4) NOT NULL DEFAULT 0,
        CuePuedeNegativo BIT NOT NULL DEFAULT 0,
        CueCicloActivo BIT NOT NULL DEFAULT 0,
        CueDiasCiclo INT NOT NULL DEFAULT 7,
        CueActiva BIT NOT NULL DEFAULT 1,
        CueFechaAlta DATETIME NOT NULL DEFAULT GETDATE(),
        CueUsuarioAlta INT NOT NULL DEFAULT 1,
        CONSTRAINT FK_Cuentas_Clientes FOREIGN KEY (CliIdCliente) REFERENCES dbo.Clientes(CliIdCliente),
        CONSTRAINT FK_Cuentas_Condiciones FOREIGN KEY (CPaIdCondicion) REFERENCES dbo.CondicionesPago(CPaIdCondicion)
    );
    PRINT 'Tabla CuentasCliente creada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MovimientosCuenta')
BEGIN
    CREATE TABLE dbo.MovimientosCuenta (
        MovIdMovimiento INT IDENTITY(1,1) PRIMARY KEY,
        CueIdCuenta INT NOT NULL,
        MovTipo VARCHAR(30) NOT NULL,
        MovConcepto NVARCHAR(500) NOT NULL,
        MovImporte DECIMAL(18,4) NOT NULL,
        MovSaldoPosterior DECIMAL(18,4) NOT NULL,
        MovFecha DATETIME NOT NULL DEFAULT GETDATE(),
        MovAnulado BIT NOT NULL DEFAULT 0,
        OrdIdOrden INT NULL,
        OReIdOrdenRetiro INT NULL,
        PagIdPago INT NULL,
        DocIdDocumento INT NULL,
        MovRefExterna VARCHAR(100) NULL,
        MovObservaciones NVARCHAR(500) NULL,
        MovUsuarioAlta INT NOT NULL DEFAULT 1,
        CONSTRAINT FK_Mov_Cuentas FOREIGN KEY (CueIdCuenta) REFERENCES dbo.CuentasCliente(CueIdCuenta)
    );
    PRINT 'Tabla MovimientosCuenta creada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DeudaDocumento')
BEGIN
    CREATE TABLE dbo.DeudaDocumento (
        DDeIdDocumento INT IDENTITY(1,1) PRIMARY KEY,
        CueIdCuenta INT NOT NULL,
        OrdIdOrden INT NULL,
        DDeImporteOriginal DECIMAL(18,4) NOT NULL,
        DDeImportePendiente DECIMAL(18,4) NOT NULL,
        DDeFechaEmision DATE NOT NULL,
        DDeFechaVencimiento DATE NOT NULL,
        DDeCuotaNumero INT NOT NULL DEFAULT 1,
        DDeCuotaTotal INT NOT NULL DEFAULT 1,
        DDeEstado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE', 
        CONSTRAINT FK_Deuda_Cuentas FOREIGN KEY (CueIdCuenta) REFERENCES dbo.CuentasCliente(CueIdCuenta)
    );
    PRINT 'Tabla DeudaDocumento creada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CiclosCredito')
BEGIN
    CREATE TABLE dbo.CiclosCredito (
        CicIdCiclo INT IDENTITY(1,1) PRIMARY KEY,
        CueIdCuenta INT NOT NULL,
        CliIdCliente INT NOT NULL,
        CicFechaInicio DATE NOT NULL,
        CicFechaCierre DATE NOT NULL,
        CicDiasAprobados INT NOT NULL,
        CicTotalOrdenes DECIMAL(18,4) NOT NULL DEFAULT 0,
        CicTotalPagos DECIMAL(18,4) NOT NULL DEFAULT 0,
        CicSaldoFacturar DECIMAL(18,4) NOT NULL DEFAULT 0,
        CicEstado VARCHAR(20) NOT NULL DEFAULT 'ABIERTO',
        CicUsuarioApertura INT NOT NULL,
        CONSTRAINT FK_Ciclos_Cuentas FOREIGN KEY (CueIdCuenta) REFERENCES dbo.CuentasCliente(CueIdCuenta)
    );
    PRINT 'Tabla CiclosCredito creada.';
END
GO

IF OBJECT_ID('dbo.SP_RegistrarMovimiento', 'P') IS NOT NULL
    DROP PROCEDURE dbo.SP_RegistrarMovimiento;
GO

CREATE PROCEDURE dbo.SP_RegistrarMovimiento
    @CueIdCuenta INT,
    @MovTipo VARCHAR(30),
    @MovConcepto NVARCHAR(500),
    @MovImporte DECIMAL(18,4),
    @MovUsuarioAlta INT,
    @OrdIdOrden INT = NULL,
    @OReIdOrdenRetiro INT = NULL,
    @PagIdPago INT = NULL,
    @DocIdDocumento INT = NULL,
    @MovRefExterna VARCHAR(100) = NULL,
    @MovObservaciones NVARCHAR(500) = NULL,
    @MovIdGenerado INT OUTPUT,
    @SaldoResultante DECIMAL(18,4) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @SaldoActual DECIMAL(18,4);
        SELECT @SaldoActual = CueSaldoActual FROM dbo.CuentasCliente WHERE CueIdCuenta = @CueIdCuenta;
        
        IF @SaldoActual IS NULL
        BEGIN
            RAISERROR('Cuenta no encontrada.', 16, 1);
        END

        SET @SaldoResultante = @SaldoActual + @MovImporte;

        UPDATE dbo.CuentasCliente
        SET CueSaldoActual = @SaldoResultante
        WHERE CueIdCuenta = @CueIdCuenta;

        INSERT INTO dbo.MovimientosCuenta (
            CueIdCuenta, MovTipo, MovConcepto, MovImporte, MovSaldoPosterior,
            MovFecha, MovAnulado, OrdIdOrden, OReIdOrdenRetiro, PagIdPago,
            DocIdDocumento, MovRefExterna, MovObservaciones, MovUsuarioAlta
        ) VALUES (
            @CueIdCuenta, @MovTipo, @MovConcepto, @MovImporte, @SaldoResultante,
            GETDATE(), 0, @OrdIdOrden, @OReIdOrdenRetiro, @PagIdPago,
            @DocIdDocumento, @MovRefExterna, @MovObservaciones, @MovUsuarioAlta
        );

        SET @MovIdGenerado = SCOPE_IDENTITY();

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
PRINT 'SP_RegistrarMovimiento creado.';
GO

IF OBJECT_ID('dbo.SP_ImputarPagoPEPS', 'P') IS NOT NULL
    DROP PROCEDURE dbo.SP_ImputarPagoPEPS;
GO

CREATE PROCEDURE dbo.SP_ImputarPagoPEPS
    @PagIdPago INT,
    @MontoDisponible DECIMAL(18,4),
    @CueIdCuenta INT,
    @UsuarioAlta INT,
    @MontoExcedente DECIMAL(18,4) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @DeudaID INT;
        DECLARE @Pendiente DECIMAL(18,4);
        DECLARE @AAplicar DECIMAL(18,4);

        DECLARE cursor_deuda CURSOR FOR 
        SELECT DDeIdDocumento, DDeImportePendiente 
        FROM dbo.DeudaDocumento 
        WHERE CueIdCuenta = @CueIdCuenta AND DDeEstado IN ('PENDIENTE', 'VENCIDO', 'PARCIAL')
        ORDER BY DDeFechaVencimiento ASC;

        OPEN cursor_deuda;
        FETCH NEXT FROM cursor_deuda INTO @DeudaID, @Pendiente;

        WHILE @@FETCH_STATUS = 0 AND @MontoDisponible > 0
        BEGIN
            IF @MontoDisponible >= @Pendiente
            BEGIN
                SET @AAplicar = @Pendiente;
                SET @MontoDisponible = @MontoDisponible - @Pendiente;
                
                UPDATE dbo.DeudaDocumento 
                SET DDeImportePendiente = 0, DDeEstado = 'PAGADO'
                WHERE DDeIdDocumento = @DeudaID;
            END
            ELSE
            BEGIN
                SET @AAplicar = @MontoDisponible;
                
                UPDATE dbo.DeudaDocumento 
                SET DDeImportePendiente = DDeImportePendiente - @MontoDisponible, DDeEstado = 'PARCIAL'
                WHERE DDeIdDocumento = @DeudaID;
                
                SET @MontoDisponible = 0;
            END

            FETCH NEXT FROM cursor_deuda INTO @DeudaID, @Pendiente;
        END

        CLOSE cursor_deuda;
        DEALLOCATE cursor_deuda;

        SET @MontoExcedente = @MontoDisponible;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
PRINT 'SP_ImputarPagoPEPS creado.';
GO
