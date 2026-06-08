import api from '../apiClient';

export const wmsService = {
    getCatalog: async () => {
        const response = await api.get('/wms/catalog');
        return response.data;
    },
    syncCatalog: async () => {
        const response = await api.post('/wms/sync');
        return response.data;
    },
    createOrder: async (orderData) => {
        const response = await api.post('/wms/order', orderData);
        return response.data;
    },
    getExchangeRate: async () => {
        const response = await api.get('/wms/exchange-rate');
        return response.data;
    },
    
    // Logistics
    getPendingOrders: async () => {
        const response = await api.get('/wms-logistica/pending');
        return response.data;
    },
    startPreparation: async (pedidoId) => {
        const response = await api.put(`/wms-logistica/start/${pedidoId}`);
        return response.data;
    },
    confirmPreparation: async (pedidoId) => {
        const response = await api.put(`/wms-logistica/confirm/${pedidoId}`);
        return response.data;
    },
    getPreparedOrders: async () => {
        const response = await api.get('/wms-logistica/prepared');
        return response.data;
    },
    receivePreparedOrder: async (pedidoId) => {
        const response = await api.put(`/wms-logistica/receive/${pedidoId}`);
        return response.data;
    },
    updateItemQuantity: async (pedidoId, data) => {
        const response = await api.put(`/wms-logistica/update-item/${pedidoId}`, data);
        return response.data;
    },
    deleteItem: async (pedidoId, wms_variante_id) => {
        const response = await api.delete(`/wms-logistica/delete-item/${pedidoId}/${wms_variante_id}`);
        return response.data;
    },
    cancelOrder: async (pedidoId) => {
        const response = await api.put(`/wms-logistica/cancel/${pedidoId}`);
        return response.data;
    },
    markDelivered: async (pedidoId) => {
        const response = await api.put(`/wms-logistica/deliver/${pedidoId}`);
        return response.data;
    }
};
