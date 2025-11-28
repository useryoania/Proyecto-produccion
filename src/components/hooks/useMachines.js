import { useState, useEffect } from 'react';
import { machinesService } from '../services/machinesService';

export const useMachines = () => {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMachines();
  }, []);

  const loadMachines = async () => {
    try {
      setLoading(true);
      const data = await machinesService.getAll();
      setMachines(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateMachineStatus = async (machineId, status) => {
    try {
      const updatedMachine = await machinesService.updateStatus(machineId, status);
      setMachines(prev => prev.map(machine =>
        machine.id === machineId ? updatedMachine : machine
      ));
      return updatedMachine;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const createTicket = async (machineId, ticketData) => {
    try {
      const newTicket = await machinesService.createTicket(machineId, ticketData);
      // Actualizar la máquina con el nuevo ticket
      await loadMachines();
      return newTicket;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    machines,
    loading,
    error,
    updateMachineStatus,
    createTicket,
    reload: loadMachines
  };
};