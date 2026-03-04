import React from 'react';
import '../aspecto/VisualOrdenesRetiro.css';
import { initializeSocket } from "../utils/socket"; // Importa el socket utilitario
import alertSoundFile from '../sonidos/ding-47489.mp3'; // Usar el archivo de sonido proporcionado por el usuario


class VisualOrdenesRetiro extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      ingresadasOrders: [],
      empaquetadasOrders: [],
    };
    this.alertSound = new Audio(alertSoundFile); // Usar el archivo de sonido proporcionado
    this.alertSound.preload = 'auto';
  }

  componentDidMount() {
    // Inicializar socket usando la utilidad
    this.socket = initializeSocket();
  
    // Escuchar actualizaciones desde el WebSocket
    this.socket.on('actualizado', (data) => {
      console.log('Evento recibido:', data);
  
      // Actualizar directamente el estado si el payload contiene datos actualizados
      if (data && data.orders) {
        this.setState({ orders: data.orders });
      } else {
        // Si no hay datos en el evento, llamar a la API
        this.loadOrdersFromBackend();
      }
    });
  
    // Cargar órdenes existentes desde el backend al iniciar
    this.loadOrdersFromBackend();
  
    // Escuchar eventos del teclado
    document.addEventListener('keydown', this.handleKeyDown);
  
    // Configuración inicial para habilitar el sonido
    document.addEventListener('click', this.enableSoundPlayback);
  }
  
  componentWillUnmount() {
    // Remover eventos y desconectar socket
    if (this.socket) {
      this.socket.off('actualizado'); // Limpiar evento
      this.socket.disconnect(); // Desconectar
    }
  
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('click', this.enableSoundPlayback);
  }  

  enableSoundPlayback = () => {
    this.alertSound.play().catch(() => {
      // Esto habilitará la reproducción de sonido después de una interacción del usuario
    });
    document.removeEventListener('click', this.enableSoundPlayback); // Remover el evento después de que se haya habilitado el sonido
  };

  // Manejar eventos de teclado
  handleKeyDown = (event) => {
    if (event.shiftKey && event.key === 'Q') {
      document.querySelector('.PDR-principal').style.display = 'none';
    }
  };

  playAlertSound = () => {
    this.alertSound.play().catch(error => {
      console.error('Error al reproducir el sonido de alerta:', error);
    });
  };

  // Método para cargar datos iniciales
  loadOrdersFromBackend = () => {
    let ingresadasOrders = []; // Declarar ingresadasOrders en el ámbito del método

    // Llamar a la API para obtener las órdenes que deben pasar por caja
    fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenesretiro/pasarporcaja`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al cargar las órdenes de retiro para pasar por caja');
        }
        return response.json();
      })
      .then((data) => {
        console.log('Órdenes que deben pasar por caja:', data);
        ingresadasOrders = data; // Asignar el resultado a ingresadasOrders

        // Llamar a la API para obtener las órdenes empaquetadas
        return fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenesRetiro/estados?estados=Abonado,Abonado de antemano,Empaquetado y abonado`);
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al cargar las órdenes empaquetadas');
        }
        return response.json();
      })
      .then((empaquetadasOrders) => {
        console.log('Órdenes empaquetadas antes de filtrar:', empaquetadasOrders);

        // Filtrar por lugar de retiro
        const empaquetadasOrdersFiltered = empaquetadasOrders.filter(order => order.lugarRetiro === 'En local');

        console.log('Órdenes empaquetadas (En local):', empaquetadasOrdersFiltered);

        // Reproducir el sonido solo si hay nuevas órdenes empaquetadas
        if (empaquetadasOrdersFiltered.length > this.state.empaquetadasOrders.length) {
          this.playAlertSound();
        }

        // Ordenar ambas listas de órdenes en forma descendente
        ingresadasOrders.sort((a, b) => b.ordenDeRetiro - a.ordenDeRetiro);
        empaquetadasOrdersFiltered.sort((a, b) => b.ordenDeRetiro - a.ordenDeRetiro);

        // Actualizar el estado
        this.setState({ ingresadasOrders, empaquetadasOrders: empaquetadasOrdersFiltered });
      })
      .catch((error) => {
        console.error('Error al cargar las órdenes de retiro:', error);
      });
  };


  render() {
    const { ingresadasOrders, empaquetadasOrders } = this.state;

    return (
      <div className="PDR-principal">
        <div className="PDR PDR1">
          <h2>PASAR POR CAJA</h2>
          <div className="scrollable-content">
            {ingresadasOrders.map(order => (
                <div key={order.ordenDeRetiro} className="order-item">
                  {order.ordenDeRetiro}
                </div>
              ))
            }
          </div>
        </div>
        <div className="PDR PDR2">
          <h2>ÓRDENES EN PREPARACIÓN</h2>
          <div className="scrollable-content">
            {empaquetadasOrders.map(order => (
                <div key={order.ordenDeRetiro} className="order-item empaquetada">
                  {order.ordenDeRetiro}
                </div>
              ))
            }
          </div>
        </div>
      </div>
    );
  }
}

export default VisualOrdenesRetiro;
