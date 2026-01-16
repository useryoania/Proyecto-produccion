import api from '../apiClient';

export const rolesService = {
    getAll: async () => {
        try {
            const response = await api.get('/roles');
            return response.data;
        } catch (error) {
            console.error("❌ Error fetching roles:", error);
            throw error;
        }
    },

    create: async (data) => {
        try {
            const response = await api.post('/roles', data);
            return response.data;
        } catch (error) {
            console.error("❌ Error creating role:", error);
            throw error;
        }
    },

    update: async (id, data) => {
        try {
            const response = await api.put(`/roles/${id}`, data);
            return response.data;
        } catch (error) {
            console.error("❌ Error updating role:", error);
            throw error;
        }
    },

    delete: async (id) => {
        try {
            const response = await api.delete(`/roles/${id}`);
            return response.data;
        } catch (error) {
            console.error("❌ Error deleting role:", error);
            throw error;
        }
    },

    getPermissions: async (id) => {
        try {
            const response = await api.get(`/roles/${id}/permissions`);
            return response.data;
        } catch (error) {
            console.error("❌ Error fetching role permissions:", error);
            throw error;
        }
    },

    updatePermissions: async (id, moduleIds) => {
        try {
            const response = await api.post(`/roles/${id}/permissions`, { moduleIds });
            return response.data;
        } catch (error) {
            console.error("❌ Error updating role permissions:", error);
            throw error;
        }
    }
};
