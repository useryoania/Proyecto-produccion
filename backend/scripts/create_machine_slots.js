const { getPool, sql } = require('../config/db');

async function createMachineSlotsTables() {
    try {
        const pool = await getPool();
        console.log("Iniciando creación de tablas para Panel de Control de Máquinas...");

        // 1. Tabla SlotsMaquina (Configuración de qué usa cada máquina)
        console.log("Creando/Verificando tabla SlotsMaquina...");
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SlotsMaquina' AND xtype='U')
            BEGIN
                CREATE TABLE SlotsMaquina (
                    SlotID INT IDENTITY(1,1) PRIMARY KEY,
                    EquipoID INT NOT NULL, -- FK a ConfigEquipos
                    Nombre NVARCHAR(100) NOT NULL, -- Ej: 'Bobina Principal', 'Tinta Cyan', 'Papel Base'
                    Tipo NVARCHAR(50) NOT NULL, -- 'BOBINA' (Continuo, se monta/desmonta), 'CONSUMIBLE' (Recarga, se registra evento)
                    OrdenVisual INT DEFAULT 1,
                    
                    -- Estado Actual (Solo para tipo BOBINA)
                    BobinaMontadaID INT NULL, -- FK a InventarioBobinas
                    FechaMontaje DATETIME NULL,

                    FOREIGN KEY (EquipoID) REFERENCES ConfigEquipos(EquipoID)
                    -- FOREIGN KEY (BobinaMontadaID) REFERENCES InventarioBobinas(BobinaID) -- Opcional, mejor validar en logica
                );
                PRINT 'Tabla SlotsMaquina creada.';
            END
            ELSE
            BEGIN
                PRINT 'Tabla SlotsMaquina ya existe.';
            END
        `);

        // 2. Tabla BitacoraInsumosMaquina (Registro histórico de cambios/recargas)
        console.log("Creando/Verificando tabla BitacoraInsumosMaquina...");
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='BitacoraInsumosMaquina' AND xtype='U')
            BEGIN
                CREATE TABLE BitacoraInsumosMaquina (
                    BitacoraID INT IDENTITY(1,1) PRIMARY KEY,
                    SlotID INT NOT NULL,
                    EquipoID INT NOT NULL,
                    UsuarioID INT NULL,
                    FechaRegistro DATETIME DEFAULT GETDATE(),
                    
                    accion NVARCHAR(50), -- 'MONTAJE', 'DESMONTAJE', 'RECARGA', 'AGOTADO'
                    
                    -- Detalles del Insumo manipulado
                    InsumoID INT NULL, -- FK a Insumos
                    BobinaID INT NULL, -- FK a InventarioBobinas (si aplica)
                    Cantidad DECIMAL(10,2) NULL, -- Metros montados o Litros recargados
                    
                    Comentario NVARCHAR(MAX) NULL,

                    FOREIGN KEY (SlotID) REFERENCES SlotsMaquina(SlotID),
                    FOREIGN KEY (EquipoID) REFERENCES ConfigEquipos(EquipoID)
                );
                PRINT 'Tabla BitacoraInsumosMaquina creada.';
            END
            ELSE
            BEGIN
                PRINT 'Tabla BitacoraInsumosMaquina ya existe.';
            END
        `);

        // 3. Insertar datos de ejemplo si no existen (Para probar el panel)
        // Buscamos equipos existentes
        const equipos = await pool.request().query("SELECT TOP 2 EquipoID, Nombre FROM ConfigEquipos");
        if (equipos.recordset.length > 0) {
            const eq1 = equipos.recordset[0];
            console.log(`Configurando slots de ejemplo para equipo: ${eq1.Nombre} (ID: ${eq1.EquipoID})`);

            // Comprobar si ya tiene slots
            const slotsCheck = await pool.request().input('EID', sql.Int, eq1.EquipoID).query("SELECT TOP 1 * FROM SlotsMaquina WHERE EquipoID = @EID");

            if (slotsCheck.recordset.length === 0) {
                // Insertar Slots Típicos de un Plotter
                // 1 Bobina + 4 Tintas (CMYK)
                const insertSlot = `INSERT INTO SlotsMaquina (EquipoID, Nombre, Tipo, OrdenVisual) VALUES (@EID, @Nom, @Tipo, @Ord)`;

                // Bobina
                await pool.request().input('EID', eq1.EquipoID).input('Nom', 'Material (Bobina)').input('Tipo', 'BOBINA').input('Ord', 1).query(insertSlot);

                // Tintas
                await pool.request().input('EID', eq1.EquipoID).input('Nom', 'Tinta Cyan').input('Tipo', 'CONSUMIBLE').input('Ord', 2).query(insertSlot);
                await pool.request().input('EID', eq1.EquipoID).input('Nom', 'Tinta Magenta').input('Tipo', 'CONSUMIBLE').input('Ord', 3).query(insertSlot);
                await pool.request().input('EID', eq1.EquipoID).input('Nom', 'Tinta Yellow').input('Tipo', 'CONSUMIBLE').input('Ord', 4).query(insertSlot);
                await pool.request().input('EID', eq1.EquipoID).input('Nom', 'Tinta Black').input('Tipo', 'CONSUMIBLE').input('Ord', 5).query(insertSlot);

                console.log("Slots de ejemplo insertados.");
            }
        }

        console.log("Tablas de Panel de Control creadas exitosamente.");

    } catch (err) {
        console.error("Error creando tablas:", err);
    }
}

createMachineSlotsTables();
