import api from '../apiClient';

export const receptionService = {
    getInitData: async () => {
        const response = await api.get('/reception/init-data');
        return response.data;
    },
    createReception: async (data) => {
        const response = await api.post('/reception/create', data);
        return response.data;
    },
    getHistory: async (filters) => {
        const params = new URLSearchParams(filters);
        const response = await api.get(`/reception/history?${params.toString()}`);
        return response.data;
    },
    getOrdersByClient: async (cliente) => {
        const response = await api.get(`/reception/orders-by-client?cliente=${encodeURIComponent(cliente)}`);
        return response.data;
    },
    getStock: async () => {
        const response = await api.get('/reception/stock');
        return response.data;
    },
    getOrdersForFabric: async (cliente, area, type) => {
        const response = await api.get(`/reception/orders-for-fabric?cliente=${encodeURIComponent(cliente)}&area=${encodeURIComponent(area || '')}&type=${encodeURIComponent(type || '')}`);
        return response.data;
    }

};
