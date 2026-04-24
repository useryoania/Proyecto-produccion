const { getPool, sql } = require('../config/db');

exports.getSecuencias = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`SELECT * FROM dbo.SecuenciaDocumentos ORDER BY SecIdSecuencia`);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error obteniendo secuencias:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.updateSecuencia = async (req, res) => {
    try {
        const { id } = req.params;
        const { SecSerie, SecPrefijo, SecDigitos, SecUltimoNumero, SecActivo } = req.body;
        const pool = await getPool();
        
        await pool.request()
            .input('Id', sql.Int, id)
            .input('Serie', sql.VarChar(5), SecSerie)
            .input('Prefijo', sql.VarChar(10), SecPrefijo || null)
            .input('Digitos', sql.Int, SecDigitos || 6)
            .input('UltimoNumero', sql.Int, SecUltimoNumero || 0)
            .input('Activo', sql.Bit, (SecActivo === true || SecActivo === 'true' || SecActivo === 1) ? 1 : 0)
            .query(`
                UPDATE dbo.SecuenciaDocumentos
                SET 
                    SecSerie = @Serie,
                    SecPrefijo = @Prefijo,
                    SecDigitos = @Digitos,
                    SecUltimoNumero = @UltimoNumero,
                    SecActivo = @Activo
                WHERE SecIdSecuencia = @Id
            `);
            
        res.json({ message: 'Secuencia actualizada correctamente' });
    } catch (error) {
        console.error('Error actualizando secuencia:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.createSecuencia = async (req, res) => {
    try {
        const { SecTipoDoc, SecSerie, SecPrefijo, SecDigitos, SecUltimoNumero } = req.body;
        const pool = await getPool();
        
        await pool.request()
            .input('TipoDoc', sql.VarChar(50), SecTipoDoc)
            .input('Serie', sql.VarChar(5), SecSerie)
            .input('Prefijo', sql.VarChar(10), SecPrefijo || null)
            .input('Digitos', sql.Int, SecDigitos || 6)
            .input('UltimoNumero', sql.Int, SecUltimoNumero || 0)
            .input('Activo', sql.Bit, 1)
            .query(`
                INSERT INTO dbo.SecuenciaDocumentos 
                (SecTipoDoc, SecSerie, SecPrefijo, SecDigitos, SecUltimoNumero, SecActivo)
                VALUES (@TipoDoc, @Serie, @Prefijo, @Digitos, @UltimoNumero, @Activo)
            `);
            
        res.status(201).json({ message: 'Secuencia creada correctamente' });
    } catch (error) {
        console.error('Error creando secuencia:', error);
        res.status(500).json({ error: error.message });
    }
};
