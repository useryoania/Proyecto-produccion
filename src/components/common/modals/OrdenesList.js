import React, { useState, useEffect } from 'react';
import { apiService } from '../../../services/api';

const OrdenesList = () => {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrdenes();
  }, []);

  const loadOrdenes = async () => {
    try {
      const data = await apiService.getOrdenes();
      setOrdenes(data);
    } catch (error) {
      console.error('Error cargando órdenes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Cargando órdenes...</div>;

  return (
    <div>
      <h2>Órdenes de Producción</h2>
      <div className="ordenes-grid">
        {ordenes.map(orden => (
          <div key={orden.OrdenID} className="orden-card">
            <h3>Orden: {orden.OrdenID}</h3>
            <p><strong>Cliente:</strong> {orden.ClienteNombre}</p>
            <p><strong>Área:</strong> {orden.AreaNombre}</p>
            <p><strong>Estado:</strong> {orden.Estado}</p>
            <p><strong>Progreso:</strong> {orden.Progreso}%</p>
            <p><strong>Prioridad:</strong> {orden.Prioridad}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrdenesList;