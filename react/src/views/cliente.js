import React, { useState, useEffect } from 'react';
import '../aspecto/cliente.css';
import '../aspecto/clientes_especiales.css';

// Importar los iconos
import preciosIcon from '../iconos/$.svg';
import pagosIcon from '../iconos/tarjeta.svg';
import comprobanteIcon from '../iconos/factura.svg';
import deudaIcon from '../iconos/grafico.svg';
import comprasIcon from '../iconos/carrito.svg';

const App = () => {
  const [allClients, setAllClients] = useState([]);
  const [searchId, setSearchId] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [tipoClientes, setTipoClientes] = useState([]);
  const [selectedTipo, setSelectedTipo] = useState('');
  const [products, setProducts] = useState([]);
  const [showClientGrid, setShowClientGrid] = useState(false);
  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    setIsAuthenticated(!!token);
    setUserRole(role);
  }, []);

  useEffect(() => {
    const fetchTipoClientes = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/apicliente/tipos`);
        const data = await response.json();
        if (response.ok) {
          setTipoClientes(data.recordset);
        }
      } catch (error) {
        console.error('Error al cargar los tipos de cliente:', error);
      }
    };

    const fetchClients = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/apicliente/dataall`);
        const data = await response.json();
        if (response.ok) {
          const allClientsData = data.recordset.map(client => ({
            id: client.IdCliente,
            codigoCliente: client.CodigoCliente,
            nombreApellido: client.NombreCliente,
            celular: client.Celular,
            nombreEmpresa: client.EmpresaCliente,
            documento: client.DocumentoCliente,
            localidad: client.LocalidadCliente,
            direccion: client.DireccionCliente,
            agencia: client.AgenciaCliente,
            mail: client.MailCliente,
            tipoCliente: client.TipoCliente,
            preciosEspeciales: client.preciosEspeciales || '',
            controlCompras: client.controlCompras || '',
            controlPagos: client.controlPagos || '',
            controlDeuda: client.controlDeuda || '',
          }));
          setAllClients(allClientsData);
        }
      } catch (error) {
        console.error('Error al obtener los clientes:', error);
      }
    };

    fetchTipoClientes();
    fetchClients();
  }, []);

  useEffect(() => {
    if (searchId.trim() !== '') {
      setShowClientGrid(true);
    }
  }, [searchId]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/apiproducto/data`);
        const data = await response.json();
        if (response.ok) {
          setProducts(
            data.sort((a, b) =>
              a.ProNombreProducto.localeCompare(b.ProNombreProducto)
            )
          );
        }
      } catch (error) {
        console.error('Error al obtener los productos:', error);
      }
    };
    fetchProducts();
  }, []);

  // Filtrar clientes según búsqueda y por tipo seleccionado
  const filteredClients = allClients.filter(client => {
    const matchesSearch = searchId.trim()
      ? client.codigoCliente.toLowerCase().includes(searchId.toLowerCase())
      : true;
    const matchesTipo = selectedTipo ? client.tipoCliente === selectedTipo : true;
    return matchesSearch && matchesTipo;
  });
  const displayedClients = showClientGrid ? filteredClients : [];

  const handleToggleClientGrid = () => {
    setShowClientGrid(!showClientGrid);
  };

  const handleOpenCreateClientModal = () => {
    setIsCreateClientModalOpen(true);
  };

  const handleCloseCreateClientModal = () => {
    setIsCreateClientModalOpen(false);
  };

  const handleClientCreated = () => {
    setIsCreateClientModalOpen(false);
    window.location.reload();
  };

  const handleClientUpdated = (updatedClient) => {
    const updatedClients = allClients.map(client =>
      client.id === updatedClient.id ? updatedClient : client
    );
    setAllClients(updatedClients);
    setSelectedClient(updatedClient);
  };

  return (
    <div className="CLIContainer">
      <h2 className="CLIContainer_h2">Buscar Cliente</h2>
      <input
        className="CLIContainer_searchInput"
        type="text"
        value={searchId}
        onChange={(e) => setSearchId(e.target.value)}
        placeholder="Ingrese el código del cliente"
      />
      <div className="button-group">
        <button className="CLIContainer_searchButton" onClick={handleToggleClientGrid}>
          {showClientGrid ? 'Ocultar Clientes' : 'Ver Todos los Clientes'}
        </button>
        <button className="CLIContainer_searchButton" onClick={handleOpenCreateClientModal}>
          Crear Cliente
        </button>
      </div>
      {/* Botones de filtrado por tipo de cliente en blanco */}
      <div className="tipo-buttons">
        <button
          className={selectedTipo === '' ? 'active' : ''}
          onClick={() => setSelectedTipo('')}
        >
          Todos
        </button>
        {tipoClientes.map(tipo => (
          <button
            key={tipo.TClIdTipoCliente}
            className={selectedTipo === tipo.TClDescripcion ? 'active' : ''}
            onClick={() => setSelectedTipo(tipo.TClDescripcion)}
          >
            {tipo.TClDescripcion}
          </button>
        ))}
      </div>

      {isEditModalOpen && selectedClient && (
        <EditClientModal
          client={selectedClient}
          closeModal={() => setIsEditModalOpen(false)}
          onClientUpdated={handleClientUpdated}
          tipoClientes={tipoClientes}
          userRole={userRole}
        />
      )}

      {isCreateClientModalOpen && (
        <CreateClientForm
          tipoClientes={tipoClientes}
          closeModal={handleCloseCreateClientModal}
          onClientCreated={handleClientCreated}
        />
      )}

      {showClientGrid && displayedClients.length > 0 && (
        <ClientListGrid
          clients={displayedClients}
          onSelectClient={(client) => {
            setSelectedClient(client);
            setIsEditModalOpen(true);
          }}
        />
      )}
    </div>
  );
};

const EditClientModal = ({ client, closeModal, onClientUpdated, tipoClientes, userRole }) => {
  const initialClient = {
    ...client,
    preciosEspeciales: client.preciosEspeciales || '',
    controlCompras: client.controlCompras || '',
    controlPagos: client.controlPagos || '',
    controlDeuda: client.controlDeuda || '',
  };

  const [editedClient, setEditedClient] = useState(initialClient);
  const [isEditing, setIsEditing] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [clientOrders, setClientOrders] = useState([]);
  const [orderFilters, setOrderFilters] = useState({
    codigoOrden: '',
    fecha: '',
    subMarca: '',
  });
  const [subMarcasList, setSubMarcasList] = useState([]);

  // Estados para el formulario de pagos (controlPagos)
  const [paymentForm, setPaymentForm] = useState({
    monto: '',
    moneda: '',
    tipoPago: '',
    fecha: '',
    ordenComprobante: '',
  });
  const [currencies, setCurrencies] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentsHistory, setPaymentsHistory] = useState([]);

  // Estado para la opción de deudas (toggle)
  const [selectedDeudaOption, setSelectedDeudaOption] = useState('comprobantes');

  // Datos de ejemplo para deudas
  const [deudasViejas, setDeudasViejas] = useState([
    { id: 1, valor: 'A123', fecha: '2023-01-15', monto: 100.0 },
    { id: 2, valor: 'B456', fecha: '2023-02-10', monto: 200.0 },
  ]);
  const [deudasActuales, setDeudasActuales] = useState([
    { id: 1, valor: 'C789', fecha: '2023-03-05', monto: 150.0 },
    { id: 2, valor: 'D012', fecha: '2023-04-20', monto: 250.0 },
  ]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedClient(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/apicliente/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedClient),
      });
      if (response.ok) {
        alert('Información actualizada correctamente');
        onClientUpdated(editedClient);
        setIsEditing(false);
        closeModal();
      } else {
        alert('Error al actualizar la información');
      }
    } catch (error) {
      console.error('Error al actualizar el cliente:', error);
    }
  };

  const handleCancelEditing = () => {
    setEditedClient(initialClient);
    setIsEditing(false);
  };

  const handleOrderFilterChange = (e) => {
    const { name, value } = e.target;
    setOrderFilters(prev => ({ ...prev, [name]: value }));
  };

  const fetchClientOrders = async () => {
    try {
      const queryParams = new URLSearchParams({
        codigoCliente: client.codigoCliente,
        pagada: 'false'
      });
      if (orderFilters.codigoOrden) queryParams.append('codigoOrden', orderFilters.codigoOrden);
      if (orderFilters.fecha) queryParams.append('fecha', orderFilters.fecha);
      if (orderFilters.subMarca) queryParams.append('subMarca', orderFilters.subMarca);

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenes/datafilter?${queryParams.toString()}`);
      const data = await response.json();
      if (response.ok) {
        data.sort((a, b) => new Date(b.FechaIngresoOrden) - new Date(a.FechaIngresoOrden));
        setClientOrders(data);
      } else {
        console.error('Error al obtener las órdenes:', data);
      }
    } catch (error) {
      console.error('Error al obtener las órdenes:', error);
    }
  };

  const fetchSubMarcas = async () => {
    try {
      const queryParams = new URLSearchParams({ codigoCliente: client.codigoCliente });
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenes/datafilter?${queryParams.toString()}`);
      const data = await response.json();
      if (response.ok) {
        const distinctSubMarcas = [...new Set(data.map(order => order.SubMarca).filter(Boolean))];
        setSubMarcasList(distinctSubMarcas);
      } else {
        console.error('Error al obtener sub marcas:', data);
      }
    } catch (error) {
      console.error('Error al obtener sub marcas:', error);
    }
  };

  useEffect(() => {
    if (activeField === 'controlCompras') {
      fetchClientOrders();
      fetchSubMarcas();
    }
    if (activeField === 'controlPagos') {
      fetch(`${process.env.REACT_APP_BACKEND_URL}/apimonedas`)
        .then((res) => res.json())
        .then((data) => setCurrencies(data))
        .catch((err) => console.error('Error al obtener monedas:', err));

      fetch(`${process.env.REACT_APP_BACKEND_URL}/apipagos/metodos`)
        .then((res) => res.json())
        .then((data) => setPaymentMethods(data))
        .catch((err) => console.error('Error al obtener métodos de pago:', err));

      fetch(`${process.env.REACT_APP_BACKEND_URL}/apipagos/historial?clienteId=${client.id}`)
        .then((res) => res.json())
        .then((data) => setPaymentsHistory(data))
        .catch((err) => console.error('Error al obtener historial de pagos:', err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeField]);

  const handleOrderFilterSubmit = () => {
    fetchClientOrders();
  };

  const handleOrderFilterReset = () => {
    setOrderFilters({ codigoOrden: '', fecha: '', subMarca: '' });
    fetchClientOrders();
  };

  const handlePaymentFormChange = (e) => {
    const { name, value } = e.target;
    setPaymentForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (
      !paymentForm.monto ||
      !paymentForm.moneda ||
      !paymentForm.tipoPago ||
      !paymentForm.fecha ||
      !paymentForm.ordenComprobante
    ) {
      alert('Todos los campos son obligatorios');
      return;
    }
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/apipagos/realizarPago`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: client.id,
          monto: parseFloat(paymentForm.monto),
          monedaId: paymentForm.moneda,
          metodoPagoId: paymentForm.tipoPago,
          fecha: paymentForm.fecha,
          ordenComprobante: paymentForm.ordenComprobante,
        }),
      });
      if (response.ok) {
        alert('Pago registrado exitosamente');
        fetch(`${process.env.REACT_APP_BACKEND_URL}/apipagos/historial?clienteId=${client.id}`)
          .then((res) => res.json())
          .then((data) => setPaymentsHistory(data))
          .catch((err) => console.error('Error al obtener historial de pagos:', err));
        setPaymentForm({
          monto: '',
          moneda: '',
          tipoPago: '',
          fecha: '',
          ordenComprobante: '',
        });
      } else {
        alert('Error al registrar el pago');
      }
    } catch (error) {
      console.error('Error al registrar el pago:', error);
      alert('Error al registrar el pago');
    }
  };

  const handleEditingInputChange = (e) => {
    const { name, value } = e.target;
    setEditedClient(prev => ({ ...prev, [name]: value }));
  };

  const renderControlContent = () => {
    switch (activeField) {
      case 'controlCompras':
        return (
          <div>
            <div className="orders-filters">
              <input
                type="text"
                name="codigoOrden"
                placeholder="Código Orden"
                value={orderFilters.codigoOrden}
                onChange={handleOrderFilterChange}
              />
              <input
                type="date"
                name="fecha"
                placeholder="Fecha"
                value={orderFilters.fecha}
                onChange={handleOrderFilterChange}
              />
              <select
                name="subMarca"
                value={orderFilters.subMarca}
                onChange={handleOrderFilterChange}
                style={{ width: '120px', padding: '5px' }}
              >
                <option value="">Todas</option>
                {subMarcasList.map((subMarca, idx) => (
                  <option key={idx} value={subMarca}>{subMarca}</option>
                ))}
              </select>
              <button onClick={handleOrderFilterSubmit}>Filtrar</button>
              <button onClick={handleOrderFilterReset}>Restablecer</button>
            </div>
            {clientOrders.length === 0 ? (
              <p>No se encontraron órdenes.</p>
            ) : (
              <div className="orders-table-wrapper">
                <div className="orders-scroll-top">
                  <div style={{ width: '1200px', height: '1px' }}></div>
                </div>
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Código Orden</th>
                      <th>Sub Marca</th>
                      <th>Nombre Trabajo</th>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Precio Unitario</th>
                      <th>Costo Final</th>
                      <th>Descuento Aplicado</th>
                      <th>Modo</th>
                      <th>Lugar Retiro</th>
                      <th>Fecha Ingreso</th>
                      <th>Nota Cliente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientOrders.map((order, index) => (
                      <tr key={index}>
                        <td>{order.CodigoOrden}</td>
                        <td>{order.SubMarca}</td>
                        <td>{order.NombreTrabajo}</td>
                        <td>{order.Producto}</td>
                        <td>{order.Cantidad}</td>
                        <td>{order.PrecioUnitario}</td>
                        <td>{order.CostoFinal}</td>
                        <td>{order.DescuentoAplicado}</td>
                        <td>{order.Modo}</td>
                        <td>{order.LugarRetiro}</td>
                        <td>{order.FechaIngresoOrden}</td>
                        <td>{order.OrdNotaCliente}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="orders-scroll-bottom">
                  <div style={{ width: '1200px', height: '1px' }}></div>
                </div>
              </div>
            )}
          </div>
        );
      case 'preciosEspeciales':
        return <p>En progreso</p>;
      case 'controlPagos': {
        const totalPagos = paymentsHistory.reduce(
          (sum, pago) => sum + parseFloat(pago.monto || 0),
          0
        );
        return (
          <div className="control-pagos">
            <div className="total-payments">
              Total Pagado: <strong>{totalPagos.toFixed(2)}</strong>
            </div>
            <h3>Registrar Pago</h3>
            <form onSubmit={handlePaymentSubmit} className="pagos-form modern">
              <div className="form-group">
                <label>Monto</label>
                <input
                  type="number"
                  name="monto"
                  value={paymentForm.monto}
                  onChange={handlePaymentFormChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Moneda</label>
                <select
                  name="moneda"
                  value={paymentForm.moneda}
                  onChange={handlePaymentFormChange}
                  required
                >
                  <option value="">Seleccione Moneda</option>
                  {currencies.map((curr) => (
                    <option key={curr.id} value={curr.id}>
                      {curr.descripcion}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Tipo de Pago</label>
                <select
                  name="tipoPago"
                  value={paymentForm.tipoPago}
                  onChange={handlePaymentFormChange}
                  required
                >
                  <option value="">Seleccione Tipo de Pago</option>
                  {paymentMethods.map((method) => (
                    <option
                      key={method.MPaIdMetodoPago}
                      value={method.MPaIdMetodoPago}
                    >
                      {method.MPaDescripcionMetodo}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Fecha</label>
                <input
                  type="date"
                  name="fecha"
                  value={paymentForm.fecha}
                  onChange={handlePaymentFormChange}
                  required
                />
              </div>
              <div className="form-group full-width">
                <label>Orden de retiro / Nº comprobante</label>
                <input
                  type="text"
                  name="ordenComprobante"
                  value={paymentForm.ordenComprobante}
                  onChange={handlePaymentFormChange}
                  required
                />
              </div>
              <div className="button-group">
                <button type="submit" className="modern-button">
                  Registrar Pago
                </button>
              </div>
            </form>

            <h3>Historial de Pagos</h3>
            <table className="payments-history-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Monto</th>
                  <th>Moneda</th>
                  <th>Tipo de Pago</th>
                  <th>Fecha</th>
                  <th>Orden / Comprobante</th>
                </tr>
              </thead>
              <tbody>
                {paymentsHistory.length > 0 ? (
                  paymentsHistory.map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.id}</td>
                      <td>{payment.monto}</td>
                      <td>{payment.moneda}</td>
                      <td>{payment.tipoPago}</td>
                      <td>{payment.fecha}</td>
                      <td>{payment.ordenComprobante}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6">No hay pagos registrados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      }
      case 'controlDeuda':
        return (
          <div className="deuda-options-container">
            <div className="deuda-toggle-buttons">
              <button
                className={`deuda-toggle-button ${selectedDeudaOption === 'ordenes' ? 'active' : ''}`}
                onClick={() => setSelectedDeudaOption('ordenes')}
              >
                Órdenes de retiro
              </button>
              <button
                className={`deuda-toggle-button ${selectedDeudaOption === 'comprobantes' ? 'active' : ''}`}
                onClick={() => setSelectedDeudaOption('comprobantes')}
              >
                Comprobantes
              </button>
            </div>
            <div className="deuda-tables">
              <div className="deuda-table-container">
                <h4>Deudas viejas</h4>
                <table className="deuda-table">
                  <thead>
                    <tr>
                      <th>{selectedDeudaOption === 'comprobantes' ? 'Comprobante' : 'Orden de retiro'}</th>
                      <th>Fecha emitido</th>
                      <th>Monto a pagar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deudasViejas.map(row => (
                      <tr key={row.id}>
                        <td>{row.valor}</td>
                        <td>{row.fecha}</td>
                        <td>{row.monto.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="deuda-table-container">
                <h4>Deudas actuales</h4>
                <table className="deuda-table">
                  <thead>
                    <tr>
                      <th>{selectedDeudaOption === 'comprobantes' ? 'Comprobante' : 'Orden de retiro'}</th>
                      <th>Fecha emitido</th>
                      <th>Monto a pagar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deudasActuales.map(row => (
                      <tr key={row.id}>
                        <td>{row.valor}</td>
                        <td>{row.fecha}</td>
                        <td>{row.monto.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'crearComprobante':
        return <ComprobanteForm client={editedClient} />;
      default:
        return <p>Seleccione una opción</p>;
    }
  };

  return (
    <div className="clientes-modal show" onClick={(e) => { if(e.target.classList.contains('clientes-modal')) closeModal(); }}>
      <div className="clientes-modal-content perfil-modal-content">
        <span className="clientes-close" onClick={closeModal}>&times;</span>
        {!isEditing ? (
          <div className="perfil-columns-container">
            <div className="perfil-left-column">
              <div className="perfil-client-code">
                {editedClient.codigoCliente || '-'}
              </div>
              <div className="perfil-info-column">
                <div className="perfil-info-item">
                  <label>Nombre y Apellido:</label>
                  <span>{editedClient.nombreApellido || '-'}</span>
                </div>
                <div className="perfil-info-item">
                  <label>Celular:</label>
                  <span>{editedClient.celular || '-'}</span>
                </div>
                <div className="perfil-info-item">
                  <label>Nombre de la Empresa:</label>
                  <span>{editedClient.nombreEmpresa || '-'}</span>
                </div>
                <div className="perfil-info-item">
                  <label>Documento:</label>
                  <span>{editedClient.documento || '-'}</span>
                </div>
                <div className="perfil-info-item">
                  <label>Localidad:</label>
                  <span>{editedClient.localidad || '-'}</span>
                </div>
                <div className="perfil-info-item">
                  <label>Dirección:</label>
                  <span>{editedClient.direccion || '-'}</span>
                </div>
                <div className="perfil-info-item">
                  <label>Agencia:</label>
                  <span>{editedClient.agencia || '-'}</span>
                </div>
                <div className="perfil-info-item">
                  <label>Email:</label>
                  <span>{editedClient.mail || '-'}</span>
                </div>
                <div className="perfil-info-item">
                  <label>Tipo de Cliente:</label>
                  <span>{editedClient.tipoCliente || '-'}</span>
                </div>
              </div>
              <div className="edit-personal-button-container">
                <button className="edit-personal-button" onClick={() => setIsEditing(true)}>
                  Editar datos personales
                </button>
              </div>
            </div>
            {userRole === 'Super Usuario' && (
              <div className="perfil-right-column">
                <div className="control-icons">
                  <button
                    onClick={() => setActiveField('preciosEspeciales')}
                    className={activeField === 'preciosEspeciales' ? 'active' : ''}
                  >
                    <img src={preciosIcon} alt="Precios Icon" className="icon-minimal" style={{ width: '24px', height: '24px' }} />
                    <span>Precios Especiales</span>
                  </button>
                  <button
                    onClick={() => setActiveField('controlCompras')}
                    className={activeField === 'controlCompras' ? 'active' : ''}
                  >
                    <img src={comprasIcon} alt="Compras Icon" className="icon-minimal" style={{ width: '24px', height: '24px' }} />
                    <span>Ordenes de Compras</span>
                  </button>
                  <button
                    onClick={() => setActiveField('controlPagos')}
                    className={activeField === 'controlPagos' ? 'active' : ''}
                  >
                    <img src={pagosIcon} alt="Pagos Icon" className="icon-minimal" style={{ width: '24px', height: '24px' }} />
                    <span>Registros de Pagos</span>
                  </button>
                  <button
                    onClick={() => setActiveField('controlDeuda')}
                    className={activeField === 'controlDeuda' ? 'active' : ''}
                  >
                    <img src={deudaIcon} alt="Deuda Icon" className="icon-minimal" style={{ width: '24px', height: '24px' }} />
                    <span>Deudas a pagar</span>
                  </button>
                  <button
                    onClick={() => setActiveField('crearComprobante')}
                    className={activeField === 'crearComprobante' ? 'active' : ''}
                  >
                    <img src={comprobanteIcon} alt="Comprobante Icon" className="icon-minimal" style={{ width: '24px', height: '24px' }} />
                    <span>Crear Comprobante</span>
                  </button>
                </div>
                <div className="control-content">
                  {renderControlContent()}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="editing-container">
            <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Editar Datos Personales</h3>
            <div className="edit-form-grid">
              <div className="form-group">
                <label>Nombre y Apellido</label>
                <input type="text" name="nombreApellido" value={editedClient.nombreApellido || ''} onChange={handleEditingInputChange} />
              </div>
              <div className="form-group">
                <label>Celular</label>
                <input type="text" name="celular" value={editedClient.celular || ''} onChange={handleEditingInputChange} />
              </div>
              <div className="form-group">
                <label>Nombre de la Empresa</label>
                <input type="text" name="nombreEmpresa" value={editedClient.nombreEmpresa || ''} onChange={handleEditingInputChange} />
              </div>
              <div className="form-group">
                <label>Documento</label>
                <input type="text" name="documento" value={editedClient.documento || ''} onChange={handleEditingInputChange} />
              </div>
              <div className="form-group">
                <label>Localidad</label>
                <input type="text" name="localidad" value={editedClient.localidad || ''} onChange={handleEditingInputChange} />
              </div>
              <div className="form-group">
                <label>Dirección</label>
                <input type="text" name="direccion" value={editedClient.direccion || ''} onChange={handleEditingInputChange} />
              </div>
              <div className="form-group">
                <label>Agencia</label>
                <input type="text" name="agencia" value={editedClient.agencia || ''} onChange={handleEditingInputChange} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" name="mail" value={editedClient.mail || ''} onChange={handleEditingInputChange} />
              </div>
              <div className="form-group">
                <label>Tipo de Cliente</label>
                <select name="tipoCliente" value={editedClient.tipoCliente || ''} onChange={handleEditingInputChange}>
                  <option value="">Seleccione un Tipo de Cliente</option>
                  {tipoClientes.map(tipo => (
                    <option key={tipo.TClIdTipoCliente} value={tipo.TClDescripcion}>
                      {tipo.TClDescripcion}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="button-group-modal">
              <button onClick={handleSubmit}>Guardar</button>
              <button onClick={handleCancelEditing}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ComprobanteForm: carga las órdenes no pagas y muestra la información.
// Se muestra el Código de cliente en "ID Cliente".
const ComprobanteForm = ({ client }) => {
  const [orders, setOrders] = useState([]);
  const [formData, setFormData] = useState({
    formaPago: '',
    tipoComprobante: '',
    moneda: '',
    cotizacion: '',
  });

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}/apiordenes/data?codigoCliente=${client.codigoCliente}&pagada=false`
        );
        const data = await response.json();
        if (response.ok) {
          setOrders(data.recordset || data);
        }
      } catch (error) {
        console.error("Error al obtener las órdenes", error);
      }
    };
    fetchOrders();
  }, [client]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const subTotal = orders.reduce((acc, order) => {
    const priceTotal =
      parseFloat(order.CostoFinal) ||
      (parseFloat(order.Cantidad) * parseFloat(order.PrecioUnitario)) ||
      0;
    return acc + priceTotal;
  }, 0);
  const iva = subTotal * 0.22;
  const total = subTotal + iva;

  return (
    <div className="comprobante-form">
      {/* Botones de acciones (solo en este contenedor) */}
      <div className="comprobante-actions">
        <button onClick={() => alert('Historial')}>Historial</button>
        <button onClick={() => alert('Guardar')}>Guardar</button>
        <button onClick={() => alert('Imprimir')}>Imprimir</button>
      </div>
      <div className="comprobante-header">
        <p><strong>ID Cliente:</strong> {client.codigoCliente}</p>
        <p><strong>Nombre:</strong> {client.nombreApellido}</p>
        <p><strong>Empresa:</strong> {client.nombreEmpresa}</p>
        <p><strong>Documento:</strong> {client.documento}</p>
      </div>
      <div className="comprobante-inputs">
        <div className="minimal-input-group">
          <label>Forma de pago:</label>
          <input 
            type="text" 
            name="formaPago" 
            value={formData.formaPago} 
            onChange={handleInputChange} 
            className="minimal-input" 
            placeholder="Ingrese forma de pago" 
          />
        </div>
        <div className="minimal-input-group">
          <label>Tipo de comprobante:</label>
          <input 
            type="text" 
            name="tipoComprobante" 
            value={formData.tipoComprobante} 
            onChange={handleInputChange} 
            className="minimal-input" 
            placeholder="Ingrese tipo de comprobante" 
          />
        </div>
        <div className="minimal-input-group">
          <label>Moneda:</label>
          <input 
            type="text" 
            name="moneda" 
            value={formData.moneda} 
            onChange={handleInputChange} 
            className="minimal-input" 
            placeholder="Ingrese moneda" 
          />
        </div>
        <div className="minimal-input-group">
          <label>Cotización:</label>
          <input 
            type="text" 
            name="cotizacion" 
            value={formData.cotizacion} 
            onChange={handleInputChange} 
            className="minimal-input" 
            placeholder="Ingrese cotización" 
          />
        </div>
      </div>
      <div className="comprobante-table">
        <table>
          <thead>
            <tr>
              <th>Orden</th>
              <th>Descripción</th>
              <th>Producto o servicio</th>
              <th>Cantidad</th>
              <th>Precio Unit</th>
              <th>Precio Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, idx) => (
              <tr key={idx}>
                <td>{order.CodigoOrden}</td>
                <td>{order.NombreTrabajo}</td>
                <td>{order.Producto}</td>
                <td>{order.Cantidad}</td>
                <td>{order.PrecioUnitario}</td>
                <td>
                  {order.CostoFinal
                    ? order.CostoFinal
                    : (parseFloat(order.Cantidad) * parseFloat(order.PrecioUnitario)).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="comprobante-totals">
        <div className="total-row">
          <label>Sub total:</label>
          <span>{subTotal.toFixed(2)}</span>
        </div>
        <div className="total-row">
          <label>Monto IVA 22%:</label>
          <span>{iva.toFixed(2)}</span>
        </div>
        <div className="total-row">
          <label>Total:</label>
          <span>{total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

const ClientListGrid = ({ clients, onSelectClient }) => {
  return (
    <div className="client-grid-container">
      <h2 style={{ textAlign: 'center' }}>Lista de Clientes</h2>
      <div className="clients-grid">
        {clients.map((client, index) => (
          <div key={index} className="client-card" onClick={() => onSelectClient(client)}>
            <p><strong>{client.codigoCliente}</strong></p>
            <p>{client.tipoCliente || 'Desconocido'}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const CreateClientForm = ({ tipoClientes, closeModal, onClientCreated }) => {
  const [newClient, setNewClient] = useState({
    CliCodigoCliente: '',
    CliNombreApellido: '',
    CliCelular: '',
    CliNombreEmpresa: '',
    CliDocumento: '',
    CliLocalidad: '',
    CliDireccion: '',
    CliAgencia: '',
    CliMail: '',
    TClIdTipoCliente: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewClient(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      if (!newClient.CliCodigoCliente || !newClient.CliNombreApellido || !newClient.CliCelular) {
        alert('Por favor, completa todos los campos obligatorios');
        return;
      }
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/apicliente/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient),
      });
      const responseData = await response.json();
      if (response.ok) {
        alert('Cliente creado exitosamente');
        onClientCreated();
      } else if (response.status === 400) {
        alert(`Error: ${responseData.error || 'Datos inválidos'}`);
      } else {
        alert('Error inesperado al crear el cliente');
      }
    } catch (error) {
      console.error('Error al crear cliente:', error);
      alert('Hubo un problema al crear el cliente. Revisa tu conexión o intenta más tarde.');
    }
  };

  return (
    <div className="clientes-modal show" onClick={(e) => { if(e.target.classList.contains('clientes-modal')) closeModal(); }}>
      <div className="clientes-modal-content" onClick={(e) => e.stopPropagation()}>
        <span className="clientes-close" onClick={closeModal}>&times;</span>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Crear Cliente</h2>
        <div className="form-container">
          <div className="edit-form-grid">
            <div className="form-group">
              <label>Código del Cliente</label>
              <input type="text" name="CliCodigoCliente" placeholder="Código del Cliente" value={newClient.CliCodigoCliente} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Nombre y Apellido</label>
              <input type="text" name="CliNombreApellido" placeholder="Nombre y Apellido" value={newClient.CliNombreApellido} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Celular</label>
              <input type="text" name="CliCelular" placeholder="Celular" value={newClient.CliCelular} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Nombre de la Empresa</label>
              <input type="text" name="CliNombreEmpresa" placeholder="Nombre de la Empresa" value={newClient.CliNombreEmpresa} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Documento</label>
              <input type="text" name="CliDocumento" placeholder="Documento" value={newClient.CliDocumento} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Localidad</label>
              <input type="text" name="CliLocalidad" placeholder="Localidad" value={newClient.CliLocalidad} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Dirección</label>
              <input type="text" name="CliDireccion" placeholder="Dirección" value={newClient.CliDireccion} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Agencia</label>
              <input type="text" name="CliAgencia" placeholder="Agencia" value={newClient.CliAgencia} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="CliMail" placeholder="Email" value={newClient.CliMail} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Tipo de Cliente</label>
              <select name="TClIdTipoCliente" value={newClient.TClIdTipoCliente} onChange={handleInputChange}>
                <option value="">Seleccione un Tipo de Cliente</option>
                {tipoClientes.map(tipo => (
                  <option key={tipo.TClIdTipoCliente} value={tipo.TClIdTipoCliente}>
                    {tipo.TClDescripcion}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={handleSubmit}>Crear Cliente</button>
        </div>
      </div>
    </div>
  );
};

export default App;
