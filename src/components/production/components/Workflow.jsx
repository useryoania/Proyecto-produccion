import React, { useState, useEffect } from 'react';
import styles from './Workflow.module.css';

const Workflow = ({ orders }) => {
  const [workflows, setWorkflows] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    generateWorkflows();
  }, [orders]);

  const generateWorkflows = () => {
    const coordOrders = orders.filter(order => order.area === 'COORD');
    
    const generatedWorkflows = coordOrders.map(order => ({
      id: order.id,
      client: order.client,
      product: order.desc,
      status: order.status,
      progress: order.progress || 30,
      flow: order.flow || 'Diseño > Sub > Costura',
      currentStep: getCurrentStep(order.status),
      steps: generateSteps(order),
      priority: order.priority,
      supply: order.supply || 'Stock OK',
      source: order.source || 'Propia',
      lastUpdate: 'Hace 2h',
      assignedTo: 'Coordinación Central'
    }));

    setWorkflows(generatedWorkflows);
  };

  const getCurrentStep = (status) => {
    const stepMap = {
      'Pendiente': 0,
      'Diseño': 1,
      'En Proceso': 2,
      'Producción': 3,
      'Finalizado': 4
    };
    return stepMap[status] || 0;
  };

  const generateSteps = (order) => {
    return [
      { name: 'Ingreso', status: 'completed', area: 'COORD', time: '22/11 09:00' },
      { name: 'Diseño', status: 'completed', area: 'DISEÑO', time: '22/11 10:30' },
      { name: 'Producción', status: order.status === 'En Proceso' ? 'active' : 'pending', area: 'PRODUCCIÓN', time: 'En proceso' },
      { name: 'Control Calidad', status: 'pending', area: 'CALIDAD', time: 'Pendiente' },
      { name: 'Empaque', status: 'pending', area: 'LOGÍSTICA', time: 'Pendiente' }
    ];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'En Proceso': return 'bg-blue-100 text-blue-700';
      case 'Pendiente': return 'bg-yellow-100 text-yellow-700';
      case 'Finalizado': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStepStatusIcon = (status) => {
    switch (status) {
      case 'completed': return 'fa-solid fa-check-circle text-green-500';
      case 'active': return 'fa-solid fa-play-circle text-blue-500 animate-pulse';
      case 'pending': return 'fa-regular fa-clock text-gray-400';
      default: return 'fa-regular fa-circle text-gray-300';
    }
  };

  const filteredWorkflows = workflows.filter(workflow => {
    if (filter === 'all') return true;
    if (filter === 'active') return workflow.status === 'En Proceso';
    if (filter === 'pending') return workflow.status === 'Pendiente';
    if (filter === 'completed') return workflow.status === 'Finalizado';
    return true;
  });

  const getProgressColor = (progress) => {
    if (progress < 30) return 'bg-red-500';
    if (progress < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className={styles.flowsContainer}>
      <div className={styles.flowsHeader}>
        <div>
          <h2 className={styles.title}>
            <i className="fa-solid fa-diagram-project"></i>
            Flujos de Trabajo
          </h2>
          <p className={styles.subtitle}>
            Estado integral de órdenes multidepartamento
          </p>
        </div>

        <div className={styles.filters}>
          <button
            className={`${styles.filterButton} ${filter === 'all' ? styles.filterActive : ''}`}
            onClick={() => setFilter('all')}
          >
            Todos ({workflows.length})
          </button>
          <button
            className={`${styles.filterButton} ${filter === 'active' ? styles.filterActive : ''}`}
            onClick={() => setFilter('active')}
          >
            En Proceso ({workflows.filter(w => w.status === 'En Proceso').length})
          </button>
          <button
            className={`${styles.filterButton} ${filter === 'pending' ? styles.filterActive : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pendientes ({workflows.filter(w => w.status === 'Pendiente').length})
          </button>
        </div>
      </div>

      <div className={styles.workflowsGrid}>
        {filteredWorkflows.map(workflow => (
          <div key={workflow.id} className={styles.workflowCard}>
            {/* Header */}
            <div className={styles.workflowHeader}>
              <div className={styles.workflowInfo}>
                <span className={styles.workflowId}>ORD-{workflow.id}</span>
                <span className={`${styles.statusBadge} ${getStatusColor(workflow.status)}`}>
                  {workflow.status}
                </span>
              </div>
              <div className={styles.workflowMeta}>
                <span className={styles.priority}>{workflow.priority}</span>
                <span className={styles.lastUpdate}>{workflow.lastUpdate}</span>
              </div>
            </div>

            {/* Client and Product */}
            <div className={styles.clientSection}>
              <h3 className={styles.clientName}>{workflow.client}</h3>
              <p className={styles.productName}>{workflow.product}</p>
            </div>

            {/* Progress Bar */}
            <div className={styles.progressSection}>
              <div className={styles.progressHeader}>
                <span>Progreso General</span>
                <span className={styles.progressPercentage}>{workflow.progress}%</span>
              </div>
              <div className={styles.progressBar}>
                <div 
                  className={`${styles.progressFill} ${getProgressColor(workflow.progress)}`}
                  style={{ width: `${workflow.progress}%` }}
                ></div>
              </div>
            </div>

            {/* Flow Steps */}
            <div className={styles.flowSteps}>
              <div className={styles.flowTitle}>
                <i className="fa-solid fa-route text-indigo-500"></i>
                Flujo: {workflow.flow}
              </div>
              
              <div className={styles.stepsContainer}>
                {workflow.steps.map((step, index) => (
                  <div key={index} className={styles.step}>
                    <div className={styles.stepIcon}>
                      <i className={getStepStatusIcon(step.status)}></i>
                    </div>
                    <div className={styles.stepInfo}>
                      <div className={styles.stepName}>{step.name}</div>
                      <div className={styles.stepDetails}>
                        <span className={styles.stepArea}>{step.area}</span>
                        <span className={styles.stepTime}>{step.time}</span>
                      </div>
                    </div>
                    {index < workflow.steps.length - 1 && (
                      <div className={styles.stepConnector}></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Info */}
            <div className={styles.additionalInfo}>
              <div className={styles.infoItem}>
                <i className="fa-solid fa-truck-loading text-green-500"></i>
                <span>Abastecimiento: {workflow.supply}</span>
              </div>
              <div className={styles.infoItem}>
                <i className="fa-solid fa-factory text-blue-500"></i>
                <span>Origen: {workflow.source}</span>
              </div>
              <div className={styles.infoItem}>
                <i className="fa-solid fa-user text-purple-500"></i>
                <span>Asignado: {workflow.assignedTo}</span>
              </div>
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              <button className={styles.actionButton}>
                <i className="fa-solid fa-eye"></i>
                Detalles
              </button>
              <button className={styles.actionButton}>
                <i className="fa-solid fa-pen-to-square"></i>
                Editar
              </button>
              <button className={styles.actionButtonPrimary}>
                <i className="fa-solid fa-forward"></i>
                Siguiente Paso
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredWorkflows.length === 0 && (
        <div className={styles.emptyState}>
          <i className="fa-solid fa-diagram-project text-gray-300 text-4xl mb-4"></i>
          <h3 className={styles.emptyTitle}>No hay flujos activos</h3>
          <p className={styles.emptyText}>
            {filter !== 'all' 
              ? `No hay flujos en estado "${filter}"`
              : 'No se encontraron órdenes de coordinación'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default Workflow;