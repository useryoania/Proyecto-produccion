const axios = require('axios');
const fs = require('fs');

async function getWmsCatalog() {
    try {
        const res = await axios.post('https://administracionuser.uy/api/sql', {
            query: "USE Ventas_Dev; SELECT id, nombre FROM Stock_Productos_Maestros ORDER BY nombre;"
        });
        
        let md = '# Catálogo Maestro WMS\n\n| ID Maestro | Nombre |\n|---|---|\n';
        const data = Array.isArray(res.data) ? res.data : (res.data.data || res.data.recordset || []);
        data.forEach(r => {
            md += `| ${r.id} | ${r.nombre} |\n`;
        });
        
        fs.writeFileSync('C:/Users/Admin/.gemini/antigravity/brain/651ca204-8027-484f-ac1a-6b9f61c14498/wms_catalog.md', md);
        console.log('Catálogo WMS guardado con éxito. Filas:', data.length);
    } catch (err) {
        console.error('Error fetching WMS catalog:', err.message);
    }
}

getWmsCatalog();
