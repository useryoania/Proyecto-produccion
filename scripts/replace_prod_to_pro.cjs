const fs = require('fs');
const path = require('path');

const rootDir = path.dirname(__dirname); // C:/Integracion/User-Macrosoft/Proyecto-produccion
const targetDirs = [
    path.join(rootDir, 'backend'),
    path.join(rootDir, 'src')
];

function processDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            if (file === 'node_modules' || file === '.git' || file === 'build' || file === 'dist') continue;
            processDirectory(fullPath);
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let newContent = content.replace(/ProdIdProducto/g, 'ProIdProducto');
            newContent = newContent.replace(/prodIdProducto/g, 'proIdProducto');
            if (content !== newContent) {
                fs.writeFileSync(fullPath, newContent, 'utf8');
                console.log(`Updated: ${fullPath.replace(rootDir, '')}`);
            }
        }
    }
}

targetDirs.forEach(dir => processDirectory(dir));
console.log("Completado");
