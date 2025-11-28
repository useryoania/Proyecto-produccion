import React, { useState } from 'react';
import styles from './TicketSystem.module.css';

const TicketSystem = ({ tickets, machines, onCreateTicket, onUpdateTicket, onDeleteTicket }) => {
  const [filter, setFilter] = useState('ALL');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newTicket, setNewTicket] = useState({
    title: '',
    machineId: '',
    description: '',
    priority: 'MEDIA'
  });

  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'ALL') return true;
    return ticket.status === filter;
  });

  const handleCreateTicket = () => {
    if (newTicket.title && newTicket.machineId) {
      onCreateTicket({
        ...newTicket,
        id: `T-${Date.now()}`,
        date: new Date().toLocaleDateString('es-ES'),
        status: 'OPEN',
        comments: []
      });
      setNewTicket({ title: '', machineId: '', description: '', priority: 'MEDIA' });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return 'bg-red-100 text-red-700';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-700';
      case 'CLOSED': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'ALTA': return 'bg-red-100 text-red-700';
      case 'MEDIA': return 'bg-yellow-100 text-yellow-700';
      case 'BAJA': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className={styles.ticketSystem}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>
          <i className="fa-solid fa-ticket"></i>
          Sistema de Tickets
        </h3>
        <div className={styles.filters}>
          <button
            className={`${styles.filterButton} ${filter === 'ALL' ? styles.filterActive : ''}`}
            onClick={() => setFilter('ALL')}
          >
            Todos
          </button>
          <button
            className={`${styles.filterButton} ${filter === 'OPEN' ? styles.filterActive : ''}`}
            onClick={() => setFilter('OPEN')}
          >
            Abiertos
          </button>
          <button
            className={`${styles.filterButton} ${filter === 'IN_PROGRESS' ? styles.filterActive : ''}`}
            onClick={() => setFilter('IN_PROGRESS')}
          >
            En Proceso
          </button>
          <button
            className={`${styles.filterButton} ${filter === 'CLOSED' ? styles.filterActive : ''}`}
            onClick={() => setFilter('CLOSED')}
          >
            Cerrados
          </button>
        </div>
      </div>

      {/* New Ticket Form */}
      <div className={styles.newTicketForm}>
        <h4 className={styles.formTitle}>Nuevo Ticket</h4>
        <div className={styles.formGrid}>
          <input
            type="text"
            placeholder="Título del ticket..."
            value={newTicket.title}
            onChange={(e) => setNewTicket({...newTicket, title: e.target.value})}
            className={styles.formInput}
          />
          <select
            value={newTicket.machineId}
            onChange={(e) => setNewTicket({...newTicket, machineId: e.target.value})}
            className={styles.formSelect}
          >
            <option value="">Seleccionar máquina</option>
            {machines.map(machine => (
              <option key={machine.id} value={machine.id}>
                {machine.name}
              </option>
            ))}
          </select>
          <select
            value={newTicket.priority}
            onChange={(e) => setNewTicket({...newTicket, priority: e.target.value})}
            className={styles.formSelect}
          >
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Media</option>
            <option value="BAJA">Baja</option>
          </select>
          <button 
            className={styles.submitButton}
            onClick={handleCreateTicket}
            disabled={!newTicket.title || !newTicket.machineId}
          >
            Crear Ticket
          </button>
        </div>
        <textarea
          placeholder="Descripción del problema..."
          value={newTicket.description}
          onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
          className={styles.formTextarea}
        />
      </div>

      {/* Tickets List */}
      <div className={styles.ticketsList}>
        {filteredTickets.map(ticket => (
          <div key={ticket.id} className={styles.ticketCard}>
            <div className={styles.ticketHeader}>
              <div className={styles.ticketInfo}>
                <span className={styles.ticketId}>{ticket.id}</span>
                <span className={styles.ticketMachine}>
                  {machines.find(m => m.id === ticket.machineId)?.name}
                </span>
              </div>
              <div className={styles.ticketStatus}>
                <span className={`${styles.statusBadge} ${getStatusColor(ticket.status)}`}>
                  {ticket.status}
                </span>
                <span className={`${styles.priorityBadge} ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority}
                </span>
              </div>
            </div>
            
            <h4 className={styles.ticketTitle}>{ticket.title}</h4>
            <p className={styles.ticketDescription}>{ticket.description}</p>
            
            <div className={styles.ticketFooter}>
              <span className={styles.ticketDate}>{ticket.date}</span>
              <div className={styles.ticketActions}>
                <button 
                  className={styles.actionButton}
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <i className="fa-solid fa-eye"></i>
                  Ver
                </button>
                <button 
                  className={styles.actionButton}
                  onClick={() => onUpdateTicket(ticket.id, { status: 'CLOSED' })}
                >
                  <i className="fa-solid fa-check"></i>
                  Cerrar
                </button>
                <button 
                  className={styles.deleteButton}
                  onClick={() => onDeleteTicket(ticket.id)}
                >
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTickets.length === 0 && (
        <div className={styles.emptyState}>
          <i className="fa-solid fa-ticket text-gray-300 text-4xl mb-4"></i>
          <h3 className={styles.emptyTitle}>
            {filter === 'ALL' ? 'No hay tickets' : `No hay tickets ${filter.toLowerCase()}`}
          </h3>
        </div>
      )}
    </div>
  );
};

export default TicketSystem;