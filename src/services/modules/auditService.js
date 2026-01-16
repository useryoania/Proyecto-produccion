import api from '../apiClient';

export const auditService = {
    getAll: async () => {
        try {
            const response = await api.get('/audit');
            return Array.isArray(response.data) ? response.data : [];
        } catch (error) {
            console.error("❌ Error fetching audit logs:", error);
            return [];
        }
    }
};
