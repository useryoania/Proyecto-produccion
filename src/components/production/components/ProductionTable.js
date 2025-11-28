import React from 'react';

const ProductionTable = ({ 
  areaConfig, 
  orders, 
  selectedOrders, 
  onToggleSelection 
}) => {
  const styles = {
    tableContainer: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'white'
    },
    tableHeader: {
      display: 'grid',
      backgroundColor: '#f8fafc',
      borderBottom: '1px solid #e2e8f0',
      fontSize: '0.7rem',
      fontWeight: 'bold',
      color: '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      height: '2.5rem',
      alignItems: 'center'
    },
    gridCell: {
      padding: '0 0.5rem',
      height: '3rem',
      display: 'flex',
      alignItems: 'center',
      borderRight: '1px solid #e2e8f0',
      minWidth: 0,
      overflow: 'hidden',
      whiteSpace: 'nowrap'
    },
    gridCellCenter: {
      justifyContent: 'center',
      textAlign: 'center'
    },
    tableRow: {
      display: 'grid',
      borderBottom: '1px solid #f1f5f9',
      alignItems: 'center',
      fontSize: '0.75rem',
      transition: 'background-color 0.1s'
    },
    checkbox: {
      cursor: 'pointer',
      accentColor: '#2563eb',
      width: '14px',
      height: '14px'
    },
    positionNumber: {
      fontSize: '0.7rem',
      fontWeight: 'bold',
      color: '#475569'
    },
    orderNumber: {
      fontSize: '0.75rem',
      fontWeight: 'bold',
      color: '#1e293b'
    },
    clientName: {
      fontSize: '0.75rem',
      fontWeight: '600',
      color: '#334155'
    },
    jobDescription: {
      fontSize: '0.75rem',
      color: '#64748b'
    },
    statusBadge: {
      fontSize: '0.7rem',
      fontWeight: 'bold',
      padding: '0.25rem 0.5rem',
      borderRadius: '9999px',
      backgroundColor: '#dbeafe',
      color: '#1e40af'
    },
    emptyValue: {
      color: '#94a3b8',
      fontStyle: 'italic'
    }
  };

  // Aplicar grid template del areaConfig
  styles.tableHeader.gridTemplateColumns = areaConfig.gridTemplate;
  styles.tableRow.gridTemplateColumns = areaConfig.gridTemplate;

  return React.createElement('div', { style: styles.tableContainer },
    // Header
    React.createElement('div', { style: styles.tableHeader },
      areaConfig.headers.map((header, index) =>
        React.createElement('div', {
          key: index,
          style: {
            ...styles.gridCell,
            ...(index === 0 ? {} : { borderLeft: 'none' })
          }
        }, header)
      )
    ),

    // Rows
    orders.map((order, index) =>
      React.createElement('div', {
        key: order.id,
        style: {
          ...styles.tableRow,
          backgroundColor: selectedOrders.includes(order.id) ? '#eff6ff' : 'white'
        }
      },
        areaConfig.renderRowCells(order, index, styles)
      )
    ),

    // Empty state
    orders.length === 0 &&
      React.createElement('div', {
        style: {
          padding: '2rem',
          textAlign: 'center',
          color: '#94a3b8',
          fontSize: '0.875rem'
        }
      }, 'No hay órdenes para mostrar')
  );
};

export default ProductionTable;