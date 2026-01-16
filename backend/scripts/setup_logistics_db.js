const { getPool, sql } = require('../config/db');

async function setupLogisticsTables() {
    try {
        const pool = await getPool();
        console.log("🛠️ Creando Tablas de Logística (Bultos y Envíos)...");

        /* 
         * 1. TABLA: Logistica_Bultos
         * Representa la unidad física indivisible (paquete, rollo, caja).
         * - Puede estar vinculado a una OrdenID (producto terminado) o ser huérfano (insumos).
         * - Tiene Estado: 'CREADO', 'EN_TRANSITO', 'EN_STOCK', 'ENTREGADO'.
         * - Tiene Ubicacion: AreaID donde se encuentra físicamente.
         */
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Logistica_Bultos' AND xtype='U')
            BEGIN
                CREATE TABLE Logistica_Bultos (
                    BultoID INT IDENTITY(1,1) PRIMARY KEY,
                    CodigoEtiqueta NVARCHAR(50) UNIQUE NOT NULL, -- QR unico
                    Tipocontenido NVARCHAR(20) NOT NULL DEFAULT 'PROD_TERMINADO', -- 'PROD_TERMINADO', 'INSUMO', 'TELA_CLIENTE'
                    OrdenID INT NULL, -- FK opcional a Ordenes
                    Descripcion NVARCHAR(255) NULL,
                    UbicacionActual NVARCHAR(50) NOT NULL DEFAULT 'PRODUCCION',
                    Estado NVARCHAR(20) NOT NULL DEFAULT 'CREADO', -- CREADO, EN_TRANSITO, EN_STOCK, ENTREGADO
                    FechaCreacion DATETIME DEFAULT GETDATE(),
                    UsuarioCreador INT NULL
                );
                CREATE INDEX IDX_Bultos_Orden ON Logistica_Bultos(OrdenID);
                CREATE INDEX IDX_Bultos_Ubicacion ON Logistica_Bultos(UbicacionActual);
                CREATE INDEX IDX_Bultos_Codigo ON Logistica_Bultos(CodigoEtiqueta);
            END
            ELSE
            BEGIN
                 -- Migracion simple: asegurar columnas nuevas si ya existiera
                 IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = N'UbicacionActual' AND Object_ID = Object_ID(N'Logistica_Bultos'))
                 BEGIN
                    ALTER TABLE Logistica_Bultos ADD UbicacionActual NVARCHAR(50) NOT NULL DEFAULT 'PRODUCCION';
                 END
            END
        `);

        /*
         * 2. TABLA: Logistica_Envios (Cabecera)
         * Representa el movimiento de un conjunto de bultos.
         * - Estado: 'PREPARACION', 'EN_TRANSITO', 'RECIBIDO_PARCIAL', 'RECIBIDO_TOTAL', 'CANCELADO'
         */
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Logistica_Envios' AND xtype='U')
            BEGIN
                CREATE TABLE Logistica_Envios (
                    EnvioID INT IDENTITY(1,1) PRIMARY KEY,
                    CodigoRemito NVARCHAR(50) UNIQUE NOT NULL, -- QR de la hoja de ruta (Ex Manifiesto)
                    AreaOrigenID NVARCHAR(50) NOT NULL,
                    AreaDestinoID NVARCHAR(50) NOT NULL,
                    UsuarioChofer NVARCHAR(100) NULL,
                    UsuarioEmisor INT NULL,
                    UsuarioReceptor INT NULL,
                    FechaSalida DATETIME NULL,
                    FechaLlegada DATETIME NULL,
                    Estado NVARCHAR(20) NOT NULL DEFAULT 'PREPARACION', 
                    Observaciones NVARCHAR(MAX) NULL
                );
            END
            ELSE
            BEGIN
                 -- Renombrar columna si existe la vieja
                 IF EXISTS(SELECT 1 FROM sys.columns WHERE Name = N'CodigoManifiesto' AND Object_ID = Object_ID(N'Logistica_Envios'))
                 BEGIN
                    EXEC sp_rename 'Logistica_Envios.CodigoManifiesto', 'CodigoRemito', 'COLUMN';
                 END
            END
        `);

        /*
         * 3. TABLA: Logistica_EnvioItems (Detalle)
         * Relaciona Bultos con Envíos.
         * - EstadoRecepcion: Permite saber cuál bulto específico faltó en un envío.
         */
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Logistica_EnvioItems' AND xtype='U')
            BEGIN
                CREATE TABLE Logistica_EnvioItems (
                    ItemID INT IDENTITY(1,1) PRIMARY KEY,
                    EnvioID INT NOT NULL,
                    BultoID INT NOT NULL,
                    EstadoRecepcion NVARCHAR(20) NOT NULL DEFAULT 'PENDIENTE', -- PENDIENTE, ESCANEADO, FALTANTE
                    FechaEscaneo DATETIME NULL,
                    FOREIGN KEY (EnvioID) REFERENCES Logistica_Envios(EnvioID),
                    FOREIGN KEY (BultoID) REFERENCES Logistica_Bultos(BultoID)
                );
                CREATE INDEX IDX_EnvioItems_Envio ON Logistica_EnvioItems(EnvioID);
            END
        `);

        console.log("✅ Tablas de Logística (WMS) verificadas/creadas correctamente.");
        process.exit(0);

    } catch (err) {
        console.error("❌ Error creando tablas de logística:", err);
        process.exit(1);
    }
}

setupLogisticsTables();
