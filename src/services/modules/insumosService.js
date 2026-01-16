import api from '../apiClient';

export const insumosService = {
    getAll: async () => {
        const response = await api.get('/insumos');
        return response.data;
    },
    create: async (data) => {
        const response = await api.post('/insumos', data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await api.put(`/insumos/${id}`, data);
        return response.data;
    },
    delete: async (id) => {
        const response = await api.delete(`/insumos/${id}`);
        return response.data;
    },
    getInventoryByArea: async (areaId) => {
        const response = await api.get(`/inventory/area?areaId=${areaId}`);
        return response.data;
    }
};
