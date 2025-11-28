import React, { useState, useEffect } from 'react';
import styles from './BordadoScheduler.module.css';

const BordadoScheduler = ({ orders }) => {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [machineLoad, setMachineLoad] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Máquinas de bordado disponibles
  const machines = [
    { id: 'M-BORD-01', name: 'Tajima 6', heads: 6, speed: 800, capacity: 200000, currentLoad: 0 },
    { id: 'M-BORD-02', name: 'Brother 4', heads: 4, speed: 750, capacity: 120000, currentLoad: 0 },
    { id: 'M-BORD-03', name: 'Tajima 12', heads: 12, speed: 1000, capacity: 300000, currentLoad: 0 }
  ];

  useEffect(() => {
    loadPendingOrders();
    calculateMachineLoad();
  }, [orders]);

  const loadPendingOrders = () => {
    const pending = orders.filter(order => 
      order.area === 'BORD' && 
      order.status !== 'Finalizado' && 
      order.status !== 'Entregado'
    );
    setPendingOrders(pending);
  };

  const calculateMachineLoad = () => {
    const load = machines.map(machine => ({
      ...machine,
      currentLoad: Math.floor(Math.random() * 80) + 10, // Simulado
      estimatedCompletion: `~${Math.floor(Math.random() * 4) + 2}h`
    }));
    setMachineLoad(load);
  };

  const runAutoScheduler = async () => {
    setIsLoading(true);
    
    // Simular procesamiento de IA
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newSuggestions = generateSuggestions();
    setSuggestions(newSuggestions);
    setIsLoading(false);
  };

  const generateSuggestions = () => {
    return pendingOrders.slice(0, 3).map(order => ({
      orderId: order.id,
      client: order.client,
      description: order.desc,
      stitches: order.stitches || 0,
      recommendedMachine: machines[Math.floor(Math.random() * machines.length)].id,
      priority: ['Alta', 'Media', 'Baja'][Math.floor(Math.random() * 3)],
      estimatedTime: `${Math.floor((order.stitches || 10000) / 500)}min`,
      reason: getSuggestionReason(order)
    }));
  };

  const getSuggestionReason = (order) => {
    const reasons = [
      'Optimización de cabezales disponibles',
      'Compatibilidad de diseño con máquina',
      'Prioridad por tiempo de entrega',
      'Balance de carga entre máquinas',
      'Eficiencia en cambio de hilos'
    ];
    return reasons[Math.floor(Math.random() * reasons.length)];
  };

  const applySuggestion = (suggestion) => {
    // Aquí iría la lógica para aplicar la sugerencia
    console.log('Aplicando sugerencia:', suggestion);
    
    // Remover de pendientes y sugerencias
    setPendingOrders(prev => prev.filter(order => order.id !== suggestion.orderId));
    setSuggestions(prev => prev.filter(s => s.orderId !== suggestion.orderId));
    
    // Actualizar carga de máquinas
    calculateMachineLoad();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Alta': return 'bg-red-100 text-red-700';
      case 'Media': return 'bg-yellow-100 text-yellow-700';
      case 'Baja': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className={styles.schedulerContainer}>
      <div className={styles.schedulerHeader}>
        <div>
          <h2 className={styles.title}>
            <i className="fa-solid fa-wand-magic-sparkles text-pink-500"></i>
            Planificador de Bordado
          </h2>
          <p className={styles.subtitle}>Optimización de carga por IA</p>
        </div>
        
        <button 
          className={styles.autoAssignButton}
          onClick={runAutoScheduler}
          disabled={isLoading}
        >
          <i className="fa-solid fa-robot"></i>
          {isLoading ? 'Procesando...' : 'Auto-Asignar'}
        </button>
      </div>

      <div className={styles.schedulerGrid}>
        {/* Columna 1: Cola de Espera */}
        <div className={styles.column}>
          <div className={styles.columnHeader}>
            Cola de Espera
          </div>
          <div className={styles.columnContent}>
            {pendingOrders.length === 0 ? (
              <div className={styles.emptyState}>
                <i className="fa-solid fa-check-circle text-green-400 text-2xl mb-2"></i>
                <p className={styles.emptyText}>Sin órdenes pendientes</p>
              </div>
            ) : (
              pendingOrders.map(order => (
                <div key={order.id} className={styles.pendingOrder}>
                  <div className={styles.orderHeader}>
                    <span className={styles.orderId}>#{order.id}</span>
                    <span className={styles.clientName}>{order.client}</span>
                  </div>
                  <p className={styles.orderDescription}>{order.desc}</p>
                  <div className={styles.orderDetails}>
                    <span className={styles.stitchCount}>
                      <i className="fa-solid fa-thread"></i>
                      {order.stitches ? order.stitches.toLocaleString() : '0'} pts
                    </span>
                    <span className={styles.quantity}>
                      <i className="fa-solid fa-hashtag"></i>
                      {order.quantity || 1}u
                    </span>
                  </div>
                  {order.matrixStatus && (
                    <div className={styles.matrixStatus}>
                      <span className={`text-[10px] px-2 py-0.5 rounded ${
                        order.matrixStatus === 'Aprobado' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {order.matrixStatus}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Columna 2: Sugerencias IA */}
        <div className={styles.suggestionsColumn}>
          <div className={styles.columnHeader}>
            <span>Sugerencias IA</span>
            <i className="fa-solid fa-brain"></i>
          </div>
          <div className={styles.columnContent}>
            {isLoading ? (
              <div className={styles.loadingState}>
                <i className="fa-solid fa-spinner fa-spin text-pink-500 text-2xl mb-2"></i>
                <p className={styles.loadingText}>Analizando órdenes...</p>
              </div>
            ) : suggestions.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyText}>Ejecuta Auto-Asignar para ver sugerencias</p>
              </div>
            ) : (
              suggestions.map((suggestion, index) => (
                <div key={suggestion.orderId} className={styles.suggestion}>
                  <div className={styles.suggestionHeader}>
                    <span className={styles.suggestionOrderId}>#{suggestion.orderId}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${getPriorityColor(suggestion.priority)}`}>
                      {suggestion.priority}
                    </span>
                  </div>
                  
                  <p className={styles.suggestionClient}>{suggestion.client}</p>
                  <p className={styles.suggestionDescription}>{suggestion.description}</p>
                  
                  <div className={styles.suggestionDetails}>
                    <div className={styles.detailItem}>
                      <i className="fa-solid fa-robot text-pink-500"></i>
                      <span>{suggestion.recommendedMachine}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <i className="fa-solid fa-clock text-blue-500"></i>
                      <span>{suggestion.estimatedTime}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <i className="fa-solid fa-thread text-green-500"></i>
                      <span>{suggestion.stitches.toLocaleString()} pts</span>
                    </div>
                  </div>

                  <div className={styles.suggestionReason}>
                    <i className="fa-solid fa-lightbulb text-yellow-500"></i>
                    <span>{suggestion.reason}</span>
                  </div>

                  <button 
                    className={styles.applyButton}
                    onClick={() => applySuggestion(suggestion)}
                  >
                    <i className="fa-solid fa-play"></i>
                    Aplicar Sugerencia
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Columna 3: Carga de Máquinas */}
        <div className={styles.column}>
          <div className={styles.columnHeader}>
            Carga de Máquinas
          </div>
          <div className={styles.columnContent}>
            {machineLoad.map(machine => (
              <div key={machine.id} className={styles.machineCard}>
                <div className={styles.machineHeader}>
                  <span className={styles.machineName}>{machine.name}</span>
                  <span className={styles.machineHeads}>
                    {machine.heads} cabezales
                  </span>
                </div>
                
                <div className={styles.loadInfo}>
                  <div className={styles.loadBarContainer}>
                    <div 
                      className={styles.loadBar}
                      style={{ width: `${machine.currentLoad}%` }}
                    ></div>
                  </div>
                  <span className={styles.loadPercentage}>
                    {machine.currentLoad}%
                  </span>
                </div>

                <div className={styles.machineDetails}>
                  <div className={styles.detail}>
                    <i className="fa-solid fa-gauge-high text-blue-500"></i>
                    <span>{machine.speed} rpm</span>
                  </div>
                  <div className={styles.detail}>
                    <i className="fa-solid fa-flag-checkered text-green-500"></i>
                    <span>{machine.estimatedCompletion}</span>
                  </div>
                </div>

                <div className={styles.capacityInfo}>
                  <span className={styles.capacityText}>
                    Capacidad: {machine.capacity.toLocaleString()} pts/día
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BordadoScheduler;