const { getPool, sql } = require('../config/db');

async function setupSlots() {
    try {
        const pool = await getPool();
        console.log("Conectado a BD. Buscando máquinas...");

        // 1. Obtener Máquinas Activas
        const machines = await pool.request().query("SELECT EquipoID, Nombre, AreaID FROM ConfigEquipos WHERE Activo = 1");

        console.log(`Encontradas ${machines.recordset.length} máquinas activas.`);

        for (const machine of machines.recordset) {
            const { EquipoID, Nombre, AreaID } = machine;

            // Verificar si ya tiene slots
            const check = await pool.request()
                .input('EID', sql.Int, EquipoID)
                .query("SELECT COUNT(*) as count FROM SlotsMaquina WHERE EquipoID = @EID");

            if (check.recordset[0].count > 0) {
                console.log(`[SKIP] La máquina '${Nombre}' ya tiene slots configurados.`);
                continue;
            }

            console.log(`[SETUP] Configurando slots para '${Nombre}' (${AreaID})...`);

            // CONFIGURACIÓN POR DEFECTO
            // Slot 1: Bobina Principal
            await pool.request()
                .input('EID', sql.Int, EquipoID)
                .input('Nom', sql.VarChar(50), 'Bobina 1')
                .input('Tip', sql.VarChar(20), 'BOBINA')
                .input('Ord', sql.Int, 1)
                .query("INSERT INTO SlotsMaquina (EquipoID, Nombre, Tipo, OrdenVisual) VALUES (@EID, @Nom, @Tip, @Ord)");

            // Slots 2-5: Tintas CMYK (Solo si es impresora, asumimos por ahora todos tienen tintas)
            const inks = ['Cyan', 'Magenta', 'Yellow', 'Black'];
            let order = 2;

            // Si es DTF, agregamos "White" y "Polvo"
            if (AreaID === 'DTF' || AreaID === 'DF') {
                inks.push('White');
                inks.push('Polvo Adhesivo');
            }
            // Si es UV, agregamos "White" y "Varnish"
            if (AreaID === 'ECOUV' || (Nombre && Nombre.includes('UV'))) {
                inks.push('White');
                inks.push('Barniz');
            }

            for (const ink of inks) {
                await pool.request()
                    .input('EID', sql.Int, EquipoID)
                    .input('Nom', sql.VarChar(50), ink)
                    .input('Tip', sql.VarChar(20), 'CONSUMIBLE')
                    .input('Ord', sql.Int, order++)
                    .query("INSERT INTO SlotsMaquina (EquipoID, Nombre, Tipo, OrdenVisual) VALUES (@EID, @Nom, @Tip, @Ord)");
            }
        }

        console.log("Configuración de Slots completada.");
        process.exit(0);

    } catch (error) {
        console.error("Error en setupSlots:", error);
        process.exit(1);
    }
}

setupSlots();
