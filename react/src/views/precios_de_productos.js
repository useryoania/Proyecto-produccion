// ProductManager.js
import React, { useState, useEffect } from 'react';
import '../aspecto/precios_de_productos.css';

function ProductManager() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalCategory, setModalCategory] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    cost: '',
    currency: '',
    category: '',
    details: '',
    codigoOdoo: '' // Nuevo campo para ProCodigoOdooProducto
  });
  const [filterText, setFilterText] = useState('');
  const [filterCost, setFilterCost] = useState('');

  useEffect(() => {
    fetchData();
    fetchCategories();
    fetchCurrencies();
  }, []);

  const fetchData = () => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/apiproducto/data`)
      .then((response) => response.json())
      .then((data) => {
        console.log("Productos recibidos:", data); // Log para verificar los productos recibidos del backend
        setProducts(data.sort((a, b) => a.ProNombreProducto.localeCompare(b.ProNombreProducto)));
      })
      .catch((error) => console.error('Error:', error));
  };

  const fetchCategories = () => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/apiproducto/categories`)
      .then((response) => response.json())
      .then((data) => setCategories(data))
      .catch((error) => console.error('Error al obtener categorías:', error));
  };

  const fetchCurrencies = () => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/apiproducto/currencies`)
      .then((response) => response.json())
      .then((data) => setCurrencies(data))
      .catch((error) => console.error('Error al obtener monedas:', error));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
  
    if (!formData.name || !formData.cost || !formData.currency || !formData.category || !formData.details || !formData.codigoOdoo) {
      console.error('Todos los campos son obligatorios');
      return;
    }
  
    const token = localStorage.getItem('token');

    const newProduct = {
      name: formData.name,
      details: formData.details,
      category: parseInt(formData.category),
      IdUnidad: 1,
      IdMoneda: parseInt(formData.currency),
      cost: parseFloat(formData.cost),
      codigoOdoo: formData.codigoOdoo,
    };
  
    fetch(`${process.env.REACT_APP_BACKEND_URL}/apiproducto/data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`, // Agregar token aquí
      },
      body: JSON.stringify(newProduct),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error en la creación del producto');
        }
        return response.json();
      })
      .then(() => {
        fetchData();
        setFormData({ name: '', cost: '', currency: '', category: '', details: '', codigoOdoo: '' });
      })
      .catch((error) => {
        console.error('Error al crear producto:', error)
        alert(error.message); // Notificar al usuario
      });
  };
  

  const openModal = (categoryId) => {
    console.log("ID de categoría seleccionada:", categoryId); // Log para verificar el ID de la categoría
    setModalCategory(categoryId);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setFilterText('');
    setFilterCost('');
  };

  const editProduct = (productId) => {
    setProducts((prevProducts) =>
      prevProducts.map((product) =>
        product.ProIdProducto === productId ? { ...product, isEditing: true } : product
      )
    );
  };

  const saveProduct = async (productId) => {
    const updatedProducts = products.map((product) =>
      product.ProIdProducto === productId ? { ...product, isEditing: false } : product
    );
    setProducts(updatedProducts.sort((a, b) => a.ProNombreProducto.localeCompare(b.ProNombreProducto)));
    const token = localStorage.getItem('token'); // Obtener el token del almacenamiento local

    const productToUpdate = updatedProducts.find((product) => product.ProIdProducto === productId);
    try {
      await fetch(`${process.env.REACT_APP_BACKEND_URL}/apiproducto/data`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`, // Agregar token aquí
        },
        body: JSON.stringify({
          IdProducto: productToUpdate.ProIdProducto,
          NombreProducto: productToUpdate.ProNombreProducto,
          Detalle: productToUpdate.ProDetalleProducto,
          Moneda: parseInt(productToUpdate.MonIdMoneda),
          NuevoPrecio: parseFloat(productToUpdate.ProPrecioActual),
          codigoOdoo: productToUpdate.ProCodigoOdooProducto // Actualización del nuevo campo
        }),
      });
    } catch (error) {
      console.error('Error al actualizar el producto:', error);
    }
  };

  const removeProduct = async (productId) => {
    try {
      await fetch(`${process.env.REACT_APP_BACKEND_URL}/apiproducto/data/${productId}`, {
        method: 'DELETE',
      });
      setProducts((prevProducts) => prevProducts.filter((product) => product.ProIdProducto !== productId).sort((a, b) => a.ProNombreProducto.localeCompare(b.ProNombreProducto)));
    } catch (error) {
      console.error('Error al eliminar el producto:', error);
    }
  };

  // Filtrar productos basados en el ID de categoría seleccionado y filtros aplicados
  const filteredProducts = products.filter((product) => {
    const matchesCategory = parseInt(product.SMaIdSubMarca) === parseInt(modalCategory);
    const matchesText = filterText === '' || product.ProNombreProducto.toLowerCase().includes(filterText.toLowerCase());
    const matchesCost = filterCost === '' || product.ProPrecioActual.toString().includes(filterCost);
    return matchesCategory && matchesText && matchesCost;
  });

  useEffect(() => {
    if (modalVisible) {
      const handleOutsideClick = (event) => {
        if (event.target.classList.contains('modal')) {
          closeModal();
        }
      };
      window.addEventListener('click', handleOutsideClick);
      return () => {
        window.removeEventListener('click', handleOutsideClick);
      };
    }
  }, [modalVisible]);

  return (
    <div className="precios-container">
      <h1>Gestor de Productos</h1>
      <form id="productForm" onSubmit={handleFormSubmit} className="form-container">
        <input
          type="text"
          id="productName"
          name="name"
          value={formData.name}
          onChange={handleFormChange}
          placeholder="Nombre del producto"
          required
          className="form-field"
        />
        <input
          type="text"
          id="codigoOdoo"
          name="codigoOdoo"
          value={formData.codigoOdoo}
          onChange={handleFormChange}
          placeholder="Código Odoo"
          required
          className="form-field"
        />
        <div className="cost-container">
          <input
            type="text"
            id="productCost"
            name="cost"
            value={formData.cost}
            onChange={(e) => {
              const value = e.target.value.replace(',', '.'); // Permitir uso de ',' o '.' para decimales
              setFormData((prevData) => ({
                ...prevData,
                cost: value
              }));
            }}
            placeholder="Costo del producto"
            required
            className="form-field"
            style={{ width: '100px' }}
            onFocus={(e) => e.target.select()} // Esto permite seleccionar el contenido actual para reemplazarlo fácilmente
          />
          <select
            id="currency"
            name="currency"
            value={formData.currency}
            onChange={handleFormChange}
            className="form-field"
            required
          >
            <option value="">Seleccione una moneda</option>
            {currencies.map((currency) => (
              <option key={currency.MonIdMoneda} value={currency.MonIdMoneda}>
                {currency.MonSimbolo} - {currency.MonDescripcionMoneda}
              </option>
            ))}
          </select>
        </div>
        <select
          id="productCategory"
          name="category"
          value={formData.category}
          onChange={handleFormChange}
          required
          className="form-field"
        >
          <option value="">Seleccione una categoría</option>
          {categories.map((category) => (
            <option key={category.SMaIdSubMarca} value={category.SMaIdSubMarca}>
              {category.SMaNombreSubMarca}
            </option>
          ))}
        </select>
        <textarea
          id="productDetails"
          name="details"
          value={formData.details || ''}
          onChange={handleFormChange}
          placeholder="Detalles del producto"
          className="form-field"
        />
        <button type="submit" className="form-button">Agregar Producto</button>
      </form>
      <div id="productSections">
        {categories.map((category) => (
          <button key={category.SMaIdSubMarca} onClick={() => openModal(category.SMaIdSubMarca)} className="category-button">
            Ver productos de {category.SMaNombreSubMarca}
          </button>
        ))}
      </div>

      {modalVisible && (
        <div id="productModal" className="modal">
          <div className="modal-content">
            <span className="close" onClick={closeModal}>&times;</span>
            <h2>Productos en {categories.find(cat => cat.SMaIdSubMarca === modalCategory)?.SMaNombreSubMarca}</h2>
            {console.log("ID de categoría en el modal:", modalCategory)} {/* Log para verificar el ID de la categoría en el modal */}
            {console.log("Productos filtrados:", filteredProducts)} {/* Log para verificar los productos filtrados */}

            <div className="filter-container">
              <input
                type="text"
                placeholder="Filtrar por nombre"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="filter-field"
              />
              <input
                type="text"
                placeholder="Filtrar por costo"
                value={filterCost}
                onChange={(e) => setFilterCost(e.target.value)}
                className="filter-field"
              />
            </div>

            <div id="modalProductList" className="product-grid">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <div key={product.ProIdProducto} className="product-item">
                    <input
                      type="text"
                      value={product.ProIdProducto || ''} // Mostrar el ProIdProducto
                      readOnly={true} // Campo de solo lectura
                      className="product-field"
                      style={{ width: '100px' }} // Ajusta el tamaño según sea necesario
                      placeholder="ID del Producto"
                    />
                    <input
                      type="text"
                      value={product.ProNombreProducto || ''}
                      readOnly={!product.isEditing}
                      onChange={(e) => {
                        setProducts((prevProducts) =>
                          prevProducts.map((p) =>
                            p.ProIdProducto === product.ProIdProducto ? { ...p, PPrNombreProducto: e.target.value } : p
                          )
                        );
                      }}
                      className="product-field"
                      style={{ width: '150px' }}
                    />
                    <input
                      type="text"
                      value={product.ProCodigoOdooProducto || ''}
                      readOnly={!product.isEditing}
                      onChange={(e) => {
                        setProducts((prevProducts) =>
                          prevProducts.map((p) =>
                            p.ProIdProducto === product.ProIdProducto
                              ? { ...p, ProCodigoOdooProducto: e.target.value }
                              : p
                          )
                        );
                      }}
                      className="product-field"
                      placeholder="Código Odoo"
                      style={{ width: '150px' }}
                    />
                    <input
                      type="text"
                      value={product.ProPrecioActual != null ? product.ProPrecioActual : ''}
                      readOnly={!product.isEditing}
                      onChange={(e) => {
                        const newValue = e.target.value.replace(',', '.');
                        setProducts((prevProducts) =>
                          prevProducts.map((p) =>
                            p.ProIdProducto === product.ProIdProducto ? { ...p, ProPrecioActual: newValue } : p
                          )
                        );
                      }}
                      className="product-field"
                      style={{ width: '100px' }}
                      onFocus={(e) => e.target.select()} // Esto permite seleccionar el contenido actual para reemplazarlo fácilmente
                    />
                    <select
                      value={product.MonIdMoneda || ''}
                      disabled={!product.isEditing}
                      onChange={(e) => {
                        setProducts((prevProducts) =>
                          prevProducts.map((p) =>
                            p.ProIdProducto === product.ProIdProducto ? { ...p, MonIdMoneda: parseInt(e.target.value) } : p
                          )
                        );
                      }}
                      className="product-field"
                    >
                      {currencies.map((currency) => (
                        <option key={currency.MonIdMoneda} value={currency.MonIdMoneda}>
                          {currency.MonSimbolo} - {currency.MonDescripcionMoneda}
                        </option>
                      ))}
                    </select>
                    <textarea
                      value={product.ProDetalleProducto || ''}
                      readOnly={!product.isEditing}
                      onChange={(e) => {
                        setProducts((prevProducts) =>
                          prevProducts.map((p) =>
                            p.ProIdProducto === product.ProIdProducto ? { ...p, PPrDetalleProducto: e.target.value } : p
                          )
                        );
                      }}
                      placeholder="Detalles del producto"
                      className="product-field"
                    />
                    <div className="edit-buttons">
                      {product.isEditing ? (
                        <button className="save-button" onClick={() => saveProduct(product.ProIdProducto)}>Guardar</button>
                      ) : (
                        <button className="edit-button" onClick={() => editProduct(product.ProIdProducto)}>Editar</button>
                      )}
                      <button className="delete-button" onClick={() => removeProduct(product.ProIdProducto)}>Eliminar</button>
                    </div>
                  </div>
                ))
              ) : (
                <p>No hay productos en esta categoría.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductManager;