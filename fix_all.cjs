const fs = require('fs');

const files = [
  'c:/Integracion/User-Macrosoft/Proyecto-produccion/src/components/modals/config/ConfigPrintersModal.jsx',
  'c:/Integracion/User-Macrosoft/Proyecto-produccion/src/components/modals/config/ConfigStatusesModal.jsx',
  'c:/Integracion/User-Macrosoft/Proyecto-produccion/src/components/modals/FabricAssignmentModal.jsx',
  'c:/Integracion/User-Macrosoft/Proyecto-produccion/src/components/modals/ImportLogModal.jsx',
  'c:/Integracion/User-Macrosoft/Proyecto-produccion/src/components/modals/PedidoModal.jsx',
  'c:/Integracion/User-Macrosoft/Proyecto-produccion/src/components/modals/SettingsModal.jsx',
  'c:/Integracion/User-Macrosoft/Proyecto-produccion/src/components/modals/SlotActionModal.jsx'
];

for (const f of files) {
   let text = fs.readFileSync(f, 'utf8');
   if (text.includes('return (\n        <div className="bg-white')) {
       text = text.replace('return (\n        <div className="bg-white', 'return (\n        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4 animate-in fade-in duration-200">\n            <div className="bg-white');
       fs.writeFileSync(f, text, 'utf8');
       console.log('Fixed', f);
   } else if (text.includes('return (\r\n        <div className="bg-white')) {
       text = text.replace('return (\r\n        <div className="bg-white', 'return (\r\n        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4 animate-in fade-in duration-200">\r\n            <div className="bg-white');
       fs.writeFileSync(f, text, 'utf8');
       console.log('Fixed', f);
   }
}
console.log('Done check');
