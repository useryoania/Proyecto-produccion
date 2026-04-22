const cron = require('node-cron');
const { google } = require('googleapis');
const { getPool, sql } = require('../config/db');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

// ── Configuración ────────────────────────────────────────────────────────────
const PRICE_SPREADSHEET_ID = '1N7Q0eLZuURcIwmrwBQyrIrtulw5rKrHNHjugjU8BqIE';
const PRICE_SHEET_NAME = 'Hoja 1';

// ── Auth (reutiliza tokens de sheetsService) ─────────────────────────────────
const CREDENTIALS_PATH = path.join(__dirname, '..', 'oauth-credentials.json');
const TOKEN_PATH = path.join(__dirname, '..', 'token.json');

function getOAuth2Client() {
    const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    const cfg = creds.installed || creds.web;
    if (!cfg) throw new Error('oauth-credentials.json inválido');
    const { client_id, client_secret } = cfg;
    const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/google/auth/callback';
    return new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);
}

async function getAuthClient() {
    const oAuth2Client = getOAuth2Client();
    if (!fs.existsSync(TOKEN_PATH)) {
        throw new Error('NO_TOKEN: Debe autorizar acceso a Google primero.');
    }
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    oAuth2Client.setCredentials(token);

    if (token.expiry_date && Date.now() > token.expiry_date - 60000) {
        const { credentials } = await oAuth2Client.refreshAccessToken();
        oAuth2Client.setCredentials(credentials);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(credentials, null, 4));
    }
    return oAuth2Client;
}

// ── Ensure Table ─────────────────────────────────────────────────────────────
async function ensureTable(pool) {
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PreciosListaPublica')
        BEGIN
            CREATE TABLE PreciosListaPublica (
                Id INT IDENTITY PRIMARY KEY,
                Familia NVARCHAR(100),
                Producto NVARCHAR(255),
                Descripcion NVARCHAR(500),
                Moneda NVARCHAR(50),
                Precio DECIMAL(18,2),
                ProIdProducto INT NULL,
                Activo BIT DEFAULT 1,
                UltimaSync DATETIME DEFAULT GETDATE()
            );
            CREATE INDEX IX_PLP_Familia ON PreciosListaPublica(Familia);
        END

        -- Asegurar que la columna exista si la tabla ya fue creada antes
        IF COL_LENGTH('PreciosListaPublica', 'ProIdProducto') IS NULL
        BEGIN
            ALTER TABLE PreciosListaPublica ADD ProIdProducto INT NULL;
        END
    `);
}

// ── Sync Logic ───────────────────────────────────────────────────────────────
async function syncPriceList() {
    const startTime = Date.now();
    logger.info('[PriceListSync] Iniciando sincronización de precios...');

    try {
        // Verificar archivos de credenciales
        if (!fs.existsSync(CREDENTIALS_PATH)) {
            logger.warn('[PriceListSync] ⚠️ No se encontró oauth-credentials.json. Omitiendo sync.');
            return { synced: 0, skipped: true };
        }
        if (!fs.existsSync(TOKEN_PATH)) {
            logger.warn('[PriceListSync] ⚠️ No se encontró token.json. Autoriza Google desde /api/google/auth primero.');
            return { synced: 0, skipped: true };
        }

        const auth = await getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });

        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: PRICE_SPREADSHEET_ID,
            range: `'${PRICE_SHEET_NAME}'!A:G`,
        });

        const rows = res.data.values || [];
        if (rows.length <= 1) {
            logger.info('[PriceListSync] Sheet vacío o solo encabezados.');
            return { synced: 0, duration: Date.now() - startTime };
        }

        // Saltar encabezados (fila 1 y cualquier fila que se vea como cabezal)
        const headerKeywords = ['FAMILIA', 'PRODUCTO', 'NOMBRE', 'PRECIO', 'DESCRIPCION'];
        const dataRows = rows.slice(1).filter(r => {
            if (r.length < 5 || !r[0]?.trim()) return false;
            // Si el primer o segundo campo es exactamente un encabezado, descartar
            const col0 = r[0].trim().toUpperCase();
            const col1 = r[1]?.trim().toUpperCase();
            if (headerKeywords.includes(col0) || headerKeywords.includes(col1)) return false;
            return true;
        });

        const pool = await getPool();
        await ensureTable(pool);

        // Marcar todos como inactivos
        await pool.request().query(`UPDATE PreciosListaPublica SET Activo = 0`);

        let inserted = 0;
        let updated = 0;

        for (const row of dataRows) {
            const familia = (row[0] || '').trim();
            const producto = (row[1] || '').trim();
            const descripcion = (row[2] || '').trim();
            const moneda = (row[3] || '').trim().toUpperCase();
            const precioStr = (row[4] || '0').replace(/[^0-9.,\-]/g, '').replace(',', '.');
            const precio = parseFloat(precioStr) || 0;
            const proIdRaw = (row[5] || '').trim();
            const proIdProducto = proIdRaw ? parseInt(proIdRaw, 10) : null;
            const ocultar = (row[6] || '').trim();

            if (!producto) continue;
            
            // Si la columna "MOSTRAR" (G) no está vacía, ocultamos el producto (lo salteamos para que quede Activo=0)
            if (ocultar) continue;

            // MERGE: buscar por Familia + Producto + Moneda
            const req = pool.request()
                .input('Familia', sql.NVarChar(100), familia)
                .input('Producto', sql.NVarChar(255), producto)
                .input('Descripcion', sql.NVarChar(500), descripcion)
                .input('Moneda', sql.NVarChar(50), moneda || 'N/A')
                .input('Precio', sql.Decimal(18, 2), precio);

            // ProIdProducto puede ser null si el producto no tiene artículo asociado
            if (proIdProducto != null && !isNaN(proIdProducto)) {
                req.input('ProIdProducto', sql.Int, proIdProducto);
            } else {
                req.input('ProIdProducto', sql.Int, null);
            }

            const result = await req.query(`
                    IF EXISTS (SELECT 1 FROM PreciosListaPublica WHERE Familia = @Familia AND Producto = @Producto AND Moneda = @Moneda)
                    BEGIN
                        UPDATE PreciosListaPublica 
                        SET Descripcion = @Descripcion, Precio = @Precio, ProIdProducto = @ProIdProducto, Activo = 1, UltimaSync = GETDATE()
                        WHERE Familia = @Familia AND Producto = @Producto AND Moneda = @Moneda;
                        SELECT 'UPDATED' AS action;
                    END
                    ELSE
                    BEGIN
                        INSERT INTO PreciosListaPublica (Familia, Producto, Descripcion, Moneda, Precio, ProIdProducto, Activo, UltimaSync)
                        VALUES (@Familia, @Producto, @Descripcion, @Moneda, @Precio, @ProIdProducto, 1, GETDATE());
                        SELECT 'INSERTED' AS action;
                    END
                `);

            if (result.recordset[0]?.action === 'INSERTED') inserted++;
            else updated++;
        }

        const duration = Date.now() - startTime;
        logger.info(`[PriceListSync] ✅ Completado en ${duration}ms. Insertados: ${inserted}, Actualizados: ${updated}, Total: ${dataRows.length}`);

        return { synced: dataRows.length, inserted, updated, duration };

    } catch (err) {
        logger.error(`[PriceListSync] ❌ Error: ${err.message}`);
        throw err;
    }
}

// ── Cron: Todos los días a las 3:00 AM ───────────────────────────────────────
cron.schedule('0 3 * * *', () => {
    setImmediate(() => {
        syncPriceList().catch(err => logger.error(`[PriceListSync] Cron Error: ${err.message}`));
    });
});

// Sync inicial al arrancar (tras 10s para que la DB esté lista)
setTimeout(() => {
    logger.info('[PriceListSync] Ejecutando sincronización inicial...');
    syncPriceList().catch(err => logger.error(`[PriceListSync] Init Error: ${err.message}`));
}, 10000);

logger.info('[PriceListSync] Cron cargado (Diario a las 3:00 AM).');

module.exports = { syncPriceList };
