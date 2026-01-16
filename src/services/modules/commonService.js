import api from '../apiClient';

export const clientsService = {
    search: async (query) => {
        const response = await api.get(`/clients/search?q=${query}`);
        return response.data;
    },
    create: async (data) => {
        const response = await api.post('/clients', data);
        return response.data;
    }
};

export const workflowsService = {
    getAll: async () => {
        const response = await api.get('/workflows');
        return response.data;
    },
    create: async (data) => {
        const response = await api.post('/workflows', data);
        return response.data;
    },
    delete: async (id) => {
        const response = await api.delete(`/workflows/${id}`);
        return response.data;
    }
};

export const externalService = {
    syncOrders: async () => {
        // const response = await api.get('/import/sync');
        const response = await api.post('/rest-sync/run')
        return response.data;
    }
};
