import React, { useState, useEffect, useRef } from 'react';
import 'react-simple-keyboard/build/css/index.css';
import '../aspecto/ticket.css';
import '../aspecto/teclado.css';

function App() {
  const [clientId, setClientId] = useState('');
  const [contact, setContact] = useState('No especificado');
  const [idOrden, setOrden] = useState('');
  const [tipodecliente, setTipodecliente] = useState('No especificado');
  const [service, setService] = useState('');
  const [exchangeRate, setExchangeRate] = useState(() => {
    const storedRate = localStorage.getItem('exchangeRate');
    return storedRate ? parseFloat(storedRate) : '';
  });
  const [orders, setOrders] = useState([]);
  const [showTicket, setShowTicket] = useState(false);
  const [ticketData, setTicketData] = useState(null);
  const [pickupLocations, setPickupLocations] = useState([]);
  const [selectedPickupLocationId, setSelectedPickupLocationId] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [ticketDateTime, setTicketDateTime] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [totalPayment, setTotalPayment] = useState(0);
  const [currency, setCurrency] = useState('USD'); // Moneda seleccionada
  const [paymentFile, setPaymentFile] = useState(null); // Archivo cargado
  const [cotizacionDolar, setCotizacionDolar] = useState(null);
  const [manualCotizacion, setManualCotizacion] = useState(''); // Para la entrada manual
  const [isManualCotizacion, setIsManualCotizacion] = useState(false); // Controla si se muestra la opción manual


  const keyboardRef = useRef(null);

  useEffect(() => {
    loadPickupLocations();
  }, []);

  useEffect(() => {
    const updatedOrders = orders.map(order => ({ ...order, checked: selectAll }));
    setOrders(updatedOrders);
  }, [selectAll]);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);
  
  useEffect(() => {
    calculateTotalPayment();
  }, [orders]);

  useEffect(() => {
    fetchCotizacionDolar();
  }, []);
  

  const fetchPaymentMethods = () => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/apipagos/metodos`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al obtener los métodos de pago.');
        }
        return response.json();
      })
      .then((data) => {
        console.log('Métodos de pago obtenidos:', data); // Verificar la estructura de los datos
        const filteredMethods = data.filter((method) =>
          ['Transferencia', 'Rollo por adelantado'].includes(method.MPaDescripcionMetodo)
        );
        console.log('Métodos de pago filtrados:', filteredMethods);
        setPaymentMethods(filteredMethods);
      })
      .catch((error) => console.error('Error al obtener métodos de pago:', error));
  };

  const fetchCotizacionDolar = () => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/apicotizaciones/hoy`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('No se encontró la cotización del dólar para hoy.');
        }
        return response.json();
      })
      .then((data) => {
        if (data.cotizaciones[0]?.CotDolar) {
          setCotizacionDolar(parseFloat(data.cotizaciones[0].CotDolar));
        } else {
          throw new Error('El formato de la respuesta no es válido.');
        }
      })
      .catch((error) => {
        console.error('Error al obtener la cotización del dólar:', error);
        setCotizacionDolar(null);
      });
  };
  
  

  const loadPickupLocations = () => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/apilugaresRetiro/lugares-retiro`)
      .then((response) => response.json())
      .then((locations) => setPickupLocations(locations))
      .catch((error) => console.error('Error al cargar los lugares de retiro:', error));
  };

  const clearOrders = () => {
    setOrders([]);
    setOrden('');
    setClientId('');
    setContact('No especificado');
    setTipodecliente('No especificado');
    setTicketData(null);
    setSelectedPickupLocationId('');
  };

  const handleSetManualCotizacion = () => {
    if (!manualCotizacion || isNaN(manualCotizacion)) {
      alert('Por favor, ingrese un valor válido para la cotización.');
      return;
    }
  
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
        setCotizacionDolar(parseFloat(manualCotizacion));
      })
      .catch((error) => {
        console.error('Error al insertar cotización:', error);
        alert('Hubo un error al guardar la cotización.');
      });
  };  

  const fetchOrdersByClientId = () => {
    if (!idOrden) {
      alert('Por favor, ingrese una orden.');
      return;
    }
  
    fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenes/dataordenescliente/${idOrden}`)
      .then((response) => response.json())
      .then((data) => {
        if (!data || !Array.isArray(data) || data.length === 0) {
          alert('No se encontraron órdenes para el cliente en estado Avisado.');
          clearOrders(); // Limpia la vista para evitar información previa
          return;
        }
  
        const ordersArray = Array.isArray(data) ? data : [data];
        const newOrders = ordersArray.map((ord) => {
          const costoFinal = parseFloat(ord.OrdCostoFinal);
          return {
            OrdIdOrden: ord.OrdIdOrden,
            orderNumber: ord.OrdCodigoOrden,
            meters: ord.OrdCantidad || '',
            costWithCurrency: costoFinal >= 0 && !isNaN(costoFinal)
              ? `${ord.MonSimbolo || ''} ${costoFinal.toFixed(2)}`
              : 'No especificado',
            MonSimbolo: ord.MonSimbolo || '',
            costo: costoFinal,
            pago: ord.OrdPagoRealizado === 1 ? 'Realizado' : 'No realizado',
            estado: ord.EOrNombreEstado || '',
            checked: false,
          };
        });
        
        setClientId(data[0]?.CliCodigoCliente);
        setOrders(newOrders);
        setContact(data[0]?.CliCelular || 'No especificado');
        setTipodecliente(data[0]?.TipoCliente || 'No especificado');
      })
      .catch((error) => console.error('Error al obtener las órdenes por cliente:', error));
  };


  const handleCurrencyChange = (event) => {
    const selectedCurrency = event.target.value;
    setCurrency(selectedCurrency);
  
    // Recalcular el total según la moneda seleccionada
    const paidOrders = orders.filter((order) => order.pago === 'Realizar'); // Filtrar órdenes pagadas

    // Calcular el total en UYU
    const totalUYU = paidOrders
    .filter((o) => o.MonSimbolo === '$')
    .reduce((acc, o) => acc + parseFloat(o.costo), 0);

    // Calcular el total en USD
    const totalUSD = paidOrders
    .filter((o) => o.MonSimbolo === 'USD')
    .reduce((acc, o) => acc + parseFloat(o.costo), 0);

    if (selectedCurrency === 'UYU' && cotizacionDolar) {

      // Convertir el total a UYU
      const totalCost = totalUSD*cotizacionDolar+totalUYU;
      setTotalPayment(totalCost.toFixed(2));
    } else {
      // Mostrar el total en USD
      const totalCost = totalUSD+totalUYU/cotizacionDolar;
      setTotalPayment(totalCost.toFixed(2));
    }
  };

  const handlePaymentMethodChange = (e) => {
    const selectedValue = e.target.value;
    console.log('Nuevo método de pago seleccionado:', selectedValue);
    setSelectedPaymentMethod(selectedValue);
  };
  
  
  const handlePayment = async (ordenRetiroId, totalToPay) => {
    if (!selectedPaymentMethod) {
      alert('Debe seleccionar un método de pago.');
      return;
    }
  
    const token = localStorage.getItem('token');
    const selectedOrderNumbers = orders
      .filter((order) => order.pago === 'Realizar') // Solo las órdenes pagas
      .map((order) => order.OrdIdOrden); // Extraer los números de orden
  

    // Continuar con el pago
    fetch(`${process.env.REACT_APP_BACKEND_URL}/apipagos/realizarPago`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // Asegúrate de incluir este encabezado
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        metodoPagoId: parseInt(selectedPaymentMethod, 10),
        monedaId: currency === 'USD' ? 2 : 1,
        monto: parseFloat(totalToPay),
        ordenRetiro: `R-${String(ordenRetiroId).padStart(4, '0')}`,
        orderNumbers: selectedOrderNumbers, // Agregar los números de orden
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al realizar el pago');
        }
        return response.json();
      })
      .then((data) => {
        console.log('Pago registrado:', data);
        alert('Pago registrado correctamente');

        // Enviar el archivo si el método de pago es "Transferencia"
        if (selectedPaymentMethod === '2' && paymentFile) {
          const formData = new FormData();
          formData.append('comprobante', paymentFile);
          formData.append('ordenRetiroId', ordenRetiroId);
      
          try {
            const response = fetch(`${process.env.REACT_APP_BACKEND_URL}/apipagos/uploadComprobante`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: formData,
            });
      
            console.log('Comprobante subido correctamente');
          } catch (error) {
            console.error('Error al subir el comprobante:', error);
            alert('Error al subir el comprobante.');
            return; // Detener el flujo si falla el archivo
          }
        }

        setSelectedPaymentMethod('');
        setPaymentFile(null); // Restablecer el archivo cargado
      })
      .catch((error) => {
        console.error('Error al realizar el pago:', error);
        alert('Error al registrar el pago');
      });
  };
      
  // Función para manejar la selección de todas las órdenes
  const handleSelectAll = () => {
    setSelectAll((prevSelectAll) => {
      const newSelectAll = !prevSelectAll;
      const updatedOrders = orders.map((order) => ({
        ...order,
        checked: newSelectAll,
      }));
      setOrders(updatedOrders);
      return newSelectAll;
    });
  };

  const handleSubmit = async () => {
    if (!selectedPickupLocationId) {
      alert('Seleccione un lugar de retiro.');
      return;
    }

    if (!clientId){
      alert('Ingrese una orden');
      return;
    }
  
    if (orders.length === 0) {
      alert('No hay órdenes cargadas para este cliente.');
      return;
    }
  
    const selectedOrders = orders.filter((order) => order.checked);
    if (selectedOrders.length === 0) {
      alert('No se ha seleccionado ninguna orden para el retiro.');
      return;
    }

    const orderPayment = orders
      .filter((order) => order.pago === 'Realizar') // Solo las órdenes pagas

    if (!selectedPaymentMethod && orderPayment.length > 0) {
      alert('Debe seleccionar un método de pago.');
      return;
    }

    const totalToPay = totalPayment;
  
    const confirmMessage = orders.some((order) => order.pago === 'Realizar')
      ? `¿Está seguro de generar el ticket y realizar el pago de ${totalToPay} ${currency}?`
      : '¿Está seguro de generar el ticket?';
  
    if (!window.confirm(confirmMessage)) {
      return;
    }
  
    try {
      // Crear los datos de la orden de retiro
      const token = localStorage.getItem('token');
  
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenesRetiro/crear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orders: selectedOrders.map((order) => ({
            orderNumber: order.orderNumber,
            meters: order.meters,
            costWithCurrency: order.costWithCurrency,
            estado: order.estado,
            pago: order.pago,
          })),
          totalToPay,
          lugarRetiro: selectedPickupLocationId,
        }),
      });
  
      if (!response.ok) {
        console.log('No se creo la orden de retiro');
        throw new Error('Error al crear la orden de retiro');
      }
  
      const data = await response.json();
      console.log('Orden de retiro creada:', data);
  
      const { OReIdOrdenRetiro, fechaCreacion } = data; // Número de orden de retiro y fecha
      const generatedTicketNumber = 'R-' + String(OReIdOrdenRetiro).padStart(4, '0');
  
      // Actualizar el estado con los datos del ticket
      setTicketNumber(generatedTicketNumber);
      setTicketDateTime(fechaCreacion);
      setTicketData({
        clientId,
        tipodecliente,
        orders: selectedOrders,
        totalCost: totalPayment,
        currencyType: currency,
        ordenDeRetiro: generatedTicketNumber,
        timestamp: fechaCreacion,
      });
      setShowTicket(true);
      
      // Realizar el pago si es necesario
      if (orders.some((order) => order.pago === 'Realizar')) {
        handlePayment(OReIdOrdenRetiro, totalToPay);
      }
      
    } catch (error) {
      console.error('Error al procesar la solicitud:', error);
      alert('Hubo un error al procesar la solicitud.');
    }
  };    

  const calculateTotalPayment = (updatedOrders = orders) => {
    const paidOrders = updatedOrders.filter((order) => order.pago === 'Realizar'); // Filtrar órdenes a pagar
    
    // Calcular el total en UYU
    const totalUYU = paidOrders
    .filter((o) => o.MonSimbolo === '$')
    .reduce((acc, o) => acc + parseFloat(o.costo), 0);

    // Calcular el total en USD
    const totalUSD = paidOrders
    .filter((o) => o.MonSimbolo === 'USD')
    .reduce((acc, o) => acc + parseFloat(o.costo), 0);

    let totalCost = 0;
    if (currency === 'UYU' && cotizacionDolar) {

      // Convertir el total a UYU
      totalCost = totalUSD*cotizacionDolar+totalUYU;
    } else {
      // Mostrar el total en USD
      totalCost = totalUSD+totalUYU/cotizacionDolar;
    }
  
    setTotalPayment(totalCost.toFixed(2)); // Actualizar el total en USD
  };
  
  
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setPaymentFile(file);
  };
  

  const handlePrintTicket = () => {
    if (!ticketData) return;
    window.print();
  };

  const handlePickupLocationChange = (e) => {
    setSelectedPickupLocationId(e.target.value);
  };

  const handleRowSelection = (index) => {
    const updatedOrders = [...orders];
    updatedOrders[index].checked = !updatedOrders[index].checked;
    setOrders(updatedOrders);
  };  

  const handleTogglePayment = (index) => {
    const updatedOrders = [...orders];
    updatedOrders[index].pago =
      updatedOrders[index].pago === 'Realizar' ? 'No realizado' : 'Realizar'; // Alternar estado de pago
  
    // Actualizar órdenes y recalcular el total
    setOrders(updatedOrders);
    calculateTotalPayment(updatedOrders); // Pasar las órdenes actualizadas para recalcular
  };
  
  
  return (
    <div className="container">
      <h1>Entrega de Pedidos</h1>
      
      <div className="client-input-container">
        <input
          type="text"
          placeholder="Ingrese una orden"
          value={idOrden}
          onChange={(e) => setOrden(e.target.value)}

        />
        <button onClick={fetchOrdersByClientId}>Buscar Órdenes</button>
      </div>
      
      <div className="dropdown-id-container">
        <select
          className="pickup-location-dropdown"
          value={selectedPickupLocationId}
          onChange={handlePickupLocationChange}
        >
          <option value="">Seleccionar lugar de retiro</option>
          {pickupLocations.map((location) => (
            <option key={location.LReIdLugarRetiro} value={location.LReIdLugarRetiro}>
              {location.LReNombreLugar}
            </option>
          ))}
        </select>
      </div>
      
      {orders.length > 0 && (
      <div className="order-info">
        <p><strong>Cliente:</strong> {clientId}</p>
        <p><strong>Contacto:</strong> {contact}</p>
        <p><strong>Tipo de cliente:</strong> {tipodecliente}</p>
      </div>
      )}

      <div className="payment-method-container">
        {orders.some((order) => order.pago === 'Realizar') && paymentMethods.length > 0 && (
          <>
            <label htmlFor="payment-method">Seleccione un método de pago:</label>
            <select
              id="payment-method"
              value={selectedPaymentMethod}
              onChange={handlePaymentMethodChange}
              >
              <option value="" disabled>Seleccione...</option>
              {paymentMethods.map((method) => (
                <option key={method.MPaIdMetodoPago} value={method.MPaIdMetodoPago}>
                  {method.MPaDescripcionMetodo}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {selectedPaymentMethod === '2' && (
        <div className="file-upload-container">
          <label htmlFor="file-upload">Cargar comprobante de pago:</label>
          <input
            type="file"
            id="file-upload"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
          />
        </div>
      )}

      <div className="currency-selector">
        {orders.some((order) => order.pago === 'Realizar') && paymentMethods.length > 0 && (
          <>
            <label htmlFor="currency">Seleccionar Moneda:</label>
            <select id="currency" value={currency} onChange={handleCurrencyChange}>
              <option value="USD">USD</option>
              <option value="UYU">UYU</option>
            </select>
        </>
        )}
      </div>

      <div className="caja-cotizacion">
        <h4>Cotización del Dólar:</h4>
        {cotizacionDolar !== null ? (
          <p>1 USD = {cotizacionDolar.toFixed(2)} UYU</p>
        ) : (
          // Solo aparece si no hay cotización existente
          <div>
            {!isManualCotizacion ? (
              <p>
                No se encontró la cotización del dólar.{' '}
                <button onClick={() => setIsManualCotizacion(true)}>
                  Ingresar manualmente
                </button>
              </p>
            ) : (
              <div>
                <input
                  type="number"
                  value={manualCotizacion}
                  onChange={(e) => setManualCotizacion(e.target.value)}
                  placeholder="Ingrese cotización"
                  className="input-cotizacion"
                />
                <button onClick={handleSetManualCotizacion}>
                  Confirmar Cotización
                </button>
              </div>
            )}
          </div>
        )}
      </div>


      <div className="total-payment-container">
        {orders.some((order) => order.pago === 'Realizar') && (
          <p>
            <strong>Total a Pagar:</strong>{' '}
            {currency === 'UYU'
              ? `$`
              : `USD`} {totalPayment} 
          </p>
        )}
      </div>

      {orders.length > 0 && (
      <div className="order-table">
        <table>
        <thead>
          <tr>
            <th style={{ width: '100px', textAlign: 'center' }}>Seleccionar  
              {/* Checkbox para seleccionar/deseleccionar todas las órdenes */}
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
              />
            </th>
            <th style={{ width: '100px' }}>Pago</th>
            <th>Número de Orden</th>
            <th>Estado</th>
            <th>Metros</th>
            <th>Costo con Moneda</th>
            <th>Pago</th>
          </tr>
        </thead>
          <tbody>
            {orders.map((order, index) => (
              <tr
                key={index}
                style={{
                  backgroundColor: order.checked ? '#d4edda' : 'transparent', // Fondo verde si está seleccionada
                }}
              >
                {/* Botón de seleccionar */}
                <td style={{ width: '100px', textAlign: 'center' }}>
                  <button
                    onClick={() => handleRowSelection(index)}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: order.checked ? '#28a745' : '#6c757d',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                    }}
                  >
                    {order.checked ? 'Seleccionada' : 'Seleccionar'}
                  </button>
                </td>
                {/* Botón de pago */}
                <td style={{ width: '100px', textAlign: 'center' }}>
                {order.pago !== "Realizado" ? (                
                  <button
                    onClick={() => handleTogglePayment(index)}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: order.pago === 'Realizar' ? '#28a745' : '#ffc107',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                    }}
                  >
                    {order.pago === 'Realizar' ? 'Pagar' : 'Marcar pago'}
                  </button>
                ):(
                  <button
                    style={{
                      padding: '5px 10px',
                      backgroundColor: '#28a745',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                    }}
                  >
                    Ya abonada
                  </button>
                )}
                </td>
                <td>{order.orderNumber}</td>
                <td>{order.estado}</td>
                <td>{order.meters}</td>
                <td>{order.costWithCurrency}</td>
                <td>{order.pago}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      <button onClick={handleSubmit}>Generar Ticket</button>

      {showTicket && (
        <div id="ticket">
          <div id="ticket-content">
            <h2>Ticket</h2>
            <h3 id="ticket-number">{ticketNumber}</h3>
            <p id="ticket-date-time">{ticketDateTime}</p>
            <p>
              <strong>Cliente:</strong> <span id="ticket-client-id">{ticketData.clientId}</span>
            </p>
            <p>
              <strong>Tipo de cliente:</strong>{' '}
              <span id="tipo-client">{ticketData.tipodecliente}</span>
            </p>
            <p>
              <strong>Servicio:</strong> <span id="ticket-service">{ticketData.service}</span>
            </p>
            <table>
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Estado</th>
                  <th>Metros</th>
                  <th>Costo con Moneda</th>
                  <th>Pago</th>
                </tr>
              </thead>
              <tbody id="ticket-orders">
                {ticketData.orders.map((order, idx) => (
                  <tr key={idx}>
                    <td>{order.orderNumber}</td>
                    <td>{order.estado}</td>
                    <td>{order.meters}</td>
                    <td>{order.costWithCurrency}</td>
                    <td>{order.pago}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan="4">Total</td>
                  <td>
                    {ticketData.totalCost} {ticketData.currencyType}
                  </td>
                </tr>
              </tbody>
            </table>
            <button id="print-ticket" className="no-print" onClick={handlePrintTicket}>
              Imprimir Ticket
            </button>
            <button
              id="close-ticket"
              className="no-print"
              onClick={() => {
                setShowTicket(false);
                clearOrders();
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
