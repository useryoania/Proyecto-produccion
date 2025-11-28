import React, { useState, useEffect } from 'react';
import styles from './MachineManagement.module.css';

const MachineManagement = ({ machines, onMachineUpdate, onAddMachine, onDeleteMachine }) => {
  const [filter, setFilter] = useState('ALL');
  const [selectedMachine, setSelectedMachine] = useState(null);

  const filteredMachines = machines.filter(machine => {
    if (filter === 'ALL') return true;
    if (filter === 'OPERATIVO') return machine.status === 'OK';
    if (filter === 'OUT') return machine.status === 'OUT' || machine.status === 'DISUSED';
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'OK': return 'text-green-600';
      case 'FAIL': return 'text-red-600';
      case 'WARN': return 'text-orange-500';
      case 'DISUSED': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'OK': return 'fa-circle-check';
      case 'FAIL': return 'fa-triangle-exclamation';
      case 'WARN': return 'fa-circle-exclamation';
      case 'DISUSED': return 'fa-power-off';
      default: return 'fa-question';
    }
  };

  const handleStatusChange = (machineId, newStatus) => {
    onMachineUpdate(machineId, { status: newStatus });
  };

  return (
    <div className={styles.machineManagement}>
      {/* Header with Filters */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3 className={styles.title}>
            <i className="fa-solid fa-list-ul"></i>
            Inventario de Máquinas
          </h3>
          <div className={styles.filters}>
            <button
              className={`${styles.filterButton} ${filter === 'ALL' ? styles.filterActive : ''}`}
              onClick={() => setFilter('ALL')}
            >
              Todos ({machines.length})
            </button>
            <button
              className={`${styles.filterButton} ${filter === 'OPERATIVO' ? styles.filterActive : ''}`}
              onClick={() => setFilter('OPERATIVO')}
            >
              Operativos ({machines.filter(m => m.status === 'OK').length})
            </button>
            <button
              className={`${styles.filterButton} ${filter === 'OUT' ? styles.filterActive : ''}`}
              onClick={() => setFilter('OUT')}
            >
              Fuera Servicio ({machines.filter(m => m.status === 'OUT' || m.status === 'DISUSED').length})
            </button>
          </div>
        </div>
        
        <button className={styles.addButton} onClick={onAddMachine}>
          <i className="fa-solid fa-plus mr-1"></i>
          Nueva Máquina
        </button>
      </div>

      {/* Machines Table */}
      <div className={styles.tableContainer}>
        <table className={styles.machinesTable}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Área</th>
              <th>Estado</th>
              <th>Capacidad</th>
              <th>Tickets</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredMachines.map(machine => (
              <tr key={machine.id} className={styles.machineRow}>
                <td>
                  <div className={styles.machineName}>
                    <i className="fa-solid fa-print text-blue-500"></i>
                    {machine.name}
                  </div>
                </td>
                <td>
                  <span className={styles.machineType}>{machine.type}</span>
                </td>
                <td>
                  <span className={styles.areaBadge}>{machine.area}</span>
                </td>
                <td>
                  <div className={styles.statusCell}>
                    <span className={`${styles.status} ${getStatusColor(machine.status)}`}>
                      <i className={`fa-solid ${getStatusIcon(machine.status)}`}></i>
                      {machine.status}
                    </span>
                    <select
                      value={machine.status}
                      onChange={(e) => handleStatusChange(machine.id, e.target.value)}
                      className={styles.statusSelect}
                    >
                      <option value="OK">Operativo</option>
                      <option value="WARN">Advertencia</option>
                      <option value="FAIL">Falla</option>
                      <option value="OUT">Fuera Servicio</option>
                      <option value="DISUSED">En Desuso</option>
                    </select>
                  </div>
                </td>
                <td>
                  {machine.capacity && (
                    <span className={styles.capacity}>
                      {machine.capacity}m
                    </span>
                  )}
                </td>
                <td>
                  <span className={styles.ticketCount}>
                    {machine.tickets ? machine.tickets.length : 0}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button 
                      className={styles.actionButton}
                      onClick={() => setSelectedMachine(machine)}
                      title="Ver detalles"
                    >
                      <i className="fa-solid fa-eye"></i>
                    </button>
                    <button 
                      className={styles.actionButton}
                      onClick={() => onDeleteMachine(machine.id)}
                      title="Eliminar máquina"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {filteredMachines.length === 0 && (
        <div className={styles.emptyState}>
          <i className="fa-solid fa-print text-gray-300 text-4xl mb-4"></i>
          <h3 className={styles.emptyTitle}>
            {filter === 'ALL' ? 'No hay máquinas registradas' : 'No se encontraron máquinas'}
          </h3>
          <p className={styles.emptyText}>
            {filter === 'ALL' 
              ? 'Agrega la primera máquina al inventario'
              : `No hay máquinas en estado "${filter}"`
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default MachineManagement;