Import-Module SQLPS -DisableNameChecking;
$srv = New-Object Microsoft.SqlServer.Management.Smo.Server("localhost\SQLEXPRESS");
$db = $srv.Databases["Macrosoft"];

if (-not $db) {
    Write-Host "Database Macrosoft not found on localhost\SQLEXPRESS"
    exit
}

$scripter = New-Object Microsoft.SqlServer.Management.Smo.Scripter($srv);
$scripter.Options.ScriptSchema = $true;
$scripter.Options.ScriptData = $false;
$scripter.Options.Indexes = $true;
$scripter.Options.DriAll = $true;
$scripter.Options.IncludeHeaders = $false;

$tables = @(
    "ImputacionPago",
    "TransaccionDetalle",
    "AjustesDocumento",
    "TransaccionesCaja",
    "EgresosCaja",
    "AutorizacionesSinPago",
    "MovimientosCuenta",
    "DeudaDocumento",
    "PlanesMetros",
    "CiclosCredito",
    "DocumentosContables",
    "DocumentosContablesDetalle",
    "SesionesTurno",
    "Cont_AsientosDetalle",
    "Cont_AsientosCabecera",
    "ColaEstadosCuenta",
    "CuentasCliente",
    "SecuenciaDocumentos"
);

$urns = New-Object Microsoft.SqlServer.Management.Smo.UrnCollection;
foreach($t in $tables) {
    $tb = $db.Tables | Where-Object { $_.Name -eq $t } | Select-Object -First 1
    if($tb) {
        $urns.Add($tb.Urn);
        Write-Host "Found: $t"
    } else {
        Write-Host "Table not found: $t"
    }
}

if ($urns.Count -gt 0) {
    $scripts = $scripter.Script($urns);
    $outPath = "c:\Integracion\User-Macrosoft\Proyecto-produccion\backend\create_tables.sql"
    $scripts | Out-File -FilePath $outPath -Encoding UTF8
    Write-Host "Script written to $outPath"
} else {
    Write-Host "No tables found."
}
