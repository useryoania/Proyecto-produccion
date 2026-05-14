const fs = require('fs');
function analyzeJSX(file) {
    let code = fs.readFileSync(file, 'utf8');
    const returnMatch = code.match(/return \([\s\S]+/);
    if (returnMatch) {
        let block = returnMatch[0];
        // Strip out comments to avoid counting <div inside comments
        block = block.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
        // Strip out strings to avoid counting <div inside strings
        block = block.replace(/\"[^\"]*\"/g, '');
        block = block.replace(/\'[^\']*\'/g, '');
        block = block.replace(/\`[^\`]*\`/g, '');
        
        const opens = (block.match(/<div/g) || []).length;
        const closes = (block.match(/<\/div>/g) || []).length;
        console.log(file, 'Opens:', opens, 'Closes:', closes);
        
        if (opens !== closes) {
            console.log('Mismatch in', file);
            if (opens === closes + 1) {
                 const newCode = code.replace(/(\s*)\}\;\s*(export default|)$/, '\n</div>$1};\n$2');
                 fs.writeFileSync(file, newCode, 'utf8');
                 console.log('Fixed missing </div>');
            } else if (closes === opens + 1) {
                 const newCode = code.replace(/<\/div>(\s*)\}\;\s*(export default|)$/m, '$1};\n$2');
                 fs.writeFileSync(file, newCode, 'utf8');
                 console.log('Fixed extra </div>');
            }
        }
    }
}
const files = [
  'c:/Integracion/User-Macrosoft/Proyecto-produccion/src/components/modals/config/ConfigInsumosModal.jsx',
  'c:/Integracion/User-Macrosoft/Proyecto-produccion/src/components/modals/config/ConfigPrintersModal.jsx',
  'c:/Integracion/User-Macrosoft/Proyecto-produccion/src/components/modals/config/ConfigStatusesModal.jsx',
  'c:/Integracion/User-Macrosoft/Proyecto-produccion/src/components/modals/config/ConfigFlowsModal.jsx',
  'c:/Integracion/User-Macrosoft/Proyecto-produccion/src/components/modals/config/ConfigDeliveryTimesModal.jsx',
  'c:/Integracion/User-Macrosoft/Proyecto-produccion/src/components/modals/config/ConfigRouteRulesModal.jsx',
  'c:/Integracion/User-Macrosoft/Proyecto-produccion/src/components/modals/FabricAssignmentModal.jsx',
  'c:/Integracion/User-Macrosoft/Proyecto-produccion/src/components/modals/ImportLogModal.jsx',
  'c:/Integracion/User-Macrosoft/Proyecto-produccion/src/components/modals/PedidoModal.jsx',
  'c:/Integracion/User-Macrosoft/Proyecto-produccion/src/components/modals/SettingsModal.jsx',
  'c:/Integracion/User-Macrosoft/Proyecto-produccion/src/components/modals/SlotActionModal.jsx'
];
files.forEach(analyzeJSX);
