import api from '../apiClient';

export const areasService = {
    getAll: async (params = {}) => {
        try {
            const response = await api.get('/areas', { params });
            // Mapeo explicito para asegurar compatibilidad con frontend que usa 'code' y 'name'
            return Array.isArray(response.data) ? response.data.map(area => ({
                code: area.AreaID, // El front usa 'code' como ID
                name: area.Nombre,
                category: area.Categoria,
                icon: area.RenderKey,
                ...area
            })) : [];
        } catch (error) {
            console.error("❌ Error fetching areas:", error);
            return [];
        }
    },
    getDetails: async (code) => {
        try {
            const response = await api.get(`/areas/${code}/details`);
            return response.data || { equipos: [], insumos: [], columnas: [], estados: [] };
        } catch (error) {
            console.error("Error getDetails:", error);
            return { equipos: [], insumos: [], columnas: [], estados: [] };
        }
    },
    getDictionary: async () => {
        try {
            const response = await api.get('/areas/dictionary');
            return response.data;
        } catch (error) { return []; }
    },
    saveColumns: async (data) => {
        const response = await api.post('/areas/columns', data);
        return response.data;
    },
    addStatus: async (data) => {
        const response = await api.post('/areas/status', data);
        return response.data;
    },
    updateStatus: async (id, data) => {
        const response = await api.put(`/areas/status/${id}`, data);
        return response.data;
    },
    deleteStatus: async (id) => {
        const response = await api.delete(`/areas/status/${id}`);
        return response.data;
    },
    updatePrinter: async (id, data) => {
        const response = await api.put(`/areas/printer/${id}`, data);
        return response.data;
    },
    addPrinter: async (data) => {
        const response = await api.post('/areas/printer', data);
        return response.data;
    },
    toggleInsumo: async (data) => {
        const response = await api.post('/areas/insumo-link', data);
        return response.data;
    },
    updateConfig: async (code, newConfig) => {
        const response = await api.put(`/areas/${code}/config`, { ui_config: newConfig });
        return response.data;
    },
    deletePrinter: async (id) => {
        const response = await api.delete(`/areas/printer/${id}`);
        return response.data;
    }
};
