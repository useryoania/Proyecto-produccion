import api from '../apiClient';

export const stockService = {
    create: async (data) => {
        const response = await api.post('/stock', data);
        return response.data;
    },
    getHistory: async (areaCode) => {
        const response = await api.get(`/stock/history?area=${areaCode}`);
        return response.data;
    },
    getAllRequests: async () => {
        const response = await api.get('/stock/all');
        return response.data;
    },
    updateStatus: async (id, status) => {
        const response = await api.put(`/stock/${id}/status`, { status });
        return response.data;
    },
    searchItems: async (query, areaId) => {
        const url = `/stock/items?q=${query}` + (areaId ? `&areaId=${areaId}` : '');
        const response = await api.get(url);
        return response.data;
    },
    createItem: async (itemData) => {
        const response = await api.post('/stock/items', itemData);
        return response.data;
    },
    getUrgentCount: async () => {
        try {
            const response = await api.get('/stock/urgent-count');
            return response.data.count;
        } catch (error) { return 0; }
    }
};
