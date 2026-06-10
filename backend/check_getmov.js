const contabilidadService = require('./services/contabilidadService');
async function run() {
  try {
    const data = await contabilidadService.getMovimientos(5, new Date('2026-05-10'), new Date('2026-06-10'), 300);
    console.log(JSON.stringify(data, null, 2));
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
