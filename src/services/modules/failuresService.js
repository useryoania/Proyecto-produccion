import api from '../apiClient';

export const failuresService = {
    getAll: async () => {
        const response = await api.get('/failures');
        return response.data;
    },
    getMachines: async (areaCode) => {
        const response = await api.get(`/failures/machines?area=${areaCode}`);
        return response.data;
    },
    searchTitles: async (query, areaCode) => {
        const response = await api.get(`/failures/titles?q=${query}&area=${areaCode}`);
        return response.data;
    },
    createType: async (data) => {
        const response = await api.post('/failures/titles', data);
        return response.data;
    },
    create: async (data) => {
        const response = await api.post('/failures', data);
        return response.data;
    },
    getHistory: async (areaCode) => {
        const response = await api.get(`/failures/history?area=${areaCode}`);
        return response.data;
    }
};
