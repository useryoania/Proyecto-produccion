import { mockOrders } from '../data/mockData';

// Simulación de API
const simulateApiCall = (data, delay = 500) => 
  new Promise((resolve) => setTimeout(() => resolve(data), delay));

export const ordersService = {
  getAll: async () => {
    return simulateApiCall(mockOrders);
  },

  getById: async (id) => {
    const order = mockOrders.find(order => order.id === id);
    return simulateApiCall(order);
  },

  getByFilters: async (filters) => {
    let filteredOrders = [...mockOrders];
    
    if (filters.area) {
      filteredOrders = filteredOrders.filter(order => order.area === filters.area);
    }
    
    if (filters.status) {
      filteredOrders = filteredOrders.filter(order => order.status === filters.status);
    }
    
    if (filters.client) {
      filteredOrders = filteredOrders.filter(order => 
        order.client.toLowerCase().includes(filters.client.toLowerCase())
      );
    }

    return simulateApiCall(filteredOrders);
  },

  create: async (orderData) => {
    const newOrder = {
      id: `ORD-${Date.now()}`,
      ...orderData,
      entryDate: new Date().toISOString(),
      status: 'Pendiente',
      progress: 0
    };
    
    mockOrders.unshift(newOrder);
    return simulateApiCall(newOrder);
  },

  update: async (id, updates) => {
    const index = mockOrders.findIndex(order => order.id === id);
    if (index !== -1) {
      mockOrders[index] = { ...mockOrders[index], ...updates };
      return simulateApiCall(mockOrders[index]);
    }
    throw new Error('Order not found');
  },

  delete: async (id) => {
    const index = mockOrders.findIndex(order => order.id === id);
    if (index !== -1) {
      mockOrders.splice(index, 1);
      return simulateApiCall({ success: true });
    }
    throw new Error('Order not found');
  }
};