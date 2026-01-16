const { getPool, sql } = require('../config/db');

async function setupInventoryModel() {
    try {
        const pool = await getPool();
        console.log("--- Configurando Modelo de Inventario e Insumos ---");

        // 1. Asegurar que tabla Insumos tenga la referencia al CodArt
        console.log("1. Verificando tabla Insumos...");
        // Asumimos que la tabla Insumos ya existe, agregamos campos si faltan
        // CodigoReferencia: Será el campo que haga match con Ordenes.CodArt
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Insumos' AND COLUMN_NAME = 'CodigoReferencia')
            BEGIN
                ALTER TABLE Insumos ADD CodigoReferencia NVARCHAR(50);
                ALTER TABLE Insumos ADD StockMinimo DECIMAL(10,2) DEFAULT 0;
            END
        `);

        // 2. Tabla de Inventario Físico (Bobinas Reales)
        console.log("2. Configurando tabla InventarioBobinas...");
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='InventarioBobinas' AND xtype='U')
            BEGIN
                CREATE TABLE InventarioBobinas (
                    BobinaID INT IDENTITY(1,1) PRIMARY KEY,
                    InsumoID INT NOT NULL, -- FK a Insumos
                    AreaID NVARCHAR(20),   -- Area dueña del material (DTF, ECOUV, etc)
                    
                    CodigoEtiqueta NVARCHAR(100), -- Identificador fisico unico (ej. scan codigo barras)
                    LoteProveedor NVARCHAR(100),  -- Trazabilidad
                    
                    MetrosIniciales DECIMAL(10,2) DEFAULT 0,
                    MetrosRestantes DECIMAL(10,2) DEFAULT 0,
                    Ancho DECIMAL(10,2) DEFAULT 0, -- Ancho del material en mts
                    
                    FechaIngreso DATETIME DEFAULT GETDATE(),
                    FechaAgotado DATETIME NULL,
                    
                    Estado NVARCHAR(20) DEFAULT 'Disponible', -- Disponible, En Uso, Agotado, Cuarentena
                    Ubicacion NVARCHAR(100),
                    
                    CONSTRAINT FK_Bobinas_Insumos FOREIGN KEY (InsumoID) REFERENCES Insumos(InsumoID)
                );
            END
        `);

        // 3. Tabla de Auditoría de Movimientos (Desechos y Consumos)
        // Aquí registraremos cuando se cierra un rollo y el cálculo de pérdida
        console.log("3. Configurando tabla MovimientosInsumos...");
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MovimientosInsumos' AND xtype='U')
            BEGIN
                CREATE TABLE MovimientosInsumos (
                    MovimientoID INT IDENTITY(1,1) PRIMARY KEY,
                    BobinaID INT NULL,  -- Puede ser nulo si es un ajuste general
                    InsumoID INT NOT NULL,
                    
                    TipoMovimiento NVARCHAR(50), -- 'INGRESO', 'CONSUMO_PRODUCCION', 'AJUSTE_DESECHO', 'CORRECCION'
                    Cantidad DECIMAL(10,2),      -- Negativo para salidas, Positivo para entradas
                    
                    Referencia NVARCHAR(200),    -- Ej: "Cierre Bobina #55 - Desecho calculado"
                    UsuarioID INT,
                    FechaMovimiento DATETIME DEFAULT GETDATE(),
                    
                    CONSTRAINT FK_Mov_Insumos FOREIGN KEY (InsumoID) REFERENCES Insumos(InsumoID)
                    -- CONSTRAINT FK_Mov_Bobinas FOREIGN KEY (BobinaID) REFERENCES InventarioBobinas(BobinaID)
                );
            END
        `);

        // 4. Vincular Tabla Rollos (Lotes de Producción) con Inventario
        console.log("4. Actualizando tabla Rollos (Vinculo con Bobina Física)...");
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Rollos' AND COLUMN_NAME = 'BobinaID')
            BEGIN
                ALTER TABLE Rollos ADD BobinaID INT NULL;
                -- FK opcional, no estricta para no romper datos viejos, pero recomendada logicamente
                -- ALTER TABLE Rollos ADD CONSTRAINT FK_Rollos_Bobina FOREIGN KEY (BobinaID) REFERENCES InventarioBobinas(BobinaID);
            END
        `);

        console.log("--- Configuración de Inventario Completada ---");

    } catch (err) {
        console.error("Error configurando inventario:", err);
    }
}

setupInventoryModel();
