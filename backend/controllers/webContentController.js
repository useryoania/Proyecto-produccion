const { getPool, sql } = require('../config/db');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');

exports.getActiveContent = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT * FROM ContenidoWeb WHERE Activo = 1 ORDER BY Orden ASC");
        res.json({ success: true, data: result.recordset });
    } catch (error) {
        logger.error("Error getting active content:", error);
        res.status(500).json({ success: false, error: "Error retrieving content." });
    }
};

exports.getAllContent = async (req, res) => {
    try {
        const pool = await getPool();
        // Orden por Tipo y luego Orden
        const result = await pool.request().query("SELECT * FROM ContenidoWeb ORDER BY Tipo, Orden ASC");
        res.json({ success: true, data: result.recordset });
    } catch (error) {
        logger.error("Error getting all content:", error);
        res.status(500).json({ success: false, error: "Error retrieving content." });
    }
};

exports.createContent = async (req, res) => {
    const { tipo, titulo, imagenUrl, linkDestino, activo, orden } = req.body;
    try {
        const pool = await getPool();
        await pool.request()
            .input('tipo', sql.NVarChar, tipo)
            .input('titulo', sql.NVarChar, titulo || null)
            .input('img', sql.NVarChar, imagenUrl)
            .input('link', sql.NVarChar, linkDestino || null)
            .input('act', sql.Bit, activo !== false ? 1 : 0) // Default true
            .input('ord', sql.Int, orden || 0)
            .query(`INSERT INTO ContenidoWeb (Tipo, Titulo, ImagenUrl, LinkDestino, Activo, Orden) 
                    VALUES (@tipo, @titulo, @img, @link, @act, @ord)`);

        res.json({ success: true, message: "Contenido creado." });
    } catch (error) {
        logger.error("Error creating content:", error);
        res.status(500).json({ success: false, error: "Error creating content." });
    }
};

exports.updateContent = async (req, res) => {
    const { id } = req.params;
    const { titulo, imagenUrl, linkDestino, activo, orden } = req.body;
    try {
        const pool = await getPool();
        const request = pool.request()
            .input('id', sql.Int, id);

        let query = "UPDATE ContenidoWeb SET ";
        const updates = [];

        if (titulo !== undefined) { updates.push("Titulo = @titulo"); request.input('titulo', sql.NVarChar, titulo); }
        if (imagenUrl !== undefined) { updates.push("ImagenUrl = @img"); request.input('img', sql.NVarChar, imagenUrl); }
        if (linkDestino !== undefined) { updates.push("LinkDestino = @link"); request.input('link', sql.NVarChar, linkDestino); }
        if (activo !== undefined) { updates.push("Activo = @act"); request.input('act', sql.Bit, activo ? 1 : 0); }
        if (orden !== undefined) { updates.push("Orden = @ord"); request.input('ord', sql.Int, orden); }

        if (updates.length === 0) return res.json({ success: true, message: "No changes." });

        query += updates.join(", ") + " WHERE ID = @id";
        await request.query(query);

        res.json({ success: true, message: "Contenido actualizado." });
    } catch (error) {
        logger.error("Error updating content:", error);
        res.status(500).json({ success: false, error: "Error updating content." });
    }
};

exports.deleteContent = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getPool();
        await pool.request()
            .input('id', sql.Int, id)
            .query("DELETE FROM ContenidoWeb WHERE ID = @id");
        res.json({ success: true, message: "Contenido eliminado." });
    } catch (error) {
        logger.error("Error deleting content:", error);
        res.status(500).json({ success: false, error: "Error deleting content." });
    }
};

exports.sendContactForm = async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ success: false, error: "Todos los campos son obligatorios." });
    }

    try {
        const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#ffffff;">
            <h2 style="color:#0f172a;">Nuevo mensaje web</h2>
            <p><strong>Nombre:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
            <p style="white-space:pre-wrap;color:#333;font-size:15px;line-height:1.6;">${message}</p>
        </div>
        `;
        
        const success = await emailService.sendMail('info@user.uy', `Mensaje Web - ${name}`, html);

        if (success) {
            res.json({ success: true, message: "Mensaje enviado exitosamente." });
        } else {
            res.status(500).json({ success: false, error: "Error enviando el correo." });
        }
    } catch (error) {
        logger.error("Error sending contact email:", error);
        res.status(500).json({ success: false, error: "Error procesando petición." });
    }
};

exports.sendJobApplication = async (req, res) => {
    const { name, phone, email, linkedin, intro } = req.body;
    const cvFile = req.file;

    if (!name || !phone || !email) {
        return res.status(400).json({ success: false, error: "Faltan datos obligatorios." });
    }

    try {
        const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;">
            <h2 style="color:#0f172a;margin-top:0;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #f1f5f9;">💼 Nueva Postulación</h2>
            
            <div style="margin-bottom:24px;">
                <p style="margin:8px 0;font-size:15px;color:#334155;"><strong>🧑‍🦱 Nombre:</strong> ${name}</p>
                <p style="margin:8px 0;font-size:15px;color:#334155;"><strong>📞 Celular:</strong> ${phone}</p>
                <p style="margin:8px 0;font-size:15px;color:#334155;"><strong>✉️ Email:</strong> <a href="mailto:${email}" style="color:#0284c7;">${email}</a></p>
                <p style="margin:8px 0;font-size:15px;color:#334155;"><strong>🔗 LinkedIn:</strong> ${linkedin ? `<a href="${linkedin}" style="color:#0284c7;">${linkedin}</a>` : '<span style="color:#94a3b8;">No provisto</span>'}</p>
                <p style="margin:8px 0;font-size:15px;color:#334155;"><strong>📎 Currículum:</strong> ${cvFile ? `<span style="color:#10b981;font-weight:bold;">Adjunto (${(cvFile.size / 1024 / 1024).toFixed(2)} MB)</span>` : '<span style="color:#ef4444;font-weight:bold;">Sin adjuntar</span>'}</p>
            </div>
            
            ${intro ? `
            <div style="background:#f8fafc;padding:20px;border-radius:8px;border-left:4px solid #0ea5e9;">
                <p style="margin:0 0 10px 0;font-size:13px;font-weight:bold;color:#64748b;text-transform:uppercase;">Presentación Corta / Dudas:</p>
                <p style="margin:0;white-space:pre-wrap;color:#1e293b;font-size:14px;line-height:1.6;">${intro}</p>
            </div>
            ` : ''}
            
            <p style="color:#94a3b8;font-size:11px;text-align:center;margin-top:40px;margin-bottom:0;">
                Este es un mensaje automático generado desde User Web.
            </p>
        </div>
        `;
        
        let attachments = [];
        if (cvFile) {
            attachments.push({
                filename: cvFile.originalname,
                content: cvFile.buffer
            });
        }

        const success = await emailService.sendMail('rrhh@user.uy', `Postulación: ${name}`, html, attachments);

        if (success) {
            res.json({ success: true, message: "Solicitud enviada exitosamente." });
        } else {
            res.status(500).json({ success: false, error: "Hubo un problema de red despachando el correo." });
        }
    } catch (error) {
        logger.error("Error procesando solicitud de trabajo (Jobs):", error);
        res.status(500).json({ success: false, error: "Error interno del servidor procesando la postulación." });
    }
};
