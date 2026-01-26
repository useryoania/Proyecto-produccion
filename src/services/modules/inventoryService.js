import api from '../api';

export const inventoryService = {
    // Obtener inventario detallado por área
    getInventoryByArea: async (areaId) => {
        const response = await api.get(`/inventory/area?areaId=${areaId}`);
        return response.data;
    },

    // Reporte de consumo
    getReport: async (params) => {
        // params: { startDate, endDate, areaId }
        const response = await api.get('/inventory/report', { params });
        return response.data;
    },

    // Agregar Stock (Recepcion)
    addStock: async (data) => {
        // data: { insumoId, areaId, metros, cantidadBobinas, loteProv, codigoBarraBase }
        const response = await api.post('/inventory/stock/add', data);
        return response.data;
    },

    // Cerrar Bobina (Calculo Desecho)
    closeBobina: async (data) => {
        const response = await api.post('/inventory/stock/close', data);
        return response.data;
    },

    // Ajuste Manual (Sin Cierre)
    adjustBobina: async (data) => {
        const response = await api.post('/inventory/stock/adjust', data);
        return response.data;
    },

    // Historial
    getBobinaHistory: async (code) => {
        const response = await api.get(`/inventory/stock/history?code=${code}`);
        return response.data;
    },

    // CRUD Insumos
    getInsumos: async () => {
        const response = await api.get('/inventory/insumos');
        return response.data;
    },

    createInsumo: async (data) => {
        const response = await api.post('/inventory/insumos', data);
        return response.data;
    },

    updateInsumo: async (id, data) => {
        const response = await api.put(`/inventory/insumos/${id}`, data);
        return response.data;
    },

    deleteInsumo: async (id) => {
        const response = await api.delete(`/inventory/insumos/${id}`);
        return response.data;
    }
};
