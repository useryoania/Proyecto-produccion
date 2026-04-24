const { getPool, sql } = require('../config/db');

const reportsController = {
    // 1. Obtener todos los precios aplicados a un cliente específico
    getClientPriceOverview: async (req, res) => {
        try {
            const { clientId } = req.params;
            const pool = await getPool();

            // a. Datos del Cliente
            const clientRes = await pool.request().input('CID', sql.Int, clientId).query(`
                SELECT CliIdCliente, Nombre, NombreFantasia, IDCliente FROM Clientes WHERE CliIdCliente = @CID
            `);
            const client = clientRes.recordset[0];
            if (!client) return res.status(404).json({ error: "Cliente no encontrado" });

            // b. Excepciones Directas (Precios Especiales)
            const specialRes = await pool.request().input('CID', sql.Int, clientId).query(`
                SELECT 
                    COALESCE(A.CodArticulo, PI.CodGrupo, CASE WHEN PI.ProIdProducto = 0 THEN 'TOTAL' ELSE CAST(PI.ProIdProducto AS VARCHAR) END) as CodArticulo, 
                    PI.TipoRegla, PI.Valor, PI.MonIdMoneda, PI.MinCantidad as CantidadMinima 
                FROM PreciosEspecialesItems PI
                LEFT JOIN Articulos A ON PI.ProIdProducto = A.ProIdProducto
                WHERE PI.CliIdCliente = @CID
            `);

            // c. Perfiles Asignados
            const profilesRes = await pool.request().input('CID', sql.Int, clientId).query(`
                SELECT PerfilesIDs FROM PreciosEspeciales WHERE CliIdCliente = @CID
            `);
            let perfilesIds = [];
            if (profilesRes.recordset.length > 0 && profilesRes.recordset[0].PerfilesIDs) {
                // PerfilesIDs is like "(1), (3)" or "1,3"
                perfilesIds = String(profilesRes.recordset[0].PerfilesIDs).replace(/[()]/g, '').split(',').map(n => parseInt(n)).filter(n => !isNaN(n));
            }

            let assignedRules = [];
            let associatedProfiles = [];
            if (perfilesIds.length > 0) {
                // Get Profile Details
                const queryStr = `SELECT ID, Nombre, Descripcion FROM PerfilesPrecios WHERE ID IN (${perfilesIds.join(',')})`;
                const pDetails = await pool.request().query(queryStr);
                 associatedProfiles = pDetails.recordset;

                // Get Rules for these profiles
                const queryRules = `
                    SELECT 
                        PI.PerfilID,
                        COALESCE(A.CodArticulo, MAP.NombreReferencia, PI.CodGrupo, CASE WHEN PI.ProIdProducto = 0 THEN 'TOTAL' ELSE CAST(PI.ProIdProducto AS VARCHAR) END) as CodArticulo,
                        COALESCE(A.Descripcion, MAP.NombreReferencia, PI.CodGrupo) as Descripcion,
                        PI.CodGrupo,
                        PI.TipoRegla, PI.Valor, PI.MonIdMoneda, PI.CantidadMinima 
                    FROM PerfilesItems PI
                    LEFT JOIN Articulos A ON PI.ProIdProducto = A.ProIdProducto
                    LEFT JOIN ConfigMapeoERP MAP ON MAP.CodigoERP = PI.CodGrupo COLLATE Database_Default
                    WHERE PI.PerfilID IN (${perfilesIds.join(',')})
                `;
                const pRules = await pool.request().query(queryRules);
                assignedRules = pRules.recordset;
            }

            // d. Perfiles Globales
            const globalRes = await pool.request().query(`SELECT ID, Nombre FROM PerfilesPrecios WHERE EsGlobal = 1`);
            const globalProfiles = globalRes.recordset;
            const globalIds = globalProfiles.map(g => g.ID);
            
            let globalRules = [];
            if (globalIds.length > 0) {
                const queryGlobalRules = `
                    SELECT 
                        PI.PerfilID,
                        COALESCE(A.CodArticulo, MAP.NombreReferencia, PI.CodGrupo, CASE WHEN PI.ProIdProducto = 0 THEN 'TOTAL' ELSE CAST(PI.ProIdProducto AS VARCHAR) END) as CodArticulo,
                        COALESCE(A.Descripcion, MAP.NombreReferencia, PI.CodGrupo) as Descripcion,
                        PI.CodGrupo,
                        PI.TipoRegla, PI.Valor, PI.MonIdMoneda, PI.CantidadMinima 
                    FROM PerfilesItems PI
                    LEFT JOIN Articulos A ON PI.ProIdProducto = A.ProIdProducto
                    LEFT JOIN ConfigMapeoERP MAP ON MAP.CodigoERP = PI.CodGrupo COLLATE Database_Default
                    WHERE PI.PerfilID IN (${globalIds.join(',')})
                `;
                const grulesRes = await pool.request().query(queryGlobalRules);
                globalRules = grulesRes.recordset;
            }

            res.json({
                cliente: client,
                excepciones: specialRes.recordset,
                perfilesAsignados: associatedProfiles,
                reglasPerfiles: assignedRules,
                perfilesGlobales: globalProfiles,
                reglasGlobales: globalRules
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    },

    // 2. Obtener todos los clientes que usan un perfil específico
    getProfileClients: async (req, res) => {
        try {
            const { profileId } = req.params;
            const pool = await getPool();
            const id = parseInt(profileId);

            // Escanear tabla PreciosEspeciales para encontrar match en PerfilesIDs
            const clientsRes = await pool.request().query(`
                SELECT PE.CliIdCliente, C.Nombre, C.NombreFantasia, C.IDCliente, PE.PerfilesIDs
                FROM PreciosEspeciales PE
                LEFT JOIN Clientes C ON PE.CliIdCliente = C.CliIdCliente
                WHERE PE.PerfilesIDs LIKE '%${id}%' 
                   OR PE.PerfilesIDs LIKE '%(${id})%' 
            `);

            // Filtrar cuidadosamente por parsing seguro (en caso de que ID=1 matche '10')
            const exactMatches = clientsRes.recordset.filter(c => {
                if (!c.PerfilesIDs) return false;
                const arr = String(c.PerfilesIDs).replace(/[()]/g, '').split(',').map(n => parseInt(n));
                return arr.includes(id);
            });

            res.json(exactMatches);

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = reportsController;
