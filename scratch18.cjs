const { getPool, sql } = require('./backend/config/db.js');
getPool().then(async pool => {
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
        await pool.request(transaction).query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ConfiguracionPrecios' and xtype='U')
            BEGIN
                CREATE TABLE ConfiguracionPrecios (
                    Clave VARCHAR(100) PRIMARY KEY,
                    Valor VARCHAR(255) NOT NULL,
                    AreaID VARCHAR(20) NULL,
                    Descripcion NVARCHAR(500) NULL
                );
            END
        `);
        
        const settings = [
            { clave: 'EST_UMBRAL_BAJADAS', valor: '10', area: 'EST', desc: 'Límite de bajadas totales para cargo fijo' },
            { clave: 'EST_CARGO_FIJO_UYU', valor: '150', area: 'EST', desc: 'Cargo mínimo fijo si no supera el umbral' },
            { clave: 'EST_PRECIO_BAJADA_UYU', valor: '15', area: 'EST', desc: 'Precio por cada bajada (si supera umbral)' },
            { clave: 'BOR_PUNTADAS_BASE', valor: '5000', area: 'EMB', desc: 'Cantidad de puntadas base para bordado' },
            { clave: 'BOR_PRECIO_BASE_UYU', valor: '50', area: 'EMB', desc: 'Precio de las puntadas base' },
            { clave: 'BOR_PUNTADAS_INTERVALO', valor: '1000', area: 'EMB', desc: 'Intervalo de puntadas extras' },
            { clave: 'BOR_PRECIO_INTERVALO_UYU', valor: '10', area: 'EMB', desc: 'Precio por cada intervalo extra' }
        ];

        for (const s of settings) {
            await pool.request(transaction)
                .input('clave', sql.VarChar(100), s.clave)
                .input('valor', sql.VarChar(255), s.valor)
                .input('area', sql.VarChar(20), s.area)
                .input('desc', sql.NVarChar(500), s.desc)
                .query(`
                    IF EXISTS (SELECT 1 FROM ConfiguracionPrecios WHERE Clave = @clave)
                        UPDATE ConfiguracionPrecios SET Valor = @valor, AreaID = @area, Descripcion = @desc WHERE Clave = @clave;
                    ELSE
                        INSERT INTO ConfiguracionPrecios (Clave, Valor, AreaID, Descripcion) VALUES (@clave, @valor, @area, @desc);
                `);
        }

        // Delete old from ConfiguracionGlobal
        await pool.request(transaction).query("DELETE FROM ConfiguracionGlobal WHERE Clave LIKE '%BORDADO%' OR Clave LIKE 'ESTAMPADO_MINIMO%'");

        await transaction.commit();
        console.log('Tabla ConfiguracionPrecios creada y poblada exitosamente.');
        process.exit(0);
    } catch(err) {
        await transaction.rollback();
        console.error(err);
        process.exit(1);
    }
}).catch(e => console.error(e));
