import api from '../apiClient';

export const menuService = {
    getByUser: async (userId) => {
        try {
            const response = await api.get(`/menu/user/${userId}`);
            return Array.isArray(response.data) ? response.data : [];
        } catch (error) {
            console.error("❌ Error fetching menu items:", error);
            return [];
        }
    },

    // --- ADMIN METHODS ---
    getAll: async () => {
        const response = await api.get('/menu');
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/menu', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.put(`/menu/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/menu/${id}`);
        return response.data;
    },

    reorder: async (items) => {
        const response = await api.post('/menu/reorder', { items });
        return response.data;
    }
};
