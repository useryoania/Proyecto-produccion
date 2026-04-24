const fs = require('fs');
const file = 'backend/routes/contabilidadRoutes.js';
let c = fs.readFileSync(file, 'utf8');
if (!c.includes('tipos-movimiento')) {
  const add = "\nrouter.get('/tipos-movimiento', ctrl.getTiposMovimiento);\nrouter.patch('/tipos-movimiento/:TmoId', ctrl.updateTipoMovimiento);\n";
  c = c.replace('module.exports = router;', add + 'module.exports = router;');
  fs.writeFileSync(file, c, 'utf8');
  console.log('OK: routes added');
} else {
  console.log('Already present');
}
