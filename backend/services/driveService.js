const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Intentar cargar credenciales
let auth = null;
const CREDENTIALS_PATH = path.join(__dirname, '../google-credentials.json');

if (fs.existsSync(CREDENTIALS_PATH)) {
    try {
        auth = new google.auth.GoogleAuth({
            keyFile: CREDENTIALS_PATH,
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });
        console.log("✅ [DriveService] Credenciales cargadas correctamente.");
    } catch (e) {
        console.error("❌ [DriveService] Error cargando credenciales:", e);
    }
} else {
    console.warn("⚠️ [DriveService] Faltan credenciales json.");
}

const drive = google.drive({ version: 'v3', auth });

exports.searchInDrive = async (query, specificFolderId = null) => {
    if (!auth) return "❌ Error: Faltan credenciales de Google (google-credentials.json).";

    try {
        console.log(`🔎 [DriveService] Buscando: "${query}" (Carpeta: ${specificFolderId || 'GLOBAL'})`);

        // ESTRATEGIA "RED AMPLIA": Buscamos en Nombre O Contenido.
        // Quitamos restricción de tipos para ver si aparecen carpetas o imagenes.
        let q = `(name contains '${query}' OR fullText contains '${query}') AND trashed = false`;

        console.log(`🔎 [DriveService DEBUG] Query AMPLIA enviada a Google: [ ${q} ]`);

        const res = await drive.files.list({
            q: q,
            fields: 'files(id, name, mimeType, webViewLink, description)',
            pageSize: 10 // Traemos más resultados
        });

        const files = res.data.files;
        if (!files || files.length === 0) {
            return "No encontré documentos relevantes en Drive.";
        }

        // 2. Intentar LEER el contenido del primer resultado relevante
        let detailedContent = "";

        // Tomamos el archivo más relevante
        const topFile = files[0];

        // Si es un Google Doc, intentamos exportarlo a texto
        if (topFile.mimeType === 'application/vnd.google-apps.document') {
            try {
                const exportRes = await drive.files.export({
                    fileId: topFile.id,
                    mimeType: 'text/plain'
                });
                // Recortamos a 2000 caracteres para no saturar a la IA
                const textSnippet = (typeof exportRes.data === 'string' ? exportRes.data : JSON.stringify(exportRes.data)).substring(0, 3000);
                detailedContent = `\n--- CONTENIDO EXTRAÍDO DE "${topFile.name}" ---\n${textSnippet}\n--- FIN CONTENIDO ---\n`;
            } catch (readErr) {
                console.warn("No se pudo leer contenido del Doc:", readErr.message);
                detailedContent = "(No se pudo extraer texto, solo ver enlace)";
            }
        } else {
            detailedContent = "(Archivo no es Google Doc, no puedo leerlo directamente, ver en enlace)";
        }

        let summary = `Encontré ${files.length} documentos. El más relevante es **"${topFile.name}"**.\n`;
        summary += `Link: ${topFile.webViewLink}\n`;
        summary += detailedContent;

        if (files.length > 1) {
            summary += `\nOtros resultados:\n`;
            files.slice(1).forEach(f => summary += `- ${f.name} (${f.webViewLink})\n`);
        }

        return summary;

    } catch (error) {
        console.error("Error en Drive API:", error);
        return `❌ Error técnico de Google: ${error.message}`;
    }
};
