const { getPool, sql } = require('../config/db');

async function applyStructureImprovements() {
    try {
        const pool = await getPool();
        console.log("🛠️ Aplicando mejoras estructurales a la Base de Datos...");

        // 1. CREAR TABLA DE ARCHIVOS INFORMATIVOS (REFERENCIA)
        console.log("   -> Creando tabla 'ArchivosReferencia'...");
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ArchivosReferencia' AND xtype='U')
            BEGIN
                CREATE TABLE ArchivosReferencia (
                    RefID INT IDENTITY(1,1) PRIMARY KEY,
                    OrdenID INT NOT NULL,
                    TipoArchivo NVARCHAR(50) NOT NULL, -- 'BOCETO', 'LOGO', 'GUIA', 'CORTE'
                    UbicacionStorage NVARCHAR(MAX) NOT NULL,
                    NombreOriginal NVARCHAR(255),
                    NotasAdicionales NVARCHAR(MAX),
                    FechaSubida DATETIME DEFAULT GETDATE(),
                    UsuarioID INT NULL,
                    FOREIGN KEY (OrdenID) REFERENCES Ordenes(OrdenID)
                );
                CREATE INDEX IDX_Ref_Orden ON ArchivosReferencia(OrdenID);
            END
        `);

        // 2. AGREGAR CAMPOS DE CONTROL DE TIEMPO Y DEPENDENCIA A LA ORDEN
        console.log("   -> Actualizando tabla 'Ordenes' (Dependencias de Tiempo)...");

        // Columna FechaHabilitacion: Indica cuando REALMENTE se pudo empezar a trabajar (materiales listos)
        const check1 = await pool.request().query("SELECT 1 FROM sys.columns WHERE Name = N'FechaHabilitacion' AND Object_ID = Object_ID(N'Ordenes')");
        if (check1.recordset.length === 0) {
            await pool.request().query("ALTER TABLE Ordenes ADD FechaHabilitacion DATETIME NULL");
            console.log("      + Columna FechaHabilitacion agregada.");
        }

        // Columna EstadoDependencia: 'OK', 'ESPERANDO_INSUMOS', 'ESPERANDO_PRENDA'
        const check2 = await pool.request().query("SELECT 1 FROM sys.columns WHERE Name = N'EstadoDependencia' AND Object_ID = Object_ID(N'Ordenes')");
        if (check2.recordset.length === 0) {
            await pool.request().query("ALTER TABLE Ordenes ADD EstadoDependencia NVARCHAR(50) DEFAULT 'OK' WITH VALUES");
            console.log("      + Columna EstadoDependencia agregada.");
        }

        // 3. ESTRUCTURA PARA CHECKLIST DE REQUISITOS (Opcional pero útil para Estampado)
        // Permite saber QUE es lo que falta (DTF? Prenda? Hilo?)
        console.log("   -> Creando tabla 'Ordenes_Requisitos'...");
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Ordenes_Requisitos' AND xtype='U')
            BEGIN
                CREATE TABLE Ordenes_Requisitos (
                    RequisitoID INT IDENTITY(1,1) PRIMARY KEY,
                    OrdenID INT NOT NULL,
                    AreaID NVARCHAR(50) NOT NULL, -- Ej: 'DTF', 'ESTAMPADO'
                    Descripcion NVARCHAR(100) NOT NULL, -- Ej: 'Recepción de DTF', 'Recepción de Prendas'
                    Estado BIT DEFAULT 0, -- 0: Pendiente, 1: Cumplido
                    FechaCumplido DATETIME NULL,
                    FOREIGN KEY (OrdenID) REFERENCES Ordenes(OrdenID)
                );
                CREATE INDEX IDX_Req_Orden ON Ordenes_Requisitos(OrdenID);
            END
        `);

        console.log("✅ Mejoras de estructura aplicadas correctamente.");
        process.exit(0);

    } catch (err) {
        console.error("❌ Error aplicando mejoras:", err);
        process.exit(1);
    }
}

applyStructureImprovements();
