const express = require('express');
const router = express.Router();
const controller = require('../controllers/clientsController');

// GET /api/clients (Lista general para integración)
router.get('/', controller.getAllClients);

// GET /api/clients/tipos (Lista de Tipos de Clientes)
router.get('/tipos', controller.getTiposClientes);

// GET /api/clients/external/:id (Proxy para API Macrosoft)
router.get('/external/:id', controller.getMacrosoftClientData);

// GET /api/clients/react-list (Proxy para API React DataAll)
router.get('/react-list', controller.getAllReactClients);

// GET /api/clients/admin/duplicates (Obtener clientes duplicados con el mismo IDReact)
router.get('/admin/duplicates', controller.getDuplicateClients);

// GET /api/clients/macrosoft-list (Proxy para lista full de Macrosoft)
router.get('/macrosoft-list', controller.getAllMacrosoftClients);

// GET /api/clients/search?q=Juan (Búsqueda autocompletado)
// GET /api/clients/search?q=Juan (Búsqueda autocompletado en otros módulos)
router.get('/search', controller.searchClients);

// GET /api/clients/unified-search?term=... (Búsqueda inteligente Local -> Legacy)
router.get('/unified-search', controller.searchClientUnified);

// POST /api/clients (Crear cliente nuevo)
router.post('/', controller.createClient);

// PUT /api/clients/:codCliente/link (Vincular con React)
router.put('/:codCliente/link', controller.updateClientLink);

// PUT /api/clients/:codCliente/link-macrosoft (Vincular con Macrosoft)
router.put('/:codCliente/link-macrosoft', controller.updateClientLinkMacrosoft);

// PUT /api/clients/:codCliente (Actualizar Datos Locales)
router.put('/:codCliente', controller.updateClient);

// POST /api/clients/import-react (Importar de React a Local)
router.post('/import-react', controller.importReactClient);

// POST /api/clients/export-react (Exportar de Local a React - Placeholder)
router.post('/export-react', controller.createReactClient);

// POST /api/clients/export-macrosoft (Exportar de Local a Macrosoft)
router.post('/export-macrosoft', controller.createMacrosoftClient);

// DELETE /api/clients/:codCliente (Eliminar cliente local)
router.delete('/:codCliente', controller.deleteClient);

module.exports = router;