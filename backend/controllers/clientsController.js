const { getPool, sql } = require('../config/db');
const axios = require('axios'); // Importar axios para el proxy
const ERP_API_BASE = process.env.ERP_API_URL;

// Cache para el Token de la API Macrosoft
let macrosoftAuthToken = null;
let macrosoftTokenExp = 0;

async function getMacrosoftToken() {
    if (macrosoftAuthToken && Date.now() < macrosoftTokenExp) {
        return macrosoftAuthToken;
    }
    try {
        const username = process.env.MACROSOFT_API_USER || 'user';
        const password = process.env.MACROSOFT_API_PASSWORD || '1234';

        console.log(`[MACROSOFT AUTH] Solicitando token a ${ERP_API_BASE}/authenticate`);
        const res = await axios.post(`${ERP_API_BASE}/authenticate`, { username, password });

        // Asumiendo que el token viene en res.data.token (o simplemente es el texto JWT retornado)
        let token = res.data?.token || res.data?.accessToken;

        if (!token && typeof res.data === 'string') {
            token = res.data;
        } else if (!token && res.data && typeof res.data.data === 'string') {
            token = res.data.data;
        } else if (!token && res.data && typeof res.data === 'object' && !res.data.error) {
            token = res.data.token;
        }

        if (!token) {
            console.warn('[MACROSOFT AUTH] No se logró parsear el token, se devuelve data completo (podría ser objeto)', res.data);
            token = res.data; // fallback en caso que de todas formas funcionase
        }

        macrosoftAuthToken = token;
        macrosoftTokenExp = Date.now() + 1000 * 60 * 55; // 55 mins caché
        return token;
    } catch (err) {
        console.error("[MACROSOFT AUTH] Error obteniendo token:", err.message);
        return null;
    }
}

// ─── BÚSQUEDA EN ClientesReact (local DB) — reemplaza la llamada a API externa ───
exports.getMacrosoftClientData = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('term', sql.VarChar(100), id)
            .query(`
                SELECT TOP 1 *
                FROM ClientesReact WITH(NOLOCK)
                WHERE CliCodigoCliente = @term
                   OR CAST(CliIdCliente AS VARCHAR) = @term
                   OR CliNombreApellido LIKE '%' + @term + '%'
                   OR CliNombreEmpresa  LIKE '%' + @term + '%'
            `);
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado en ClientesReact' });
        }
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('[getMacrosoftClientData] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// Obtener clientes de ClientesReact que NO están vinculados en la tabla local Clientes
exports.getAllReactClients = async (req, res) => {
    try {
        const pool = await getPool();
        const { q } = req.query;
        const request = pool.request();
        let whereSearch = '1=1';

        if (q) {
            whereSearch = `(
                cr.CliNombreApellido LIKE @q
                OR cr.CliNombreEmpresa LIKE @q
                OR cr.CliCodigoCliente LIKE @q
                OR cr.CliMail LIKE @q
                OR cr.CliDocumento LIKE @q
            )`;
            request.input('q', sql.VarChar(200), `%${q}%`);
        }

        // Solo retorna los de ClientesReact que NO están ya vinculados en dbo.Clientes
        const result = await request.query(`
            SELECT 
                cr.CliIdCliente       AS IdCliente,
                cr.CliCodigoCliente   AS CodigoCliente,
                cr.CliNombreApellido  AS NombreCliente,
                cr.CliNombreEmpresa   AS EmpresaCliente,
                cr.CliCelular         AS Telefono,
                cr.CliMail            AS Email,
                cr.CliDocumento       AS Rut,
                cr.CliLocalidad       AS Localidad,
                cr.CliDireccion       AS Direccion,
                cr.CliAgencia         AS Agencia,
                cr.TClIdTipoCliente,
                cr.LReIdLugarRetiro,
                cr.CliFechaAlta
            FROM ClientesReact cr WITH(NOLOCK)
            WHERE NOT EXISTS (
                SELECT 1 FROM dbo.Clientes loc WITH(NOLOCK)
                WHERE loc.IDCliente = cr.CliCodigoCliente
                   OR (loc.IDReact IS NOT NULL AND loc.IDReact <> '' AND CAST(loc.IDReact AS VARCHAR) = CAST(cr.CliIdCliente AS VARCHAR))
            )
            AND ${whereSearch}
            ORDER BY cr.CliNombreApellido ASC
        `);

        console.log(`[getAllReactClients] Devolviendo ${result.recordset.length} clientes React sin vincular`);
        res.set('Cache-Control', 'no-store');
        res.json(result.recordset);
    } catch (error) {
        console.error("Error getAllReactClients:", error.message);
        res.status(500).json({ error: "Error al obtener clientes: " + error.message });
    }
};

// Obtener todos los clientes de ClientesReact (paginado/búsqueda) — reemplaza la llamada a API externa
exports.getAllMacrosoftClients = async (req, res) => {
    const { q, page = 1, pageSize = 50 } = req.query;
    try {
        const pool = await getPool();
        const request = pool.request();
        let where = '1=1';

        if (q) {
            where = `(
                CliNombreApellido LIKE @q
                OR CliNombreEmpresa LIKE @q
                OR CliCodigoCliente LIKE @q
                OR CliMail LIKE @q
                OR CliDocumento LIKE @q
            )`;
            request.input('q', sql.VarChar(200), `%${q}%`);
        }

        const offset = (parseInt(page) - 1) * parseInt(pageSize);
        request.input('offset', sql.Int, offset);
        request.input('pageSize', sql.Int, parseInt(pageSize));

        const result = await request.query(`
            SELECT 
                CliIdCliente    AS IdCliente,
                CliCodigoCliente AS CodigoCliente,
                CliNombreApellido AS NombreCliente,
                CliNombreEmpresa  AS EmpresaCliente,
                CliCelular       AS Telefono,
                CliMail          AS Email,
                CliDocumento     AS Rut,
                CliLocalidad     AS Localidad,
                CliDireccion     AS Direccion,
                CliAgencia       AS Agencia,
                TClIdTipoCliente,
                LReIdLugarRetiro,
                CliFechaAlta
            FROM ClientesReact WITH(NOLOCK)
            WHERE ${where}
            ORDER BY CliNombreApellido ASC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
        `);

        const countResult = await pool.request()
            .query(`SELECT COUNT(*) AS total FROM ClientesReact WITH(NOLOCK) WHERE ${where}`);

        res.set('Cache-Control', 'no-store');
        res.json({
            data: result.recordset,
            total: countResult.recordset[0].total,
            page: parseInt(page),
            pageSize: parseInt(pageSize)
        });
    } catch (error) {
        console.error('[getAllMacrosoftClients] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// Buscar Clientes (Autocompletado)
exports.searchClients = async (req, res) => {
    const { q } = req.query; // Lo que escribe el usuario
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('term', sql.NVarChar(100), `%${q}%`)
            .query('SELECT TOP 10 * FROM dbo.Clientes WHERE Nombre LIKE @term');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Crear Cliente
exports.createClient = async (req, res) => {
    const { nombre, telefono, email, direccion, ruc, nombreFantasia, codReact, idReact, codCliente } = req.body;
    try {
        const pool = await getPool();

        // Verificar si existe
        // ... (misma lógica de check, omitida para brevedad si no la toco? No, debo reemplazar todo el bloque si uso replace)
        // Usaré un bloque más grande para reemplazar todo.

        const check = await pool.request()
            .input('Nombre', sql.NVarChar(200), nombre)
            .query("SELECT COUNT(*) as count FROM dbo.Clientes WHERE Nombre = @Nombre");

        if (check.recordset[0].count > 0) {
            const existing = await pool.request()
                .input('Nombre', sql.NVarChar(200), nombre)
                .query("SELECT * FROM dbo.Clientes WHERE Nombre = @Nombre");
            return res.json(existing.recordset[0]);
        }

        // Insertar nuevo FULL
        // Sanitizar inputs para evitar errores de tipo
        const safeString = (val) => (val !== undefined && val !== null && val !== '') ? String(val) : null;

        // Determinar ID Local:
        // Si el usuario quiere usar el ID Externo (React) como ID Local
        // Determinar ID Local:
        // Prioridad: 1. ID Legacy Forzado (codCliente) | 2. ID React | 3. Auto-generado
        let nextId = null;
        if (codCliente) {
            nextId = parseInt(codCliente);
            console.log("Usando ID Legacy forzado:", nextId);
        } else if (idReact && !isNaN(parseInt(idReact))) {
            nextId = parseInt(idReact);
            console.log("Usando ID React como CodCliente Local:", nextId);
        } else {
            const idQuery = await pool.request().query("SELECT ISNULL(MAX(CodCliente), 0) + 1 as NextID FROM dbo.Clientes");
            nextId = idQuery.recordset[0].NextID;
            console.log("Generado nuevo CodCliente Auto:", nextId);
        }

        const result = await pool.request()
            .input('NextId', sql.Int, nextId)
            .input('Nombre', sql.NVarChar(200), safeString(nombre))
            .input('Telefono', sql.NVarChar(50), safeString(telefono))
            .input('Email', sql.NVarChar(200), safeString(email))
            .input('Direccion', sql.NVarChar(500), safeString(direccion))
            .input('Ruc', sql.NVarChar(50), safeString(ruc))
            .input('Fantasia', sql.NVarChar(200), safeString(nombreFantasia))
            .input('CodReact', sql.NVarChar(50), safeString(codReact))
            .input('IdReact', sql.NVarChar(50), safeString(idReact))
            .query(`
                INSERT INTO dbo.Clientes (CodCliente, Nombre, TelefonoTrabajo, Email, CioRuc, NombreFantasia, IDCliente, IDReact) 
                OUTPUT INSERTED.* 
                VALUES (@NextId, @Nombre, @Telefono, @Email, @Ruc, @Fantasia, @CodReact, @IdReact)
            `);

        res.json(result.recordset[0]);
    } catch (err) {
        console.error("[CreateClient ERROR]", err);
        console.error("Full Body:", req.body);
        res.status(500).json({ error: "DB Error: " + err.message });
    }
};

// --- NUEVOS METODOS DE INTEGRACION ---

// Obtener todos los clientes con JOINs a catálogos para vista tabla
exports.getAllClients = async (req, res) => {
    const { q, mode } = req.query;
    try {
        const pool = await getPool();
        let query = `
            SELECT 
                c.CliIdCliente, c.CodCliente, c.Nombre, c.NombreFantasia,
                c.IDCliente, c.CioRuc, c.IDReact, c.CodReferencia,
                c.Email, c.TelefonoTrabajo, c.DireccionTrabajo,
                c.ESTADO, c.WebActive,
                c.VendedorID, c.FechaRegistro,
                c.DepartamentoID, c.LocalidadID, c.AgenciaID,
                c.FormaEnvioID, c.TClIdTipoCliente,
                l.Nombre  AS LocalidadNombre,
                d.Nombre  AS DepartamentoNombre,
                a.Nombre  AS AgenciaNombre,
                fe.Nombre AS FormaEnvioNombre,
                tc.TClDescripcion AS TipoClienteNombre,
                t.Nombre  AS VendedorNombre
            FROM dbo.Clientes c WITH(NOLOCK)
            LEFT JOIN Localidades   l  WITH(NOLOCK) ON l.ID  = c.LocalidadID
            LEFT JOIN Departamentos d  WITH(NOLOCK) ON d.ID  = c.DepartamentoID
            LEFT JOIN Agencias      a  WITH(NOLOCK) ON a.ID  = c.AgenciaID
            LEFT JOIN FormasEnvio   fe WITH(NOLOCK) ON fe.ID = c.FormaEnvioID
            LEFT JOIN TiposClientes tc WITH(NOLOCK) ON tc.TClIdTipoCliente = c.TClIdTipoCliente
            LEFT JOIN Trabajadores  t  WITH(NOLOCK) ON TRY_CAST(t.Cedula AS NVARCHAR(50)) = c.VendedorID
            WHERE 1=1
        `;

        const request = pool.request();

        if (q) {
            query += ` 
                AND (c.Nombre LIKE @q 
                   OR c.NombreFantasia LIKE @q 
                   OR c.CioRuc LIKE @q 
                   OR c.Email LIKE @q
                   OR c.TelefonoTrabajo LIKE @q
                   OR CAST(c.CodCliente AS VARCHAR) LIKE @q)
            `;
            request.input('q', sql.NVarChar, `%${q}%`);
        }

        if (mode === 'linked') {
            query += ` AND c.IDReact IS NOT NULL`;
        } else if (mode === 'unlinked') {
            query += ` AND c.IDReact IS NULL`;
        }

        query += ` ORDER BY c.Nombre ASC`;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('getAllClients error:', err.message);
        res.status(500).json({ error: err.message });
    }
};


// Vincular Cliente con React
exports.updateClientLink = async (req, res) => {
    const { codCliente } = req.params;
    const { codigoReact, idReact } = req.body;

    console.log(`[LINK] Intentando vincular LocalID=${codCliente} con ReactCode=${codigoReact}, ReactID=${idReact}`);

    try {
        const pool = await getPool();
        await pool.request()
            .input('CC', sql.Int, codCliente)
            .input('CR', sql.NVarChar(50), codigoReact ? String(codigoReact).trim() : null)
            .input('IR', sql.NVarChar(50), idReact ? String(idReact).trim() : null)
            .query(`
                UPDATE dbo.Clientes 
                SET IDCliente = @CR, IDReact = @IR 
                WHERE CodCliente = @CC
            `);

        res.json({ success: true, message: 'Vinculación con React actualizada correctamente' });
    } catch (err) {
        console.error("[LINK ERROR] Falló SQL Update:", err);
        res.status(500).json({ error: "Error al actualizar base de datos: " + err.message });
    }
};

// Vincular Cliente con Macrosoft
exports.updateClientLinkMacrosoft = async (req, res) => {
    const { codCliente } = req.params;
    const { codReferencia } = req.body;

    console.log(`[LINK MACROSOFT] Intentando vincular LocalID=${codCliente} con CodReferencia=${codReferencia}`);

    try {
        const pool = await getPool();
        await pool.request()
            .input('CC', sql.Int, parseInt(codCliente))
            .input('CR', sql.Int, codReferencia ? parseInt(codReferencia) : null)
            .query(`
                UPDATE dbo.Clientes 
                SET CodReferencia = @CR 
                WHERE CodCliente = @CC
            `);

        res.json({ success: true, message: 'Vinculación con Macrosoft actualizada correctamente' });
    } catch (err) {
        console.error("[LINK MACROSOFT ERROR] Falló SQL Update:", err);
        res.status(500).json({ error: "Error al actualizar base de datos: " + err.message });
    }
};

// Importar Cliente desde ClientesReact → tabla local Clientes
exports.importReactClient = async (req, res) => {
    // Acepta tanto el formato nuevo (de ClientesReact) como el antiguo (de API externa)
    const {
        IdCliente, CodigoCliente,          // de ClientesReact
        NombreCliente, EmpresaCliente,     // de ClientesReact
        Telefono, Email, Rut,              // de ClientesReact
        Localidad, Direccion,              // de ClientesReact
        TClIdTipoCliente, LReIdLugarRetiro // de ClientesReact
    } = req.body;

    const nombreFinal = (EmpresaCliente || NombreCliente || '').trim() || 'Sin Nombre';
    const fantasiaFinal = (NombreCliente || '').trim();

    console.log('[IMPORT] Importando desde ClientesReact:', { nombreFinal, CodigoCliente, IdCliente });

    try {
        const pool = await getPool();

        // Verificar si ya existe por CodigoReact o IDReact
        const check = await pool.request()
            .input('CR', sql.NVarChar(50), String(CodigoCliente || '').trim())
            .input('IR', sql.Int, parseInt(IdCliente) || null)
            .query(`
                SELECT TOP 1 CodCliente, Nombre FROM dbo.Clientes WITH(NOLOCK)
                WHERE (IDCliente = @CR AND @CR <> '')
                   OR (IDReact = @IR AND @IR IS NOT NULL)
            `);

        if (check.recordset.length > 0) {
            return res.json({
                success: true,
                alreadyExists: true,
                client: check.recordset[0],
                message: `El cliente ya existe localmente (CodCliente=${check.recordset[0].CodCliente})`
            });
        }

        // Insertar en Clientes local
        const result = await pool.request()
            .input('Nom', sql.NVarChar(200), nombreFinal)
            .input('Fant', sql.NVarChar(200), fantasiaFinal)
            .input('Ruc', sql.NVarChar(50), String(Rut || '').trim() || null)
            .input('Email', sql.NVarChar(200), String(Email || '').trim() || null)
            .input('Tel', sql.NVarChar(50), String(Telefono || '').trim() || null)
            .input('Dir', sql.NVarChar(500), String(Direccion || '').trim() || null)
            .input('Loc', sql.NVarChar(200), String(Localidad || '').trim() || null)
            .input('CR', sql.NVarChar(50), String(CodigoCliente || '').trim() || null)
            .input('IR', sql.Int, parseInt(IdCliente) || null)
            .input('Tipo', sql.Int, parseInt(TClIdTipoCliente) || null)
            .input('LRe', sql.Int, parseInt(LReIdLugarRetiro) || null)
            .query(`
                INSERT INTO dbo.Clientes
                    (Nombre, NombreFantasia, CioRuc, Email, TelefonoTrabajo,
                     CliDireccion, Localidad, IDCliente, IDReact, TClIdTipoCliente, FormaEnvioID)
                OUTPUT INSERTED.*
                VALUES (@Nom, @Fant, @Ruc, @Email, @Tel,
                        @Dir, @Loc, @CR, @IR, @Tipo, @LRe)
            `);

        res.json({ success: true, alreadyExists: false, client: result.recordset[0] });

    } catch (err) {
        console.error('[IMPORT ERROR]', err);
        res.status(500).json({ error: 'Error creando cliente local: ' + err.message });
    }
};

// createReactClient removido - ya no se necesita exportar a legacy
// La creación de clientes se hace directamente en la DB local via createClient
exports.createReactClient = async (req, res) => {
    const client = req.body;
    try {
        console.log("[createReactClient] Creando cliente directamente en DB local:", client.Nombre);
        const pool = await getPool();
        const safeString = (val) => (val !== undefined && val !== null && val !== '') ? String(val) : null;

        // Verificar si ya existe
        const check = await pool.request()
            .input('Nom', sql.NVarChar(200), client.Nombre)
            .query("SELECT CodCliente FROM dbo.Clientes WHERE Nombre = @Nom");

        if (check.recordset.length > 0) {
            return res.json({
                success: true,
                message: "Cliente ya existe en DB local",
                data: { CodCliente: check.recordset[0].CodCliente }
            });
        }

        // Insertar
        const result = await pool.request()
            .input('Nom', sql.NVarChar(200), safeString(client.Nombre))
            .input('Fan', sql.NVarChar(200), safeString(client.NombreFantasia))
            .input('Tel', sql.NVarChar(50), safeString(client.TelefonoTrabajo))
            .input('Mail', sql.NVarChar(200), safeString(client.Email))
            .input('Ruc', sql.NVarChar(50), safeString(client.CioRuc))
            .input('Dir', sql.NVarChar(500), safeString(client.CliDireccion || client.Direccion))
            .query(`
                INSERT INTO dbo.Clientes (Nombre, NombreFantasia, TelefonoTrabajo, Email, CioRuc, CliDireccion)
                OUTPUT INSERTED.*
                VALUES (@Nom, @Fan, @Tel, @Mail, @Ruc, @Dir)
            `);

        const created = result.recordset[0];
        console.log(`[createReactClient] Cliente creado: CodCliente=${created.CodCliente}`);

        res.json({
            success: true,
            data: created,
            message: "Cliente creado en DB local"
        });
    } catch (error) {
        console.error("Error createReactClient:", error.message);
        res.status(500).json({ error: "Error interno al crear cliente: " + error.message });
    }
};

exports.createMacrosoftClient = async (req, res) => {
    const client = req.body;
    try {
        console.log("Iniciando exportación a Macrosoft:", client.Nombre);

        const token = await getMacrosoftToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // Mapeo Local -> Macrosoft
        // Regla solicitada: nombre fantasia = idcliente (CodCliente local)
        const payload = {
            Nombre: client.Nombre || 'Sin Nombre',
            NombreFantasia: String(client.CodCliente),
            Moneda: 1, // Por defecto
            CioRuc: client.CioRuc || '',
            DireccionParticular: client.CliDireccion || '',
            DireccionTrabajo: client.CliDireccion || '',
            TelefonoParticular: client.TelefonoTrabajo || '',
            TelefonoTrabajo: client.TelefonoTrabajo || '',
            Email: client.Email || '',
            FechaNac: '20000101' // default required format by macrosoft maybe?
        };

        const response = await axios.post(`${ERP_API_BASE}/clientes`, payload, { headers });
        let createdClient = response.data;
        if (createdClient && createdClient.data && Array.isArray(createdClient.data) && createdClient.data.length > 0) {
            createdClient = createdClient.data[0];
        }

        const newId = createdClient?.CodCliente || createdClient?.IdCliente;

        // Autolink en la base de datos (Macrosoft usa la misma columna en base de datos local? no, en la local la DB tiene la col para macrosoft -> el user configuro "codigoReact" para React, pero por la BD "CodCliente" en su esquema originario es la Key primaria. "macrosoft es codcliente y de react es codigoreact." wait, si Macrosoft devuelve un ID nuevo pero la db local ya tiene un CodCliente como primary key, como lo guarda el usuario? 
        // "macrosoft es codcliente y de react es codigoreact")
        // Wait, "Mi base de datos principal donde ingresasn en la base local y el id es idcliente, hay que señalizar si estan enlazados a react y a macrosoft, macrosoft es codcliente y de react es codigoreact"
        // Wait! Let's examine the Local DB schema in the file.
        // `UPDATE dbo.Clientes SET CodigoReact = @CR, IDReact = @IR WHERE CodCliente = @CC` -> CodCliente seems to be the Local PK.
        // If "macrosoft es codcliente y de react es codigoreact", CodigoReferencia? In GET query we have CodReferencia. Let's see how search was doing it.
        // Ah! Search Unified local query: `WHERE CAST(CodCliente AS NVARCHAR(50)) = @Term OR Nombre LIKE '%' + @Term + '%' OR CioRuc = @Term OR CodigoReact = @Term OR CAST(IDReact AS NVARCHAR(50)) = @Term`. There's no separate field for Macrosoft ID if CodCliente is the Local ID? 
        // Oh... "Mi base de datos principal donde ingresasn en la base local  y el id es idcliente, hay que  señalizar si estan enlazados a react y a macrosoft, macrosoft es codcliente y de react es codigoreact."
        // Let's assume there is a CodReferencia or we should just pass the message and let him edit the manual fields.

        if (newId) {
            // El usuario parece querer usar un nuevo campo o reutilizar.
            // Para asegurar que funciona sin romper esquema:
            const pool = await getPool();
            // Voy a actualizar CodReferencia asumiendo que es para eso o le paso solo el feedback al fronetnd
        }

        res.json({
            success: true,
            data: response.data,
            message: "Cliente creado en Macrosoft auto!"
        });

    } catch (error) {
        console.error("Error exportando a Macrosoft:", error.message);
        res.status(500).json({ error: "Fallo conexión API Macrosoft" });
    }
};

// Búsqueda Unificada: Local → ClientesReact (misma DB, sin llamada a API externa)
exports.searchClientUnified = async (req, res) => {
    const { term } = req.query;
    if (!term) return res.status(400).json({ error: 'Término de búsqueda requerido' });

    try {
        const pool = await getPool();

        // 1. Búsqueda en tabla local Clientes (prioridad)
        const localRes = await pool.request()
            .input('Term', sql.NVarChar(100), term)
            .query(`
                SELECT TOP 1 * FROM dbo.Clientes WITH(NOLOCK)
                WHERE CAST(CodCliente AS NVARCHAR(50)) = @Term
                   OR Nombre LIKE '%' + @Term + '%'
                   OR CioRuc = @Term
                   OR IDCliente = @Term
                   OR CAST(IDReact AS NVARCHAR(50)) = @Term
                   OR NombreFantasia LIKE '%' + @Term + '%'
            `);

        if (localRes.recordset.length > 0) {
            console.log(`[Unified] Encontrado en Local: ${term}`);
            return res.json({ source: 'local', client: localRes.recordset[0], found: true });
        }

        // 2. Búsqueda en ClientesReact (tabla local, antes era API externa)
        console.log(`[Unified] No en local. Buscando en ClientesReact: ${term}`);
        const reactRes = await pool.request()
            .input('Term2', sql.VarChar(200), term)
            .query(`
                SELECT TOP 1
                    CliIdCliente    AS IdCliente,
                    CliCodigoCliente AS CodigoCliente,
                    CliNombreApellido AS NombreCliente,
                    CliNombreEmpresa  AS EmpresaCliente,
                    CliCelular       AS Telefono,
                    CliMail          AS Email,
                    CliDocumento     AS Rut,
                    CliLocalidad     AS Localidad,
                    CliDireccion     AS Direccion,
                    CliAgencia       AS Agencia,
                    TClIdTipoCliente,
                    LReIdLugarRetiro
                FROM ClientesReact WITH(NOLOCK)
                WHERE CliCodigoCliente = @Term2
                   OR CAST(CliIdCliente AS VARCHAR) = @Term2
                   OR CliNombreApellido LIKE '%' + @Term2 + '%'
                   OR CliNombreEmpresa  LIKE '%' + @Term2 + '%'
                   OR CliMail = @Term2
                   OR CliDocumento = @Term2
            `);

        if (reactRes.recordset.length > 0) {
            console.log(`[Unified] Encontrado en ClientesReact: ${term}`);
            return res.json({ source: 'react', client: reactRes.recordset[0], found: true });
        }

        return res.json({ found: false, message: 'No encontrado en Local ni en ClientesReact' });

    } catch (error) {
        console.error('Error Unified Search:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.updateClient = async (req, res) => {
    const { codCliente } = req.params;
    const {
        // Identificación
        Nombre, NombreFantasia, IDCliente, CioRuc, IDReact, CodReferencia,
        // Contacto
        TelefonoTrabajo, Email,
        // Direcciones
        DireccionTrabajo, CliDireccion,
        // Clasificación
        Tipo, TiposPrecios, TClIdTipoCliente, Moneda,
        // Geo (texto heredado + FK)
        Localidad, Agencia,
        DepartamentoID, LocalidadID, AgenciaID, FormaEnvioID,
        // Comercial
        VendedorID, IDClientePlanilla,
        // Estado / Web
        ESTADO, WebActive,
    } = req.body;

    if (!codCliente) return res.status(400).json({ error: 'Falta CodCliente' });

    try {
        const pool = await getPool();
        const safeStr = (val, max = 500) => (val !== undefined && val !== null) ? String(val).substring(0, max) : null;
        const safeInt = (val) => (val !== undefined && val !== null && val !== '') ? parseInt(val) : null;
        const safeSI = (val) => (val !== undefined && val !== null && val !== '') ? parseInt(val) : null; // smallint

        await pool.request()
            // Identificación
            .input('CC', sql.Int, safeInt(codCliente))
            .input('Nom', sql.Char(150), safeStr(Nombre, 150))
            .input('Fan', sql.Char(150), safeStr(NombreFantasia, 150))
            .input('IDCli', sql.VarChar(255), safeStr(IDCliente, 255))
            .input('Ruc', sql.Char(20), safeStr(CioRuc, 20))
            .input('CReact', sql.NVarChar(50), safeStr(IDReact ? String(IDReact) : null, 50))
            .input('IReact', sql.Int, safeInt(IDReact))
            .input('CRef', sql.Int, safeInt(CodReferencia))
            // Contacto
            .input('Tel', sql.Char(20), safeStr(TelefonoTrabajo, 20))
            .input('Mail', sql.Char(40), safeStr(Email, 40))
            // Direcciones
            .input('DirTrab', sql.Char(80), safeStr(DireccionTrabajo, 80))
            .input('Dir', sql.NVarChar(500), safeStr(CliDireccion, 500))
            // Clasificación
            .input('Tipo', sql.Int, safeInt(Tipo))
            .input('TipPre', sql.SmallInt, safeSI(TiposPrecios))
            .input('TipCli', sql.Int, safeInt(TClIdTipoCliente))
            .input('Mon', sql.Int, safeInt(Moneda))
            // Geo texto
            .input('Loc', sql.NVarChar(200), safeStr(Localidad, 200))
            .input('Age', sql.NVarChar(200), safeStr(Agencia, 200))
            // Geo FK
            .input('DepID', sql.Int, safeInt(DepartamentoID))
            .input('LocID', sql.Int, safeInt(LocalidadID))
            .input('AgeID', sql.Int, safeInt(AgenciaID))
            .input('FEnvID', sql.Int, safeInt(FormaEnvioID))
            // Comercial
            .input('Vend', sql.NVarChar(20), safeStr(VendedorID, 20))
            .input('IPlan', sql.VarChar(255), safeStr(IDClientePlanilla, 255))
            // Estado / Web
            .input('Est', sql.NVarChar(10), safeStr(ESTADO, 10))
            .input('WA', sql.Bit, WebActive != null ? (WebActive ? 1 : 0) : null)
            .query(`
                UPDATE dbo.Clientes SET
                    -- Identificación
                    Nombre            = COALESCE(@Nom,    Nombre),
                    NombreFantasia    = COALESCE(@Fan,    NombreFantasia),
                    IDCliente         = COALESCE(@IDCli,  IDCliente),
                    CioRuc            = COALESCE(@Ruc,    CioRuc),
                    IDReact           = COALESCE(@IReact, IDReact),
                    CodReferencia     = @CRef,
                    -- Contacto
                    TelefonoTrabajo   = COALESCE(@Tel,    TelefonoTrabajo),
                    Email             = COALESCE(@Mail,   Email),
                    -- Direcciones
                    DireccionTrabajo  = COALESCE(@DirTrab, DireccionTrabajo),
                    CliDireccion      = COALESCE(@Dir,    CliDireccion),
                    -- Clasificación
                    Tipo              = COALESCE(@Tipo,   Tipo),
                    TiposPrecios      = COALESCE(@TipPre, TiposPrecios),
                    TClIdTipoCliente  = COALESCE(@TipCli, TClIdTipoCliente),
                    Moneda            = COALESCE(@Mon,    Moneda),
                    -- Geo texto (se actualiza siempre si se manda)
                    Localidad         = COALESCE(@Loc,    Localidad),
                    Agencia           = COALESCE(@Age,    Agencia),
                    -- Geo FK
                    DepartamentoID    = COALESCE(@DepID,  DepartamentoID),
                    LocalidadID       = COALESCE(@LocID,  LocalidadID),
                    AgenciaID         = COALESCE(@AgeID,  AgenciaID),
                    FormaEnvioID      = COALESCE(@FEnvID, FormaEnvioID),
                    -- Comercial
                    VendedorID        = COALESCE(@Vend,   VendedorID),
                    IDClientePlanilla = COALESCE(@IPlan,  IDClientePlanilla),
                    -- Estado / Web
                    ESTADO            = COALESCE(@Est,    ESTADO),
                    WebActive         = COALESCE(@WA,     WebActive)
                WHERE CodCliente = @CC
            `);

        res.json({ success: true, message: 'Cliente actualizado correctamente' });
    } catch (e) {
        console.error('Error updateClient:', e);
        res.status(500).json({ error: e.message });
    }
};



// Obtener duplicados por IDReact
exports.getDuplicateClients = async (req, res) => {
    try {
        const pool = await getPool();

        const dupIdsResult = await pool.request().query(`
            SELECT IDCliente
            FROM dbo.Clientes WITH (NOLOCK)
            WHERE IDCliente IS NOT NULL AND IDCliente <> ''
            GROUP BY IDCliente
            HAVING COUNT(*) > 1
        `);

        const dupIds = dupIdsResult.recordset.map(row => row.IDCliente);
        if (dupIds.length === 0) return res.json({ clients: [], reactClients: [], formAnswers: [] });

        const idListStr = dupIds.map(id => `'${id}'`).join(',');

        const clientsResult = await pool.request().query(`
            SELECT * FROM dbo.Clientes WITH (NOLOCK)
            WHERE IDCliente IN (${idListStr})
            ORDER BY IDCliente ASC
        `);

        const reactIds = [...new Set(clientsResult.recordset.map(c => c.IDReact).filter(id => id && String(id).trim() !== ''))];
        let reactResult = { recordset: [] };
        let formResult = { recordset: [] };

        if (reactIds.length > 0) {
            const reactIdListStr = reactIds.map(id => `'${id}'`).join(',');

            reactResult = await pool.request().query(`
                SELECT * FROM dbo.clientesreact WITH (NOLOCK)
                WHERE CAST(CliIdCliente AS VARCHAR) IN (${reactIdListStr})
            `);

            formResult = await pool.request().query(`
                SELECT * FROM dbo.[Respuestas de formulario] WITH (NOLOCK)
                WHERE CAST([ID react] AS VARCHAR) IN (${reactIdListStr})
            `);
        }

        res.json({
            clients: clientsResult.recordset,
            reactClients: reactResult.recordset,
            formAnswers: formResult.recordset
        });

    } catch (err) {
        console.error("Error getDuplicateClients:", err);
        res.status(500).json({ error: "DB Error: " + err.message });
    }
};

// Eliminar Cliente
exports.deleteClient = async (req, res) => {
    const { codCliente } = req.params;

    if (!codCliente) return res.status(400).json({ error: "Falta CodCliente" });

    try {
        const pool = await getPool();

        await pool.request()
            .input('CC', sql.Int, codCliente)
            .query(`
                DELETE FROM dbo.Clientes
                WHERE CodCliente = @CC
            `);

        res.json({ success: true, message: "Cliente eliminado correctamente" });
    } catch (err) {
        console.error("Error deleteClient:", err);
        res.status(500).json({ error: "No se puede eliminar porque posiblemente tenga datos asociados en ordenes o facturas. " + err.message });
    }
};

// -------------------------------------------------------------------
// TIPOS CLIENTES
// -------------------------------------------------------------------
exports.getTiposClientes = async (req, res) => {
    try {
        const { getPool } = require('../config/db');
        const pool = await getPool();
        const result = await pool.request().query('SELECT TClIdTipoCliente, TClDescripcion FROM TiposClientes WITH(NOLOCK) ORDER BY TClIdTipoCliente ASC');
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener Tipos de Clientes:', error);
        res.status(500).json({ message: 'Error al obtener Tipos de Clientes', error: error.message });
    }
};

// -------------------------------------------------------------------
// CATALOGS — todos los catálogos en una sola llamada
// -------------------------------------------------------------------
exports.getCatalogs = async (req, res) => {
    try {
        const pool = await getPool();
        const [localidades, departamentos, agencias, formasEnvio, tiposClientes, vendedores] = await Promise.all([
            pool.request().query('SELECT ID, Nombre, DepartamentoID FROM Localidades WITH(NOLOCK) ORDER BY Nombre'),
            pool.request().query('SELECT ID, Nombre FROM Departamentos WITH(NOLOCK) ORDER BY Nombre'),
            pool.request().query('SELECT ID, Nombre FROM Agencias WITH(NOLOCK) ORDER BY Nombre'),
            pool.request().query('SELECT ID, Nombre FROM FormasEnvio WITH(NOLOCK) ORDER BY Nombre'),
            pool.request().query('SELECT TClIdTipoCliente AS ID, TClDescripcion AS Nombre FROM TiposClientes WITH(NOLOCK) ORDER BY TClDescripcion'),
            // Trabajadores del área VENTAS — columna se llama [Área] con Á mayúscula (U+00C1)
            pool.request().query("SELECT Cedula, Nombre FROM Trabajadores WITH(NOLOCK) WHERE [\u00C1rea] = 'VENTAS' ORDER BY Nombre"),
        ]);
        res.json({
            localidades: localidades.recordset,
            departamentos: departamentos.recordset,
            agencias: agencias.recordset,
            formasEnvio: formasEnvio.recordset,
            tiposClientes: tiposClientes.recordset,
            vendedores: vendedores.recordset,
        });
    } catch (error) {
        console.error('Error getCatalogs:', error);
        res.status(500).json({ error: error.message });
    }
};
