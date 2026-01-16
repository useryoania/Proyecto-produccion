// src/components/production/areas/CoordinacionArea.jsx
import React, { useState, useEffect } from 'react';
//import OrderKanban from '../../../production/components/OrderKanban.jsx';
//import OrderKanbanMetrics from '../../../production/components/OrderKanbanMetrics.jsx';
//import styles from './CoordinacionArea.module.css';

// Componente Wrapper para Coordinación (Vista Manual)
const CoordinacionArea = ({ onSwitchTab, orders = [] }) => { // CORRECCIÓN: Inicializar orders a []
    const [selectedView, setSelectedView] = useState('pendientes');

    const renderView = () => {
        // Aseguramos que orders sea un array antes de usar filter
        const ordersArray = orders || []; 
        
        const filteredOrders = ordersArray.filter(order => {
            if (selectedView === 'pendientes') {
                return order.status === 'Pendiente' || order.status === 'En Coordinación';
            }
            if (selectedView === 'completadas') {
                return order.status === 'Aprobado' || order.status === 'Revisión';
            }
            return true;
        });

        if (filteredOrders.length === 0) {
            return <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No hay órdenes en la vista {selectedView}.</div>;
        }

        return (
            <div className={styles.kanbanContainer}>
                <OrderKanban 
                    orders={filteredOrders} 
                    title="Órdenes de Coordinación" 
                    isCoordination={true} 
                />
            </div>
        );
    };

    return (
        <div className={styles.layoutContainer}>
            <header className={styles.header}>
                <button className={styles.backButton} onClick={() => onSwitchTab('dashboard')}>
                    <i className="fa-solid fa-arrow-left"></i>
                </button>
                <h1>Coordinación y Diseño</h1>
            </header>
            
            <div className={styles.contentWrapper}>
                <aside className={styles.sidebar}>
                    <OrderKanbanMetrics 
                        orders={orders} 
                        area="COORDINACION" 
                    />
                </aside>
                
                <main className={styles.mainContent}>
                    <div className={styles.controls}>
                        <div className={styles.viewTabs}>
                            <button 
                                className={selectedView === 'pendientes' ? styles.tabActive : styles.tab} 
                                onClick={() => setSelectedView('pendientes')}
                            >
                                Pendientes / En Proceso
                            </button>
                            <button 
                                className={selectedView === 'completadas' ? styles.tabActive : styles.tab} 
                                onClick={() => setSelectedView('completadas')}
                            >
                                Aprobadas / Revisadas
                            </button>
                        </div>
                    </div>
                    
                    {renderView()}
                </main>
            </div>
        </div>
    );
};

export default CoordinacionArea;