import axios from 'axios';

const API_BASE = '/api/labels';

/**
 * Cancel (delete) a label / bulto.
 * @param {number} etiquetaId - ID of the Etiqueta to cancel.
 * @returns {Promise<Object>} API response data.
 */
export const cancelLabel = async (etiquetaId) => {
    const response = await axios.delete(`${API_BASE}/${etiquetaId}`);
    return response.data;
};
