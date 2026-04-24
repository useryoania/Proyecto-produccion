const { getPool } = require('./backend/config/db.js');

const query = `
IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = N'Agencia' AND Object_ID = Object_ID(N'dbo.TesoreriaCheques'))
BEGIN
    ALTER TABLE dbo.TesoreriaCheques ADD Agencia VARCHAR(255) NULL;
END

IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = N'EmitidoPor' AND Object_ID = Object_ID(N'dbo.TesoreriaCheques'))
BEGIN
    ALTER TABLE dbo.TesoreriaCheques ADD EmitidoPor VARCHAR(255) NULL;
END

IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = N'EndosadoPor' AND Object_ID = Object_ID(N'dbo.TesoreriaCheques'))
BEGIN
    ALTER TABLE dbo.TesoreriaCheques ADD EndosadoPor VARCHAR(255) NULL;
END

IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = N'EsPagoParcial' AND Object_ID = Object_ID(N'dbo.TesoreriaCheques'))
BEGIN
    ALTER TABLE dbo.TesoreriaCheques ADD EsPagoParcial BIT NULL DEFAULT 0;
END

IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = N'CategoriaPropiedad' AND Object_ID = Object_ID(N'dbo.TesoreriaCheques'))
BEGIN
    ALTER TABLE dbo.TesoreriaCheques ADD CategoriaPropiedad VARCHAR(50) NULL DEFAULT 'Tercero';
END

IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = N'ClasificacionPlazo' AND Object_ID = Object_ID(N'dbo.TesoreriaCheques'))
BEGIN
    ALTER TABLE dbo.TesoreriaCheques ADD ClasificacionPlazo VARCHAR(50) NULL DEFAULT 'Común';
END

IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = N'RubroContableId' AND Object_ID = Object_ID(N'dbo.TesoreriaCheques'))
BEGIN
    ALTER TABLE dbo.TesoreriaCheques ADD RubroContableId INT NULL;
END
`;

getPool().then(async pool => {
    try {
        await pool.request().query(query);
        console.log("SQL script executed successfully!");
        process.exit(0);
    } catch(err) {
        console.error(err.message);
        process.exit(1);
    }
});
