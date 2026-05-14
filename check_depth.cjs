const fs = require('fs');
let code = fs.readFileSync('c:/Integracion/User-Macrosoft/Proyecto-produccion/src/components/modals/config/ConfigStatusesModal.jsx', 'utf8');

// replace all strings and comments to avoid false positives
code = code.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
code = code.replace(/"[^"]*"/g, '');
code = code.replace(/'[^']*'/g, '');
code = code.replace(/`[^`]*`/g, '');

const lines = code.split('\n');
let depth = 0;
let insideReturn = false;

for(let i=0; i<lines.length; i++) {
   if (lines[i].includes('return (')) insideReturn = true;
   
   if (insideReturn) {
       const opens = (lines[i].match(/<div/g) || []).length;
       const closes = (lines[i].match(/<\/div>/g) || []).length;
       depth += opens - closes;
       
       if (opens > 0 || closes > 0) {
           console.log(`Line ${i+1}: Opens ${opens}, Closes ${closes}, Depth ${depth}`);
       }
       
       if (depth === 0 && closes > 0) {
           console.log('Root closed at line', i+1);
           insideReturn = false;
       }
   }
}
