import React from 'react';
import '../aspecto/RecepcionDeEntrega.css';
import alertSoundFile from '../sonidos/deposito.mp3'; // Usar el archivo de sonido proporcionado por el usuario
import { initializeSocket } from "../utils/socket"; // Importa el socket utilitario

class RecepcionDeEntrega extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      ingresadasOrders: [],
      empaquetadasOrders: [],
      selectedOrder: null,
      filterLocation: "", // Estado para el filtro de lugar de retiro
    };
    this.channel = new BroadcastChannel('orders_channel');
    this.alertSound = new Audio(alertSoundFile); // Usar el archivo de sonido proporcionado
    this.alertSound.preload = 'auto';
  }

  componentDidMount() {
    // Inicializar el socket
    this.socket = initializeSocket();

    // Suscribirse al evento "actualizado"
    this.socket.on("actualizado", () => {
      console.log("Evento recibido: actualizando órdenes");
      this.loadOrdersFromBackend();
    });

    // Cargar datos iniciales
    this.loadOrdersFromBackend();
  
    // Configuración inicial para habilitar el sonido
    document.addEventListener('click', this.enableSoundPlayback);
  }

  componentWillUnmount() {
    if (this.socket) {
      this.socket.off("actualizado"); // Limpiar evento al desmontar
    }
    document.removeEventListener('click', this.enableSoundPlayback);
  }

  enableSoundPlayback = () => {
    this.alertSound.play().catch(() => {
      // Habilitar reproducción de sonido tras interacción del usuario
    });
    document.removeEventListener('click', this.enableSoundPlayback);
  };

  loadOrdersFromBackend = () => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenesRetiro/estados?estados=Ingresado,Abonado,Abonado de antemano,Empaquetado sin abonar,Empaquetado y abonado`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al cargar las órdenes de retiro');
        }
        return response.json();
      })
      .then((orders) => {
        const ingresadasOrders = orders.filter(order => (order.estado === 'Ingresado'));
        const empaquetadasOrders = orders.filter(order => (
          order.estado === 'Empaquetado sin abonar' ||
          order.estado === 'Abonado' ||
          order.estado === 'Abonado de antemano' ||
          order.estado === 'Empaquetado y abonado'
        ));

        // Reproducir sonido si hay nuevas órdenes empaquetadas
        if (empaquetadasOrders.length > this.state.empaquetadasOrders.length) {
          this.playAlertSound();
        }

        this.setState({ ingresadasOrders, empaquetadasOrders });
      })
      .catch((error) => {
        console.error('Error al cargar las órdenes de retiro:', error);
      });
  };

  playAlertSound = () => {
    this.alertSound.play().catch(error => {
      console.error('Error al reproducir el sonido de alerta:', error);
    });
  };

  handleBroadcastMessage = (event) => {
    if (event.data === 'update_orders') {
      this.loadOrdersFromBackend();
    }
  };

  handleOrderClick = (order) => {
    const filteredOrders = order.orders.filter(po => po.orderEstado === 7); // Filtrar por estado
    const enrichedOrders = filteredOrders.map(po => ({
      ...po,
      paymentStatus: po.orderPago != null ? 'Orden Paga' : 'No fue pagada',
    }));

    this.setState({
      selectedOrder: {
        ...order,
        orders: enrichedOrders,
        clientCode: order.CliCodigoCliente,
        clientType: order.TClDescripcion,
        isCommonClient: order.TClDescripcion === 'Comun',
      },
    });
  };

  closeModal = () => {
    this.setState({ selectedOrder: null });
  };

  handleEntregadoClick = () => {
    const { selectedOrder } = this.state;
    const token = localStorage.getItem('token');

    if (selectedOrder) {
      fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenesRetiro/marcarOrdenEntregada`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',             
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ordenDeRetiro: selectedOrder.ordenDeRetiro }),
      })
        .then((response) => {
          if (!response.ok) {
            alert('Error al marcar la orden como entregada');
          }
          return response.json();
        })
        .then(() => {
          this.setState({ selectedOrder: null });
          this.loadOrdersFromBackend();

          if (this.channel && this.channel.readyState !== 'closed') {
            this.channel.postMessage('update_orders');
          } else {
            this.channel = new BroadcastChannel('orders_channel');
            this.channel.postMessage('update_orders');
          }
        })
        .catch((error) => {
          console.error('Error al marcar la orden como entregada:', error);
        });
    }
  };

  handleModalClick = (event) => {
    if (event.target.className === 'modal') {
      this.closeModal();
    }
  };

  handleFilterChange = (event) => {
    this.setState({ filterLocation: event.target.value });
  };

  handlePrint = () => {
    const { empaquetadasOrders, filterLocation } = this.state;
    // Filtrar las órdenes según el filtro actual
    const filteredOrders = filterLocation
      ? empaquetadasOrders.filter(order => order.lugarRetiro === filterLocation)
      : empaquetadasOrders;
      
    // Construir el contenido HTML de la planilla de impresión
    let printContent = `
      <html>
        <head>
          <title>Comprobante de Retiro</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; }
            .header h1 { margin: 0; font-size: 36px; }
            .header h2 { margin: 10px 0; font-size: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${filterLocation ? filterLocation : "Todos los lugares"}</h1>
            <h2>Comprobante de Retiro</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th>Orden de Retiro</th>
                <th>ID del Cliente</th>
                <th>Órdenes de Pedido</th>
              </tr>
            </thead>
            <tbody>
    `;

    filteredOrders.forEach(order => {
      let ordersList = "";
      if (order.orders && order.orders.length > 0) {
        ordersList = order.orders.map(po => po.orderNumber).join(", ");
      }
      printContent += `
        <tr>
          <td>${order.ordenDeRetiro}</td>
          <td>${order.CliCodigoCliente || ''}</td>
          <td>${ordersList}</td>
        </tr>
      `;
    });

    printContent += `
            </tbody>
          </table>
        </body>
      </html>
    `;

    // Abrir nueva ventana y disparar el diálogo de impresión
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  render() {
    const { ingresadasOrders, empaquetadasOrders, selectedOrder, filterLocation } = this.state;
    const uniqueLocations = [...new Set(empaquetadasOrders.map(order => order.lugarRetiro))];
    const filteredOrders = filterLocation
      ? empaquetadasOrders.filter(order => order.lugarRetiro === filterLocation)
      : empaquetadasOrders;

    return (
      <div className="CONTRECPRINCIPAL">
        <div className="CONTREC1">
          <h2>ORDENES INGRESADAS</h2>
          <div className="scrollable-content">
            {ingresadasOrders.length > 0 ? (
              ingresadasOrders.map(order => (
                <div key={order.ordenDeRetiro} className="order-button">
                  {order.ordenDeRetiro}
                </div>
              ))
            ) : (
              <div className="no-orders">No hay órdenes ingresadas</div>
            )}
          </div>
        </div>
        <div className="CONTREC2">
          <h2>ORDENES EMPAQUETADAS</h2>
          <select value={filterLocation} onChange={this.handleFilterChange} className="filter-dropdown">
            <option value="">Todos los lugares</option>
            {uniqueLocations.map(location => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
          <button className="print-button" onClick={this.handlePrint}>
            Imprimir comprobante de retiro
          </button>
          <div className="scrollable-content">
            {filteredOrders.length > 0 ? (
              filteredOrders.map(order => (
                <div
                  key={order.ordenDeRetiro}
                  className="order-button"
                  onClick={() => this.handleOrderClick(order)}
                >
                  {order.ordenDeRetiro}
                  <div className="order-pickup-location">{order.lugarRetiro || "No especificado"}</div>
                </div>
              ))
            ) : (
              <div className="no-orders">No hay órdenes empaquetadas</div>
            )}
          </div>
        </div>
        {selectedOrder && (
          <div className="CONTREC3 modal" onClick={this.handleModalClick}>
            <div className="modal-content">
              <span className="close-button" onClick={this.closeModal}>&times;</span>
              <h2>{selectedOrder.ordenDeRetiro}</h2>
              <p><strong>Código del cliente:</strong> {selectedOrder.clientCode || 'No especificado'}</p>
              <p><strong>Tipo de cliente:</strong> {selectedOrder.clientType || 'No especificado'}</p>
              <div className="purchase-orders">
                <h3>Órdenes</h3>
                {selectedOrder.orders.map(po => (
                  <div key={po.orderNumber} className="purchase-order">
                    {po.orderNumber}
                    {selectedOrder.clientType === 'Comun' && (
                      <p>{po.paymentStatus || 'No especificado'}</p>
                    )}
                  </div>
                ))}
              </div>
              <button className="entregado-button" onClick={this.handleEntregadoClick}>
                ENTREGADO
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default RecepcionDeEntrega;
