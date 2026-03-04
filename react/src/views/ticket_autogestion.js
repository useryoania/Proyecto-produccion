import React, { useState, useEffect, useRef } from 'react';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';
import '../aspecto/ticket_autogestion.css';
import '../aspecto/teclado.css';

function App() {
  const [clientId, setClientId] = useState('No especificado');
  const [contact, setContact] = useState('No especificado');
  const [tipodecliente, setTipodecliente] = useState('No especificado');
  const [service, setService] = useState('');
  const [orders, setOrders] = useState([]);
  const [inputName, setInputName] = useState('order-0');
  const [inputValue, setInputValue] = useState('');
  const [orderInputValue, setOrderInputValue] = useState('');
  const [showKeyboardModal, setShowKeyboardModal] = useState(false);
  const [layoutName] = useState('default');
  const [showTicket, setShowTicket] = useState(false);
  const [ticketData, setTicketData] = useState(null);
  const [ticketNumber, setTicketNumber] = useState('');
  const [ticketDateTime, setTicketDateTime] = useState('');
  const [pickupLocations, setPickupLocations] = useState([]);
  const [selectedPickupLocationId, setSelectedPickupLocationId] = useState('');
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  const keyboardRef = useRef(null);
  const validOrdersCount = orders.filter(o => o.orderNumber.trim() !== "").length;

  useEffect(() => {
    addRows(5);
    loadPickupLocations();
    handleFocus('order-0');
  }, []);

  const handleChange = (input) => {
    if (inputName === 'ingresarOrdenes') {
      setOrderInputValue(input);
    } else if (inputName.startsWith('order-')) {
      setInputValue(input);
      const index = parseInt(inputName.split('-')[1], 10);
      handleOrderNumberChange(index, input);
    }
  };

  const loadPickupLocations = () => {
    const localPickup = {
      LReNombreLugar: "En local",
      LReIdLugarRetiro: 5,
    };
    setPickupLocations([localPickup]);
    setSelectedPickupLocationId(localPickup.LReIdLugarRetiro);
  };

  const handleFocus = (name) => {
    setInputName(name);
    if (name === 'ingresarOrdenes') {
      setOrderInputValue(orderInputValue);
    } else if (name.startsWith('order-')) {
      const index = parseInt(name.split('-')[1], 10);
      let value = orders[index]?.orderNumber || '';
      setInputValue(value);
    }
    if (keyboardRef.current) {
      keyboardRef.current.setInput(name === 'ingresarOrdenes' ? orderInputValue : inputValue);
    }
  };

  // Layout del teclado que incluye {bksp} para borrar
  const layouts = {
    default: [
      '1 2 3',
      '4 5 6',
      '7 8 9',
      '0 00 {bksp}',
      'SB- DF- UVDF- X',
      'ECOUV- TWC- EMB- R TWD-',
      'VEN- EST- PRO-',
    ],
  };

  const handleKeyPress = (button) => {
    if (button === '{bksp}') {
      // Elimina el último carácter del input actual
      if (inputName === 'ingresarOrdenes') {
        const newValue = orderInputValue.slice(0, -1);
        setOrderInputValue(newValue);
        if (keyboardRef.current) keyboardRef.current.setInput(newValue);
      } else if (inputName.startsWith('order-')) {
        const newValue = inputValue.slice(0, -1);
        setInputValue(newValue);
        const index = parseInt(inputName.split('-')[1], 10);
        handleOrderNumberChange(index, newValue);
        if (keyboardRef.current) keyboardRef.current.setInput(newValue);
      }
      return;
    }

    if (inputName === 'ingresarOrdenes') {
      if (button === '{tab}' || button === '{enter}') {
        let index = orders.findIndex((order) => (order.orderNumber || '').trim() === '');
        if (index === -1) {
          addRows(1);
          index = orders.length;
        }
        handleOrderNumberChange(index, orderInputValue);
        setOrderInputValue('');
        setShowKeyboardModal(false);
      } else {
        const newValue = orderInputValue + button;
        setOrderInputValue(newValue);
        if (keyboardRef.current) keyboardRef.current.setInput(newValue);
      }
    } else if (inputName.startsWith('order-')) {
      if (button === '{tab}' || button === '{enter}') {
        navigateVertical();
      } else {
        const newValue = inputValue + button;
        setInputValue(newValue);
        setTimeout(() => {
          const index = parseInt(inputName.split('-')[1], 10);
          handleOrderNumberChange(index, newValue);
          if (keyboardRef.current) keyboardRef.current.setInput(newValue);
        }, 0);
      }
    }
  };

  const navigateVertical = () => {
    if (inputName.startsWith('order-')) {
      const currentIndex = parseInt(inputName.split('-')[1], 10);
      const nextIndex = currentIndex + 1 < orders.length ? currentIndex + 1 : currentIndex;
      handleFocus(`order-${nextIndex}`);
      if (keyboardRef.current) keyboardRef.current.setInput('');
    }
  };

  const addRows = (count) => {
    const newOrders = [...orders];
    for (let i = 0; i < count; i++) {
      newOrders.push({
        orderNumber: '',
        ordNombreTrabajo: '',
        meters: '',
        costWithCurrency: '',
        clientId: '',
        contact: '',
        tipodecliente: '',
        checked: false,
      });
    }
    setOrders(newOrders);
  };

  function updateClientInfo(updatedOrders = orders) {
    const selectedOrders = updatedOrders.filter(order => order.checked);
    const firstOrderWithClient = selectedOrders.find((order) => order.clientId);
    if (firstOrderWithClient) {
      setClientId(firstOrderWithClient.clientId || 'No especificado');
      setContact(firstOrderWithClient.contact || 'No especificado');
      setTipodecliente(firstOrderWithClient.tipodecliente || 'No especificado');
    } else {
      setClientId('No especificado');
      setContact('No especificado');
      setTipodecliente('No especificado');
    }
  }

  const handleOrderNumberChange = (index, value) => {
    const newOrders = [...orders];
    if (value.trim() === '') {
      newOrders[index] = {
        orderNumber: '',
        ordNombreTrabajo: '',
        meters: '',
        costWithCurrency: '',
        pago: '',
        estado: '',
        clientId: '',
        contact: '',
        tipodecliente: '',
        checked: newOrders[index]?.checked || false,
      };
    } else {
      newOrders[index] = {
        ...newOrders[index],
        orderNumber: value,
      };
    }
    setOrders(newOrders);
    validateOrders(newOrders);
    updateClientInfo(newOrders);
  };

  const validateOrders = (updatedOrders) => {
    const selectedOrders = updatedOrders.filter(order => order.checked);
    const hasValidOrders = selectedOrders.some((order) => (order.orderNumber || '').trim() !== '');
    const clientIds = selectedOrders.map((order) => order.clientId || '').filter(Boolean);
    const uniqueClientIds = [...new Set(clientIds)];
    const hasSingleClient = uniqueClientIds.length <= 1;
    if (!hasSingleClient && hasValidOrders) {
      alert('Existen órdenes de más de un cliente. Verifique las órdenes.');
    }
    setIsSubmitDisabled(!hasValidOrders || !hasSingleClient);
  };

  const fetchOrdersByClientId = () => {
    if (!orderInputValue.trim()) {
      alert('Por favor, ingrese una orden para buscar.');
      return;
    }
    fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenes/dataordenescliente/${orderInputValue}`)
      .then((response) => response.json())
      .then((data) => {
        const ordersArray = Array.isArray(data) ? data : [data];
        const matchingOrder = ordersArray.find(
          (ord) =>
            (ord.EOrNombreEstado || '').trim().toLowerCase() === "avisado" &&
            (ord.OrdCodigoOrden || '').trim().toLowerCase() === orderInputValue.trim().toLowerCase()
        );
        if (!matchingOrder) {
          alert("Orden no encontrada");
          clearOrders();
          return;
        }
        const clientIdFound = matchingOrder.CliCodigoCliente;
        const filteredOrders = ordersArray.filter(
          (ord) =>
            ord.CliCodigoCliente === clientIdFound &&
            (ord.EOrNombreEstado || '').trim().toLowerCase() === "avisado"
        );
        const newOrders = filteredOrders.map((ord) => {
          const costoFinal = parseFloat(ord.OrdCostoFinal);
          return {
            OrdIdOrden: ord.OrdIdOrden,
            orderNumber: ord.OrdCodigoOrden,
            ordNombreTrabajo: ord.OrdNombreTrabajo || '',
            meters: ord.OrdCantidad || '',
            costWithCurrency: !isNaN(costoFinal)
              ? `${ord.MonSimbolo || ''} ${costoFinal.toFixed(2)}`
              : 'No especificado',
            MonSimbolo: ord.MonSimbolo || '',
            costo: costoFinal,
            pago: ord.OrdPagoRealizado === 1 ? 'Realizado' : 'No realizado',
            estado: ord.EOrNombreEstado || '',
            clientId: ord.CliCodigoCliente || 'No especificado',
            contact: ord.CliCelular || 'No especificado',
            tipodecliente: ord.TipoCliente || 'No especificado',
            checked: false,
          };
        });
        setClientId(filteredOrders[0]?.CliCodigoCliente || 'No especificado');
        setOrders(newOrders);
        setContact(filteredOrders[0]?.CliCelular || 'No especificado');
        setTipodecliente(filteredOrders[0]?.TipoCliente || 'No especificado');
        setShowKeyboardModal(false);
      })
      .catch((error) => {
        console.error('Error al obtener las órdenes:', error);
        alert('Error al obtener las órdenes.');
      });
  };

  const clearOrders = () => {
    const updatedOrders = orders.map(order => order.checked ? {
      orderNumber: '',
      ordNombreTrabajo: '',
      meters: '',
      costWithCurrency: '',
      pago: '',
      estado: '',
      clientId: '',
      contact: '',
      tipodecliente: '',
      checked: false,
    } : order);
    setOrders(updatedOrders);
    updateClientInfo(updatedOrders);
  };

  const clearPage = () => {
    setClientId('No especificado');
    setContact('No especificado');
    setTipodecliente('No especificado');
    setService('');
    setOrders([]);
    setInputName('ingresarOrdenes');
    setInputValue('');
    setOrderInputValue('');
    setShowKeyboardModal(false);
    setShowTicket(false);
    setTicketData(null);
    setTicketNumber('');
    setTicketDateTime('');
    setSelectAll(false);
  };

  const handleSubmit = () => {
    if (!selectedPickupLocationId) {
      alert('Por favor, seleccione un lugar de retiro.');
      return;
    }
    const selectedOrders = orders.filter(order => order.checked && order.orderNumber.trim() !== '');
    if (selectedOrders.length === 0) {
      alert('No hay órdenes seleccionadas para generar la órden.');
      return;
    }
    let totalCost = 0;
    let ticketOrders = [];
    selectedOrders.forEach((order) => {
      const numericCost = parseFloat(order.costWithCurrency.replace(/[^0-9.]/g, ''));
      if (!isNaN(numericCost)) totalCost += numericCost;
      ticketOrders.push({
        orderId: order.orderId,
        ...order,
        costWithCurrency: order.costWithCurrency,
      });
    });
    const token = localStorage.getItem('token');
    fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenes/dataordenescliente/${orderInputValue}`)
      .then((response) => response.json())
      .then((data) => {
        fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenesRetiro/crear`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            orders: ticketOrders,
            totalCost,
            lugarRetiro: selectedPickupLocationId,
          }),
        })
          .then((response) => {
            if (!response.ok) throw new Error('Error al crear la orden de retiro');
            return response.json();
          })
          .then((data) => {
            const { OReIdOrdenRetiro } = data;
            const generatedTicketNumber = 'R-' + String(OReIdOrdenRetiro).padStart(4, '0');
            const now = new Date();
            const options = {
              timeZone: 'America/Montevideo',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            };
            const formatter = new Intl.DateTimeFormat('es-UY', options);
            const uruguayDateTime = formatter.format(now);
            setTicketNumber(generatedTicketNumber);
            setTicketDateTime(uruguayDateTime);
            setTicketData({
              clientId,
              tipodecliente,
              service,
              orders: ticketOrders,
              totalCost,
              ordenDeRetiro: generatedTicketNumber,
              timestamp: uruguayDateTime,
            });
            setShowTicket(true);
          })
          .catch((error) => {
            console.error('Error al crear la orden de retiro:', error);
            alert('Error al crear la orden de retiro');
          });
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  };

  const handlePrintTicket = () => {
    if (!ticketData) {
      alert('No hay datos del ticket para guardar.');
      return;
    }
    saveTicket(ticketData);
    window.print();
  };

  const saveTicket = (ticket) => {
    let tickets = JSON.parse(localStorage.getItem('ORDENES_DE_RETIRO')) || {};
    tickets[ticket.ordenDeRetiro] = ticket;
    localStorage.setItem('ORDENES_DE_RETIRO', JSON.stringify(tickets));
  };

  const handleRowSelection = (index) => {
    const updatedOrders = [...orders];
    updatedOrders[index].checked = !updatedOrders[index].checked;
    setOrders(updatedOrders);
    validateOrders(updatedOrders);
  };

  const handleSelectAll = () => {
    setSelectAll((prevSelectAll) => {
      const newSelectAll = !prevSelectAll;
      const updatedOrders = orders.map((order) => ({
        ...order,
        checked: newSelectAll,
      }));
      setOrders(updatedOrders);
      validateOrders(updatedOrders);
      return newSelectAll;
    });
  };

  // Componente para mostrar el texto ingresado sin borde
  const InputDisplay = () => (
    <div className="input-display">
      {inputName === 'ingresarOrdenes' ? orderInputValue : inputValue}
    </div>
  );

  // Componente para renderizar la copia del ticket
  const TicketCopy = () => (
    <div className="ticket-copy">
      <h2>Ticket</h2>
      <h3 id="ticket-number">{ticketNumber}</h3>
      <p id="ticket-date-time">{ticketDateTime}</p>
      <p>
        <strong>Cliente:</strong> <span id="ticket-client-id">{ticketData.clientId}</span>
      </p>
      <p>
        <strong>Tipo de cliente:</strong> <span id="tipo-client">{ticketData.tipodecliente}</span>
      </p>
      <p>
        <strong>Servicio:</strong> <span id="ticket-service">{ticketData.service}</span>
      </p>
      {/* Contenedor adicional para centrar la tabla en impresión */}
      <div className="table-print-container">
        <table className="ticket-table">
          <thead>
            <tr>
              <th>Orden</th>
              <th>Nombre de trabajo</th>
              <th>Metros</th>
              <th>Costo</th>
            </tr>
          </thead>
          <tbody>
            {ticketData.orders.map((order, idx) => (
              <tr key={idx}>
                <td><span>{order.orderNumber}</span></td>
                <td><span>{order.ordNombreTrabajo}</span></td>
                <td><span>{order.meters}</span></td>
                <td><span>{order.costWithCurrency}</span></td>
              </tr>
            ))}
            <tr className="total-row">
              <td colSpan="3"><strong>Total</strong></td>
              <td>
                <span>{`${orders[0]?.MonSimbolo || ''} ${ticketData.totalCost.toFixed(2)}`}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="container">
      <div className="content-container">
        <div className="order-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p><strong>Cliente:</strong> <span>{clientId}</span></p>
            <p><strong>Contacto:</strong> {contact}</p>
            <p><strong>Tipo de cliente:</strong> {tipodecliente}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              value={orderInputValue}
              placeholder="Ingresar órdenes o buscar"
              onFocus={() => { 
                handleFocus('ingresarOrdenes'); 
                setShowKeyboardModal(true);
              }}
              onChange={(e) => setOrderInputValue(e.target.value)}
              className="order-input-field"
              style={{ marginRight: '10px' }}
            />
            <button
              id="submit-btn"
              onClick={handleSubmit}
              style={{ height: '60px', padding: '0 50px' }}
              disabled={isSubmitDisabled}
            >
              Realizar Retiro
            </button>
          </div>
        </div>
      </div>
      <div className="pickup-location-display" style={{ marginTop: '10px' }}>
        <p style={{ fontWeight: 'bold', fontSize: '16px' }}>
          Lugar de retiro: <span>{pickupLocations[0]?.LReNombreLugar || 'No especificado'}</span>
        </p>
      </div>
      { validOrdersCount > 0 && (
        <div className="orders-count">
          Total de órdenes encontradas: {validOrdersCount}
        </div>
      )}
      <div className="table-keyboard-wrapper" style={{ justifyContent: 'center' }}>
        <div className="table-container">
          <table className="order-table">
            <thead>
              <tr>
                <th style={{ width: '150px', textAlign: 'center' }}>
                  <button className="select-all-btn" onClick={handleSelectAll}>
                    {selectAll ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
                  </button>
                </th>
                <th>Número de orden</th>
                <th>Nombre de trabajo</th>
                <th>Metros</th>
                <th>Costo</th>
              </tr>
            </thead>
            <tbody>
              {orders
                .filter(order => order.orderNumber.trim() !== '')
                .map((order, index) => (
                  <tr key={index}>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className={`select-btn ${order.checked ? 'selected' : ''}`}
                        onClick={() => handleRowSelection(index)}
                      >
                        {order.checked ? 'Seleccionado' : 'Seleccionar'}
                      </button>
                    </td>
                    <td><span>{order.orderNumber}</span></td>
                    <td><span>{order.ordNombreTrabajo}</span></td>
                    <td><span>{order.meters}</span></td>
                    <td><span>{order.costWithCurrency}</span></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
      {showTicket && ticketData && (
        <div id="ticket">
          <div id="ticket-content">
            <div className="ticket-header no-print">
              <button className="ticket-btn print-ticket-btn" onClick={handlePrintTicket}>
                Imprimir Ticket
              </button>
              <button className="ticket-btn close-ticket-btn" onClick={clearPage}>
                Cerrar
              </button>
            </div>
            <div className="ticket-print-container">
              <TicketCopy />
              <TicketCopy />
            </div>
          </div>
        </div>
      )}
      {showKeyboardModal && (
        <div id="keyboard-modal" onClick={() => setShowKeyboardModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-keyboard-btn" onClick={fetchOrdersByClientId}>
              Buscar Órdenes
            </button>
            {/* Se muestra el input sin borde visible justo debajo del botón Buscar Órdenes */}
            <InputDisplay />
            <Keyboard
              keyboardRef={(r) => (keyboardRef.current = r)}
              layoutName={layoutName}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              layout={layouts}
              display={{
                '{bksp}': 'Borrar'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
