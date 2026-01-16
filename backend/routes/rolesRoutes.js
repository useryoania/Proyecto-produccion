const express = require('express');
const router = express.Router();
const rolesController = require('../controllers/rolesController');

router.get('/', rolesController.getAll);
router.post('/', rolesController.create);
router.put('/:id', rolesController.update);
router.delete('/:id', rolesController.delete);
router.get('/:id/permissions', rolesController.getPermissions);
router.post('/:id/permissions', rolesController.updatePermissions);

module.exports = router;
