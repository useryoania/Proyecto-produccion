const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'Integracion', 'User-Macrosoft', 'Proyecto-produccion', 'backend', 'Para Migrar', '04-POBLAR_TABLAS_DIRECTO.sql');

let content = fs.readFileSync(filePath, 'utf8');

// Encontramos dónde empieza SecuenciaDocumentos y dónde termina
const startMarker = '-- TABLA: SecuenciaDocumentos';
const endMarker = '-- TABLA: SINCRO-ARTICULOS';

if (content.includes(startMarker) && content.includes(endMarker)) {
    const p1 = content.indexOf(startMarker);
    const p2 = content.indexOf(endMarker);

    const safeSecuencia = `
-- TABLA: SecuenciaDocumentos
-- --------------------------------------------------
PRINT '-> Procesando tabla SecuenciaDocumentos (1/23)';

-- Asegurarnos que las columnas existan antes de hacer nada (evita errores de compilacion)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='SecuenciaDocumentos' AND COLUMN_NAME='SecNroResolucion')
BEGIN
    ALTER TABLE [dbo].[SecuenciaDocumentos] ADD [SecNroResolucion] varchar(20) NULL;
    ALTER TABLE [dbo].[SecuenciaDocumentos] ADD [SecRangoDesde] int NULL;
    ALTER TABLE [dbo].[SecuenciaDocumentos] ADD [SecRangoHasta] int NULL;
    ALTER TABLE [dbo].[SecuenciaDocumentos] ADD [SecFechaVencimientoCAE] date NULL;
END
GO

DELETE FROM [dbo].[SecuenciaDocumentos];
GO

-- Insertamos con SQL dinamico para que SSMS no tire error de "Invalid Column" en la verificacion previa
EXEC('
SET IDENTITY_INSERT [dbo].[SecuenciaDocumentos] ON;
INSERT INTO [dbo].[SecuenciaDocumentos] ([SecIdSecuencia], [SecTipoDoc], [SecSerie], [SecPrefijo], [SecDigitos], [SecUltimoNumero], [SecActivo], [SecObservaciones], [SecNroResolucion], [SecRangoDesde], [SecRangoHasta], [SecFechaVencimientoCAE]) VALUES 
(1, ''ETICKET'', ''ET'', ''ET-'', 7, 1, 1, NULL, NULL, NULL, NULL, NULL),
(2, ''FACTURA'', ''FA'', ''FA-'', 6, 0, 1, NULL, NULL, NULL, NULL, NULL),
(3, ''CREDITO'', ''NC'', ''NC-'', 6, 0, 1, NULL, NULL, NULL, NULL, NULL),
(4, ''NOTA_CONSUMO'', ''NC'', ''NC-'', 6, 0, 1, NULL, NULL, NULL, NULL, NULL),
(5, ''RECIBO'', ''RC'', ''RC-'', 6, 1, 1, NULL, NULL, NULL, NULL, NULL),
(6, ''ORDEN_PAGO'', ''OP'', ''OP-'', 6, 0, 1, NULL, NULL, NULL, NULL, NULL),
(7, ''FACTURA_CICLO'', ''FC'', ''FC-'', 5, 0, 1, NULL, NULL, NULL, NULL, NULL),
(8, ''VOUCHER_CAJA'', ''VC'', ''VC-'', 6, 0, 1, NULL, NULL, NULL, NULL, NULL),
(9, ''E-TICKET CREDITO'', ''ET'', ''ET-'', 5, 0, 1, NULL, NULL, NULL, NULL, NULL),
(10, ''E-FACTURA CREDITO'', ''FA'', ''FA-'', 5, 0, 1, NULL, NULL, NULL, NULL, NULL),
(11, ''E-FACTURA CONTADO'', ''FA'', ''FA-'', 5, 0, 1, NULL, NULL, NULL, NULL, NULL),
(12, ''PEDIDO_CAJA'', ''PC'', ''PC-'', 5, 2, 1, NULL, NULL, NULL, NULL, NULL),
(13, ''RECIBO_ANTICIPO'', ''RC'', ''RC-'', 5, 0, 1, NULL, NULL, NULL, NULL, NULL),
(14, ''E-TICKET CREDITO'', ''A'', ''A-'', 5, 0, 1, NULL, NULL, NULL, NULL, NULL),
(15, ''E-TICKET DEBITO'', ''ND'', ''ND-'', 6, 0, 1, NULL, NULL, NULL, NULL, NULL),
(16, ''E-FACTURA DEBITO'', ''ND'', ''ND-'', 6, 0, 1, NULL, NULL, NULL, NULL, NULL);
SET IDENTITY_INSERT [dbo].[SecuenciaDocumentos] OFF;
');
PRINT '   [OK] 16 filas insertadas en SecuenciaDocumentos';
GO

-- --------------------------------------------------
`;

    // Reemplazamos
    const head = content.substring(0, p1);
    const tail = content.substring(p2);
    
    content = head + safeSecuencia + tail;
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('04-POBLAR_TABLAS_DIRECTO.sql actualizado con éxito.');
} else {
    console.log('No se encontraron los marcadores en el archivo.');
}
