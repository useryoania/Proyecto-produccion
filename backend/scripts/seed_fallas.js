require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getPool } = require('../config/db');
const sql = require('mssql');

async function seedFallas() {
    try {
        const pool = await getPool();

        console.log("Iniciando población de TiposFallas para DTF...");

        // Datos a insertar
        const fallas = [
            { titulo: 'Banding / Rayas', desc: 'Líneas horizontales en la impresión por cabezal sucio.', frecuente: 1 },
            { titulo: 'Mancha de Tinta', desc: 'Goteo o mancha de tinta sobre el diseño.', frecuente: 1 },
            { titulo: 'Atasco de Film', desc: 'El film se atascó o arrugó durante la impresión.', frecuente: 1 },
            { titulo: 'Color Incorrecto', desc: 'Los colores no coinciden con el archivo original.', frecuente: 0 },
            { titulo: 'Despegue de Transfer', desc: 'El material no adhiere correctamente.', frecuente: 0 },
            { titulo: 'Falla de Software/RIP', desc: 'El archivo se procesó mal en el RIP.', frecuente: 0 },
            { titulo: 'Borde Sucio', desc: 'Rozamiento de cabezal en los bordes.', frecuente: 0 }
        ];

        for (const f of fallas) {
            // Verificar si ya existe para no duplicar (aunque al recrear tabla estará vacía, es buena práctica)
            const check = await pool.request()
                .input('Titulo', sql.NVarChar, f.titulo)
                .input('Area', sql.VarChar, 'DTF')
                .query("SELECT Count(*) as count FROM TiposFallas WHERE Titulo = @Titulo AND AreaID = @Area");

            if (check.recordset[0].count === 0) {
                await pool.request()
                    .input('AreaID', sql.VarChar, 'DTF')
                    .input('Titulo', sql.NVarChar, f.titulo)
                    .input('Desc', sql.NVarChar, f.desc)
                    .input('Frecuente', sql.Bit, f.frecuente)
                    .query(`
                        INSERT INTO TiposFallas (AreaID, Titulo, DescripcionDefault, EsFrecuente)
                        VALUES (@AreaID, @Titulo, @Desc, @Frecuente)
                    `);
                console.log(`Insertado: ${f.titulo}`);
            } else {
                console.log(`Existente: ${f.titulo}`);
            }
        }

        console.log("Población completada.");
        process.exit(0);

    } catch (err) {
        console.error("Error poblando fallas:", err);
        process.exit(1);
    }
}

seedFallas();
