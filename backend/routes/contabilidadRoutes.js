'use strict';

const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/contabilidadController');
const { verifyToken } = require('../middleware/authMiddleware');

// Todas las rutas requieren JWT
router.use(verifyToken);

// ── Artículos y grupos ERP ───────────────────────────────────────────────────
router.get('/grupos-erp',                                ctrl.getGruposERP);
router.get('/unidades',                                  ctrl.getUnidades);
router.get('/articulos',                                 ctrl.getArticulos);

// ── Condiciones de pago ─────────────────────────────────────────────────────
router.get('/condiciones-pago', ctrl.getCondicionesPago);

// ── Resumen de clientes con saldo activo ─────────────────────────────────────
router.get('/clientes-activos', ctrl.getClientesActivos);

// ── Cuentas de cliente ──────────────────────────────────────────────────────
router.get( '/cuentas/:CliIdCliente',                    ctrl.getCuentasCliente);
router.post('/cuentas',                                  ctrl.crearCuenta);
router.patch('/cuentas/:CueIdCuenta/configuracion',      ctrl.actualizarConfigCuenta);

// ── Movimientos (Libro Mayor) ───────────────────────────────────────────────
router.get( '/cuentas/:CueIdCuenta/movimientos',         ctrl.getMovimientos);
router.post('/movimientos/ajuste',                       ctrl.registrarAjusteManual);
router.post('/movimientos/pago-anticipado',              ctrl.registrarPagoAnticipado);

// ── Deudas ──────────────────────────────────────────────────────────────────
router.get( '/cuentas/:CueIdCuenta/deudas',              ctrl.getDeudas);

// ── Ciclos de crédito ───────────────────────────────────────────────────────
router.get( '/ciclos/:CliIdCliente',                     ctrl.getCiclosCliente);
router.post('/ciclos/cerrar-vencidos',                   ctrl.cerrarCiclosVencidos);
router.post('/ciclos',                                   ctrl.abrirCiclo);
router.post('/ciclos/:CicIdCiclo/cerrar',                ctrl.cerrarCiclo);

// ── Planes de recursos (Metros / KG / Unidades) ──────────────────────────────
router.get(  '/planes/:CliIdCliente',               ctrl.getPlanesCliente);
router.post( '/planes',                             ctrl.crearPlan);
router.post( '/planes/:PlaIdPlan/recargar',         ctrl.recargarPlan);
router.patch('/planes/:PlaIdPlan/desactivar',       ctrl.desactivarPlan);

// ── Reportes ────────────────────────────────────────────────────────────────
router.get('/reportes/antiguedad-deuda',                 ctrl.getAntiguedadDeuda);
router.get('/reportes/estado-cuenta/:CliIdCliente',      ctrl.getEstadoCuentaCliente);
router.get('/reportes/deuda-consolidada',                ctrl.getDeudaConsolidada);

// ── Moneda / Cotización ───────────────────────────────────────────────────────
router.get( '/monedas',                                  ctrl.getMonedas);
router.get( '/metodos-pago',                             ctrl.getMetodosPago);
router.get( '/cotizacion-hoy',                           ctrl.getCotizacionHoy);
router.post('/movimientos/pago-cruzado',                 ctrl.registrarPagoCruzado);

// ── Cola de estados de cuenta ────────────────────────────────────────────────
router.get( '/cola',                                     ctrl.getColaEstados);
router.get( '/cola/:ColIdCola/preview',                  ctrl.previewEstadoCola);
router.post('/cola/generar',                             ctrl.generarEstadosManual);
router.post('/cola/enviar-aprobados',                    ctrl.enviarAprobados);
router.patch('/cola/:ColIdCola/estado',                  ctrl.cambiarEstadoCola);
router.post('/cola/:ColIdCola/enviar',                   ctrl.enviarEstadoCola);

module.exports = router;
