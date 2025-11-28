import React from 'react';

const ServicioTecnico = ({ onSwitchTab, machines = [] }) => {
  const [techTab, setTechTab] = React.useState('machines');

  const renderMachinesTab = () => {
    const failedMachines = machines.filter(m => m.status === 'FAIL');
    
    return (
      React.createElement('div', null,
        failedMachines.length > 0 && 
          React.createElement('div', {
            style: {
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '0.5rem',
              padding: '1rem',
              marginBottom: '2rem'
            }
          },
            React.createElement('div', {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#dc2626',
                fontWeight: 'bold',
                marginBottom: '0.5rem'
              }
            },
              React.createElement('i', { className: 'fa-solid fa-circle-exclamation' }),
              React.createElement('span', null, 'Atención Inmediata Requerida')
            ),
            React.createElement('div', {
              style: {
                fontSize: '0.875rem',
                color: '#991b1b'
              }
            },
              `${failedMachines.length} máquina(s) con fallas críticas`
            )
          ),

        React.createElement('div', {
          style: {
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }
        },
          React.createElement('div', {
            style: {
              padding: '1rem',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }
          },
            React.createElement('h3', {
              style: {
                fontSize: '1rem',
                fontWeight: 'bold',
                color: '#374151',
                margin: 0
              }
            }, 'Inventario de Máquinas'),
            React.createElement('div', {
              style: {
                display: 'flex',
                gap: '0.5rem',
                fontSize: '0.75rem'
              }
            },
              ['Todos', 'OK', 'Falla', 'Desuso'].map(filter => 
                React.createElement('button', {
                  key: filter,
                  style: {
                    padding: '0.25rem 0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.25rem',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    fontSize: '0.75rem'
                  }
                }, filter)
              )
            )
          ),
          React.createElement('table', {
            style: {
              width: '100%',
              borderCollapse: 'collapse'
            }
          },
            React.createElement('thead', null,
              React.createElement('tr', {
                style: {
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0'
                }
              },
                ['Equipo', 'Área', 'Estado', 'Último Mantenimiento', 'Acciones'].map(header => 
                  React.createElement('th', {
                    key: header,
                    style: {
                      padding: '0.75rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      color: '#64748b',
                      textTransform: 'uppercase'
                    }
                  }, header)
                )
              )
            ),
            React.createElement('tbody', null,
              machines.map(machine => 
                React.createElement('tr', {
                  key: machine.id,
                  style: {
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer'
                  },
                  onClick: () => console.log('Abrir detalle:', machine.id)
                },
                  React.createElement('td', {
                    style: {
                      padding: '0.75rem',
                      fontWeight: 'bold',
                      color: '#1e293b'
                    }
                  }, machine.name),
                  React.createElement('td', {
                    style: {
                      padding: '0.75rem',
                      color: '#64748b'
                    }
                  }, machine.area),
                  React.createElement('td', {
                    style: {
                      padding: '0.75rem'
                    }
                  },
                    React.createElement('span', {
                      style: {
                        padding: '0.25rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        backgroundColor: machine.status === 'OK' ? '#dcfce7' : '#fef2f2',
                        color: machine.status === 'OK' ? '#166534' : '#dc2626'
                      }
                    }, machine.status === 'OK' ? 'OPERATIVO' : 'FALLA')
                  ),
                  React.createElement('td', {
                    style: {
                      padding: '0.75rem',
                      color: '#64748b',
                      fontSize: '0.875rem'
                    }
                  }, '15/11/2024'),
                  React.createElement('td', {
                    style: {
                      padding: '0.75rem'
                    }
                  },
                    React.createElement('button', {
                      style: {
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      },
                      onClick: (e) => {
                        e.stopPropagation();
                        console.log('Crear ticket para:', machine.id);
                      }
                    }, 'Ticket')
                  )
                )
              )
            )
          )
        )
      )
    );
  };

  const renderTicketsTab = () => (
    React.createElement('div', {
      style: {
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        border: '1px solid #e2e8f0',
        padding: '2rem',
        textAlign: 'center',
        color: '#64748b'
      }
    },
      React.createElement('i', {
        className: 'fa-solid fa-ticket',
        style: { fontSize: '3rem', marginBottom: '1rem', color: '#d1d5db' }
      }),
      React.createElement('h3', {
        style: { marginBottom: '0.5rem', color: '#374151' }
      }, 'Gestión de Tickets'),
      React.createElement('p', null, 'Sistema de tickets de servicio técnico - En desarrollo')
    )
  );

  const renderProjectsTab = () => (
    React.createElement('div', {
      style: {
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        border: '1px solid #e2e8f0',
        padding: '2rem',
        textAlign: 'center',
        color: '#64748b'
      }
    },
      React.createElement('i', {
        className: 'fa-solid fa-screwdriver-wrench',
        style: { fontSize: '3rem', marginBottom: '1rem', color: '#d1d5db' }
      }),
      React.createElement('h3', {
        style: { marginBottom: '0.5rem', color: '#374151' }
      }, 'Proyectos Técnicos'),
      React.createElement('p', null, 'Gestión de proyectos de mejora y mantenimiento - En desarrollo')
    )
  );

  const renderContent = () => {
    switch (techTab) {
      case 'machines':
        return renderMachinesTab();
      case 'tickets':
        return renderTicketsTab();
      case 'projects':
        return renderProjectsTab();
      default:
        return renderMachinesTab();
    }
  };

  return (
    React.createElement('div', {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f8fafc'
      }
    },
      /* Header */
      React.createElement('div', {
        style: {
          padding: '1rem 1.5rem',
          backgroundColor: 'white',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }
      },
        React.createElement('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }
        },
          React.createElement('button', {
            onClick: () => onSwitchTab('dashboard'),
            style: {
              color: '#6b7280',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              padding: '0.5rem',
              borderRadius: '0.375rem'
            }
          },
            React.createElement('i', { className: 'fa-solid fa-arrow-left' })
          ),
          React.createElement('h2', {
            style: {
              fontWeight: 'bold',
              fontSize: '1.5rem',
              color: '#1e293b',
              margin: 0
            }
          }, 'Servicio Técnico')
        ),
        React.createElement('div', {
          style: {
            display: 'flex',
            backgroundColor: '#f1f5f9',
            borderRadius: '0.5rem',
            padding: '0.25rem',
            gap: '0.25rem'
          }
        },
          ['machines', 'tickets', 'projects'].map(tab => 
            React.createElement('button', {
              key: tab,
              onClick: () => setTechTab(tab),
              style: {
                padding: '0.5rem 1rem',
                borderRadius: '0.25rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 'bold',
                textTransform: 'capitalize',
                transition: 'all 0.2s',
                ...(techTab === tab ? {
                  backgroundColor: 'white',
                  color: '#1e293b',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                } : {
                  backgroundColor: 'transparent',
                  color: '#64748b'
                })
              }
            }, tab)
          )
        )
      ),

      /* Contenido */
      React.createElement('div', {
        style: {
          flex: 1,
          padding: '2rem',
          overflowY: 'auto'
        }
      },
        renderContent()
      )
    )
  );
};

export default ServicioTecnico;