import React from 'react';
import ReactDOM from 'react-dom';
import '../aspecto/aviso.css';

class Avisos extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentMessage: "",
      editMode: false,
      clientId: "",
      clientPhone: "",
      templateMessage: localStorage.getItem('templateMessage') || "Orden: {orderNumber}, Trabajo: {orderName}, Producto: {orderProduct}, Cantidad: {orderQuantity}, Costo: {orderCost}.",
      orders: [],
      clients: [],
      customFooter: localStorage.getItem('customFooter') || "",
      currentDate: new Date().toLocaleDateString(),
      cotizacionDolar: null, // Cotización del dólar
    };
  }

  componentDidMount() {
    const userId = this.getUserId(); // Obtener el ID del usuario autenticado
    if (userId) {
      this.unblockClientsOnLoad(userId); // Desbloquear clientes bloqueados por este usuario al cargar
    }
    this.fetchClients();
    this.fetchCotizacionDolar();
  }
  

  getUserId = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id;
    } catch (error) {
      console.error('Error al decodificar el token:', error);
      return null;
    }
  };

  unblockClientsOnLoad = (userId) => {
    const token = localStorage.getItem('token');
    fetch(`${process.env.REACT_APP_BACKEND_URL}/apicliente/desbloquearTodos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ userId }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          console.log('Clientes desbloqueados correctamente al cargar.');
        } else {
          console.error('No se pudieron desbloquear los clientes:', data.message);
        }
      })
      .catch(error => {
        console.error('Error al desbloquear clientes al cargar:', error);
      });
  };

  componentWillUnmount() {
    const userId = this.getUserId();
    if (userId) {
      this.unblockClientsOnLoad(userId);
    }
  }
  
  fetchClients = () => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenes/estados?estados=Ingresado`)
      .then(response => response.json())
      .then(data => {
        const uniqueClients = data.reduce((clients, order) => {
          if (!clients.some(client => client.id === order.IdCliente)) {
            clients.push({
              id: order.IdCliente,
              phone: `+598${order.Celular}`,
              CliBloqueadoBy: order.CliBloqueadoBy || null,
            });
          }
          return clients;
        }, []);
        this.setState({ clients: uniqueClients });
      })
      .catch(error => console.error('Error al obtener los clientes:', error));
  };

  fetchOrdersByClientId = (clientId) => {
    if (!clientId) return;

    fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenes/estados?estados=Ingresado`)
      .then(response => response.json())
      .then(data => {
        const filteredOrders = data.filter(order => order.IdCliente === clientId);
        const clientPhone = `+598${data.find(order => order.IdCliente === clientId)?.Celular || ""}`;
        this.setState({ orders: filteredOrders, clientId, clientPhone }, () => {
          this.generateMessage();
        });
      })
      .catch(error => {
        console.error('Error al obtener las órdenes:', error);
      });
  };

  fetchCotizacionDolar = () => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/apicotizaciones/hoy`)
      .then(response => response.json())
      .then(data => {
        this.setState({ cotizacionDolar: parseFloat(data.cotizaciones[0].CotDolar) });
      })
      .catch(error => {
        console.error('Error al obtener la cotización del dólar:', error);
        this.setState({ cotizacionDolar: null });
      });
  };

  handleClientSelect = async (clientId) => {
    const token = localStorage.getItem('token');
    const userId = this.getUserId();

    try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/apicliente/bloquear`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ clientId, userId }),
        });

        const data = await response.json();

        if (!data.success) {
            // Mostrar mensaje específico del backend
            alert(data.message);
            return; // Salir si no se pudo bloquear
        }

        // Actualizar estado si el cliente fue bloqueado con éxito
        this.setState({ clientId, clientPhone: data.clientPhone || "" }, () => {
            this.fetchOrdersByClientId(clientId);
        });
    } catch (error) {
        console.error('Error al gestionar el cliente:', error);
    }
  };

  handleClientRemove = () => {
    const { clientId, orders } = this.state;
    const token = localStorage.getItem('token');
    const userId = this.getUserId();

    if (!clientId || orders.length === 0) return;

    const orderIds = orders.map(order => order.IdOrden);
    fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenes/actualizarEstado`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ orderIds, nuevoEstado: 'Avisado' }),
    })
      .then(() => {
        return fetch(`${process.env.REACT_APP_BACKEND_URL}/apicliente/desbloquear`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ clientId, userId }),
        });
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          this.setState(prevState => ({
            clients: prevState.clients.filter(client => client.id !== clientId),
            clientId: "",
            clientPhone: "",
            currentMessage: "",
            orders: [],
          }));
        } else {
          alert(data.message || 'No se pudo desbloquear al cliente.');
        }
      })
      .catch(error => {
        console.error('Error al desbloquear cliente:', error);
      });
  };

  generateMessage = () => {
    const { templateMessage, orders, customFooter, currentDate, cotizacionDolar } = this.state;
    if (orders.length === 0) {
      this.setState({ currentMessage: "No hay órdenes disponibles." });
      return;
    }

    let combinedMessage = orders.length === 1
      ? `Tu pedido ya está listo.
  Fecha: ${currentDate}
  `
      : `Tus pedidos ya están listos.
  Fecha: ${currentDate}
  
  Órdenes:
  `;

    combinedMessage += orders.map(order => {
      const costWithSymbol = `${order.MonSimbolo} ${parseFloat(order.CostoFinal).toFixed(2)}`;
      return templateMessage
        .replace('{orderNumber}', order.CodigoOrden)
        .replace('{orderName}', order.NombreTrabajo)
        .replace('{orderProduct}', order.Producto)
        .replace('{orderQuantity}', order.Cantidad)
        .replace('{orderCost}', costWithSymbol);
    }).join('\n');

  // Calcular el total en cada moneda
  const totalUSD = orders
    .filter(order => order.MonSimbolo === 'USD')
    .reduce((sum, order) => sum + parseFloat(order.CostoFinal), 0);
  const totalUYU = orders
    .filter(order => order.MonSimbolo === '$')
    .reduce((sum, order) => sum + parseFloat(order.CostoFinal), 0);

  // Lógica para manejar las diferentes monedas
  if (totalUSD > 0 && totalUYU === 0) {
  // Si todas las órdenes son en USD
  const totalInUYU = (totalUSD * cotizacionDolar).toFixed(2);
  combinedMessage += `\nTotal USD: ${totalUSD.toFixed(2)}`;
  combinedMessage += `\nEquivalente a: $ ${totalInUYU}`;
  } else if (totalUYU > 0 && totalUSD === 0) {
  // Si todas las órdenes son en UYU
  combinedMessage += `\nTotal $: ${totalUYU.toFixed(2)}`;
  } else if (totalUSD > 0 && totalUYU > 0) {
  // Si hay órdenes mixtas
  const total = (totalUSD * cotizacionDolar + totalUYU).toFixed(2);
  combinedMessage += `\n\nSubTotal USD: ${totalUSD.toFixed(2)}`;
  combinedMessage += `\nSubTotal en $: ${totalUYU.toFixed(2)}`;
  combinedMessage += `\n\nTotal equivalente a: $ ${total} UYU`;
  }

  console.log(combinedMessage);


    combinedMessage += customFooter ? `\n\n${customFooter}` : "";
    this.setState({ currentMessage: combinedMessage });
  };

  handleSendMessage = () => {
    const { currentMessage, clientPhone } = this.state;
    if (!clientPhone) {
      alert('No se ha especificado un número de teléfono para el cliente.');
      return;
    }
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${clientPhone}&text=${encodeURIComponent(currentMessage)}`;
    window.open(whatsappUrl, "_blank");
  };

  handleOpenTemplateEdit = () => {
    this.setState({ editMode: !this.state.editMode });
  };

  handleFooterChange = (e) => {
    this.setState(
      { customFooter: e.target.value.replace('{currentDate}', this.state.currentDate) },
      () => {
        localStorage.setItem('customFooter', this.state.customFooter);
        this.generateMessage();
      }
    );
  };

  handleCopyMessage = () => {
    const { currentMessage } = this.state;
    navigator.clipboard.writeText(currentMessage).catch(error => {
      console.error('Error al copiar el mensaje:', error);
    });
  };

  render() {
    return (
      <div className="avisos-container">
        <div className="avisos-left">
          <h2 className="avisos-title">ÓRDENES PARA AVISAR</h2>
          <div className="avisos-client-list">
            {this.state.clients
              .filter(client => client.CliBloqueadoBy === null)
              .map((client, index) => (
                <button
                  key={index}
                  className="avisos-client-button"
                  onClick={() => this.handleClientSelect(client.id)}
                >
                  {client.id}
                </button>
              ))}
          </div>
        </div>
        <div className="avisos-right">
          <div className="avisos-client-info">
            <div>ID del cliente: {this.state.clientId}</div>
            <div>Contacto: {this.state.clientPhone}</div>
          </div>
          <div className="avisos-message-box-container">
            <div className="avisos-message-box" style={{ whiteSpace: 'pre-line' }}>
              {this.state.currentMessage}
            </div>
            <div className="button-group">
              <button className="avisos-send-button" onClick={this.handleSendMessage}>Enviar Mensaje</button>
              <button className="avisos-copy-button" onClick={this.handleCopyMessage}>Copiar Mensaje</button>
            </div>
            <div className="button-group">
              <button className="avisos-edit-button" onClick={this.handleOpenTemplateEdit}>Editar Mensaje Predeterminado</button>
            </div>
          </div>
          <button className="avisos-avisado-button" onClick={this.handleClientRemove}>AVISADO</button>
          {this.state.editMode && (
            <div className="footer-edit-container">
              <textarea
                value={this.state.customFooter}
                onChange={this.handleFooterChange}
                className="footer-edit-input"
                placeholder="Escribe el mensaje de pie de página aquí"
              />
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default Avisos;

ReactDOM.render(<Avisos />, document.getElementById("root"));
