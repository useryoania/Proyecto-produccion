import React from 'react';
import '../aspecto/caja.css';
import { initializeSocket } from "../utils/socket"; // Importa el socket utilitario

class EntregaDePedido extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      orders: [],
      selectedOrder: null,
      purchaseOrders: [],
      totalProntoUYU: 0,
      totalProntoUSD: 0,
      currency: 'USD', // Valor inicial de la moneda
      paymentMethods: [],
      selectedPaymentMethod: '', // Método de pago seleccionado
      paymentAmount: '',
      cotizacionDolar: null,
      manualCotizacion: '',
      isManualCotizacion: false,
    };
  }

  componentDidMount() {
    // Inicializar el socket
    this.socket = initializeSocket();

    // Suscribirse al evento "actualizado"
    this.socket.on("actualizado", () => {
      console.log("Evento recibido: actualizando órdenes");
      this.loadOrders(); // Cargar órdenes actualizadas
    });

    // Cargar datos iniciales
    this.loadOrders();
    this.fetchPaymentMethods();
    this.fetchCotizacionDolar();
  }

  componentWillUnmount() {
    if (this.socket) {
      this.socket.off("actualizado"); // Limpiar evento al desmontar
    }
  }

  fetchPaymentMethods = () => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/apipagos/metodos`)
      .then((response) => response.json())
      .then((data) => {
        this.setState({ paymentMethods: data });
      })
      .catch((error) => console.error('Error al obtener métodos de pago:', error));
  };

  fetchCotizacionDolar = () => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/apicotizaciones/hoy`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('No se encontró la cotización del dólar para hoy.');
        }
        return response.json();
      })
      .then((data) => {
        console.log(data);
  
        // Verificar si `cotizaciones` es un objeto con la estructura esperada
        if (data.cotizaciones[0].CotDolar) {
          this.setState({ cotizacionDolar: parseFloat(data.cotizaciones[0].CotDolar) });
        } else {
          throw new Error('El formato de la respuesta no es válido.');
        }
      })
      .catch((error) => {
        console.error('Error al obtener la cotización del dólar:', error);
        this.setState({ cotizacionDolar: null });
      });
  };  
  

  loadOrders = () => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenesretiro/caja`)
      .then((response) => response.json())
      .then((data) => {
        if (JSON.stringify(data) !== JSON.stringify(this.state.orders)) {
          this.setState((prevState) => ({
            orders: data,
            selectedOrder: prevState.selectedOrder,
            purchaseOrders: prevState.purchaseOrders,
          }));
        }
      })
      .catch((error) => console.error('Error al obtener órdenes:', error));
  };

  handleManualCotizacionChange = (e) => {
    this.setState({ manualCotizacion: e.target.value });
  };

  handleSetManualCotizacion = () => {
    const { manualCotizacion } = this.state;

    if (!manualCotizacion || isNaN(manualCotizacion)) {
      alert('Por favor, ingrese un valor válido para la cotización.');
      return;
    }

    if (window.confirm(`¿Está seguro de establecer la cotización del dólar en ${manualCotizacion} UYU?`)) {
      const token = localStorage.getItem('token');

      fetch(`${process.env.REACT_APP_BACKEND_URL}/apicotizaciones/insertar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cotizacion: parseFloat(manualCotizacion),
          fecha: new Date().toISOString().split('T')[0],
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Error al insertar la cotización.');
          }
          return response.json();
        })
        .then(() => {
          alert('¡Cotización registrada exitosamente!');
          this.setState({ cotizacionDolar: parseFloat(manualCotizacion), isManualCotizacion: false });
        })
        .catch((error) => {
          console.error('Error al insertar cotización:', error);
          alert('Hubo un error al guardar la cotización.');
        });
    }
  };

  handleOrderClick = async (order) => {
    const { selectedOrder, cotizacionDolar } = this.state;
  
    // Si la orden está actualmente seleccionada (desmarcando la orden)
    if (selectedOrder === order.ordenDeRetiro) {
      console.log(order);
      this.setState({ selectedOrder: null, purchaseOrders: [], totalProntoUSD: 0, totalProntoUYU: 0 });
      
      try {
          const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenesretiro/marcarpasarporcaja/0`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`, // Usa el token almacenado
            },
            body: JSON.stringify({
              ordenDeRetiro: order.ordenDeRetiro,
            }),
          });
  
        } catch (err) {
          console.error('Error en la solicitud:', err);
        }
      return;
    }
  
    // Si la orden contiene órdenes individuales
    if (order.ordenes && Array.isArray(order.ordenes)) {
      // Calcular los totales de las órdenes
      const purchaseOrders = order.ordenes.map((o) => {
        const totalUYU =
          o.moneda.simbolo === 'USD' && cotizacionDolar
            ? parseFloat(o.costoFinal) * cotizacionDolar
            : parseFloat(o.costoFinal);
  
        return {
          orderId: o.orderId,
          orderNumber: o.codigoOrden,
          total: parseFloat(o.costoFinal) || 0,
          moneda: o.moneda.simbolo,
          pago: o.pagoRealizado,
        };
      });
  
      // Calcular el total 
      const totalProntoUSD = purchaseOrders
      .filter((po) => po.moneda === 'USD' && po.pago === 0)
      .reduce((acc, po) => acc + po.total, 0);

      // Calcular el total en UYU
      const totalProntoUYU = purchaseOrders
        .filter((po) => po.moneda === '$' && po.pago === 0)
        .reduce((acc, po) => acc + parseFloat(po.total), 0);

      console.log(totalProntoUSD);
      console.log(totalProntoUYU);      

      // Actualizar el estado local para reflejar la selección
      this.setState({ selectedOrder: order.ordenDeRetiro, purchaseOrders, totalProntoUSD, totalProntoUYU });
    
      // Llamar a la API para marcar como "Aviso pasar por caja"
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenesretiro/marcarpasarporcaja/1`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`, // Usa el token almacenado
          },
          body: JSON.stringify({
            ordenDeRetiro: order.ordenDeRetiro,
          }),
        });
      } catch (err) {
        console.error('Error en la solicitud:', err);
      }
    } else {
      console.error('La orden seleccionada no contiene órdenes individuales.');
    }
  };
  

  handlePaymentAmountChange = (e) => {
    const value = e.target.value;
    this.setState({ paymentAmount: value });
  };
  

  // Método para manejar el cambio de moneda
  handleCurrencyChange = (e) => {
    const { paymentAmount, cotizacionDolar, currency } = this.state;
    const newCurrency = e.target.value; // Nueva moneda seleccionada
    
    // Verifica si el monto es válido
    let payment = parseFloat(paymentAmount);
    if (isNaN(payment) || payment <= 0) {
      payment = 0; // Si no es válido, establece un valor predeterminado
    }
    
    // Realiza la conversión
    if (currency === 'USD' && newCurrency === 'UYU' && cotizacionDolar) {
      payment = payment * cotizacionDolar; // USD a UYU
    } else if (currency === 'UYU' && newCurrency === 'USD' && cotizacionDolar) {
      payment = payment / cotizacionDolar; // UYU a USD
    }
  
    // Actualiza el estado con la nueva moneda y el monto convertido
    this.setState({
      currency: newCurrency,
      paymentAmount: payment.toFixed(2), // Actualizamos el valor convertido
    });
  };    
  
  

  handlePaymentMethodChange = (e) => {
    this.setState({ selectedPaymentMethod: e.target.value }); // Cambia el método de pago seleccionado
  };

  handlePaymentClick = () => {
    const {
      selectedOrder,
      selectedPaymentMethod,
      paymentAmount,
      currency,
      purchaseOrders, // Lista de órdenes cargadas
    } = this.state;
    const token = localStorage.getItem('token');
  
    if (!selectedOrder || !selectedPaymentMethod || !paymentAmount) {
      alert('Por favor, seleccione una orden, un método de pago e ingrese un monto.');
      return;
    }

    if (paymentAmount <= 0) {
      alert("Por favor, ingrese un monto válido");
      return;
    }
  
    if (!token) {
      alert('No se encontró un token de autorización. Por favor, inicie sesión nuevamente.');
      return;
    }
  
    // Filtrar órdenes aun no pagas
    const ordersToPay = purchaseOrders.filter((o) => o.pago === 0)
      .map((po) => po.orderId); // Extraer los números de las órdenes
  
    if (ordersToPay.length === 0) {
      alert('No hay órdenes listas para pagar.');
      return;
    }
  
    if (
      window.confirm(
        `¿Está seguro de realizar el pago de ${paymentAmount} ${currency} para la orden de retiro ${selectedOrder}?`
      )
    ) {
      fetch(`${process.env.REACT_APP_BACKEND_URL}/apipagos/realizarPago`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          metodoPagoId: parseInt(selectedPaymentMethod, 10),
          monedaId: currency === 'USD' ? 2 : 1,
          monto: parseFloat(paymentAmount),
          ordenRetiro: selectedOrder,
          orderNumbers: ordersToPay, // Lista de órdenes
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Error en el servidor: ${response.statusText}`);
          }
          return response.json();
        })
        .then(() => {
          alert('Pago registrado correctamente');
          this.setState({
            selectedOrder: null,
            selectedPaymentMethod: '',
            paymentAmount: '',
          });
          this.loadOrders();
        })
        .catch((error) => {
          console.error('Error al realizar el pago:', error);
          alert('Error al registrar el pago. Por favor, intente nuevamente.');
        });
    }
  };    

  render() {
    const {
      orders,
      selectedOrder,
      purchaseOrders,
      totalProntoUSD,
      totalProntoUYU,
      currency,
      paymentMethods,
      selectedPaymentMethod,
      paymentAmount,
      cotizacionDolar,
      isManualCotizacion,
      manualCotizacion,
    } = this.state;

    return (
      <div className="caja-prin" style={{ display: 'flex', flexDirection: 'column', width: '90vw', maxWidth: '1200px', height: '100vh', overflow: 'hidden', margin: '0 auto', backgroundColor: '#ffffff' }}>
        {/* Parte superior con los controles de pago */}
        <div className="caja-c1" style={{ flex: '0 1 auto', width: '100%', padding: '10px', boxSizing: 'border-box', backgroundColor: '#ffffff', overflow: 'hidden' }}>
          <div className="caja-field-row" style={{ display: 'flex', flexDirection: 'row', gap: '10px', justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <div className="caja-field-container">
              <label htmlFor="payment-method" className="caja-label">Seleccionar forma de pago</label>
              <select id="payment-method" className="caja-payment-method" value={selectedPaymentMethod} onChange={this.handlePaymentMethodChange}>
                <option value="">Seleccione un método</option>
                {paymentMethods.map((method) => (
                  <option key={method.MPaIdMetodoPago} value={method.MPaIdMetodoPago}>
                    {method.MPaDescripcionMetodo}
                  </option>
                ))}
              </select>
            </div>

            <div className="caja-field-container">
              <label htmlFor="currency" className="caja-label">Seleccionar Moneda</label>
              <select id="currency" value={currency} onChange={this.handleCurrencyChange} className="caja-currency">
                <option value="USD">USD</option>
                <option value="UYU">UYU</option>
              </select>
            </div>

            <div className="caja-field-container">
              <label htmlFor="file-upload" className="caja-label">Cargar comprobante de pago</label>
              <input type="file" id="file-upload" className="caja-file-upload" />
            </div>

            <div className="caja-field-container" style={{ marginTop: '60px' }}>
              <label htmlFor="payment-amount" className="caja-label">Ingrese Monto</label>
              <input
                type="number"
                id="payment-amount"
                className="input-payment-value"
                value={paymentAmount} // Este valor es el que se muestra en el input
                onChange={this.handlePaymentAmountChange} // Esta función actualiza el estado
                style={{ width: '100%' }} // Asegúrate de que no hay nada que interfiera con la visibilidad o el estilo
              />
              <button className="caja-payment-button" onClick={this.handlePaymentClick} style={{ marginTop: '30px' }}>
                Realizar Pago
              </button>
            </div>
          </div>

          <div className="caja-cotizacion">
            <h4>Cotización del Dólar:</h4>
            {cotizacionDolar !== null ? (
              <p>1 USD = {cotizacionDolar.toFixed(2)} UYU</p>
            ) : (
              <>
                {!isManualCotizacion ? (
                  <p>
                    No se encontró la cotización del dólar.{' '}
                    <button onClick={() => this.setState({ isManualCotizacion: true })}>
                      Ingresar manualmente
                    </button>
                  </p>
                ) : (
                  <div>
                    <input
                      type="number"
                      value={manualCotizacion}
                      onChange={this.handleManualCotizacionChange}
                      placeholder="Ingrese cotización"
                      className="input-cotizacion"
                    />
                    <button onClick={this.handleSetManualCotizacion}>
                      Confirmar Cotización
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Contenedor de CajaC2 y CajaC3 en la parte inferior */}
        <div className="caja-inferior" style={{ display: 'flex', flex: '1', width: '100%', backgroundColor: '#ffffff', overflow: 'hidden' }}>
          <div className="caja-c2" style={{ flex: '1', padding: '20px', boxSizing: 'border-box', borderRight: '1px solid #ddd', backgroundColor: '#ffffff', overflow: 'hidden' }}>
            <div className="caja-orders-list">
              <h3 className="caja-orders-title">Órdenes para Pagar</h3>
              {orders.length > 0 ? (
                <div className="caja-orders-grid">
                  {orders.map((order) => (
                    <div
                      key={order.ordenDeRetiro}
                      className={`caja-order-button ${selectedOrder === order.ordenDeRetiro ? 'active' : ''} ${
                        selectedOrder && selectedOrder !== order.ordenDeRetiro ? 'disabled' : ''
                      }`}
                      onClick={() => {
                        if (!selectedOrder || selectedOrder === order.ordenDeRetiro) {
                          this.handleOrderClick(order);
                        }
                      }}
                    >
                      {order.ordenDeRetiro}
                    </div>
                  ))}
                </div>              
              ) : (
                <div className="caja-no-orders">No hay órdenes disponibles</div>
              )}
            </div>
          </div>

          <div className="caja-c3" style={{ flex: '1', padding: '20px', boxSizing: 'border-box', backgroundColor: '#ffffff', overflow: 'hidden' }}>
            {selectedOrder && (
              <div className="caja-order-details">
                <div className="caja-order-title">{selectedOrder}</div>
                <div className="caja-total-amount">
                  <strong>Total a Cobrar: 
                    {currency === 'USD' ? (
                      // Si la moneda es USD, mostramos el total en USD
                      `USD ${((parseFloat(totalProntoUYU) / cotizacionDolar) + parseFloat(totalProntoUSD)).toFixed(2)}`
                    ) : (
                      // Si la moneda es UYU, convertimos el total
                      `$ ${((parseFloat(totalProntoUSD) * cotizacionDolar) + parseFloat(totalProntoUYU)).toFixed(2)}`
                    )}
                  </strong>
                </div>
                <h3 className="caja-order-list-title">Órdenes de Pedido:</h3>
                <div className="caja-purchase-orders">
                  {purchaseOrders.map((po) => (
                    <div
                      key={po.orderNumber}
                      className={`caja-purchase-order 'pronto`}
                    >
                      {po.orderNumber} // Costo total: {po.moneda} {po.total.toFixed(2)}
                      {currency === 'UYU' && po.moneda === "USD" && (
                        <>
                          {' '}➡ $ {(po.total*cotizacionDolar).toFixed(2)}
                        </>
                      )}
                      {currency === 'USD' && po.moneda === "$" && (
                        <>
                          {' '}➡ USD {(po.total/cotizacionDolar).toFixed(2)}
                        </>
                      )}
                      {po.pago === 1 && (<>{' '}➡ Pago ya realizado</>)} 
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default EntregaDePedido;
