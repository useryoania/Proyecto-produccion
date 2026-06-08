const { getPool } = require('./config/db');
(async () => {
  try {
    const pool = await getPool();
    await pool.request().query(`
CREATE OR ALTER PROCEDURE dbo.SP_CerrarSesionCaja 
    @StuIdSesion INT, 
    @UsuarioId INT, 
    @MontoFinal DECIMAL(18,2), 
    @MontoFinalUSD DECIMAL(18,2) = 0,
    @Observaciones NVARCHAR(500) = NULL 
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @MontoInicial DECIMAL(18,2), @MontoInicialUSD DECIMAL(18,2);
    DECLARE @IngresosUYU DECIMAL(18,2) = 0, @IngresosUSD DECIMAL(18,2) = 0;
    DECLARE @EgresosUYU DECIMAL(18,2) = 0, @EgresosUSD DECIMAL(18,2) = 0;
    
    DECLARE @MontoSistema DECIMAL(18,2), @Diferencia DECIMAL(18,2);
    DECLARE @MontoSistemaUSD DECIMAL(18,2), @DiferenciaUSD DECIMAL(18,2);

    SELECT 
        @MontoInicial = ISNULL(StuMontoInicial, 0),
        @MontoInicialUSD = ISNULL(StuMontoInicialUSD, 0)
    FROM dbo.SesionesTurno 
    WHERE StuIdSesion = @StuIdSesion;

    SELECT 
        @IngresosUYU = ISNULL(SUM(CASE WHEN p.PagIdMonedaPago = 1 THEN p.PagMontoPago ELSE 0 END), 0),
        @IngresosUSD = ISNULL(SUM(CASE WHEN p.PagIdMonedaPago = 2 THEN p.PagMontoPago ELSE 0 END), 0)
    FROM dbo.TransaccionesCaja t WITH(NOLOCK)
    JOIN dbo.Pagos p WITH(NOLOCK) ON p.PagTcaIdTransaccion = t.TcaIdTransaccion
    WHERE t.StuIdSesion = @StuIdSesion 
      AND t.TcaEstado IN ('COMPLETADO', 'COMPLETADA', 'COBRADO')
      AND p.PagTipoMovimiento != 'ANULADO'
      AND p.MPaIdMetodoPago = 1;

    SELECT 
        @EgresosUYU = ISNULL(SUM(CASE WHEN EgrMoneda = 'UYU' THEN EgrMonto ELSE 0 END), 0),
        @EgresosUSD = ISNULL(SUM(CASE WHEN EgrMoneda = 'USD' THEN EgrMonto ELSE 0 END), 0)
    FROM dbo.EgresosCaja WITH(NOLOCK)
    WHERE StuIdSesion = @StuIdSesion 
      AND EgrEstado = 'REGISTRADO'
      AND MPaIdMetodoPago = 1;

    SET @MontoSistema = @MontoInicial + @IngresosUYU - @EgresosUYU;
    SET @Diferencia   = @MontoFinal - @MontoSistema;

    SET @MontoSistemaUSD = @MontoInicialUSD + @IngresosUSD - @EgresosUSD;
    SET @DiferenciaUSD   = @MontoFinalUSD - @MontoSistemaUSD;

    DECLARE @NuevoEstado VARCHAR(30) = CASE 
        WHEN ABS(@Diferencia) < 1 AND ABS(@DiferenciaUSD) < 0.05 THEN 'CERRADA' 
        ELSE 'CERRADA_CON_DIFERENCIA' 
    END;

    UPDATE dbo.SesionesTurno 
    SET StuFechaCierre = GETDATE(), 
        StuUsuarioCierra = @UsuarioId, 
        StuMontoFinal = @MontoFinal, 
        StuMontoSistema = @MontoSistema, 
        StuDiferencia = @Diferencia, 
        StuMontoFinalUSD = @MontoFinalUSD, 
        StuMontoSistemaUSD = @MontoSistemaUSD, 
        StuDiferenciaUSD = @DiferenciaUSD, 
        StuEstado = @NuevoEstado, 
        StuObservaciones = @Observaciones 
    WHERE StuIdSesion = @StuIdSesion AND StuEstado = 'ABIERTA';

    IF @@ROWCOUNT = 0 
    BEGIN 
        RAISERROR('No se encontro sesion ABIERTA con ID %d.', 16, 1, @StuIdSesion); 
        RETURN; 
    END

    SELECT 
        @StuIdSesion AS StuIdSesion, 
        @IngresosUYU AS TotalCobros, 
        @EgresosUYU AS TotalEgresos, 
        @MontoSistema AS MontoSistema, 
        @MontoFinal AS MontoFinal, 
        @Diferencia AS Diferencia, 
        @IngresosUSD AS TotalCobrosUSD, 
        @EgresosUSD AS TotalEgresosUSD, 
        @MontoSistemaUSD AS MontoSistemaUSD, 
        @MontoFinalUSD AS MontoFinalUSD, 
        @DiferenciaUSD AS DiferenciaUSD, 
        @NuevoEstado AS EstadoFinal;
END
    `);
    console.log('SP_CerrarSesionCaja actualizado.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
