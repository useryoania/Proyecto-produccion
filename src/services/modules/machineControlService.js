import api from '../apiClient';

export const machineControlService = {
    getSlots: (machineId) => api.get(`/machine-control/${machineId}/slots`).then(res => res.data),

    // Payload: { action: 'MOUNT'|'UNMOUNT'|'REFILL', bobinaId, insumoId, cantidad, comment }
    executeAction: (machineId, slotId, payload) =>
        api.post(`/machine-control/${machineId}/slots/${slotId}/action`, payload).then(res => res.data),

    getAvailableBobbins: (machineId) => api.get(`/machine-control/${machineId}/available-bobbins`).then(res => res.data)
};
