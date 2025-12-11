// C:\sistema-produccion\backend-externo\controllers\exportacion.controller.js

const exportacionService = require('../service/exportacion.service'); 

// 1. Controlador para la lista de pedidos (la consulta grande)
const exportarPedidos = async (req, res) => {
    try {
        const data = await exportacionService.getPedidos();
        res.status(200).json({ message: `Exportación exitosa.`, data: data });
    } catch (error) {
        res.status(500).json({ message: "Error interno del servidor.", details: error.message });
    }
};

// 2. Controlador para la búsqueda de identificadores (nuevo)
const exportarIdentificadores = async (req, res) => {
    try {
        const { codDoc } = req.params;
        
        if (!codDoc) {
            return res.status(400).json({ message: "Falta el parámetro CodDoc." });
        }

        const data = await exportacionService.getIdentificadores(codDoc);

        if (data.length === 0) {
            return res.status(404).json({ message: `No se encontraron identificadores para el documento ${codDoc}.` });
        }

        res.status(200).json({ message: `Identificadores encontrados.`, data: data });
    } catch (error) {
        console.error("❌ Error en el controlador exportarIdentificadores:", error);
        res.status(500).json({ message: "Error interno del servidor.", details: error.message });
    }
};

module.exports = { 
    exportarPedidos,
    exportarIdentificadores 
};