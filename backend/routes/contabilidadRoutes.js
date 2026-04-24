'use strict';
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/contabilidadController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/grupos-erp', ctrl.getGruposERP);
router.get('/unidades', ctrl.getUnidades);
router.get('/articulos', ctrl.getArticulos);
router.get('/monedas', ctrl.getMonedas);
router.get('/metodos-pago', ctrl.getMetodosPago);
router.get('/condiciones-pago', ctrl.getCondicionesPago);
router.get('/cotizacion-hoy', ctrl.getCotizacionHoy);
router.get('/clientes-activos', ctrl.getClientesActivos);
router.get('/clientes/:CliIdCliente/deudas-vivas', ctrl.getDeudasVivasCliente);
router.get('/cuentas/:CliIdCliente', ctrl.getCuentasCliente);
router.post('/cuentas', ctrl.crearCuenta);
router.patch('/cuentas/:CueIdCuenta/configuracion', ctrl.actualizarConfigCuenta);
router.get('/cuentas/:CueIdCuenta/movimientos', ctrl.getMovimientos);
router.post('/movimientos/ajuste', ctrl.registrarAjusteManual);
router.post('/movimientos/pago-anticipado', ctrl.registrarPagoAnticipado);
router.post('/movimientos/pago-cruzado', ctrl.registrarPagoCruzado);
router.get('/movimientos/:MovIdMovimiento/recibo/pdf', ctrl.generarReciboPdf);
router.get('/cuentas/:CueIdCuenta/deudas', ctrl.getDeudas);
router.get('/ciclos/:CliIdCliente', ctrl.getCiclosCliente);
router.post('/ciclos', ctrl.abrirCiclo);
router.post('/ciclos/cerrar-vencidos', ctrl.cerrarCiclosVencidos);
router.post('/ciclos/:CicIdCiclo/cerrar', ctrl.cerrarCiclo);
router.get('/planes/:CliIdCliente', ctrl.getPlanesCliente);
router.post('/planes', ctrl.crearPlan);
router.post('/planes/:PlaIdPlan/recargar', ctrl.recargarPlan);
router.patch('/planes/:PlaIdPlan/desactivar', ctrl.desactivarPlan);
router.get('/reportes/antiguedad-deuda', ctrl.getAntiguedadDeuda);
router.get('/reportes/estado-cuenta/:CliIdCliente', ctrl.getEstadoCuentaCliente);
router.get('/reportes/deuda-consolidada', ctrl.getDeudaConsolidada);
router.get('/cola', ctrl.getColaEstados);
router.get('/cola/:ColIdCola/preview', ctrl.previewEstadoCola);
router.post('/cola/generar', ctrl.generarEstadosManual);
router.post('/cola/enviar-aprobados', ctrl.enviarAprobados);
router.patch('/cola/:ColIdCola/estado', ctrl.cambiarEstadoCola);
router.post('/cola/:ColIdCola/enviar', ctrl.enviarEstadoCola);
router.get('/tipos-movimiento', ctrl.getTiposMovimiento);
router.post('/tipos-movimiento', ctrl.createTipoMovimiento);
router.patch('/tipos-movimiento/:TmoId', ctrl.updateTipoMovimiento);
router.delete('/tipos-movimiento/:TmoId', ctrl.deleteTipoMovimiento);

// ── MOTOR DE REGLAS ──────────────────────────────────────────────────
const motorCtrl = require('../controllers/motorContableController');
router.get('/motor/transacciones', motorCtrl.getTiposTransaccion);
router.get('/motor/transacciones/:codigo/reglas', motorCtrl.getReglasPorTransaccion);
router.post('/motor/transacciones', motorCtrl.saveReglasTransaccion);
router.delete('/motor/transacciones/:codigo', motorCtrl.deleteTransaccion);


// ── Módulo Caja y Pagos ────────────────────────────────────────────────
const caja = require('../controllers/cajaController');
const erp  = require('../controllers/erpContabilidadController'); // NUEVO ERP

// ── Nomencladores y Libro Mayor ERP
router.get('/erp/cuentas',        erp.getPlanCuentas);
router.post('/erp/cuentas',       erp.crearCuenta);
router.put('/erp/cuentas/:id',    erp.actualizarCuenta);
router.get('/erp/cuentas/gastos', erp.getCuentasGastos);
router.get('/erp/libro-mayor',    erp.getLibroMayor);

// Transacciones
router.post('/caja/transaccion',              caja.procesarTransaccion);
router.post('/caja/venta-directa',            caja.procesarVentaDirecta); // NUEVO
router.get('/caja/productos-venta',           caja.getProductosVenta); // NUEVO
router.post('/caja/transaccion/:id/anular',   caja.anularTransaccion);
router.get('/caja/transaccion/:id',           caja.getTransaccion);
router.get('/caja/historial/:clienteId',      caja.getHistorialCliente);
router.get('/caja/movimientos-turno',         caja.getMovimientosTurno);

// Sesión de caja (apertura / cierre)
router.get('/caja/sesion/actual',             caja.getSesionActual);
router.post('/caja/sesion/abrir',             caja.abrirSesion);
router.post('/caja/sesion/:id/cerrar',        caja.cerrarSesion);
router.get('/caja/sesion/:id/resumen',        caja.getResumenSesion);

// Numeración automática de documentos
router.get('/caja/siguiente-numero',          caja.getSiguienteNumero);

// CRUD Secuencias Documentos
const secCtrl = require('../controllers/secuenciasController');
router.get('/caja/secuencias',                secCtrl.getSecuencias);
router.post('/caja/secuencias',               secCtrl.createSecuencia);
router.put('/caja/secuencias/:id',            secCtrl.updateSecuencia);

// Egresos
router.post('/caja/egreso',                   caja.registrarEgreso);

// Autorizaciones sin pago
router.post('/caja/autorizar',                caja.autorizarSinPago);

// ── OPERACIONES DEL MOTOR disponibles para elegir en Caja ─────────────────
// Devuelve los eventos contables que tienen prefijo (son documentales) y activos
// El cajero puede seleccionar una operación manual y el sistema aplica sus reglas
router.get('/caja/operaciones', motorCtrl.getOperacionesCaja);
router.post('/caja/operacion-manual', caja.registrarOperacionManual);

// ── CFE (Facturación Electrónica) ──────────────────────────────────────────
const cfeCtrl = require('../controllers/cfeController');
router.get('/cfe/nomencladores', cfeCtrl.getNomencladores);
router.get('/cfe/documentos', cfeCtrl.getDocumentosCFE);
router.post('/cfe/documentos/:id/enviar', cfeCtrl.enviarADGI);
router.post('/cfe/manual', cfeCtrl.crearFacturaManual);
router.get('/cfe/documentos/:id/detalle', cfeCtrl.getDetalleFactura);
router.put('/cfe/documentos/:id/anular', cfeCtrl.anularFactura);
router.put('/cfe/documentos/:id', cfeCtrl.editarFactura);

// ── RECONCILIACIÓN CONTABLE MANUAL ───────────────────────────────────────────
// GET  /contabilidad/reconciliacion/audit   → Solo muestra inconsistencias, no toca nada
// POST /contabilidad/reconciliacion/ejecutar → Detecta y repara (igual que el job automático)
const reconciliacionJob = require('../jobs/contabilidadReconciliacionJob');
const { getPool, sql: sqlRec } = require('../config/db');

router.get('/reconciliacion/audit', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                od.OrdCodigoOrden       AS CodigoOrden,
                od.OrdFechaIngresoOrden AS FechaDeposito,
                pc.ID                   AS PCId,
                pc.MontoTotal,
                pc.MontoContabilizado,
                pc.MetrosContabilizados
            FROM OrdenesDeposito od
            INNER JOIN PedidosCobranza pc 
                ON LTRIM(RTRIM(pc.NoDocERP)) = LTRIM(RTRIM(od.OrdCodigoOrden))
            WHERE od.OrdEstadoActual = 1
              AND pc.MontoContabilizado IS NULL
            ORDER BY od.OrdFechaIngresoOrden ASC
        `);
        res.json({
            inconsistencias: result.recordset.length,
            detalle: result.recordset
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/reconciliacion/ejecutar', async (req, res) => {
    try {
        // Corre el job en background y responde de inmediato
        reconciliacionJob.run()
            .then(() => {})
            .catch(e => console.error('[ReconciliacionCtb-Manual] Error:', e.message));
        res.json({ success: true, message: 'Reconciliación iniciada en background. Revisá los logs del servidor.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;


