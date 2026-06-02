const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Integracion\\User-Macrosoft\\Proyecto-produccion\\backend\\Para Migrar\\02-COLUMNAS_NUEVAS.sql';
let content = fs.readFileSync(filePath, 'utf-8');

const alterSecuencia = `
-- ----------------------------------------------------------------------------
-- PARCHE: Columnas de CFE para SecuenciaDocumentos
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='SecuenciaDocumentos' AND COLUMN_NAME='SecNroResolucion') 
BEGIN
    ALTER TABLE dbo.[SecuenciaDocumentos] ADD [SecNroResolucion] varchar(20) NULL;
    ALTER TABLE dbo.[SecuenciaDocumentos] ADD [SecRangoDesde] int NULL;
    ALTER TABLE dbo.[SecuenciaDocumentos] ADD [SecRangoHasta] int NULL;
    ALTER TABLE dbo.[SecuenciaDocumentos] ADD [SecFechaVencimientoCAE] date NULL;
END
GO
`;

if (!content.includes('SecNroResolucion')) {
    content += '\n' + alterSecuencia;
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('02-COLUMNAS_NUEVAS.sql parcheado exitosamente.');
} else {
    console.log('El archivo ya contenía el parche.');
}
