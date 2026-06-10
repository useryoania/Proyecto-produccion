const fs = require('fs');
const path = require('path');

const missingTables = [
'SINCRO-ARTICULOS',
'PlanesMetros',
'ConfiguracionPrecios',
'TesoreriaBancos',
'Config_TiposDocumento',
'Config_CuentasEgreso',
'CondicionesPago',
'TiposMovimiento',
'Cont_PlanCuentas',
'Cont_TiposTransaccion',
'Cont_EventosContables',
'Cont_ReglasEventos',
'Cont_ReglasContables',
'Cont_ReglasAsiento',
'Config_CFE',
'PlanesMetrosArticulosPermitidos',
'Articulos_Wms',
'Articulos_WMS_Variantes',
'Articulos_Imagenes',
'Articulos_UbicacionLocal',
'Temp_Articulos_Maestros',
'Temp_WMS_Maestros',
'EgresosCaja',
'SesionesTurno',
'TransaccionesCaja',
'SINCRONIZAR DATOS SISTEMAS - SINCRO',
'TesoreriaCheques',
'DocumentosContablesDetalle',
'AutorizacionesSinPago',
'ImputacionPago',
'TransaccionDetalle',
'SINCRO-ARTICULOSVIEJA',
'Cont_AsientosCabecera',
'Cont_AsientosDetalle',
'CuentasCliente',
'MovimientosCuenta',
'DeudaDocumento',
'DocumentosContables',
'AjustesDocumento',
'ColaEstadosCuenta',
'CiclosCredito',
'SecuenciaDocumentos'
];

const script1 = fs.readFileSync('c:\\Integracion\\User-Macrosoft\\Proyecto-produccion\\backend\\Para Migrar\\01-TABLAS_FALTANTES.sql', 'utf8');
const script7 = fs.readFileSync('c:\\Integracion\\User-Macrosoft\\Proyecto-produccion\\backend\\Para Migrar\\07-TABLAS_WMS.sql', 'utf8');

const combined = script1 + '\n' + script7;
const tableRegex = /CREATE\s+TABLE\s+(?:\[dbo\]\.)?\[?([a-zA-Z0-9_\-\s]+)\]?/gi;

const foundTables = new Set();
let match;
while ((match = tableRegex.exec(combined)) !== null) {
    foundTables.add(match[1].trim());
}

console.log('Tables found in scripts:');
console.log(Array.from(foundTables));

const missingFromScripts = missingTables.filter(t => {
    // Check case-insensitive
    const tLower = t.toLowerCase();
    for (const f of foundTables) {
        if (f.toLowerCase() === tLower) return false;
    }
    return true;
});

console.log('\n--- TABLAS QUE FALTAN EN LOS SCRIPTS ---');
console.log(missingFromScripts);
