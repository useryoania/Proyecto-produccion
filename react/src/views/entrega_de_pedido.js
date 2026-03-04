import React from 'react';
import '../aspecto/entrega_de_pedido.css';
import alertSoundFile from '../sonidos/deposito.mp3';
import { initializeSocket } from "../utils/socket"; // Importa el socket utilitario

class EntregaDePedido extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedOrder: null,
            purchaseOrders: [],
            scannedValues: Array(40).fill(''),
            orders: [],
            pickupLocation: "",
            filterLocation: "",
            tipoCliente: "",
            pagoRealizado: "",
        };
        this.intervalId = null;
        this.audio = new Audio(alertSoundFile); // Inicializar el objeto de audio
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
        document.addEventListener('click', this.enableAudio);
      }
    
    enableAudio = () => {
        // Permitir la reproducción de audio tras la interacción
        this.audio.play().catch(() => {
            console.log('Audio habilitado después de interacción');
        });
        document.removeEventListener('click', this.enableAudio); // Eliminar el listener después de una interacción    
    };
    

    componentWillUnmount() {
        if (this.intervalId) clearInterval(this.intervalId);
        if (this.channel) this.channel.close();
        if (this.socket) this.socket.disconnect(); // Desconectar el WebSocket

        // Configuración inicial para habilitar el sonido
        document.removeEventListener('click', this.enableAudio);
    }

    // Función para manejar mensajes del BroadcastChannel
    handleChannelMessage = (message) => {
        if (message.data === 'update_orders') {
            this.loadOrdersFromBackend();
        }
    };

    // Cargar órdenes de retiro en estado "Abonado" desde el backend
    loadOrdersFromBackend = () => {
        fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenesRetiro/estados?estados=Ingresado,Abonado,Abonado de antemano`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Error al cargar las órdenes de retiro desde el backend');
                }
                return response.json();
            })
            .then((orders) => {
                // Reproducir el sonido si se agrega una nueva orden
                if (orders.length > this.state.orders.length) {
                    this.audio.play();
                }
                this.setState({ orders });
                console.log(orders);
            })
            .catch((error) => {
                console.error('Error al cargar las órdenes de retiro:', error);
            });
    };

    handleOrderClick = (order) => {
        this.setState({
            selectedOrder: order.ordenDeRetiro,
            tipoCliente: order.TClDescripcion,
            pagoRealizado: order.pagorealizado,
            purchaseOrders: order.orders.map((o) => o.orderNumber),
            pickupLocation: order.lugarRetiro || "No especificado",
        });
    }

    handleInputChange = (index, value) => {
        const newScannedValues = [...this.state.scannedValues];
        const processedValue = value.includes('$*') ? value.split('$*')[0].trim() : value.trim();

        // Validar si el valor ya existe en otro campo
        if (newScannedValues.includes(processedValue)) {
            return; // No se actualiza el estado ni se mueve al siguiente campo
        }

        newScannedValues[index] = processedValue;
        this.setState({ scannedValues: newScannedValues }, () => {
            if (value.length < 30 && index < 19) {
                setTimeout(() => {
                    this.focusNextInput(index);
                }, 300);
            }
        });
    };

    focusNextInput = (index) => {
        const nextInput = document.getElementById(`scanned-input-${index + 1}`);
        if (nextInput) {
            nextInput.focus();
        }
    }

    isOrderScanned = (orderId) => {
        return this.state.scannedValues.some(scannedValue => scannedValue === orderId.trim());
    }

    handleFilterChange = (event) => {
        this.setState({ filterLocation: event.target.value });
    }

    handleProntoClick = () => {
        const { selectedOrder, scannedValues, purchaseOrders } = this.state;        
        const token = localStorage.getItem('token');
        
        if (selectedOrder) {
            fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenesRetiro/marcarPronto`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    },
                body: JSON.stringify({ ordenDeRetiro: selectedOrder, scannedValues }),
            })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Error al marcar la orden como pronta');
                }
                return response.json();
            })
            .then(() => {
                if (this.channel) {
                    this.channel.postMessage('update_orders');
                    this.channel.postMessage('ENTREGADOODR1');
                }
                this.loadOrdersFromBackend();
                this.setState({
                    selectedOrder: null,
                    purchaseOrders: [],
                    scannedValues: Array(40).fill(''),
                });
            })
            .catch((error) => {
                console.error('Error al marcar la orden como pronta:', error);
            });            
        }
    }

    handleCancelarClick = async () => {
        const { selectedOrder } = this.state;
      
        if (!selectedOrder) {
          alert('No hay ninguna orden seleccionada para cancelar.');
          return;
        }
      
        // Confirmar si desea cancelar
        const confirmCancel = window.confirm(
          `¿Estás seguro de que deseas cancelar la orden ${selectedOrder}?`
        );
        if (!confirmCancel) return; // Si el usuario cancela, detener aquí
      
        try {
          const token = localStorage.getItem('token'); // Obtener el token almacenado
          if (!token) {
            alert('No se encontró un token de autorización. Por favor, inicie sesión nuevamente.');
            return;
          }
      
          // Realizar la solicitud POST a la API
          const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenesretiro/actualizarEstado`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`, // Enviar el token en la cabecera
            },
            body: JSON.stringify({
              ordenDeRetiro: selectedOrder,
              nuevoEstado: 'Cancelar', // Estado "Cancelar"
            }),
          });
      
          if (response.ok) {
            const data = await response.json();
            // alert(`La orden ${selectedOrder} ha sido cancelada correctamente.`);
            console.log('Respuesta del servidor:', data);
      
            // Actualizar las órdenes después de cancelar
            this.setState({ selectedOrder: null, purchaseOrders: [] });
            this.loadOrdersFromBackend();
          } else {
            const error = await response.json();
            console.error('Error al cancelar la orden:', error);
            alert(`Error: ${error.message || 'No se pudo cancelar la orden.'}`);
          }
        } catch (err) {
          console.error('Error en la solicitud:', err);
          alert('Hubo un problema al intentar cancelar la orden.');
        }
      };
      
    
    render() {
        const { orders, selectedOrder, purchaseOrders, scannedValues, pickupLocation, filterLocation, tipoCliente, pagoRealizado } = this.state;
        const hasScannedValues = scannedValues.some(value => value.trim() !== "");
        const filteredOrders = filterLocation
            ? orders.filter(order => order.lugarRetiro === filterLocation)
            : orders;
        const uniqueLocations = [...new Set(orders.map(order => order.lugarRetiro))];

        return (
            <div className="fixed-container">
                <div className="container-edp">
                    <div className="odr-section">
                        <div className="scrollable-content">
                            <select value={filterLocation} onChange={this.handleFilterChange} className="filter-dropdown">
                                <option value="">Todos los lugares</option>
                                {uniqueLocations.map(location => (
                                    <option key={location} value={location}>{location}</option>
                                ))}
                            </select>
                            {filteredOrders.length > 0 ? (
                                filteredOrders.map(order => (
                                    <div
                                        key={order.ordenDeRetiro}
                                        className={`order-button ${selectedOrder === order.ordenDeRetiro ? 'active' : ''}`}
                                        onClick={() => this.handleOrderClick(order)}
                                    >
                                        {order.ordenDeRetiro}
                                        <div className="order-pickup-location">{order.lugarRetiro || "No especificado"}</div>
                                        <div className="order-pickup-location">{order.TClDescripcion}</div>
                                        <div className="order-pickup-location">{order.pagorealizado === 1 ? "Orden Paga" : "Orden aún no paga"}</div>                                    
                                    </div>
                                ))
                            ) : (
                                <div className="no-orders">No hay órdenes disponibles</div>
                            )}
                        </div>
                    </div>
                    <div className="odp-section">
                        <div className="scrollable-content">
                            <div className="order-actions">
                                <button
                                className="button-cancelar"
                                onClick={this.handleCancelarClick}
                                >
                                CANCELAR
                                </button>
                                <button
                                className="button-pronto"
                                onClick={this.handleProntoClick}
                                disabled={!hasScannedValues}
                                >
                                PRONTO
                                </button>
                            </div>
                            {selectedOrder && (
                                <div>
                                    <div className="selected-order">{selectedOrder}</div>
                                    <div className="pickup-location">{pickupLocation}</div>
                                    <div className="pickup-location">{tipoCliente}</div>
                                    <div className="pickup-location">{pagoRealizado === 1 ? "Orden Paga" : "Orden aún no paga"}
                                    </div>
                                    <div className="purchase-orders">
                                        <h3>Órdenes de Pedido:</h3>
                                        {purchaseOrders.map(po => (
                                            <div
                                                key={po}
                                                className={`purchase-order ${this.isOrderScanned(po) ? 'matched' : ''}`}
                                            >
                                                {po}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="esc-section">
                        <h2>Escanear Órdenes</h2>
                        <div className="scrollable-content scanned-values-section">
                            {scannedValues.map((value, index) => (
                                <input
                                    key={index}
                                    id={`scanned-input-${index}`}
                                    type="text"
                                    value={value}
                                    onChange={(e) => this.handleInputChange(index, e.target.value)}
                                    maxLength={100}
                                    className="scanned-input"
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }    
}

export default EntregaDePedido;
