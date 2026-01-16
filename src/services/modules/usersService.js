import api from '../apiClient';

export const usersService = {
    getAll: async () => {
        try {
            const response = await api.get('/users');
            return response.data;
        } catch (error) {
            console.error("❌ Error fetching users:", error);
            throw error;
        }
    },

    create: async (data) => {
        try {
            const response = await api.post('/users', data);
            return response.data;
        } catch (error) {
            console.error("❌ Error creating user:", error);
            throw error;
        }
    },

    update: async (id, data) => {
        try {
            const response = await api.put(`/users/${id}`, data);
            return response.data;
        } catch (error) {
            console.error("❌ Error updating user:", error);
            throw error;
        }
    },

    delete: async (id) => {
        try {
            const response = await api.delete(`/users/${id}`);
            return response.data;
        } catch (error) {
            console.error("❌ Error deleting user:", error);
            throw error;
        }
    }
};
