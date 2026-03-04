// pedido_de_stock.js
import React, { useState } from 'react';
import '../aspecto/pedido_de_stock.css';

const PedidoDeStock = () => {
  const [productosModalVisible, setProductosModalVisible] = useState(false);
  const [mediasModalVisible, setMediasModalVisible] = useState(false);
  const [shortModalVisible, setShortModalVisible] = useState(false);
  const [shortItems, setShortItems] = useState([{ color: '', talle: '', cantidad: 0 }]);

  const openModal = (modal) => {
    if (modal === 'productos') setProductosModalVisible(true);
    if (modal === 'medias') setMediasModalVisible(true);
    if (modal === 'short') setShortModalVisible(true);
  };

  const closeModal = (modal) => {
    if (modal === 'productos') setProductosModalVisible(false);
    if (modal === 'medias') setMediasModalVisible(false);
    if (modal === 'short') setShortModalVisible(false);
  };

  const addShortRow = () => {
    setShortItems([...shortItems, { color: '', talle: '', cantidad: 0 }]);
  };

  return (
    <div className="pds-button-container">
      <h1>Pedido de Stock</h1>
      <p className="pds-order-number">Número de Orden: P-001</p>
      <button onClick={() => openModal('productos')}>Productos sin Variantes</button>
      <button onClick={() => openModal('medias')}>Medias Anti Deslizantes + Caña</button>
      <button onClick={() => openModal('short')}>Short</button>

      {productosModalVisible && (
        <div className="pds-modal">
          <div className="pds-modal-content">
            <span className="pds-close" onClick={() => closeModal('productos')}>&times;</span>
            <h3>Producto: Máquina Patillera</h3>
            <label htmlFor="cantidadPatillera">Cantidad:</label>
            <input type="number" id="cantidadPatillera" min="1" defaultValue="1" />
          </div>
        </div>
      )}

      {mediasModalVisible && (
        <div className="pds-modal">
          <div className="pds-modal-content">
            <span className="pds-close" onClick={() => closeModal('medias')}>&times;</span>
            <h3>Medias Anti Deslizantes + Caña</h3>
            {['Negro', 'Blanco', 'Azul Francia', 'Azul Marino', 'Rojo', 'Verde'].map((color) => (
              <div className="pds-variant-row" key={color}>
                <span>{color}:</span>
                <input type="number" min="0" defaultValue="0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {shortModalVisible && (
        <div className="pds-modal">
          <div className="pds-modal-content">
            <span className="pds-close" onClick={() => closeModal('short')}>&times;</span>
            <h3>Short</h3>
            <div className="pds-short-items-container">
              {shortItems.map((item, index) => (
                <div className="pds-item" key={index}>
                  <label>Color:</label>
                  <select value={item.color} onChange={(e) => {
                    const newShortItems = [...shortItems];
                    newShortItems[index].color = e.target.value;
                    setShortItems(newShortItems);
                  }}>
                    <option value="">Seleccionar</option>
                    {['Negro', 'Blanco', 'Azul Francia', 'Azul Marino', 'Rojo', 'Verde'].map((color) => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                  <label>Talle:</label>
                  <select value={item.talle} onChange={(e) => {
                    const newShortItems = [...shortItems];
                    newShortItems[index].talle = e.target.value;
                    setShortItems(newShortItems);
                  }}>
                    <option value="">Seleccionar</option>
                    {['6', '8', '10', '12', '14', '16', 'S', 'M', 'L', 'XL', '2XL', '3XL'].map((talle) => (
                      <option key={talle} value={talle}>{talle}</option>
                    ))}
                  </select>
                  <label>Cantidad:</label>
                  <input type="number" min="0" value={item.cantidad} onChange={(e) => {
                    const newShortItems = [...shortItems];
                    newShortItems[index].cantidad = e.target.value;
                    setShortItems(newShortItems);
                  }} />
                </div>
              ))}
              <div className="pds-add-short-button-container">
                <button className="pds-add-short-button" onClick={addShortRow}>Agregar otro Short</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PedidoDeStock;
