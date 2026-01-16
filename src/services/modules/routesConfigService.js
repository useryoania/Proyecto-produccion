import api from '../apiClient';

export const routesConfigService = {
    getAll: async () => {
        const response = await api.get('/routes-config');
        return response.data;
    },
    create: async (data) => {
        const response = await api.post('/routes-config', data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await api.put(`/routes-config/${id}`, data);
        return response.data;
    },
    delete: async (id) => {
        const response = await api.delete(`/routes-config/${id}`);
        return response.data;
    }
};
