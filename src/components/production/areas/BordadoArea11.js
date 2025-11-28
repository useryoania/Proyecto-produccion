import React from 'react';
import PlanillaBase from '../PlanillaBase.js';
import SettingsModal from '../../modals/SettingsModal.jsx';
import StockModal from '../../modals/StockModal.jsx';
import ReportModal from '../../modals/ReportModal.jsx';
import NewOrderModal from '../../modals/NewOrderModal.jsx';

const BordadoArea = ({ 
  orders = [], 
  selectedOrders = [], 
  onToggleSelection, 
  onCreateRoll, 
  onSwitchTab 
}) => {
  
  const [modals, setModals] = React.useState({
    settings: false,
    stock: false,
    report: false,
    newOrder: false
  });

  const [activeTab, setActiveTab] = React.useState('todo');
  const [selectedMachine, setSelectedMachine] = React.useState('ALL');
  const [bordadoView, setBordadoView] = React.useState('table');

  const openModal = (modalName) => setModals(prev => ({ ...prev, [modalName]: true }));
  const closeModal = (modalName) => setModals(prev => ({ ...prev, [modalName]: false }));

  const areaConfig = {
    name: 'Bordado',
    gridTemplate: '40px 40px 60px 80px 80px 100px 220px 150px 80px 60px 70px 90px 120px 50px',
    headers: ['', 'Pos', 'Orden', 'Ingreso', 'Tiempo', 'Matriz', 'Cliente', 'Trabajo', 'Nota', 'Arch.', 'Puntadas', 'Estado', 'Máquina', 'Chat'],
    
    renderRowCells: (order, index, styles) => [
      // Posición
      React.createElement('div', { 
        key: 'pos',
        className: `${styles.gridCell} ${styles.gridCellCenter}` 
      },
        React.createElement('span', { 
          className: styles.positionNumber 
        }, (index + 1).toString().padStart(2, '0'))
      ),

      // Orden
      React.createElement('div', { 
        key: 'order',
        className: styles.gridCell 
      },
        React.createElement('span', { 
          className: styles.orderNumber 
        }, `#${order.id}`)
      ),

      // Ingreso
      React.createElement('div', { 
        key: 'ingreso',
        className: `${styles.gridCell} ${styles.gridCellCenter}` 
      },
        React.createElement('div', { className: styles.date }, '22/11'),
        React.createElement('div', { className: styles.time }, '09:00')
      ),

      // Tiempo
      React.createElement('div', { 
        key: 'tiempo',
        className: `${styles.gridCell} ${styles.gridCellCenter}` 
      },
        React.createElement('div', { className: styles.timeBadge }, '6h')
      ),

      // Matriz
      React.createElement('div', { 
        key: 'matriz',
        className: `${styles.gridCell} ${styles.gridCellCenter}` 
      },
        React.createElement('span', { className: styles.matrixBadge }, 'OK')
      ),

      // Cliente
      React.createElement('div', { 
        key: 'cliente',
        className: styles.gridCell 
      },
        React.createElement('div', { className: styles.clientName }, order.client || 'Sin cliente')
      ),

      // Trabajo
      React.createElement('div', { 
        key: 'trabajo',
        className: styles.gridCell 
      },
        React.createElement('div', { className: styles.jobDescription }, order.desc || 'Sin descripción')
      ),

      // Nota
      React.createElement('div', { 
        key: 'nota',
        className: `${styles.gridCell} ${styles.gridCellCenter}` 
      },
        order.note && 
          React.createElement('i', { 
            className: 'fa-solid fa-note-sticky',
            title: order.note 
          })
      ),

      // Archivo
      React.createElement('div', { 
        key: 'archivo',
        className: `${styles.gridCell} ${styles.gridCellCenter}` 
      },
        React.createElement('i', { 
          className: 'fa-solid fa-file',
          title: 'Archivo listo' 
        })
      ),

      // Puntadas
      React.createElement('div', { 
        key: 'puntadas',
        className: `${styles.gridCell} ${styles.gridCellCenter}` 
      },
        React.createElement('span', { className: styles.quantity }, '8500')
      ),

      // Estado
      React.createElement('div', { 
        key: 'estado',
        className: `${styles.gridCell} ${styles.gridCellCenter}` 
      },
        React.createElement('span', { className: styles.statusBadge }, order.status || 'Bordando')
      ),

      // Máquina
      React.createElement('div', { 
        key: 'maquina',
        className: `${styles.gridCell} ${styles.gridCellCenter}` 
      },
        React.createElement('span', { className: styles.machine }, 'Tajima 6')
      ),

      // Chat
      React.createElement('div', { 
        key: 'chat',
        className: `${styles.gridCell} ${styles.gridCellCenter}` 
      },
        React.createElement('button', { className: styles.chatButton },
          React.createElement('i', { className: 'fa-regular fa-comment-dots' })
        )
      )
    ]
  };

  const renderSchedulerView = () => (
    <div style={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      backgroundColor: '#fdf4ff',
      padding: '2rem',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <h3 style={{ color: '#a855f7', marginBottom: '1rem' }}>Planificador IA - Bordado</h3>
      <p style={{ color: '#6b7280', textAlign: 'center' }}>
        Optimización inteligente de secuencias de bordado
      </p>
    </div>
  );

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <div style={headerStyles.headerContainer}>
        <div style={headerStyles.headerLeft}>
          <button
            onClick={() => onSwitchTab('dashboard')}
            style={headerStyles.backButton}
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div>
            <h2 style={headerStyles.areaTitle}>Bordado</h2>
            <p style={headerStyles.areaSubtitle}>Producción</p>
          </div>
          
          <div style={{ height: '2rem', width: '1px', backgroundColor: '#e2e8f0', margin: '0 1rem' }}></div>
          
          {/* Tabs principales */}
          <div style={headerStyles.tabButtons}>
            <button 
              onClick={() => setActiveTab('todo')}
              style={{ 
                ...headerStyles.tabButton, 
                ...(activeTab === 'todo' ? headerStyles.tabButtonActive : headerStyles.tabButtonInactive)
              }}
            >
              Para Hacer
            </button>
            <button 
              onClick={() => setActiveTab('all')}
              style={{ 
                ...headerStyles.tabButton, 
                ...(activeTab === 'all' ? headerStyles.tabButtonActive : headerStyles.tabButtonInactive)
              }}
            >
              Todos / Historial
            </button>
          </div>
          
          {/* Tabs específicos de Bordado */}
          <div style={bordadoTabStyles.tabContainer}>
            <button 
              onClick={() => setBordadoView('table')}
              style={{ 
                ...bordadoTabStyles.tabButton, 
                ...(bordadoView === 'table' ? bordadoTabStyles.tabButtonActive : bordadoTabStyles.tabButtonInactive)
              }}
            >
              Órdenes
            </button>
            <button 
              onClick={() => setBordadoView('scheduler')}
              style={{ 
                ...bordadoTabStyles.tabButton, 
                ...(bordadoView === 'scheduler' ? bordadoTabStyles.tabButtonActive : bordadoTabStyles.tabButtonInactive)
              }}
            >
              <i className="fa-solid fa-wand-magic-sparkles"></i> IA
            </button>
          </div>
          
          <select 
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value)}
            style={headerStyles.machineFilter}
          >
            <option value="ALL">Todas las Máquinas</option>
            <option value="TAJIMA-01">Tajima 6</option>
            <option value="TAJIMA-02">Tajima 12</option>
            <option value="BROTHER">Brother PR</option>
          </select>
        </div>
        
        <div style={headerStyles.headerRight}>
          <button 
            onClick={() => openModal('settings')}
            style={{ ...headerStyles.actionButton, ...headerStyles.buttonConfig }}
          >
            <i className="fa-solid fa-gear"></i>
          </button>
          <button 
            onClick={() => openModal('stock')}
            style={{ ...headerStyles.actionButton, ...headerStyles.buttonInsumos }}
          >
            <i className="fa-solid fa-boxes-stacked"></i>
            Insumos
          </button>
          <button 
            onClick={() => openModal('report')}
            style={{ ...headerStyles.actionButton, ...headerStyles.buttonFalla }}
          >
            <i className="fa-solid fa-triangle-exclamation"></i>
            Falla
          </button>
          <button 
            onClick={() => openModal('newOrder')}
            style={{ ...headerStyles.actionButton, ...headerStyles.buttonNuevaOrden }}
          >
            <i className="fa-solid fa-plus"></i>
            Nueva Orden
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar de Matrices */}
        <div style={{ 
          width: '16rem', 
          backgroundColor: 'white', 
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0
        }}>
          <div style={{ 
            padding: '1rem', 
            borderBottom: '1px solid #f1f5f9', 
            backgroundColor: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ 
              fontWeight: 'bold', 
              fontSize: '0.875rem', 
              color: '#374151',
              margin: 0
            }}>
              Matrices / Diseños
            </h3>
            <button style={{ 
              color: '#9ca3af',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.75rem'
            }}>
              <i className="fa-solid fa-angles-left"></i>
            </button>
          </div>
          
          <div style={{ flex: 1, overflow: 'auto', padding: '0.5rem' }}>
            <div style={{ 
              padding: '0.5rem',
              backgroundColor: '#fce7f3',
              borderLeft: '4px solid #ec4899',
              borderRadius: '0.375rem',
              marginBottom: '0.5rem',
              cursor: 'pointer'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ fontWeight: 'bold', color: '#db2777' }}>Logo Empresa</span>
                <span style={{ color: '#64748b' }}>3 Ord.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Área de contenido dinámico */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, backgroundColor: 'white', position: 'relative' }}>
          {bordadoView === 'table' ? (
            <PlanillaBase
              areaConfig={areaConfig}
              orders={orders}
              selectedOrders={selectedOrders}
              onToggleSelection={onToggleSelection}
              onCreateRoll={onCreateRoll}
              onSwitchTab={onSwitchTab}
            />
          ) : (
            renderSchedulerView()
          )}
        </div>
      </div>

      {/* Modales */}
      <SettingsModal 
        isOpen={modals.settings} 
        onClose={() => closeModal('settings')} 
        area="BORD" 
      />
      <StockModal 
        isOpen={modals.stock} 
        onClose={() => closeModal('stock')} 
      />
      <ReportModal 
        isOpen={modals.report} 
        onClose={() => closeModal('report')} 
      />
      <NewOrderModal 
        isOpen={modals.newOrder} 
        onClose={() => closeModal('newOrder')} 
        area="BORD" 
      />
    </div>
  );
};

// Estilos para Bordado
const headerStyles = {
  headerContainer: {
    backgroundColor: 'white',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 20
  },
  headerLeft: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center'
  },
  headerRight: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center'
  },
  backButton: {
    color: '#9ca3af',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '0.5rem',
    borderRadius: '0.375rem',
    transition: 'all 0.2s'
  },
  areaTitle: {
    fontWeight: 'bold',
    fontSize: '1.125rem',
    color: '#1e293b',
    lineHeight: '1.25',
    margin: 0
  },
  areaSubtitle: {
    fontSize: '0.625rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: 0
  },
  tabButtons: {
    display: 'flex',
    backgroundColor: '#f1f5f9',
    borderRadius: '0.375rem',
    padding: '0.25rem',
    gap: '0.25rem'
  },
  tabButton: {
    padding: '0.5rem 0.75rem',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    borderRadius: '0.25rem',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  tabButtonActive: {
    backgroundColor: 'white',
    color: '#1e293b',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
  },
  tabButtonInactive: {
    backgroundColor: 'transparent',
    color: '#64748b'
  },
  machineFilter: {
    backgroundColor: '#fce7f3',
    border: '1px solid #fbcfe8',
    color: '#db2777',
    fontSize: '0.75rem',
    borderRadius: '0.375rem',
    padding: '0.5rem 0.75rem',
    outline: 'none',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  actionButton: {
    padding: '0.5rem 1rem',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    borderRadius: '0.375rem',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s'
  },
  buttonConfig: {
    backgroundColor: '#f1f5f9',
    color: '#64748b'
  },
  buttonInsumos: {
    backgroundColor: '#ffedd5',
    color: '#ea580c',
    border: '1px solid #fdba74'
  },
  buttonFalla: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca'
  },
  buttonNuevaOrden: {
    backgroundColor: '#ec4899',
    color: 'white',
    boxShadow: '0 1px 3px rgba(236, 72, 153, 0.3)'
  }
};

const bordadoTabStyles = {
  tabContainer: {
    display: 'flex',
    backgroundColor: '#fdf2f8',
    borderRadius: '0.375rem',
    padding: '0.25rem',
    gap: '0.25rem',
    marginLeft: '0.5rem'
  },
  tabButton: {
    padding: '0.5rem 0.75rem',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    borderRadius: '0.25rem',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem'
  },
  tabButtonActive: {
    backgroundColor: 'white',
    color: '#db2777',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
  },
  tabButtonInactive: {
    backgroundColor: 'transparent',
    color: '#9ca3af'
  }
};

export default BordadoArea;