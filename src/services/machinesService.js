import { mockMachines } from '../data/mockData';

const simulateApiCall = (data, delay = 500) => 
  new Promise((resolve) => setTimeout(() => resolve(data), delay));

export const machinesService = {
  getAll: async () => {
    return simulateApiCall(mockMachines);
  },

  getById: async (id) => {
    const machine = mockMachines.find(machine => machine.id === id);
    return simulateApiCall(machine);
  },

  getByArea: async (area) => {
    const machines = mockMachines.filter(machine => machine.area === area);
    return simulateApiCall(machines);
  },

  updateStatus: async (id, status) => {
    const machine = mockMachines.find(m => m.id === id);
    if (machine) {
      machine.status = status;
      return simulateApiCall(machine);
    }
    throw new Error('Machine not found');
  },

  createTicket: async (machineId, ticketData) => {
    const machine = mockMachines.find(m => m.id === machineId);
    if (machine) {
      const newTicket = {
        id: `T-${Date.now()}`,
        ...ticketData,
        date: new Date().toLocaleDateString('es-ES'),
        status: 'OPEN'
      };
      
      if (!machine.tickets) machine.tickets = [];
      machine.tickets.push(newTicket);
      
      return simulateApiCall(newTicket);
    }
    throw new Error('Machine not found');
  }
};