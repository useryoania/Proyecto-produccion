import React, { useEffect, useState } from 'react';
import '../aspecto/data.css'; // Importa el archivo CSS

function Data() {
  const [data, setData] = useState([]);
  const [newProducto, setNewProducto] = useState({
    Nombre: '',
    PrecioActual: '',
    IdMoneda: '',
    Tamaño: ''
  });

  useEffect(() => {
    // Obtener datos desde el backend
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/data`)
      .then((response) => response.json())
      .then((data) => {
        setData(data);
      })
      .catch((error) => console.error('Error:', error));
  }, []);

  // Manejar cambios en los inputs del formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProducto({ ...newProducto, [name]: value });
  };

  // Manejar envío del formulario
  const handleSubmit = (e) => {
    e.preventDefault();
    // Enviar nuevo producto al backend
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newProducto),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Error en la creación del producto');
        }
        return response.json();
      })
      .then(() => {
        // Obtener la lista de productos nuevamente después de crear uno nuevo
        return fetch(`${process.env.REACT_APP_BACKEND_URL}/api/data`);
      })
      .then((response) => response.json())
      .then((data) => {
        console.log('Productos actualizados:', data);
        setData(data); // Actualiza el estado con la lista de productos
        setNewProducto({ Nombre: '', PrecioActual: '', IdMoneda: '', Tamaño: '' }); // Limpiar el formulario
      })
      .catch((error) => console.error('Error al crear producto:', error));
  };

  return (
    <div>
      <h1>Datos desde la base de datos</h1>
      <ul>
        {Array.isArray(data) && data.length > 0 ? (
          data.map((item) => (
            <li key={item.Nombre}> {/* Asegúrate de que Nombre es único o usa otro identificador único */}
              <strong>Nombre:</strong> {item.Nombre} <br />
              <strong>Precio Actual:</strong> {item.PrecioActual} <br />
              <strong>Id Moneda:</strong> {item.IdMoneda} <br />
              <strong>Tamaño:</strong> {item.Tamaño} <br />
            </li>
          ))
        ) : (
          <p>No se encontraron datos</p>
        )}
      </ul>

      {/* Formulario para agregar nuevo producto */}
      <h2>Crear nuevo producto</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Nombre:</label>
          <input
            type="text"
            name="Nombre"
            value={newProducto.Nombre}
            onChange={handleInputChange}
            required
          />
        </div>
        <div>
          <label>Precio Actual:</label>
          <input
            type="number"
            name="PrecioActual"
            value={newProducto.PrecioActual}
            onChange={handleInputChange}
            required
          />
        </div>
        <div>
          <label>Id Moneda:</label>
          <input
            type="text"
            name="IdMoneda"
            value={newProducto.IdMoneda}
            onChange={handleInputChange}
            required
          />
        </div>
        <div>
          <label>Tamaño:</label>
          <input
            type="text"
            name="Tamaño"
            value={newProducto.Tamaño}
            onChange={handleInputChange}
            required
          />
        </div>
        <button type="submit">Crear Producto</button>
      </form>
    </div>
  );
}

export default Data;
