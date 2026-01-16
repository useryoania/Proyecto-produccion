import api from '../apiClient';

export const deliveryTimesService = {
    getAll: async () => {
        const response = await api.get('/delivery-times');
        return response.data;
    },
    create: async (data) => {
        const response = await api.post('/delivery-times', data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await api.put(`/delivery-times/${id}`, data);
        return response.data;
    },
    delete: async (id) => {
        const response = await api.delete(`/delivery-times/${id}`);
        return response.data;
    }
};
