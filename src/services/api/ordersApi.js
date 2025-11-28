// services/api/ordersApi.js
import { baseApi } from './baseApi';

export const ordersApi = {
  // Obtener órdenes por área
  getOrdersByArea: async (areaKey, filters = {}) => {
    const response = await baseApi.get(`/orders/area/${areaKey}`, { params: filters });
    return response.data;
  },

  // Crear nueva orden
  createOrder: async (orderData) => {
    const response = await baseApi.post('/orders', orderData);
    return response.data;
  },

  // Actualizar orden
  updateOrder: async (orderId, updates) => {
    const response = await baseApi.patch(`/orders/${orderId}`, updates);
    return response.data;
  },

  // Obtener configuración de área
  getAreaConfig: async (areaKey) => {
    const response = await baseApi.get(`/areas/${areaKey}/config`);
    return response.data;
  }
};