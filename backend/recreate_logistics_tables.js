require('dotenv').config();
const { getPool, sql } = require('./config/db');

async function recreateTables() {
    try {
        const pool = await getPool();

        console.log("🔥 Dropping and Recreating Logistics Tables...");

        // Drop in order of FK dependency
        await pool.request().query("IF OBJECT_ID('DespachoItems', 'U') IS NOT NULL DROP TABLE DespachoItems");
        await pool.request().query("IF OBJECT_ID('Despachos', 'U') IS NOT NULL DROP TABLE Despachos");

        // Create Despachos
        console.log("Creating Despachos...");
        await pool.request().query(`
            CREATE TABLE Despachos (
                DespachoID int IDENTITY(1,1) PRIMARY KEY,
                Codigo varchar(50) NOT NULL UNIQUE,
                AreaOrigenID varchar(20) NOT NULL,
                AreaDestinoID varchar(20) NOT NULL,
                UsuarioEmisorID int DEFAULT 1,
                FechaCreacion datetime DEFAULT GETDATE(),
                Estado varchar(20) DEFAULT 'EN_TRANSITO',
                Observaciones nvarchar(255)
            )
        `);

        // Create DespachoItems
        // Note: Using 'ID' as PK to match the current patched controller code
        console.log("Creating DespachoItems...");
        await pool.request().query(`
            CREATE TABLE DespachoItems (
                ID int IDENTITY(1,1) PRIMARY KEY, 
                DespachoID int NOT NULL,
                OrdenID int NOT NULL,
                EstadoItem varchar(20) DEFAULT 'EN_TRANSITO',
                FechaEscaneo datetime,
                FOREIGN KEY (DespachoID) REFERENCES Despachos(DespachoID)
            )
        `);

        console.log("✅ Tables Recreated Successfully!");

    } catch (e) {
        console.error("❌ Error recreating tables:", e);
    }
}
recreateTables();
