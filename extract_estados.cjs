const fs = require('fs');
const path = require('path');
function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) { 
            results = results.concat(walk(file));
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            results.push(file);
        }
    });
    return results;
}
const files = walk('c:/Integracion/User-Macrosoft/Proyecto-produccion');
const estados = new Set();
const estadosLogistica = new Set();
const estadosEnArea = new Set();
files.forEach(file => {
    const code = fs.readFileSync(file, 'utf8');
    const matchesEstado = code.matchAll(/\bestado(?:s)?\s*(?:===|==|:|=)\s*['"]([^'"]+)['"]/gi);
    for (const match of matchesEstado) estados.add(match[1]);
    const matchesLogistica = code.matchAll(/\bEstadoLogistica\s*(?:===|==|:|=)\s*['"]([^'"]+)['"]/gi);
    for (const match of matchesLogistica) estadosLogistica.add(match[1]);
    const matchesArea = code.matchAll(/\bEstadoEnArea\s*(?:===|==|:|=)\s*['"]([^'"]+)['"]/gi);
    for (const match of matchesArea) estadosEnArea.add(match[1]);
});
console.log('ESTADO:', Array.from(estados).join(', '));
console.log('ESTADO LOGISTICA:', Array.from(estadosLogistica).join(', '));
console.log('ESTADO EN AREA:', Array.from(estadosEnArea).join(', '));
