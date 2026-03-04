import React, { useState, useEffect } from 'react';
import '../aspecto/cliente.css';
import '../aspecto/clientes_especiales.css'; // Import CSS for special clients

const App = () => {
  const [clients, setClients] = useState([]);
  const [searchId, setSearchId] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [tipoClientes, setTipoClientes] = useState([]);
  const [products, setProducts] = useState([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);

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

    fetchTipoClientes();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/apiproducto/data`);
        const data = await response.json();
        if (response.ok) {
          setProducts(data.sort((a, b) => a.ProNombreProducto.localeCompare(b.ProNombreProducto)));
        }
      } catch (error) {
        console.error('Error al obtener los productos:', error);
      }
    };

    fetchProducts();
  }, []);

  const handleSearch = async () => {
    try {
      // Realizar la solicitud al backend
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/apicliente/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ codigoCliente: searchId }),
      });

      const data = await response.json();

      if (response.ok && data.recordset.length > 0) {
        // Si se encuentran datos, tomar el primer cliente de la lista de resultados
        const client = data.recordset[0];
        setSelectedClient({
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
        });
      } else {
        setSelectedClient(null); // Cliente no encontrado
      }
    } catch (error) {
      console.error('Error al buscar el cliente:', error);
      setSelectedClient(null);
    }
  };

  const handleEdit = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/apicliente/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedClient),
      });

      if (response.ok) {
        alert('Información actualizada correctamente');
        setIsEditing(false);
      } else {
        alert('Error al actualizar la información');
      }
    } catch (error) {
      console.error('Error al actualizar el cliente:', error);
    }
  };

  const handleOpenProductModal = () => {
    setIsProductModalOpen(true);
  };

  return (
    <div className="CLIContainer">
      <h2 className="CLIContainer_h2">Buscar Cliente</h2>
      <input
        className="CLIContainer_searchInput"
        type="text"
        value={searchId}
        onChange={e => setSearchId(e.target.value)}
        placeholder="Ingrese el código del cliente"
      />
      <button className="CLIContainer_searchButton" onClick={handleSearch}>Buscar</button>

      {selectedClient ? (
        <div className="client-details">
          <h3 className="client-details-title">Detalles del Cliente</h3>
          <table className="client-details-table">
            <tbody>
              <tr>
                <td><strong>Nombre y Apellido:</strong></td>
                <td>
                  {isEditing ? (
                    <input
                      type="text"
                      value={selectedClient.nombreApellido || ''}
                      onChange={e =>
                        setSelectedClient({ ...selectedClient, nombreApellido: e.target.value })
                      }
                    />
                  ) : (
                    selectedClient.nombreApellido
                  )}
                </td>
                <td><strong>Celular:</strong></td>
                <td>
                  {isEditing ? (
                    <input
                      type="text"
                      value={selectedClient.celular || ''}
                      onChange={e =>
                        setSelectedClient({ ...selectedClient, celular: e.target.value })
                      }
                    />
                  ) : (
                    selectedClient.celular
                  )}
                </td>
              </tr>
              <tr>
                <td><strong>Nombre Empresa:</strong></td>
                <td>
                  {isEditing ? (
                    <input
                      type="text"
                      value={selectedClient.nombreEmpresa || ''}
                      onChange={e =>
                        setSelectedClient({ ...selectedClient, nombreEmpresa: e.target.value })
                      }
                    />
                  ) : (
                    selectedClient.nombreEmpresa
                  )}
                </td>
                <td><strong>Documento:</strong></td>
                <td>
                  {isEditing ? (
                    <input
                      type="text"
                      value={selectedClient.documento || ''}
                      onChange={e =>
                        setSelectedClient({ ...selectedClient, documento: e.target.value })
                      }
                    />
                  ) : (
                    selectedClient.documento
                  )}
                </td>
              </tr>
              <tr>
                <td><strong>Localidad:</strong></td>
                <td>
                  {isEditing ? (
                    <input
                      type="text"
                      value={selectedClient.localidad || ''}
                      onChange={e =>
                        setSelectedClient({ ...selectedClient, localidad: e.target.value })
                      }
                    />
                  ) : (
                    selectedClient.localidad
                  )}
                </td>
                <td><strong>Dirección:</strong></td>
                <td>
                  {isEditing ? (
                    <input
                      type="text"
                      value={selectedClient.direccion || ''}
                      onChange={e =>
                        setSelectedClient({ ...selectedClient, direccion: e.target.value })
                      }
                    />
                  ) : (
                    selectedClient.direccion
                  )}
                </td>
              </tr>
              <tr>
                <td><strong>Agencia:</strong></td>
                <td>
                  {isEditing ? (
                    <input
                      type="text"
                      value={selectedClient.agencia || ''}
                      onChange={e =>
                        setSelectedClient({ ...selectedClient, agencia: e.target.value })
                      }
                    />
                  ) : (
                    selectedClient.agencia
                  )}
                </td>
                <td><strong>Email:</strong></td>
                <td>
                  {isEditing ? (
                    <input
                      type="text"
                      value={selectedClient.mail || ''}
                      onChange={e =>
                        setSelectedClient({ ...selectedClient, mail: e.target.value })
                      }
                    />
                  ) : (
                    selectedClient.mail
                  )}
                </td>
              </tr>
              <tr>
                <td><strong>Tipo Cliente:</strong></td>
                <td colSpan="3">
                  {isEditing ? (
                    <select
                      value={selectedClient.tipoCliente || ''}
                      onChange={e =>
                        setSelectedClient({ ...selectedClient, tipoCliente: parseInt(e.target.value, 10) })
                      }
                    >
                      <option value="">Seleccione un tipo</option>
                      {tipoClientes.map(tipo => (
                        <option key={tipo.TClIdTipoCliente} value={tipo.TClIdTipoCliente}>
                          {tipo.TClDescripcion}
                        </option>
                      ))}
                    </select>
                  ) : (
                    tipoClientes.find(tipo => tipo.TClIdTipoCliente === selectedClient.tipoCliente)?.TClDescripcion || selectedClient.tipoCliente
                  )}
                </td>
              </tr>
            </tbody>
          </table>
          <div className="client-actions">
            {isEditing ? (
              <>
                <button className="save-button" onClick={handleEdit}>Guardar</button>
                <button className="cancel-button" onClick={() => setIsEditing(false)}>Cancelar</button>
              </>
            ) : (
              <>
                <button className="edit-button" onClick={() => setIsEditing(true)}>Editar</button>
                <button className="special-price-button" onClick={handleOpenProductModal}>Cargar Precio Especial</button>
              </>
            )}
          </div>
        </div>
      ) : (
        <p className="no-client">Cliente no encontrado</p>
      )}

      {isProductModalOpen && (
        <ProductModal
          closeModal={() => setIsProductModalOpen(false)}
          products={products}
          selectedProducts={selectedProducts}
          setSelectedProducts={setSelectedProducts}
        />
      )}
    </div>
  );
};

function ProductModal({ closeModal, products, selectedProducts, setSelectedProducts }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [globalDiscount, setGlobalDiscount] = useState('');

  useEffect(() => {
    if (selectAll) {
      const allSelected = products.map(product => ({
        name: product.ProNombreProducto,
        discount: globalDiscount || '0'
      }));
      setSelectedProducts(allSelected);
    } else {
      setSelectedProducts([]);
    }
  }, [selectAll, products, globalDiscount]);

  const handleProductChange = (product, checked) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, { name: product.ProNombreProducto, discount: globalDiscount || '0' }]);
    } else {
      setSelectedProducts(selectedProducts.filter(p => p.name !== product.ProNombreProducto));
    }
  };

  const handleDiscountChange = (product, discount) => {
    setSelectedProducts(selectedProducts.map(p => {
      if (p.name === product) {
        return { ...p, discount };
      } else {
        return p;
      }
    }));
  };

  return (
    <div className="clientes-modal show" onClick={(e) => { if (e.target.classList.contains('clientes-modal')) closeModal(); }}>
      <div className="clientes-modal-content" onClick={(e) => e.stopPropagation()}>
        <span className="clientes-close" onClick={closeModal}>&times;</span>
        <h2>Selección de Productos</h2>
        <input
          type="text"
          placeholder="Buscar producto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="clientes-search-input"
        />
        <div className="select-all">
          <input
            type="checkbox"
            id="selectAll"
            checked={selectAll}
            onChange={(e) => setSelectAll(e.target.checked)}
          />
          <label htmlFor="selectAll">Seleccionar todos</label>
          <input
            type="number"
            id="globalDiscount"
            placeholder="% Desc. Global"
            min="0"
            max="100"
            value={globalDiscount}
            onChange={(e) => setGlobalDiscount(e.target.value)}
          />
        </div>
        <div className="clientes-product-list" id="productList">
          {products.filter(product => product.ProNombreProducto.toLowerCase().includes(searchTerm.toLowerCase())).map((product, index) => (
            <div className="clientes-product-item" key={index}>
              <label>
                <input
                  type="checkbox"
                  id={`product${index}`}
                  name={`product${index}`}
                  checked={selectedProducts.some(p => p.name === product.ProNombreProducto)}
                  onChange={(e) => handleProductChange(product, e.target.checked)}
                />
                {product.ProNombreProducto}
              </label>
              <input
                type="number"
                id={`discount${index}`}
                name={`discount${index}`}
                min="0"
                max="100"
                placeholder="% Desc."
                value={selectedProducts.find(p => p.name === product.ProNombreProducto)?.discount || ''}
                onChange={(e) => handleDiscountChange(product.ProNombreProducto, e.target.value)}
              />
            </div>
          ))}
        </div>
        <button id="applyDiscounts" onClick={closeModal}>Aplicar Descuentos</button>
      </div>
    </div>
  ); 
}

export default App;
