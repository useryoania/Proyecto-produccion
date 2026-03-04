import React, { useState, useEffect } from 'react';
import '../aspecto/ordenes_de_retiro.css';

function OrdenesRetiro() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filters, setFilters] = useState({ date: '', search: '', codigo: '' });
  const [groupVisibility, setGroupVisibility] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const loadOrdersFromBackend = () => {
    if (!(filters.date || filters.codigo)) {
      return; // No se ejecuta si ambos campos están vacíos
    }
      
    setIsLoading(true);
  
    // Construir la URL con parámetros opcionales
    let apiUrl = `${process.env.REACT_APP_BACKEND_URL}/apiordenesRetiro/filterByDate?date=${filters.date}`;
    if (filters.codigo) {
      apiUrl += `&codigo=${filters.codigo}`;
    }
  
    fetch(apiUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error al cargar las órdenes de retiro desde el backend');
        }
        return response.json();
      })
      .then((data) => {
        const mappedOrders = data.map(order => ({
          ordenDeRetiro: order.ordenDeRetiro,
          totalCost: order.totalCost,
          lugarRetiro: order.lugarRetiro,
          fechaAlta: order.fechaAlta || null,
          estado: order.estado,
          orders: typeof order.orders === 'string' ? JSON.parse(order.orders) : order.orders,
          pagorealizado: !!order.pagorealizado,
          montopagorealizado: order.montopagorealizado,
          fechapagooden: order.fechapagooden,
          metodoPago: order.metodoPago,
          comprobante: order.comprobante,
          cliente: order.CliCodigoCliente,
          tipoCliente: order.TClDescripcion
        }));
        setOrders(mappedOrders || []);
      })
      .catch((error) => {
        console.error('Error al cargar las órdenes de retiro:', error);
        alert('Error al cargar las órdenes de retiro. Por favor, inténtelo de nuevo.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prevFilters) => ({
      ...prevFilters,
      [name]: value
    }));
  };
  


  const handleGroupToggle = (date) => {
    setGroupVisibility((prevState) => ({
      ...prevState,
      [date]: !prevState[date],
    }));
  };

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
  };

  const handleOverlayClick = (event) => {
    if (event.target.classList.contains('overlay')) {
      setSelectedOrder(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredOrders = orders.filter(order =>
    order.ordenDeRetiro.toLowerCase().includes(filters.search.toLowerCase())
  );
  

  const groupedOrders = filteredOrders.reduce((groups, order) => {
    const date = order.fechaAlta
      ? order.fechaAlta.split('T')[0]
      : 'Fecha desconocida';
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(order);
    return groups;
  }, {});

  return (
    <div id="principalor" className="principalor">
      <div className="filters-container">
        <input
          type="date"
          name="date"
          value={filters.date}
          onChange={handleFilterChange}
          placeholder="Filtrar por fecha"
        />
        <input
          type="text"
          name="codigo"
          value={filters.codigo}
          onChange={handleFilterChange}
          placeholder="Buscar por código"
        />
        <button 
          onClick={loadOrdersFromBackend} 
          className="filter-button"
          disabled={!(filters.date || filters.codigo)} // Deshabilita el botón si no hay fecha seleccionada o codigo
        >
          Filtrar
        </button>
        <input
          type="text"
          name="search"
          value={filters.search}
          onChange={handleFilterChange}
          placeholder="Buscar orden en la lista"
        />
      </div>

      {isLoading ? (
        <div className="loading">Cargando órdenes...</div>
      ) : (
        <div className="orders-container">
          {Object.keys(groupedOrders).length > 0 ? (
            Object.keys(groupedOrders).map((date) => (
              <div key={date} className="group">
                <h3 onClick={() => handleGroupToggle(date)} className="group-header">
                  {date}
                </h3>
                {groupVisibility[date] && (
                  <div className="group-orders">
                    {groupedOrders[date].map((order) => (
                      <button
                        key={order.ordenDeRetiro}
                        onClick={() => handleOrderClick(order)}
                        className="order-item"
                      >
                        <div>
                          {order.ordenDeRetiro}
                          {!order.pagorealizado ? (
                            <span className="payment-not-paid"> - No pagado</span>
                          ) : (
                            <span className="payment-paid"> - Pagado</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="no-orders">No hay órdenes disponibles.</div>
          )}
        </div>
      )}

      {selectedOrder && (
        <div className="overlay" onClick={handleOverlayClick}>
          <div className="order-popup">
            <button className="close-button" onClick={() => setSelectedOrder(null)}>X</button>
            <h2>Detalles de la Orden de Retiro</h2>
            <p><strong>Código de Orden:</strong> {selectedOrder.ordenDeRetiro}</p>
            <p><strong>Costo Total:</strong> {selectedOrder.totalCost}</p>
            <p><strong>Cliente:</strong> {selectedOrder.cliente}</p>
            <p><strong>Tipo Cliente:</strong> {selectedOrder.tipoCliente}</p>            
            <p><strong>Lugar de Retiro:</strong> {selectedOrder.lugarRetiro}</p>
            {
              (() => {
                if (!selectedOrder.fechaAlta) {
                  return <p><strong>Fecha de Alta:</strong> No disponible</p>;
                }
                const [fecha, horaCompleta] = selectedOrder.fechaAlta.split('T');
                const hora = horaCompleta.slice(0, 5);
                return (
                  <>
                    <p><strong>Fecha de Alta:</strong> {fecha}</p>
                    <p><strong>Hora de Alta (hh:mm):</strong> {hora}</p>
                  </>
                );
              })()
            }
            <p><strong>Estado:</strong> {selectedOrder.estado}</p>
            <p><strong>Método de Pago:</strong> {selectedOrder.metodoPago ? selectedOrder.metodoPago : 'N/A'}</p>
            {!selectedOrder.pagorealizado ? (
              <p className="payment-not-paid">No fue pagado</p>
            ) : (
              <p><strong>Fecha de Pago:</strong> {selectedOrder.fechapagooden ? new Date(selectedOrder.fechapagooden).toLocaleString('es-ES') : 'N/A'}</p>
            )}
              {selectedOrder.comprobante ? (
                  <a 
                      href={`${process.env.REACT_APP_BACKEND_URL}/comprobantesPagos/${selectedOrder.comprobante}`}
                      download
                      target="_blank" // Abre el enlace en una nueva pestaña si el navegador lo permite
                      rel="noopener noreferrer"
                  >
                      Descargar Comprobante
                  </a>
              ) : (
                  'Sin comprobante'
              )}
            <h3>Órdenes Asociadas</h3>
            {selectedOrder.orders && selectedOrder.orders.length > 0 ? (
              <ul>
                {selectedOrder.orders.map((order) => (
                  <li key={order.orderId} className="associated-order">
                    <p><strong>Número de Orden:</strong> {order.orderNumber}</p>
                    <p><strong>Costo:</strong> {order.orderCosto}</p>
                    <p><strong>Método de Pago:</strong> {order.orderMetodoPago ? order.orderMetodoPago : 'N/A'}</p>
                    {!order.orderPago ? (
                      <p className="payment-not-paid">No fue pagado</p>
                    ) : (
                      <p><strong>Pago:</strong> {order.orderPago} en {order.orderFechaPago ? new Date(order.orderFechaPago).toLocaleString('es-ES') : 'N/A'}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No hay órdenes asociadas.</p>
            )}
            <button onClick={handlePrint} className="print-button">Imprimir</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrdenesRetiro;
