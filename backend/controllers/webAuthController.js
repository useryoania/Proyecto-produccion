const { sql, getPool } = require('../config/db');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../middleware/asyncHandler');
const logger = require('../utils/logger');
const googleSheets = require('../services/googleSheetsService');
const { trackLogin } = require('../utils/sessionTracker');
const { audit } = require('../utils/auditLogger');
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined in environment variables');

// ===================================
// LOGIN
// ===================================
exports.login = asyncHandler(async (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier) {
        return res.status(400).json({ success: false, message: 'ID Cliente requerido' });
    }

    logger.info(`🔐 [LOGIN ATTEMPT] Identifier: '${identifier}'`);

    const pool = await getPool();

    const result = await pool.request()
        .input('Val', sql.NVarChar, identifier.trim())
        .query(`
            SELECT CodCliente, IDCliente, Nombre, WebPasswordHash, WebActive, Email, NombreFantasia, WebResetPassword 
            FROM Clientes
            WHERE LTRIM(RTRIM(IDCliente)) = @Val
        `);

    logger.info(`🔐 [LOGIN RESULT] Matches found: ${result.recordset.length}`);

    if (result.recordset.length === 0) {
        trackLogin(null, identifier, req.ip, 'WEB_CLIENT', false, 'Usuario no encontrado');
        audit('LOGIN', { user: identifier, ip: req.ip, type: 'WEB_CLIENT', result: 'FAIL', reason: 'Usuario no encontrado' });
        return res.status(401).json({ success: false, message: 'Usuario incorrecto: No se encontró el cliente.' });
    }

    const client = result.recordset[0];

    let isValid = false;
    let isFirstTime = false;

    if (!client.WebPasswordHash || client.WebPasswordHash === '') {
        if (password && password.length > 0) {
            isFirstTime = true;
            isValid = true;
        } else {
            return res.status(401).json({ success: false, message: 'Debe ingresar una contraseña.' });
        }
    } else if (client.WebPasswordHash === password) {
        isValid = true;
    }

    if (!isValid) {
        return res.status(401).json({ success: false, message: 'Contraseña incorrecta.' });
    }

    if (!client.WebActive) {
        return res.status(403).json({ success: false, message: 'Tu cuenta está pendiente de aprobación. Contactá al administrador.' });
    }

    if (isFirstTime) {
        await pool.request()
            .input('ID', sql.Int, client.CodCliente)
            .input('Pass', sql.NVarChar, password)
            .query("UPDATE Clientes SET WebPasswordHash = @Pass, WebResetPassword = 0 WHERE CodCliente = @ID");
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

    trackLogin(client.CodCliente, client.IDCliente || identifier, req.ip, 'WEB_CLIENT', true);
    audit('LOGIN', { user: client.IDCliente || identifier, userId: client.CodCliente, ip: req.ip, type: 'WEB_CLIENT', result: 'OK' });

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

// ===================================
// REGISTER
// ===================================
exports.register = asyncHandler(async (req, res) => {
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

    // --- Fetch department name (always, independent of vendedor path) ---
    let deptoNombre = '';
    if (departamentoId) {
        try {
            const deptoResult = await pool.request()
                .input('DepID', sql.Int, departamentoId)
                .query("SELECT Nombre FROM dbo.Departamentos WHERE ID = @DepID");
            deptoNombre = deptoResult.recordset[0]?.Nombre || '';
        } catch (err) {
            logger.warn('⚠️ Error fetching department name:', err.message);
        }
    }

    // --- Vendedor assignment: manual selection takes priority, otherwise auto-assign ---
    let vendedorId = manualVendedorId || null;
    if (!vendedorId && departamentoId) {
        try {
            const zonaResult = await pool.request()
                .input('DepID', sql.Int, departamentoId)
                .query("SELECT Zona FROM dbo.Departamentos WHERE ID = @DepID");

            const zona = zonaResult.recordset[0]?.Zona;

            if (zona) {
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
            logger.warn('⚠️ Error auto-assigning vendedor:', err.message);
        }
    }

    // 1. Verificar si IDCliente ya existe
    const checkId = await pool.request()
        .input('Val', sql.NVarChar, idcliente)
        .query("SELECT CodCliente FROM Clientes WHERE IDCliente = @Val");

    if (checkId.recordset.length > 0) {
        return res.status(409).json({ success: false, message: 'Este ID de cliente ya está en uso. Elegí otro.' });
    }

    // 2. Verificar si el email ya existe
    if (email) {
        const checkEmail = await pool.request()
            .input('Email', sql.NVarChar, email.trim().toLowerCase())
            .query("SELECT CodCliente FROM Clientes WHERE LOWER(LTRIM(RTRIM(Email))) = @Email AND Email IS NOT NULL AND Email != ''");

        if (checkEmail.recordset.length > 0) {
            return res.status(409).json({ success: false, message: 'Este correo electrónico ya está registrado.' });
        }
    }

    // 3. Crear cliente nuevo
    const idQuery = await pool.request().query("SELECT ISNULL(MAX(CodCliente), 0) + 1 as NextID FROM Clientes");
    let codClienteInterno = idQuery.recordset[0].NextID;

    const insertRes = await pool.request()
        .input('CC', sql.Int, codClienteInterno)
        .input('IDC', sql.NVarChar(50), idcliente)
        .input('Nom', sql.NVarChar(200), company || name || 'Nuevo Cliente')
        .input('Fant', sql.NVarChar(200), fantasyName || name || '')
        .input('Email', sql.NVarChar(200), email)
        .input('Tel', sql.NVarChar(50), phone || '')
        .input('Dir', sql.NVarChar(500), address || '')
        .input('Ruc', sql.NVarChar(50), ruc || '')
        .input('Pass', sql.NVarChar(255), password)
        .input('DepID', sql.Int, departamentoId || null)
        .input('LocID', sql.Int, localidadId || null)
        .input('AgeID', sql.Int, agenciaId || null)
        .input('FenvID', sql.Int, formaEnvioId || null)
        .input('VenID', sql.NVarChar(20), vendedorId)
        .query(`
            INSERT INTO Clientes (
                CodCliente, IDCliente, Nombre, NombreFantasia, Email, TelefonoTrabajo, DireccionTrabajo, CioRuc, 
                WebPasswordHash, WebActive, WebResetPassword,
                DepartamentoID, LocalidadID, AgenciaID, FormaEnvioID, VendedorID, FechaRegistro
            )
            OUTPUT INSERTED.CliIdCliente
            VALUES (
                @CC, @IDC, @Nom, @Fant, @Email, @Tel, @Dir, @Ruc, 
                @Pass, 0, 0,
                @DepID, @LocID, @AgeID, @FenvID, @VenID, GETDATE()
            )
        `);

    const cliIdClienteGenerado = insertRes.recordset[0].CliIdCliente;

    await pool.request()
        .input('CID', sql.Int, cliIdClienteGenerado)
        .query('UPDATE Clientes SET IDReact = @CID WHERE CliIdCliente = @CID');

    const emailService = require('../services/emailService');
    if (email) {
        emailService.sendRegistrationMail(email, company || name, codClienteInterno).catch(console.error);
    }

    res.json({
        success: true,
        pendingApproval: true,
        message: 'Registro exitoso. Revisá tu correo electrónico para activar tu cuenta.'
    });

    // Fire-and-forget: sincronizar con Google Sheets
    googleSheets.insertarClienteEnGoogle({
        idCliente: idcliente,
        nombre: name || '',
        telefono: phone || '',
        email: email || '',
        empresa: company || '',
        doc: ruc || '',
        direccion: address || '',
        depto: deptoNombre || '',
        localidad: localidad || '',
        tipoRetiro: formaEnvioId === 1 || formaEnvioId === '1' ? 'Retiro en el local' : 'Encomienda: ' + agencia,
        idReact: String(cliIdClienteGenerado),
    }).catch(e => logger.warn('[GoogleSheets] insertarCliente falló:', e.message));
});

// ===================================
// ME (GET CURRENT USER)
// ===================================
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
                address: u.DireccionTrabajo,
                ruc: u.CioRuc,
                departamentoId: u.DepartamentoID,
                localidadId: u.LocalidadID,
                agenciaId: u.AgenciaID,
                formaEnvioId: u.FormaEnvioID,
                tipoClienteId: u.TClIdTipoCliente || null,
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
    const userId = req.user.codCliente;
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
        .input('DepID', sql.Int, departamentoId || null)
        .input('LocID', sql.Int, localidadId || null)
        .input('AgeID', sql.Int, agenciaId || null)
        .input('FenvID', sql.Int, formaEnvioId || null)
        .query(`
            UPDATE Clientes 
            SET Nombre = ISNULL(@Nombre, Nombre),
                NombreFantasia = ISNULL(@NombreFantasia, NombreFantasia),
                TelefonoTrabajo = ISNULL(@Telefono, TelefonoTrabajo),
                DireccionTrabajo = ISNULL(@Direccion, DireccionTrabajo),
                CioRuc = ISNULL(@Ruc, CioRuc),
                DepartamentoID = ISNULL(@DepID, DepartamentoID),
                LocalidadID = ISNULL(@LocID, LocalidadID),
                AgenciaID = ISNULL(@AgeID, AgenciaID),
                FormaEnvioID = ISNULL(@FenvID, FormaEnvioID)
            WHERE CodCliente = @ID
        `);

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
                address: u.DireccionTrabajo,
                ruc: u.CioRuc,
                departamentoId: u.DepartamentoID,
                localidadId: u.LocalidadID,
                agenciaId: u.AgenciaID,
                formaEnvioId: u.FormaEnvioID,
                role: 'WEB_CLIENT',
                codCliente: u.CodCliente
            }
        });

        if (u.IDReact) {
            // Fetch department name for Sheets sync
            let deptoNombreUpdate = '';
            if (u.DepartamentoID) {
                try {
                    const deptoRes = await pool.request()
                        .input('DepID', sql.Int, u.DepartamentoID)
                        .query("SELECT Nombre FROM dbo.Departamentos WHERE ID = @DepID");
                    deptoNombreUpdate = deptoRes.recordset[0]?.Nombre || '';
                } catch (_) {}
            }

            googleSheets.actualizarClienteEnGoogle(u.IDReact, {
                nombre: name || '',
                telefono: phone || '',
                empresa: company || '',
                direccion: address || '',
                doc: ruc || '',
                depto: deptoNombreUpdate,
                localidad: localidad || '',
                tipoRetiro: u.FormaEnvioID === 1 ? 'Retiro en el local' : `Encomienda: ${agencia || ''}`,
            }).catch(e => logger.warn('[GoogleSheets] actualizarCliente falló:', e.message));
        }
    } else {
        res.status(404).json({ error: "Cliente no encontrado" });
    }
});

// ===================================
// FORGOT PASSWORD (send reset link)
// ===================================
exports.forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    logger.info(`🔑 [FORGOT-PASSWORD] Solicitud recibida para email: '${email}'`);

    if (!email || !email.trim()) {
        return res.status(400).json({ success: false, message: 'El email es requerido.' });
    }

    const pool = await getPool();
    const result = await pool.request()
        .input('Email', sql.NVarChar, email.trim().toLowerCase())
        .query(`
            SELECT CodCliente, Nombre, Email
            FROM Clientes
            WHERE LOWER(LTRIM(RTRIM(Email))) = @Email
              AND WebActive = 1
        `);

    logger.info(`🔑 [FORGOT-PASSWORD] Clientes encontrados con ese email: ${result.recordset.length}`);

    if (result.recordset.length === 0) {
        logger.warn(`🔑 [FORGOT-PASSWORD] Email '${email}' no encontrado o cuenta inactiva. No se envía correo.`);
        return res.json({ success: true });
    }

    const client = result.recordset[0];
    logger.info(`🔑 [FORGOT-PASSWORD] Enviando link de reset a CodCliente=${client.CodCliente} (${client.Email})`);

    const resetToken = jwt.sign(
        { codCliente: client.CodCliente, purpose: 'password-reset' },
        JWT_SECRET,
        { expiresIn: '15m' }
    );

    const emailService = require('../services/emailService');
    emailService.sendPasswordResetLinkMail(client.Email, client.Nombre, resetToken)
        .then(ok => logger.info(`🔑 [FORGOT-PASSWORD] sendMail resultado: ${ok}`))
        .catch(err => logger.error(`🔑 [FORGOT-PASSWORD] sendMail excepción: ${err.message}`));

    return res.json({ success: true });
});

// ===================================
// RESET PASSWORD (consume reset token)
// ===================================
exports.resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token) {
        return res.status(400).json({ success: false, expired: true, message: 'Token requerido.' });
    }
    if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 4 caracteres.' });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
        const expired = err.name === 'TokenExpiredError';
        return res.status(400).json({ success: false, expired, message: expired ? 'El enlace expiró.' : 'Token inválido.' });
    }

    if (decoded.purpose !== 'password-reset') {
        return res.status(400).json({ success: false, message: 'Token inválido.' });
    }

    const pool = await getPool();
    await pool.request()
        .input('ID', sql.Int, decoded.codCliente)
        .input('Pass', sql.NVarChar, newPassword)
        .query("UPDATE Clientes SET WebPasswordHash = @Pass, WebResetPassword = 0 WHERE CodCliente = @ID");

    return res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
});

// ===================================
// ACTIVATE ACCOUNT (EMAIL VERIFICATION)
// ===================================
exports.activate = asyncHandler(async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).send(activationPage('Token inválido o faltante.', false));
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const pool = await getPool();

        const result = await pool.request()
            .input('ID', sql.Int, decoded.codCliente)
            .query('SELECT CodCliente, WebActive, Nombre FROM Clientes WHERE CodCliente = @ID');

        if (result.recordset.length === 0) {
            return res.status(404).send(activationPage('Cliente no encontrado.', false));
        }

        const client = result.recordset[0];

        if (client.WebActive) {
            return res.send(activationPage('Tu cuenta ya estaba activada. Podés iniciar sesión.', true));
        }

        await pool.request()
            .input('ID', sql.Int, decoded.codCliente)
            .query('UPDATE Clientes SET WebActive = 1 WHERE CodCliente = @ID');

        return res.send(activationPage('¡Tu cuenta fue activada exitosamente! Ya podés iniciar sesión.', true));
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(400).send(activationPage('El enlace de activación expiró. Registrate nuevamente.', false));
        }
        return res.status(400).send(activationPage('Token inválido.', false));
    }
});

// HTML page shown after clicking activation link
function activationPage(message, success) {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Activación de Cuenta</title></head>
    <body style="font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f5;">
        <div style="background:white;padding:40px;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.1);text-align:center;max-width:400px;">
            <div style="font-size:48px;margin-bottom:16px;">${success ? '✅' : '❌'}</div>
            <h2 style="color:${success ? '#1a1a1a' : '#dc2626'};margin-bottom:12px;">${success ? 'Cuenta Activada' : 'Error'}</h2>
            <p style="color:#666;margin-bottom:24px;">${message}</p>
            <a href="/login" style="display:inline-block;padding:12px 32px;background:#0f172a;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">Ir al Login</a>
        </div>
    </body>
    </html>`;
}
