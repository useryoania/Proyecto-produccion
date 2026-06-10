const fs = require('fs');
const path = require('path');
const sql = require('mssql');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const configBase = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
    options: {
        instanceName: process.env.DB_INSTANCE || undefined,
        encrypt: false,
        trustServerCertificate: true
    }
};

const scriptPath = 'c:\\Integracion\\User-Macrosoft\\Proyecto-produccion\\backend\\Para Migrar\\02-COLUMNAS_NUEVAS.sql';
const scriptContent = fs.readFileSync(scriptPath, 'utf8').toLowerCase();

const requiredColumns = {
  'Ordenes': ['CliIdCliente', 'ProdIdProducto', 'ProIdProducto', 'MotivoCancelacionID', 'DetallesCancelacion'],
  'PreciosBase': ['MonIdMoneda', 'ProIdProducto'],
  'ArchivosOrden': ['MotivoCancelacionID', 'DetallesCancelacion'],
  'PerfilesPrecios': ['Categoria'],
  'PedidosCobranzaDetalle': ['Moneda', 'PerfilAplicado', 'PricingTrace', 'DatoTecnico', 'MonedaOriginal', 'PrecioUnitarioOriginal', 'SubtotalOriginal', 'ProIdProducto'],
  'PreciosEspeciales': ['CliIdCliente'],
  'Rollos': ['UsuarioID'],
  'PreciosEspecialesItems': ['MonIdMoneda', 'ProIdProducto', 'CliIdCliente', 'CodGrupo'],
  'PedidosCobranza': ['QR_Pedido', 'QR_Cliente', 'QR_Trabajo', 'QR_Urgencia', 'QR_Producto', 'QR_Cantidad', 'QR_Importe', 'QR_String', 'DetalleCostos', 'PerfilesPrecio', 'MontoContabilizado', 'MetrosContabilizados'],
  'PreciosListaPublica': ['FiltroLanding'],
  'PerfilesItems': ['MonIdMoneda', 'ProIdProducto', 'CodGrupo'],
  'MetodosPagos': ['MPaAfectaCaja', 'MPaTipo', 'MPaActivo'],
  'ServiciosExtraOrden': ['MotivoCancelacionID', 'DetallesCancelacion'],
  'ConfigMapeoERP': ['Tipo'],
  'Articulos': ['UniIdUnidad', 'borrar'],
  'Pagos': ['PagTcaIdTransaccion', 'PagCotizacion', 'PagMontoConvertido', 'PagTipoMovimiento', 'PagSaldoConsumidoId'],
  'OrdenesDeposito': ['OrdMaterialPlanilla']
};

async function getColumnDefinition(pool, tableName, columnName) {
    const colsRes = await pool.request()
        .input('TableName', sql.NVarChar, tableName)
        .input('ColumnName', sql.NVarChar, columnName)
        .query(`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = @TableName AND COLUMN_NAME = @ColumnName
        `);
    
    if(colsRes.recordset.length === 0) return null;
    const c = colsRes.recordset[0];
    let typeStr = c.DATA_TYPE;
    if (c.DATA_TYPE === 'nvarchar' || c.DATA_TYPE === 'varchar' || c.DATA_TYPE === 'char') {
        typeStr += `(${c.CHARACTER_MAXIMUM_LENGTH === -1 ? 'MAX' : c.CHARACTER_MAXIMUM_LENGTH})`;
    } else if (c.DATA_TYPE === 'decimal' || c.DATA_TYPE === 'numeric') {
        typeStr += `(18,2)`;
    }
    return `[${c.COLUMN_NAME}] ${typeStr} ${c.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`;
}

async function run() {
    try {
        const missingColumns = [];
        for (const [table, columns] of Object.entries(requiredColumns)) {
            for (const col of columns) {
                // simple check if column name exists in script
                // Since SQL scripts use `ADD [ColumnName]` or `ADD ColumnName` we can check if the column name exists near the table name
                // To be safe, let's just check if the column name string exists in the script at all.
                // If it doesn't exist, it's definitely missing.
                if (!scriptContent.includes(col.toLowerCase())) {
                    missingColumns.push({ table, col });
                }
            }
        }

        if (missingColumns.length === 0) {
            console.log("ALL_OK");
            return;
        }

        console.log("Missing columns:", missingColumns);

        const pool = await sql.connect({ ...configBase, database: 'SecureAppDB' });
        
        let outputSql = 'USE [importa];\nGO\n\n-- ============================================================================\n-- COLUMNAS FALTANTES (COMPLEMENTO A 02-COLUMNAS_NUEVAS.sql)\n-- ============================================================================\n\n';

        for (const item of missingColumns) {
            const def = await getColumnDefinition(pool, item.table, item.col);
            if (def) {
                outputSql += `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='${item.table}' AND COLUMN_NAME='${item.col}')\n`;
                outputSql += `ALTER TABLE [dbo].[${item.table}] ADD ${def};\nGO\n\n`;
            } else {
                console.log(`WARNING: Column ${item.col} not found in ${item.table} in DB SecureAppDB`);
            }
        }
        
        fs.writeFileSync('c:\\Integracion\\User-Macrosoft\\Proyecto-produccion\\backend\\Para Migrar\\02.5-COLUMNAS_NUEVAS_TEMP.sql', outputSql);
        console.log("DONE");

        await pool.close();
    } catch(err) {
        console.error(err);
    }
}
run();
