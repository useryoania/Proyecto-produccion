const { getPool, sql } = require('../config/db');

async function fixIdentity() {
    try {
        console.log("🔄 Iniciando migración a IDENTITY para ConfigEquipos...");
        const pool = await getPool();

        // 1. Verificar si ya existe alguna FK que apunte a ConfigEquipos (para evitar errores al dropear)
        // Nota: Si existen, este script básico podría fallar y requeriría manejo manual de FKs.

        // 2. Crear tabla temporal con estructura correcta e IDENTITY
        console.log("🛠️  Creando tabla temporal _ConfigEquipos_New...");
        await pool.query(`
            CREATE TABLE dbo._ConfigEquipos_New (
                EquipoID INT IDENTITY(1,1) PRIMARY KEY,
                AreaID VARCHAR(20),
                Nombre NVARCHAR(100),
                Activo BIT DEFAULT 1,
                Capacidad INT DEFAULT 100,
                Velocidad INT DEFAULT 10,
                Estado NVARCHAR(50) DEFAULT 'DISPONIBLE',
                EstadoProceso NVARCHAR(50) DEFAULT 'DETENIDO'
            );
        `);

        // 3. Copiar datos existentes
        console.log("📦 Copiando datos existentes...");
        // Usamos SET IDENTITY_INSERT para mantener los IDs viejos si se desea, 
        // pero como el objetivo es activar Identity, es mejor migrar los datos tal cual.
        // SI necesitamos preservar los IDs exactos (recomendado para integridad referencial):
        await pool.query(`
            SET IDENTITY_INSERT dbo._ConfigEquipos_New ON;
            INSERT INTO dbo._ConfigEquipos_New (EquipoID, AreaID, Nombre, Activo, Capacidad, Velocidad, Estado, EstadoProceso)
            SELECT EquipoID, AreaID, Nombre, Activo, Capacidad, Velocidad, Estado, EstadoProceso FROM dbo.ConfigEquipos;
            SET IDENTITY_INSERT dbo._ConfigEquipos_New OFF;
        `);

        // 4. Renombrar tablas
        console.log("🔄 Reemplazando tabla original...");
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            await new sql.Request(transaction).query("DROP TABLE dbo.ConfigEquipos");
            await new sql.Request(transaction).query("EXEC sp_rename 'dbo._ConfigEquipos_New', 'ConfigEquipos'");
            await transaction.commit();
            console.log("✅ Tabla reemplazada exitosamente.");
        } catch (err) {
            await transaction.rollback();
            throw err;
        }

        console.log("🚀 Migración completada. EquipoID ahora es IDENTITY.");
        process.exit(0);

    } catch (err) {
        console.error("❌ Error en la migración:", err.message);
        // Intentar limpiar si falló
        try {
            const pool = await getPool();
            await pool.query("IF OBJECT_ID('dbo._ConfigEquipos_New', 'U') IS NOT NULL DROP TABLE dbo._ConfigEquipos_New");
        } catch (e) { /* ignore */ }
        process.exit(1);
    }
}

fixIdentity();
