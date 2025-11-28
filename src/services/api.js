const API_BASE_URL = 'http://localhost:5000/api';

export const apiService = {
  // Órdenes
  async getOrdenes() {
    const response = await fetch(`${API_BASE_URL}/ordenes`);
    return await response.json();
  },

  async getOrdenById(id) {
    const response = await fetch(`${API_BASE_URL}/ordenes/${id}`);
    return await response.json();
  },

  async createOrden(ordenData) {
    const response = await fetch(`${API_BASE_URL}/ordenes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ordenData),
    });
    return await response.json();
  },

  async updateOrden(id, ordenData) {
    const response = await fetch(`${API_BASE_URL}/ordenes/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ordenData),
    });
    return await response.json();
  },

  async deleteOrden(id) {
    const response = await fetch(`${API_BASE_URL}/ordenes/${id}`, {
      method: 'DELETE',
    });
    return await response.json();
  },

  // Máquinas
  async getMaquinas() {
    const response = await fetch(`${API_BASE_URL}/maquinas`);
    return await response.json();
  },

  // Clientes
  async getClientes() {
    const response = await fetch(`${API_BASE_URL}/clientes`);
    return await response.json();
  },

  // Áreas
  async getAreas() {
    const response = await fetch(`${API_BASE_URL}/areas`);
    return await response.json();
  },

  // Archivos
  async getArchivos(ordenId) {
    const response = await fetch(`${API_BASE_URL}/archivos/${ordenId}`);
    return await response.json();
  },

  // Mensajes
  async getMensajes(ordenId) {
    const response = await fetch(`${API_BASE_URL}/mensajes/${ordenId}`);
    return await response.json();
  },

  async sendMensaje(mensajeData) {
    const response = await fetch(`${API_BASE_URL}/mensajes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mensajeData),
    });
    return await response.json();
  },

  // Tickets
  async getTickets() {
    const response = await fetch(`${API_BASE_URL}/tickets`);
    return await response.json();
  },

  // Health check
  async healthCheck() {
    const response = await fetch(`${API_BASE_URL}/health`);
    return await response.json();
  }
};