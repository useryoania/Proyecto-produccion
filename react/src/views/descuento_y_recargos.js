import React, { useState, useEffect } from 'react';
import '../aspecto/descuento_y_recargos.css';

const DiscountAdmin = () => {
  const [discountType, setDiscountType] = useState('');
  const [discountSelection, setDiscountSelection] = useState('');
  const [product, setProduct] = useState('');
  const [quantityDiscount, setQuantityDiscount] = useState({ amount: 0, threshold: 0 });
  const [timeDiscount, setTimeDiscount] = useState({ amount: 0, startDate: '', endDate: '' });
  const [surcharge, setSurcharge] = useState({ name: '', amount: 0 });
  const [savedItems, setSavedItems] = useState([]);

  useEffect(() => {
    const storedData = localStorage.getItem('adminDescuentosData');
    if (storedData) {
      setSavedItems(JSON.parse(storedData));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('adminDescuentosData', JSON.stringify(savedItems));
  }, [savedItems]);

  const handleSave = (event) => {
    event.preventDefault();

    let newItem;
    if (discountType === 'quantity') {
      newItem = {
        type: 'quantity',
        product,
        discountType: discountSelection,
        discountAmount: quantityDiscount.amount,
        threshold: quantityDiscount.threshold,
      };
    } else if (discountType === 'time') {
      newItem = {
        type: 'time',
        product,
        discountType: discountSelection,
        discountAmount: timeDiscount.amount,
        startDate: timeDiscount.startDate,
        endDate: timeDiscount.endDate,
      };
    } else if (discountType === 'surcharge') {
      newItem = {
        type: 'surcharge',
        product,
        name: surcharge.name,
        amount: surcharge.amount,
      };
    }

    setSavedItems([...savedItems, newItem]);
    resetForm();
  };

  const resetForm = () => {
    setDiscountType('');
    setDiscountSelection('');
    setProduct('');
    setQuantityDiscount({ amount: 0, threshold: 0 });
    setTimeDiscount({ amount: 0, startDate: '', endDate: '' });
    setSurcharge({ name: '', amount: 0 });
  };

  const handleDelete = (index) => {
    setSavedItems(savedItems.filter((_, i) => i !== index));
  };

  return (
    <div className="container">
      <h1>Administrador de Descuentos y Recargos</h1>
      <form onSubmit={handleSave} id="discount-form">
        <div className="form-group">
          
          <select id="discount-type" value={discountType} onChange={(e) => setDiscountType(e.target.value)} required>
            <option value="">Seleccionar Tipo</option>
            <option value="quantity">Descuento por Cantidad</option>
            <option value="time">Descuento por Tiempo</option>
            <option value="surcharge">Recargo</option>
          </select>
        </div>
        {(discountType === 'quantity' || discountType === 'time') && (
          <div className="form-group" id="discount-type-selection">
            
            <select id="discount-selection" value={discountSelection} onChange={(e) => setDiscountSelection(e.target.value)} required>
              <option value="">Seleccionar Tipo de Descuento</option>
              <option value="percentage">Porcentaje de Descuento</option>
              <option value="value">Valor Final</option>
            </select>
          </div>
        )}
        {discountType !== 'surcharge' && (
          <div className="form-group" id="product-group">
            
            <input
              type="text"
              id="product"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="Ejemplo: Producto A"
              required
            />
          </div>
        )}
        {discountType === 'quantity' && (
          <div className="form-group" id="quantity-discount-fields">
            
            <input
              type="number"
              id="quantity-discount-amount"
              min="0"
              value={quantityDiscount.amount}
              onChange={(e) => setQuantityDiscount({ ...quantityDiscount, amount: parseFloat(e.target.value) })}
              placeholder="Ejemplo: 10"
              required
            />
            
            <input
              type="number"
              id="quantity-threshold"
              min="0"
              value={quantityDiscount.threshold}
              onChange={(e) => setQuantityDiscount({ ...quantityDiscount, threshold: parseFloat(e.target.value) })}
              placeholder="Ejemplo: 5"
              required
            />
          </div>
        )}
        {discountType === 'time' && (
          <div className="form-group" id="time-discount-fields">
            
            <input
              type="number"
              id="time-discount-amount"
              min="0"
              value={timeDiscount.amount}
              onChange={(e) => setTimeDiscount({ ...timeDiscount, amount: parseFloat(e.target.value) })}
              placeholder="Ejemplo: 15"
              required
            />
            
            <input
              type="date"
              id="start-date"
              value={timeDiscount.startDate}
              onChange={(e) => setTimeDiscount({ ...timeDiscount, startDate: e.target.value })}
              required
            />
            
            <input
              type="date"
              id="end-date"
              value={timeDiscount.endDate}
              onChange={(e) => setTimeDiscount({ ...timeDiscount, endDate: e.target.value })}
              required
            />
          </div>
        )}
        {discountType === 'surcharge' && (
          <div className="form-group" id="surcharge-fields">
            
            <input
              type="text"
              id="surcharge-name"
              value={surcharge.name}
              onChange={(e) => setSurcharge({ ...surcharge, name: e.target.value })}
              placeholder="Ejemplo: Recargo Extra"
              required
            />
            
            <input
              type="number"
              id="surcharge-amount"
              min="0"
              value={surcharge.amount}
              onChange={(e) => setSurcharge({ ...surcharge, amount: parseFloat(e.target.value) })}
              placeholder="Ejemplo: 20"
              required
            />
          </div>
        )}
        <button type="submit" id="save-discount-surcharge">Guardar Descuento/Recargo</button>
      </form>
      <div className="saved-items-container">
        <div className="saved-items-grid" id="saved-items-grid">
          {savedItems.map((item, index) => (
            <div className="discount-surcharge-card" key={index}>
              {item.type === 'quantity' && (
                <>
                  <h3>Descuento por Cantidad</h3>
                  {item.product && <p>Producto: {item.product}</p>}
                  <p>Tipo de Descuento: {item.discountType === 'percentage' ? 'Porcentaje de Descuento' : 'Valor Final'}</p>
                  <p>Valor del Descuento: {item.discountAmount}%</p>
                  <p>Cantidad Mínima: {item.threshold} unidades</p>
                </>
              )}
              {item.type === 'time' && (
                <>
                  <h3>Descuento por Tiempo</h3>
                  {item.product && <p>Producto: {item.product}</p>}
                  <p>Tipo de Descuento: {item.discountType === 'percentage' ? 'Porcentaje de Descuento' : 'Valor Final'}</p>
                  <p>Valor del Descuento: {item.discountAmount}%</p>
                  <p>Fecha de Inicio: {new Date(item.startDate).toLocaleDateString()}</p>
                  <p>Fecha de Finalización: {new Date(item.endDate).toLocaleDateString()}</p>
                </>
              )}
              {item.type === 'surcharge' && (
                <>
                  <h3>Recargo</h3>
                  {item.product && <p>Producto: {item.product}</p>}
                  <p>Nombre del Recargo: {item.name}</p>
                  <p>Porcentaje del Recargo: {item.amount}%</p>
                </>
              )}
              <button className="delete-btn" onClick={() => handleDelete(index)}>Eliminar</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DiscountAdmin;