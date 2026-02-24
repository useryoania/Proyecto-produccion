const { sql, getPool } = require('../config/db');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../middleware/asyncHandler');
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-macrosoft-production';

// ===================================
// AUTHENTICATION LOGIC (UNIFIED IN Clientes TABLE)
// ===================================
exports.login = asyncHandler(async (req, res) => {
    // identifier es el IDCliente (Varchar)
    const { identifier, password } = req.body;

    // Check if identifier is provided
    if (!identifier) {
        return res.status(400).json({ success: false, message: 'ID Cliente requerido' });
    }

    console.log(`🔐 [LOGIN ATTEMPT] Identifier: '${identifier}' (Pattern: '${identifier.trim()}')`);

    const pool = await getPool();

    // Busqueda estricta por IDCliente (Varchar) con tolerancia a espacios
    const result = await pool.request()
        .input('Val', sql.NVarChar, identifier.trim())
        .query(`
            SELECT CodCliente, IDCliente, Nombre, WebPasswordHash, WebActive, Email, NombreFantasia, WebResetPassword 
            FROM Clientes
            WHERE LTRIM(RTRIM(IDCliente)) = @Val
        `);

    console.log(`🔐 [LOGIN RESULT] Matches found: ${result.recordset.length}`);

    if (result.recordset.length === 0) {
        console.warn(`❌ Login Failed: User not found for '${identifier}'`);
        return res.status(401).json({ success: false, message: 'Usuario incorrecto: No se encontró el cliente.' });
    }

    const client = result.recordset[0];

    let isValid = false;
    let isFirstTime = false;

    // Lógica de Contraseña
    // Si no tiene hash (NULL o vacio), es primera vez -> Auto Set
    if (!client.WebPasswordHash || client.WebPasswordHash === '') {
        if (password && password.length > 0) {
            isFirstTime = true;
            isValid = true;
        } else {
            return res.status(401).json({ success: false, message: 'Debe ingresar una contraseña.' });
        }
    }
    else if (client.WebPasswordHash === password) {
        isValid = true;
    }

    if (!isValid) {
        return res.status(401).json({ success: false, message: 'Contraseña incorrecta.' });
    }

    // Verificar si el cliente está activo (después de validar contraseña)
    if (!client.WebActive) {
        return res.status(403).json({ success: false, message: 'Tu cuenta está pendiente de aprobación. Contactá al administrador.' });
    }

    // Si es la primera vez, guardamos la contraseña
    if (isFirstTime) {
        await pool.request()
            .input('ID', sql.Int, client.CodCliente)
            .input('Pass', sql.NVarChar, password)
            .query("UPDATE Clientes SET WebPasswordHash = @Pass, WebResetPassword = 0 WHERE CodCliente = @ID");

        // Actualizamos en memoria
        client.WebResetPassword = false;
    }

    const token = jwt.sign(
        {
            id: client.CodCliente,
            email: client.Email,
            name: client.Nombre,
            role: 'WEB_CLIENT',
            codCliente: client.CodCliente,
            requireReset: client.WebResetPassword
        },
        JWT_SECRET,
        { expiresIn: '30d' }
    );

    await pool.request()
        .input('ID', sql.Int, client.CodCliente)
        .query("UPDATE Clientes SET WebLastLogin = GETDATE() WHERE CodCliente = @ID");

    res.json({
        success: true,
        user: {
            id: client.CodCliente,
            email: client.Email,
            name: client.Nombre,
            company: client.NombreFantasia,
            role: 'WEB_CLIENT',
            codCliente: client.CodCliente,
            requireReset: client.WebResetPassword
        },
        token
    });
});

exports.register = asyncHandler(async (req, res) => {
    // Registro usando IDCliente (alfanumérico) como identificador principal
    const {
        idcliente,
        name, email, password, company, phone,
        address, ruc, localidad, agencia, fantasyName, documento,
        departamentoId, localidadId, agenciaId, formaEnvioId,
        manualVendedorId
    } = req.body;

    if (!idcliente || !password) {
        return res.status(400).json({ error: "Faltan datos obligatorios (ID Cliente, Contraseña)" });
    }

    const pool = await getPool();

    // --- Vendedor assignment: manual selection takes priority, otherwise auto-assign ---
    let vendedorId = manualVendedorId || null;
    if (!vendedorId && departamentoId) {
        try {
            // 1. Get the zone for the selected department
            const zonaResult = await pool.request()
                .input('DepID', sql.Int, departamentoId)
                .query("SELECT Zona FROM dbo.Departamentos WHERE ID = @DepID");

            const zona = zonaResult.recordset[0]?.Zona;

            if (zona) {
                // 2. Find the vendedor in that zone with the fewest assigned clients (round-robin)
                const vendedorResult = await pool.request()
                    .input('Zona', sql.NVarChar, zona)
                    .query(`
                        SELECT TOP 1 t.ID
                        FROM dbo.Trabajadores t
                        LEFT JOIN dbo.Clientes c ON c.VendedorID = t.ID
                        WHERE t.Zona = @Zona AND t.[Área] = 'Ventas'
                        GROUP BY t.ID
                        ORDER BY COUNT(c.CodCliente) ASC
                    `);

                vendedorId = vendedorResult.recordset[0]?.ID || null;
            }
        } catch (err) {
            console.warn('⚠️ Error auto-assigning vendedor:', err.message);
            // Non-blocking: registration continues without vendedor
        }
    }

    // 1. Verificar si existe por IDCliente
    const check = await pool.request()
        .input('Val', sql.NVarChar, idcliente)
        .query("SELECT * FROM Clientes WHERE IDCliente = @Val");

    let codClienteInterno;
    let createdOrUpdatedClient;

    console.log('📋 [REGISTRO] Datos a guardar:', {
        idcliente, name, email, company, phone, address, ruc,
        localidad, agencia, fantasyName, documento,
        departamentoId, localidadId, agenciaId, formaEnvioId,
        vendedorId
    });

    if (check.recordset.length > 0) {
        // Cliente Exists -> Update / Claim
        const existing = check.recordset[0];
        codClienteInterno = existing.CodCliente;

        const req2 = pool.request()
            .input('ID', sql.Int, codClienteInterno)
            .input('Pass', sql.NVarChar(255), password)
            .input('Email', sql.NVarChar(200), email || existing.Email)
            .input('Tel', sql.NVarChar(50), phone || existing.TelefonoTrabajo)
            .input('Dir', sql.NVarChar(500), address || existing.CliDireccion)
            .input('Loc', sql.NVarChar(200), localidad || existing.Localidad)
            .input('Age', sql.NVarChar(200), agencia || existing.Agencia)
            .input('Ced', sql.NVarChar(50), documento || existing.Cedula)
            .input('DepID', sql.Int, departamentoId || existing.DepartamentoID || null)
            .input('LocID', sql.Int, localidadId || existing.LocalidadID || null)
            .input('AgeID', sql.Int, agenciaId || existing.AgenciaID || null)
            .input('FenvID', sql.Int, formaEnvioId || existing.FormaEnvioID || null)
            .input('VenID', sql.NVarChar(20), vendedorId || existing.VendedorID || null);

        await req2.query(`
                UPDATE Clientes 
                SET WebPasswordHash = @Pass, 
                    WebActive = 1, 
                    WebResetPassword = 0,
                    Email = @Email,
                    TelefonoTrabajo = @Tel,
                    CliDireccion = @Dir,
                    Localidad = @Loc,
                    Agencia = @Age,
                    Cedula = @Ced,
                    DepartamentoID = @DepID,
                    LocalidadID = @LocID,
                    AgenciaID = @AgeID,
                    FormaEnvioID = @FenvID,
                    VendedorID = @VenID
                WHERE CodCliente = @ID
            `);

        createdOrUpdatedClient = { ...existing, Nombre: existing.Nombre };
    } else {
        // Cliente NO existe -> Crear Nuevo

        // Generar CodCliente si no es Identity (asumimos lógica anterior de MAX+1)
        const idQuery = await pool.request().query("SELECT ISNULL(MAX(CodCliente), 0) + 1 as NextID FROM Clientes");
        codClienteInterno = idQuery.recordset[0].NextID;

        await pool.request()
            .input('CC', sql.Int, codClienteInterno)
            .input('IDC', sql.NVarChar(50), idcliente) // Guardamos el ID alfanumérico
            .input('Nom', sql.NVarChar(200), company || name || 'Nuevo Cliente')
            .input('Fant', sql.NVarChar(200), fantasyName || name || '')
            .input('Email', sql.NVarChar(200), email)
            .input('Tel', sql.NVarChar(50), phone || '')
            .input('Dir', sql.NVarChar(500), address || '')
            .input('Ruc', sql.NVarChar(50), ruc || '')
            .input('Loc', sql.NVarChar(200), localidad || '')
            .input('Age', sql.NVarChar(200), agencia || '')
            .input('Pass', sql.NVarChar(255), password)
            .input('Ced', sql.NVarChar(50), documento || '')
            .input('DepID', sql.Int, departamentoId || null)
            .input('LocID', sql.Int, localidadId || null)
            .input('AgeID', sql.Int, agenciaId || null)
            .input('FenvID', sql.Int, formaEnvioId || null)
            .input('VenID', sql.NVarChar(20), vendedorId)
            .query(`
                INSERT INTO Clientes (
                    CodCliente, IDCliente, Nombre, NombreFantasia, Email, TelefonoTrabajo, CliDireccion, CioRuc, 
                    Localidad, Agencia, WebPasswordHash, WebActive, WebResetPassword, Cedula,
                    DepartamentoID, LocalidadID, AgenciaID, FormaEnvioID, VendedorID, FechaRegistro
                )
                VALUES (
                    @CC, @IDC, @Nom, @Fant, @Email, @Tel, @Dir, @Ruc, 
                    @Loc, @Age, @Pass, 0, 0, @Ced,
                    @DepID, @LocID, @AgeID, @FenvID, @VenID, GETDATE()
                )
            `);

        createdOrUpdatedClient = { Nombre: company || name, Email: email };
    }

    const emailService = require('../services/emailService');
    if (email) {
        emailService.sendRegistrationMail(email, company || name).catch(console.error);
    }

    // NO auto-login: cuenta pendiente de aprobación
    res.json({
        success: true,
        pendingApproval: true,
        message: 'Registro exitoso. Tu cuenta está pendiente de aprobación por un administrador.'
    });
});

exports.me = asyncHandler(async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "No autorizado" });

    const pool = await getPool();
    const r = await pool.request()
        .input('ID', sql.Int, req.user.codCliente)
        .query(`
            SELECT c.*, t.Nombre AS VendedorNombre
            FROM Clientes c
            LEFT JOIN dbo.Trabajadores t ON c.VendedorID = t.ID
            WHERE c.CodCliente = @ID
        `);

    if (r.recordset.length > 0) {
        const u = r.recordset[0];
        res.json({
            success: true,
            user: {
                id: u.CodCliente,
                idCliente: u.IDCliente,
                email: u.Email,
                name: u.Nombre,
                company: u.NombreFantasia,
                phone: u.TelefonoTrabajo,
                address: u.CliDireccion,
                ruc: u.CioRuc,
                documento: u.Cedula,
                localidad: u.Localidad,
                agencia: u.Agencia,
                departamentoId: u.DepartamentoID,
                localidadId: u.LocalidadID,
                agenciaId: u.AgenciaID,
                formaEnvioId: u.FormaEnvioID,
                vendedorNombre: u.VendedorNombre || null,
                role: 'WEB_CLIENT',
                codCliente: u.CodCliente,
                requireReset: u.WebResetPassword || (u.WebPasswordHash == null) || (u.WebPasswordHash === '')
            }
        });
    } else {
        res.status(404).json({ error: "Cliente no encontrado" });
    }
});

// ===================================
// UPDATE PASSWORD (FORCE RESET)
// ===================================
exports.updatePassword = asyncHandler(async (req, res) => {
    // User must be authenticated (even with the temp/reset token)
    const userId = req.user.codCliente; // Using CodCliente as ID
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ error: "La contraseña es muy corta" });
    }

    const pool = await getPool();
    await pool.request()
        .input('ID', sql.Int, userId)
        .input('Pass', sql.NVarChar, newPassword)
        .query("UPDATE Clientes SET WebPasswordHash = @Pass, WebResetPassword = 0 WHERE CodCliente = @ID");

    res.json({ success: true, message: "Contraseña actualizada correctamente" });
});

// ===================================
// UPDATE PROFILE (CLIENT SELF-EDIT)
// ===================================
exports.updateProfile = asyncHandler(async (req, res) => {
    const userId = req.user.codCliente;
    const {
        name, company, phone, address, ruc, documento,
        localidad, agencia, departamentoId, localidadId, agenciaId, formaEnvioId
    } = req.body;

    const pool = await getPool();
    await pool.request()
        .input('ID', sql.Int, userId)
        .input('Nombre', sql.NVarChar, name || null)
        .input('NombreFantasia', sql.NVarChar, company || null)
        .input('Telefono', sql.NVarChar, phone || null)
        .input('Direccion', sql.NVarChar, address || null)
        .input('Ruc', sql.NVarChar, ruc || null)
        .input('Ced', sql.NVarChar, documento || null)
        .input('Loc', sql.NVarChar, localidad || null)
        .input('Age', sql.NVarChar, agencia || null)
        .input('DepID', sql.Int, departamentoId || null)
        .input('LocID', sql.Int, localidadId || null)
        .input('AgeID', sql.Int, agenciaId || null)
        .input('FenvID', sql.Int, formaEnvioId || null)
        .query(`
            UPDATE Clientes 
            SET Nombre = ISNULL(@Nombre, Nombre),
                NombreFantasia = ISNULL(@NombreFantasia, NombreFantasia),
                TelefonoTrabajo = ISNULL(@Telefono, TelefonoTrabajo),
                CliDireccion = ISNULL(@Direccion, CliDireccion),
                CioRuc = ISNULL(@Ruc, CioRuc),
                Cedula = ISNULL(@Ced, Cedula),
                Localidad = ISNULL(@Loc, Localidad),
                Agencia = ISNULL(@Age, Agencia),
                DepartamentoID = ISNULL(@DepID, DepartamentoID),
                LocalidadID = ISNULL(@LocID, LocalidadID),
                AgenciaID = ISNULL(@AgeID, AgenciaID),
                FormaEnvioID = ISNULL(@FenvID, FormaEnvioID)
            WHERE CodCliente = @ID
        `);

    // Return updated user data
    const r = await pool.request()
        .input('ID2', sql.Int, userId)
        .query("SELECT * FROM Clientes WHERE CodCliente = @ID2");

    if (r.recordset.length > 0) {
        const u = r.recordset[0];
        res.json({
            success: true,
            user: {
                id: u.CodCliente,
                idCliente: u.IDCliente,
                email: u.Email,
                name: u.Nombre,
                company: u.NombreFantasia,
                phone: u.TelefonoTrabajo,
                address: u.CliDireccion,
                ruc: u.CioRuc,
                documento: u.Cedula,
                localidad: u.Localidad,
                agencia: u.Agencia,
                departamentoId: u.DepartamentoID,
                localidadId: u.LocalidadID,
                agenciaId: u.AgenciaID,
                formaEnvioId: u.FormaEnvioID,
                role: 'WEB_CLIENT',
                codCliente: u.CodCliente
            }
        });
    } else {
        res.status(404).json({ error: "Cliente no encontrado" });
    }
});
