const driveService = require('../services/driveService');

async function saveTokenManual() {
    const code = '4/0AfrIepBkbSO8V0seBONTi9yLjTDSMimEVscLyYSDiGXoRThaG0gvQLYELBvaH6RYviUpog'; // Código del usuario
    console.log(`Intentando guardar token con código: ${code}`);

    try {
        const result = await driveService.saveToken(code);
        if (result) {
            console.log("✅ Token guardado EXITOSAMENTE en token.json");
        } else {
            console.error("❌ Error al guardar el token (retornó false)");
        }
    } catch (e) {
        console.error("❌ Excepción al guardar token:", e);
    }
}

saveTokenManual();
