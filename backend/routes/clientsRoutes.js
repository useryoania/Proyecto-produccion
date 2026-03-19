const express = require('express');
const router = express.Router();
const controller = require('../controllers/clientsController');

// ── Lectura general ──────────────────────────────────────────────────────────
router.get('/',                    controller.getAllClients);
router.get('/tipos',               controller.getTiposClientes);
router.get('/catalogs',            controller.getCatalogs);
router.get('/search',              controller.searchClients);
router.get('/unified-search',      controller.searchClientUnified);
router.get('/admin/duplicates',    controller.getDuplicateClients);
router.get('/react-list',          controller.getAllReactClients);
router.get('/macrosoft-list',      controller.getAllMacrosoftClients);
router.get('/macrosoft-page',      controller.getMacrosoftPage);       // ?page=N — una página
router.get('/react-clients/search',controller.getAllMacrosoftClients);
router.get('/external/:id',        controller.getMacrosoftClientData);

// ── Árbol agrupado ───────────────────────────────────────────────────────────
// GET /api/clients/tree?group=vendedor|tipo
router.get('/tree', controller.getClientsTree);

// ── Google Sheets ────────────────────────────────────────────────────────────
router.get('/sheets/all',    controller.sheetsGetAll);
router.get('/sheets/search', controller.sheetsSearch);   // ?idreact=123
router.post('/sheets/update',controller.sheetsUpdate);   // { idreact, data }

// ── Crear ────────────────────────────────────────────────────────────────────
// Endpoint público (protegido por x-api-key header, sin JWT)
router.post('/external-create', controller.createExternalClient);
router.post('/',                controller.createClient);
router.post('/import-react',    controller.importReactClient);
router.post('/export-react',    controller.createReactClient);
router.post('/export-macrosoft',controller.createMacrosoftClient);

// ── Actualizar ───────────────────────────────────────────────────────────────
router.put('/:codCliente/link',           controller.updateClientLink);
router.put('/:codCliente/link-macrosoft', controller.updateClientLinkMacrosoft);
router.patch('/:codCliente/quick',        controller.quickUpdateClient);   // solo vendedor/tipo
router.put('/:codCliente',                controller.updateClient);
router.put('/macrosoft/:codReferencia',   controller.updateMacrosoftClient);

// ── Eliminar ─────────────────────────────────────────────────────────────────
router.delete('/:codCliente', controller.deleteClient);

module.exports = router;