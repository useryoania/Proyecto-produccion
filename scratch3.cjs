const fs = require('fs');
const lines = fs.readFileSync('backend/logs/combined-2026-04-08.log', 'utf8').split('\n');
let capture = false;
let jsonStr = '';
for (const line of lines) {
    if (line.includes('Inyectando JSON complejo de orden: DF-90968')) {
        capture = true;
    } else if (capture && line.includes('Iniciando proceso de creación desde Planilla')) {
        capture = false;
        break;
    } else if (capture) {
        // usually it's pretty printed
        // but if it's on one line, we might need to parse differently
        jsonStr += line + '\n';
    }
}
fs.writeFileSync('scratch3.json', jsonStr);
