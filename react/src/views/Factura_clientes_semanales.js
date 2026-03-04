import React, { useState, useEffect } from 'react';
import '../aspecto/Factura_clientes_semanales.css';
import logo from '../imagenes/user.svg';

const FacturaClientesSemanales = () => {
  const [clientId, setClientId] = useState('CLI001');
  const [clientOrders, setClientOrders] = useState([]);
  const [originalOrders, setOriginalOrders] = useState([]); // Nueva copia para almacenar valores originales
  const [paymentMethod, setPaymentMethod] = useState('Pago contado');
  const [invoiceVisible, setInvoiceVisible] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(0);
  const [currencyType, setCurrencyType] = useState('original');
  const [payment, setPayment] = useState(0);

  const columns = [
    { key: 'CodigoOrden', label: 'N° de Orden' },
    { key: 'NombreTrabajo', label: 'Nombre del Trabajo' },
    { key: 'Producto', label: 'Producto' },
    { key: 'Cantidad', label: 'Cantidad' },
    { key: 'CostoFinal', label: 'Costo de la Orden' },
    { key: 'MonSimbolo', label: 'Moneda' },
  ];

  const columnsInvoice = [
    ...columns,
    { key: 'EstadoPago', label: 'Estado de pago' },
    { key: 'paid', label: 'Pago Realizado' },
  ];

  useEffect(() => {
    if (clientId) {
      fetchOrdersByClientId(clientId).then((updatedOrders) => {
        const reversedOrders = updatedOrders.reverse();
        setClientOrders(reversedOrders);
        setOriginalOrders(reversedOrders); // Guardar los valores originales
      });
    }
  }, [clientId]);

  const fetchOrdersByClientId = (clientId) => {
    return fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenes/data`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) {
          console.error('Unexpected data format:', data);
          return [];
        }
        const filteredOrders = data.filter((order) => order.IdCliente === clientId && order.Estado === 'Para imprimir');
        const updatedOrders = filteredOrders.map((order) => {
          const numericCostoFinal = parseFloat(order.CostoFinal.replace(/[^0-9.]/g, '')) || 0;
          return {
            ...order,
            CostoFinal: numericCostoFinal,
            MonSimbolo: order.MonSimbolo || '',
            EstadoPago: 'FALTA PAGO',
          };
        });
        return updatedOrders;
      })
      .catch((error) => {
        console.error('Error fetching orders:', error);
        return [];
      });
  };

  const handleClientIdChange = (e) => {
    setClientId(e.target.value);
  };

  const handlePaymentInputChange = (e) => {
    const paymentValue = parseFloat(e.target.value) || 0;
    setPayment(paymentValue);
  };

  const handlePaymentMethodChange = (e) => {
    setPaymentMethod(e.target.value);
  };

  const handleExchangeRateChange = (e) => {
    const newExchangeRate = parseFloat(e.target.value);
    setExchangeRate(newExchangeRate);
    if (!newExchangeRate || newExchangeRate <= 0) {
      setCurrencyType('original');
    }
  };

  const handleCurrencyTypeChange = (e) => {
    const selectedCurrency = e.target.value;
    setCurrencyType(selectedCurrency);

    if (selectedCurrency === 'original') {
      setClientOrders(originalOrders);
    } else {
      // Aplicar conversión de moneda solo si se selecciona un tipo distinto al original
      setClientOrders(convertCurrencyForInvoice());
    }
  };

  const applyPaymentsToOrders = (orders, payment) => {
    let remainingPayment = payment;
    return orders.map((order) => {
      const unpaidAmount = parseFloat(order.CostoFinal);
      const paidAmount = Math.min(remainingPayment, unpaidAmount);
      remainingPayment -= paidAmount;
      const estadoPago = paidAmount >= unpaidAmount ? 'PAGADO' : 'FALTA PAGO';

      return { ...order, paid: paidAmount.toFixed(2), EstadoPago: estadoPago };
    });
  };

  const convertCurrencyForInvoice = () => {
    return applyPaymentsToOrders(
      originalOrders.map((order) => {
        if (currencyType === 'original') {
          return order;
        }

        let convertedCostoFinal = order.CostoFinal;
        let newSymbol = order.MonSimbolo;

        if (currencyType === 'USD' && order.MonSimbolo === '$') {
          convertedCostoFinal = (order.CostoFinal / exchangeRate).toFixed(2);
          newSymbol = 'USD';
        } else if (currencyType === '$' && order.MonSimbolo === 'USD') {
          convertedCostoFinal = (order.CostoFinal * exchangeRate).toFixed(2);
          newSymbol = '$';
        } else {
          // Mantener el símbolo de moneda original si no hay conversión
          newSymbol = order.MonSimbolo;
        }

        return { ...order, CostoFinal: parseFloat(convertedCostoFinal), MonSimbolo: currencyType === 'original' ? order.MonSimbolo : newSymbol };
      }),
      originalOrders.map((order) => {
        if (currencyType === 'original') {
          return order;
        }

        let convertedCostoFinal = order.CostoFinal;
        let newSymbol = order.MonSimbolo;

        if (currencyType === 'USD' && order.MonSimbolo === '$') {
          convertedCostoFinal = (order.CostoFinal / exchangeRate).toFixed(2);
          newSymbol = 'USD';
        } else if (currencyType === '$' && order.MonSimbolo === 'USD') {
          convertedCostoFinal = (order.CostoFinal * exchangeRate).toFixed(2);
          newSymbol = '$';
        }

        return { ...order, CostoFinal: parseFloat(convertedCostoFinal), MonSimbolo: newSymbol };
      }),
      payment
    );
  };

  const handlePrintInvoice = () => {
    setInvoiceVisible(true);
    setPreviewMode(true);
  };

  const closeModal = () => {
    setInvoiceVisible(false);
    setPreviewMode(false);
  };

  const printInvoice = () => {
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const invoiceOrders = invoiceVisible ? convertCurrencyForInvoice() : clientOrders;

  const totalInvoiceAmount = invoiceOrders.reduce((acc, order) => acc + (parseFloat(order.CostoFinal) || 0), 0).toFixed(2);
  const currencySymbol = invoiceOrders.length > 0 ? invoiceOrders[0].MonSimbolo : '';

  return (
    <div className="factura-container">
      <header className="factura-header no-print">
        <h1>Sistema de Órdenes de Cliente</h1>
      </header>

      <div className="factura-top-section no-print">
        <div className="input-container">
          <label htmlFor="clientIdInput">ID del Cliente:</label>
          <input
            type="text"
            value={clientId}
            onChange={handleClientIdChange}
            placeholder="Ingrese el ID del cliente"
            id="clientIdInput"
          />
        </div>
        <div className="input-container">
          <label htmlFor="paymentInput">Monto a Pagar:</label>
          <input
            type="number"
            onChange={handlePaymentInputChange}
            placeholder="Ingrese el monto a pagar"
            id="paymentInput"
          />
        </div>
        <div className="input-container">
          <label htmlFor="paymentMethod">Forma de Pago:</label>
          <select id="paymentMethod" value={paymentMethod} onChange={handlePaymentMethodChange}>
            <option value="Pago contado">Pago contado</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Deposito">Deposito</option>
            <option value="Pago por adelantado">Pago por adelantado</option>
            <option value="Mercado Pago">Mercado Pago</option>
            <option value="Debito">Debito</option>
            <option value="Credito">Credito</option>
          </select>
        </div>
        <div className="input-container">
          <label htmlFor="exchangeRateInput">Cotización del Dólar:</label>
          <input
            type="number"
            value={exchangeRate}
            onChange={handleExchangeRateChange}
            placeholder="Ingrese la cotización del dólar"
            id="exchangeRateInput"
          />
        </div>
        <div className="input-container">
          <label htmlFor="currencyType">Moneda de Pago:</label>
          <select id="currencyType" value={currencyType} onChange={handleCurrencyTypeChange} disabled={!exchangeRate || exchangeRate <= 0}>
            <option value="original">Original</option>
            <option value="USD">USD</option>
            <option value="$">Pesos</option>
          </select>
        </div>
      </div>

      <div className="factura-actions-section no-print">
        <button id="printInvoice" className="print-button" onClick={handlePrintInvoice}>Ticket</button>
      </div>

      <div className={`factura-table-section ${previewMode ? 'print-preview' : ''}`}>
        <table id="ordersTable">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clientOrders.length > 0 ? (
              clientOrders.sort((a, b) => new Date(a.FechaOrden) - new Date(b.FechaOrden)).map((order, index) => (
                <tr key={index}>
                  {columns.map((column) => (
                    <td key={column.key}>{order[column.key]}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length}>No se encontraron órdenes para este cliente.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {invoiceVisible && (
        <div id="invoiceModal" className="modal">
          <div className="modal-content">
            <button className="print-button-small no-print" onClick={printInvoice}>Imprimir</button>
            <div className="modal-header">
              <img src={logo} alt="User Logo" className="logo" />
              <div className="header-details">
                <p>User Impresión & Sublimación / DTF</p>
                <p>Vilardebo 2031 esq. Martín C. Martínez</p>
                <p>Montevideo, CP 11800. Uruguay</p>
              </div>
              <span className="close no-print" onClick={closeModal}>&times;</span>
            </div>
            <h2>Ticket</h2>
            <div id="invoiceContent">
              <h3>Cliente: {clientId}</h3>
              <h4>Forma de Pago: {paymentMethod}</h4>
              <table border="1">
                <thead>
                  <tr>
                    {columnsInvoice.map((column) => (
                      <th key={column.key}>{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoiceOrders.map((order, index) => (
                    <tr key={index}>
                      {columnsInvoice.map((column) => (
                        <td key={column.key}>{column.key === 'CostoFinal' || column.key === 'paid' ? `${order.MonSimbolo} ${order[column.key]}` : order[column.key]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="invoice-summary">
                <p><strong>Total:</strong> {currencySymbol} {totalInvoiceAmount}</p>
              </div>
            </div>
            <div className="modal-footer">
              <p>Realizar pago en el siguiente día hábil luego de enviado el estado de cuenta</p>
              <p>Cel: 092284262 | www.user.uy | RUT: 218973270018</p>
              <p><a href="https://www.user.uy/terms">Términos y condiciones</a></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacturaClientesSemanales;
